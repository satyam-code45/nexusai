"use client";

/**
 * useCollaboration
 *
 * Owns the full lifecycle of one collaborative editing session:
 *   1. Fetch DB content + persisted Yjs binary state in parallel with the WS token
 *   2. Create a fresh Y.Doc and pre-populate it with the saved Yjs state
 *   3. Create the WebsocketProvider (disconnected) and wire up awareness + status events
 *   4. Expose everything as stable React state — the caller just renders
 *
 * Pre-populating the ydoc (step 2) before the editor mounts is the key insight.
 * y-prosemirror's ySyncPlugin only writes an initial "empty paragraph" when the
 * Yjs XML fragment is empty.  If the fragment already has content, it skips that
 * write.  This eliminates the race where:
 *   mount (empty ydoc) → y-prosemirror writes ¶ → WS sync arrives with real content
 *   → Yjs merges both → stray empty ¶ prepended (accumulating on every reload).
 */

import { useState, useEffect, useRef, useCallback } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

const WS_URL = process.env.NEXT_PUBLIC_YWEBSOCKET_URL ?? "ws://localhost:1234";

// ── Public types ──────────────────────────────────────────────────────────────

export type WsStatus =
  | "idle"         // hook hasn't started yet
  | "fetching"     // fetching DB content + WS token
  | "connecting"   // provider created, waiting for first sync
  | "synced"       // WS sync complete (or ydoc was pre-populated — fully ready)
  | "offline";     // was synced, lost connection (reconnecting in background)

export interface CollaboratorState {
  clientId: number;
  user: { name: string; email: string; userId: string; color: string };
  appMouse?: { x: number; y: number };
  appCursor?: { x: number; y: number };
}

export interface InitialContent {
  html: string;
  tiptapJson: object | null;
  title: string;
}

export interface CollabSession {
  ydoc: Y.Doc;
  provider: WebsocketProvider;
  /** Monotonically increasing — use as the React key on the Editor */
  sessionId: number;
}

export interface UseCollaborationResult {
  session: CollabSession | null;
  wsStatus: WsStatus;
  initialContent: InitialContent;
  joinees: CollaboratorState[];
  /** Call from onMouseMove to broadcast position to collaborators */
  broadcastMouse: (x: number, y: number) => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

let _sessionCounter = 0;

export function useCollaboration(
  editorKey: string,
  projectId: string,
  userInfo: { name?: string | null; email?: string | null; userId?: string | null },
): UseCollaborationResult {
  const [session, setSession]           = useState<CollabSession | null>(null);
  const [wsStatus, setWsStatus]         = useState<WsStatus>("idle");
  const [initialContent, setInitialContent] = useState<InitialContent>({ html: "", tiptapJson: null, title: "" });
  const [joinees, setJoinees]           = useState<CollaboratorState[]>([]);

  // Stable ref for mouse broadcast (doesn't need state/re-render)
  const providerRef = useRef<WebsocketProvider | null>(null);
  // Stable random color per browser session
  const colorRef = useRef("#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0"));

  const broadcastMouse = useCallback((x: number, y: number) => {
    providerRef.current?.awareness.setLocalStateField("appMouse", { x, y });
  }, []);

  useEffect(() => {
    if (!editorKey) return;

    let dead = false;
    // Hold refs so the cleanup closure always has the latest instances even
    // when the async setup hasn't finished before the effect re-runs.
    let localDoc: Y.Doc | null = null;
    let localProvider: WebsocketProvider | null = null;

    setWsStatus("fetching");

    (async () => {
      // ── 1. Parallel fetch: DB content + WS token ──────────────────────────
      let content: InitialContent = { html: "", tiptapJson: null, title: "" };
      let yjsBytes: Uint8Array | null = null;
      let wsParams: Record<string, string> = { projectId };

      const [contentResult, tokenResult] = await Promise.allSettled([
        fetch(`/api/workspace/content?workspaceKey=${encodeURIComponent(editorKey)}`)
          .then(r => r.ok ? r.json() : null),
        fetch(`/api/workspace/ws-token?workspaceKey=${encodeURIComponent(editorKey)}`)
          .then(r => r.ok ? r.json() : null),
      ]);

      if (dead) return;

      if (contentResult.status === "fulfilled" && contentResult.value) {
        const data = contentResult.value;
        content = {
          html:        data.html        ?? "",
          tiptapJson:  data.tiptapJson  ?? null,
          title:       data.title       ?? "",
        };
        if (data.yjsStateB64) {
          try {
            yjsBytes = Uint8Array.from(atob(data.yjsStateB64), c => c.charCodeAt(0));
          } catch {
            // Corrupted base64 — ignore, editor falls back to tiptapJson
          }
        }
      }

      if (tokenResult.status === "fulfilled" && tokenResult.value?.token) {
        wsParams = { ...wsParams, token: tokenResult.value.token, exp: String(tokenResult.value.exp) };
      }

      setInitialContent(content);

      // ── 2. Create ydoc and pre-populate with saved Yjs state ──────────────
      // Pre-populating makes yFragment.length > 0 before `useEditor` runs,
      // so y-prosemirror's ySyncPlugin skips writing the initial empty paragraph.
      // This eliminates the stray-paragraph-on-reload bug entirely.
      const doc = new Y.Doc();
      localDoc = doc;

      if (yjsBytes && yjsBytes.length > 0) {
        try {
          Y.applyUpdate(doc, yjsBytes);
        } catch {
          // Corrupt yjsState — fall back to empty ydoc; editor uses tiptapJson
        }
      }

      if (dead) { doc.destroy(); return; }

      // ── 3. Create WebsocketProvider (deferred connect so listeners are set first) ──
      setWsStatus("connecting");

      const prov = new WebsocketProvider(WS_URL, editorKey, doc, {
        params:  wsParams,
        connect: false,       // explicitly connect after listeners are registered
      });
      localProvider = prov;
      providerRef.current = prov;

      // ── 4. Awareness ──────────────────────────────────────────────────────
      prov.awareness.setLocalState({
        user: {
          name:   userInfo.name   ?? "Anonymous",
          email:  userInfo.email  ?? "",
          userId: userInfo.userId ?? "",
          color:  colorRef.current,
        },
      });

      const handleAwarenessChange = () => {
        if (dead) return;
        const states: CollaboratorState[] = [];
        prov.awareness.getStates().forEach((state: any, clientId: number) => {
          if (state?.user) states.push({ clientId, ...state } as CollaboratorState);
        });
        setJoinees(states);
      };
      prov.awareness.on("change", handleAwarenessChange);

      // ── 5. WS status transitions ───────────────────────────────────────────
      prov.on("status", ({ status }: { status: string }) => {
        if (dead) return;
        if (status === "disconnected") setWsStatus("offline");
        // "connecting" is handled by the sync event below
      });

      prov.on("sync", (synced: boolean) => {
        if (dead) return;
        setWsStatus(synced ? "synced" : "connecting");
      });

      // ── 6. Expose session + connect ───────────────────────────────────────
      // ydoc already has pre-populated content — mark as synced immediately
      // so the UI doesn't show a "connecting" state when content is already available.
      const alreadyHasContent = doc.getXmlFragment("default").length > 0;
      if (alreadyHasContent) setWsStatus("synced");

      const sid = ++_sessionCounter;
      setSession({ ydoc: doc, provider: prov, sessionId: sid });

      if (!dead) prov.connect();
    })();

    return () => {
      dead = true;

      // Clean up provider
      if (localProvider) {
        localProvider.awareness.setLocalState(null);
        localProvider.disconnect();
        localProvider.destroy();
        localProvider = null;
        providerRef.current = null;
      }

      // Destroy ydoc
      if (localDoc) { localDoc.destroy(); localDoc = null; }

      setSession(null);
      setWsStatus("idle");
      setJoinees([]);
    };
  // userInfo fields are primitives — listed explicitly to avoid object identity churn
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorKey, projectId, userInfo.name, userInfo.email, userInfo.userId]);

  return { session, wsStatus, initialContent, joinees, broadcastMouse };
}
