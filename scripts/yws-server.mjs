/**
 * Yjs WebSocket server — nexusai
 *
 * Responsibilities:
 *  - Implement the y-protocols sync handshake so collaborators share one Y.Doc
 *  - Persist the Yjs binary state to MongoDB after each change (debounced)
 *    and immediately on last-user-disconnect so the HTTP API can read it
 *  - Validate signed HMAC tokens issued by /api/workspace/ws-token
 *  - Keep connections alive with a 30-second ping/pong heartbeat
 *  - Shut down gracefully on SIGTERM/SIGINT: flush all pending saves before exit
 */

import http     from 'node:http';
import ws       from 'ws';
import * as Y   from 'yjs';
import * as syncProtocol      from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding  from 'lib0/encoding';
import * as decoding  from 'lib0/decoding';
import { createHmac } from 'node:crypto';
import mongoose from 'mongoose';

// ── Config ────────────────────────────────────────────────────────────────────

const MONGODB_URI = process.env.MONGODB_URI;
const WS_SECRET   = process.env.WS_SECRET ?? "";
const PORT        = Number(process.env.YWS_PORT ?? 1234);

/** Debounce window (ms) for in-flight saves; keeps write rate bounded during bursts. */
const SAVE_DEBOUNCE_MS  = 1_500;
/** How often to send a WebSocket ping to each client. */
const HEARTBEAT_INTERVAL_MS = 30_000;
/** How long to wait for a pong before treating the connection as dead. */
const HEARTBEAT_TIMEOUT_MS  = 10_000;
/** WS token validity window: must match /api/workspace/ws-token. */
const TOKEN_TTL_MS = 30 * 60 * 1_000;

// ── MongoDB ───────────────────────────────────────────────────────────────────

const NexusPageSchema = new mongoose.Schema(
  {
    workspaceKey: { type: String, required: true, unique: true },
    projectId:    { type: String  },
    title:        { type: String, default: 'Untitled' },
    tiptapJson:   { type: mongoose.Schema.Types.Mixed, default: null },
    html:         { type: String,  default: '' },
    yjsState:     { type: Buffer,  default: null },
    lastEditedBy: { type: String  },
    editCount:    { type: Number,  default: 0  },
  },
  { timestamps: true }
);

const NexusPage =
  mongoose.models?.NexusPage ?? mongoose.model('NexusPage', NexusPageSchema);

if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI, { maxPoolSize: 5, serverSelectionTimeoutMS: 5_000 })
    .then(() => console.log('[yws] MongoDB connected'))
    .catch(err => console.error('[yws] MongoDB connection failed:', err.message));
} else {
  console.warn('[yws] MONGODB_URI not set — Yjs state will not be persisted');
}

// ── Persistence ───────────────────────────────────────────────────────────────

/**
 * Normalize BSON Binary / Node.js Buffer / raw object → Uint8Array.
 * Mongoose .lean() may return a BSON Binary (has .buffer + .position) or a
 * plain Buffer depending on driver version; both must produce the correct bytes.
 */
function toUint8Array(raw) {
  if (!raw) return null;
  if (raw instanceof Uint8Array) return raw.slice();                        // Buffer (extends Uint8Array)
  if (typeof raw.value === 'function') return new Uint8Array(raw.value()); // BSON Binary v5/6
  if (raw.buffer) {
    const buf = Buffer.isBuffer(raw.buffer) ? raw.buffer : Buffer.from(raw.buffer);
    const len = typeof raw.position === 'number' ? raw.position : buf.byteLength;
    return new Uint8Array(buf.buffer, buf.byteOffset, len);
  }
  return new Uint8Array(Buffer.from(raw));
}

async function loadDocState(workspaceKey, doc) {
  if (!MONGODB_URI || mongoose.connection.readyState !== 1) return;
  try {
    const page = await NexusPage.findOne({ workspaceKey }).select('yjsState').lean();
    if (!page?.yjsState) { console.log(`[yws] no state for "${workspaceKey}"`); return; }
    const bytes = toUint8Array(page.yjsState);
    if (!bytes?.length) { console.log(`[yws] empty state for "${workspaceKey}"`); return; }
    Y.applyUpdate(doc, bytes);
    console.log(`[yws] loaded "${workspaceKey}" (${bytes.length} B)`);
  } catch (err) {
    console.error('[yws] loadDocState error:', err.message);
    // Clear corrupt state so next persist overwrites with a valid snapshot
    NexusPage.updateOne({ workspaceKey }, { $set: { yjsState: null } }).catch(() => {});
  }
}

async function persistState(workspaceKey, doc, projectId) {
  if (!MONGODB_URI || mongoose.connection.readyState !== 1) return;
  try {
    const state = Y.encodeStateAsUpdate(doc);
    await NexusPage.findOneAndUpdate(
      { workspaceKey },
      {
        $set:         { yjsState: Buffer.from(state) },
        $setOnInsert: { workspaceKey, ...(projectId ? { projectId } : {}) },
      },
      { upsert: true }
    );
    console.log(`[yws] persisted "${workspaceKey}" (${state.length} B)`);
  } catch (err) {
    console.error('[yws] persistState error:', err.message);
  }
}

/** Active debounce timers for in-flight saves. */
const saveTimers  = new Map();
/**
 * Promises for saves triggered on last-disconnect.  New connections wait for
 * these to resolve before loading state, preventing stale reads on fast refresh.
 */
const pendingSaves = new Map();

function scheduleSave(workspaceKey, doc, projectId) {
  if (!MONGODB_URI) return;
  const existing = saveTimers.get(workspaceKey);
  if (existing) clearTimeout(existing);
  saveTimers.set(workspaceKey, setTimeout(() => {
    saveTimers.delete(workspaceKey);
    persistState(workspaceKey, doc, projectId);
  }, SAVE_DEBOUNCE_MS));
}

// ── Token validation ──────────────────────────────────────────────────────────

function isTokenValid(docName, token, exp) {
  if (!WS_SECRET) return true;   // dev mode — accept all
  if (!token || !exp)  return false;
  if (parseInt(exp, 10) < Date.now()) return false;
  const expected = createHmac('sha256', WS_SECRET).update(`${docName}:${exp}`).digest('hex');
  return expected === token;
}

// ── Yjs document store ────────────────────────────────────────────────────────

const messageSync      = 0;
const messageAwareness = 1;
const wsReadyStateOpen = 1;

/** In-memory map of active Y.Doc instances keyed by workspaceKey. */
const docs = new Map();

class WSSharedDoc extends Y.Doc {
  constructor(name, projectId) {
    super({ gc: true });
    this.name      = name;
    this.projectId = projectId ?? null;
    /** Map<WebSocket, Set<clientId>> — tracks awareness IDs per connection. */
    this.conns     = new Map();
    this.awareness = new awarenessProtocol.Awareness(this);
    this.awareness.setLocalState(null);

    this.awareness.on('update', ({ added, updated, removed }, conn) => {
      const changedIds = [...added, ...updated, ...removed];
      if (conn !== null) {
        const controlled = this.conns.get(conn);
        if (controlled) {
          added.forEach(id => controlled.add(id));
          removed.forEach(id => controlled.delete(id));
        }
      }
      const enc = encoding.createEncoder();
      encoding.writeVarUint(enc, messageAwareness);
      encoding.writeVarUint8Array(enc, awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedIds));
      const buf = encoding.toUint8Array(enc);
      this.conns.forEach((_, c) => send(this, c, buf));
    });

    this.on('update', update => {
      const enc = encoding.createEncoder();
      encoding.writeVarUint(enc, messageSync);
      syncProtocol.writeUpdate(enc, update);
      const buf = encoding.toUint8Array(enc);
      this.conns.forEach((_, c) => send(this, c, buf));
      scheduleSave(this.name, this, this.projectId);
    });
  }
}

function getOrCreateDoc(name, projectId) {
  if (!docs.has(name)) docs.set(name, new WSSharedDoc(name, projectId));
  return docs.get(name);
}

// ── Per-connection helpers ────────────────────────────────────────────────────

function send(doc, conn, data) {
  if (conn.readyState !== wsReadyStateOpen) { closeConn(doc, conn); return; }
  try {
    conn.send(data, {}, err => { if (err) closeConn(doc, conn); });
  } catch {
    closeConn(doc, conn);
  }
}

function closeConn(doc, conn) {
  if (!doc.conns.has(conn)) return;
  const controlledIds = doc.conns.get(conn);
  doc.conns.delete(conn);
  awarenessProtocol.removeAwarenessStates(doc.awareness, [...controlledIds], null);

  if (doc.conns.size === 0) {
    // Last connection closed — flush any debounced timer immediately and persist.
    const pending = saveTimers.get(doc.name);
    if (pending) { clearTimeout(pending); saveTimers.delete(doc.name); }

    const savePromise = persistState(doc.name, doc, doc.projectId).finally(() => {
      if (doc.conns.size === 0) {
        doc.destroy();
        docs.delete(doc.name);
      }
      if (pendingSaves.get(doc.name) === savePromise) pendingSaves.delete(doc.name);
    });
    pendingSaves.set(doc.name, savePromise);
  }
}

function messageListener(conn, doc, message) {
  try {
    const enc  = encoding.createEncoder();
    const dec  = decoding.createDecoder(new Uint8Array(message));
    const type = decoding.readVarUint(dec);

    if (type === messageSync) {
      encoding.writeVarUint(enc, messageSync);
      syncProtocol.readSyncMessage(dec, enc, doc, null);
      if (encoding.length(enc) > 1) send(doc, conn, encoding.toUint8Array(enc));
    } else if (type === messageAwareness) {
      awarenessProtocol.applyAwarenessUpdate(
        doc.awareness, decoding.readVarUint8Array(dec), conn
      );
    }
  } catch (err) {
    console.error('[yws] messageListener error:', err.message);
  }
}

// ── Heartbeat ─────────────────────────────────────────────────────────────────
//
// Browsers don't always send a proper close frame on navigation / crash.
// We ping every HEARTBEAT_INTERVAL_MS; if no pong arrives within
// HEARTBEAT_TIMEOUT_MS we terminate the socket.

function attachHeartbeat(conn, doc) {
  let alive = true;

  const pingTimer = setInterval(() => {
    if (!alive) {
      clearInterval(pingTimer);
      conn.terminate();
      closeConn(doc, conn);
      return;
    }
    alive = false;
    conn.ping();
  }, HEARTBEAT_INTERVAL_MS);

  conn.on('pong', () => { alive = true; });

  conn.on('close', () => clearInterval(pingTimer));
}

// ── Connection setup ──────────────────────────────────────────────────────────

async function setupWSConnection(conn, req) {
  conn.binaryType = 'arraybuffer';
  const url          = new URL(req.url, 'http://localhost');
  const workspaceKey = url.pathname.slice(1).split('?')[0];
  const projectId    = url.searchParams.get('projectId') ?? null;

  if (!workspaceKey) { conn.close(4000, 'missing workspaceKey'); return; }

  console.log(`[yws] connect workspaceKey="${workspaceKey}" projectId=${projectId}`);

  // Wait for any in-flight last-disconnect save to finish before reading state.
  // This prevents a racing new connection from seeing stale data.
  if (pendingSaves.has(workspaceKey)) {
    console.log(`[yws] awaiting pending save for "${workspaceKey}"`);
    await pendingSaves.get(workspaceKey).catch(() => {});
  }

  const doc = getOrCreateDoc(workspaceKey, projectId);

  // Load persisted state only for the first connection to this room.
  if (doc.conns.size === 0) {
    await loadDocState(workspaceKey, doc);
  }

  doc.conns.set(conn, new Set());

  attachHeartbeat(conn, doc);

  conn.on('message', msg => messageListener(conn, doc, msg));
  conn.on('close',   ()  => {
    console.log(`[yws] close  workspaceKey="${workspaceKey}"`);
    closeConn(doc, conn);
  });
  conn.on('error',   err => console.error(`[yws] conn error (${workspaceKey}):`, err.message));

  // ── Sync step 1 ──────────────────────────────────────────────────────────
  const syncEnc = encoding.createEncoder();
  encoding.writeVarUint(syncEnc, messageSync);
  syncProtocol.writeSyncStep1(syncEnc, doc);
  send(doc, conn, encoding.toUint8Array(syncEnc));

  // ── Current awareness snapshot ────────────────────────────────────────────
  const states = doc.awareness.getStates();
  if (states.size > 0) {
    const awEnc = encoding.createEncoder();
    encoding.writeVarUint(awEnc, messageAwareness);
    encoding.writeVarUint8Array(awEnc, awarenessProtocol.encodeAwarenessUpdate(doc.awareness, [...states.keys()]));
    send(doc, conn, encoding.toUint8Array(awEnc));
  }
}

// ── HTTP + WS server ──────────────────────────────────────────────────────────

const server = http.createServer((_, res) => { res.writeHead(200); res.end('nexusai yws'); });
const wss    = new ws.Server({ noServer: true });

wss.on('connection', setupWSConnection);

server.on('upgrade', (request, socket, head) => {
  const url          = new URL(request.url, 'http://localhost');
  const workspaceKey = url.pathname.slice(1).split('?')[0];
  const token        = url.searchParams.get('token');
  const exp          = url.searchParams.get('exp');

  if (!isTokenValid(workspaceKey, token, exp)) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, conn => wss.emit('connection', conn, request));
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
//
// On SIGTERM / SIGINT:
//   1. Stop accepting new WS connections
//   2. Wait for all in-flight saves (debounced + last-disconnect) to settle
//   3. Disconnect MongoDB and exit

async function shutdown(signal) {
  console.log(`[yws] ${signal} — shutting down gracefully`);

  // Stop accepting new connections
  wss.close();
  server.close();

  // Flush remaining debounced saves immediately
  for (const [key, timer] of saveTimers) {
    clearTimeout(timer);
    saveTimers.delete(key);
    const doc = docs.get(key);
    if (doc) await persistState(key, doc, doc.projectId).catch(() => {});
  }

  // Wait for last-disconnect saves that are still in flight
  await Promise.allSettled([...pendingSaves.values()]);

  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect().catch(() => {});
  }

  console.log('[yws] shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('uncaughtException', err => console.error('[yws] uncaughtException:', err));
process.on('unhandledRejection', reason => console.error('[yws] unhandledRejection:', reason));

server.listen(PORT, () => console.log(`[yws] listening on ws://localhost:${PORT}`));
