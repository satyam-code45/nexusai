# NexusAI

A full-stack collaborative AI workspace. Users create *projects*, add source material (PDF/file uploads, YouTube links, web links, pasted text, Google Drive files), then:

- Co-edit rich-text documents in real time with live cursors (Tiptap v3 + Yjs CRDT + y-websocket)
- Chat with a multi-agent AI (LangGraph) that does RAG across all uploaded sources, streamed back over SSE
- Generate AI reports per-source or across multiple sources: summaries, study guides, mind maps
- AI-assisted editor: ghost-text autocomplete, rephrase, translate (streamed typewriter-style)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript 6 |
| Auth | NextAuth.js v5 — Google OAuth only. JWT with MongoDB user `_id` embedded in session |
| Database | MongoDB 6 via Mongoose 9 for app data; Pinecone for vector embeddings |
| Background jobs | Inngest — durable, serverless-native background functions (no long-lived poller needed); embeds uploaded docs into Pinecone |
| Real-time collab | Yjs + y-websocket v3. Awareness protocol carries live cursors + mouse positions |
| Editor | Tiptap v3 + `@tiptap/extension-collaboration` (Yjs-backed). 3 custom extensions: Autocomplete, Rephrase, Translate |
| AI | LangChain + LangGraph. OpenAI for chat, embeddings (text-embedding-3-small), memory compression, image reading, and audio overview. Exa for the researcher agent's live web search |
| State | Redux Toolkit (projects, documents/sources, chat, editor UI) |
| Styling | Tailwind CSS v4, shadcn/ui (Radix UI primitives) |
| Package manager | npm |

---

## Getting Started

```bash
# 1. Clone and install
git clone <repo-url>
cd nexusai
npm install

# 2. Configure environment
cp .env.example .env.local
# Fill in all values — see .env.example for details

# 3. Run everything
npm run dev
```

`npm run dev` starts three processes concurrently (see `package.json`):
- **Next.js** dev server → http://localhost:3000
- **y-websocket** collab server (`scripts/yws-server.mjs`) → ws://localhost:1234
- **Inngest dev server** (`npx inngest-cli@latest dev`) → http://localhost:8288 — a local dashboard where you can watch background job (`doc-embedding`) runs live. No account or API keys needed for local dev.

> **y-websocket note:** `npx y-websocket` no longer works with v3 (client-only package). The bundled `scripts/yws-server.mjs` replaces it — that's what `npm run dev` (or `npm run ws`) starts.

> **Port conflicts:** if port 3000 is already in use by another project, run `next dev -p <port>` and pass the matching `-u http://localhost:<port>/api/inngest` to the Inngest CLI. Google OAuth's redirect URI is tied to whatever port `NEXTAUTH_URL`/`NEXT_PUBLIC_APP_URL` point to, so keep them in sync.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js (Turbopack, hot reload) + y-websocket server + Inngest dev server, concurrently |
| `npm run dev:next` | Start only the Next.js dev server |
| `npm run ws` | Start only the y-websocket collaboration server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint check |
| `npx tsc --noEmit` | TypeScript type check without emit |

---

## Environment Variables

See `.env.example` for the complete list with descriptions. Required variables:

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `NEXT_PUBLIC_APP_URL` | App base URL — client-side API calls prefix this value, so an unset value breaks every fetch in production. Baked in at build time; changing it needs a redeploy. |
| `NEXTAUTH_URL` | App base URL (must match OAuth redirect) — same value as `NEXT_PUBLIC_APP_URL` |
| `NEXTAUTH_SECRET` | NextAuth JWT signing secret |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth credentials |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Client-side Google OAuth (Drive picker) |
| `NEXT_PUBLIC_DEVELOPPER_KEY` | Google API key for Drive picker widget |
| `OPENAI_API_KEY` | OpenAI (chat, embeddings, memory compression, image reading, audio overview) |
| `EXA_API_KEY` | Exa web search for the researcher agent |
| `PINECONE_API_KEY` / `PINECONE_INDEX` | Pinecone vector store |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Cloudinary (file/media uploads) |
| `NEXT_PUBLIC_YWEBSOCKET_URL` | y-websocket server URL (default: `ws://localhost:1234`) |
| `WS_SECRET` | HMAC-SHA256 signing secret for WS token auth. Leave unset in dev to skip auth |
| `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` | Inngest production credentials (from app.inngest.com or its Vercel integration). Not needed locally — `npx inngest-cli dev` needs no keys |

---

## App Structure

Next.js App Router route groups:

```
src/app/
  (public)/
    (auth)/
      login/          ← Google sign-in page
      my/             ← personal editor sandbox (no project context)
  (private)/
    (admin)/
      workspace/      ← project list (redirects to /login if no session)
      workspace/[projectId]/  ← three-panel workspace shell
      test-editor/    ← Tiptap dev sandbox
  api/
    auth/[...nextauth]/
    addsource/{text,weblink,youtube,uploads,upload-drive-files}/
    agent/{stream,chat-history}/
    documents/{save,single-doc,autocomplete,rephrase,translate}/
    inngest/           ← serves registered Inngest functions (doc-embedding)
    projects/, projects/[id]/, projects/docs/
    reports/{summary,study-guide,mindmap}/
    reports/{summary,studyguide,mindmap}-from-multiple-docs/
    upload-image/
```

---

## Project Structure

```
src/
  app/                    Next.js App Router pages and API routes
  components/
    addSource/            Source upload modals (file, YouTube, web, text, Drive)
    chatbox/              AI chat panel (SSE stream reader)
    collaboration/        BlinkingCursor, presence awareness
    editor/               Tiptap editor + toolbar + custom extensions
    leftpanel/            Project nav, source list, report list
    middlepanel/          PDF viewer + editor wrapper + mouse presence
    project/              Project cards, create/search modals
  inngest/
    client.ts             Inngest client (isDev flag keyed off NODE_ENV)
    functions/            docEmbedding.ts — chunk + embed job, triggered by "doc/embedding.requested"
  lib/
    api/                  Client-side fetch helpers
    helper/               Utility functions (title generation, chunking)
    llm/                  LLM singleton factory (OpenAI)
    mongodb/              Connection helper, withAuth middleware
    multi-doc-agent/      LangGraph agent graph definitions
    pipelines/            multi-vector.ts — chunk + embed into Pinecone
    tools/                LangChain tool definitions (memory, search, file I/O)
  models/                 Mongoose schemas
  services/               Repository-pattern DB access layer
  store/                  Redux Toolkit slices
public/
  uploads/                Uploaded files stored on disk
  agent/stm.json          Short-term memory for AI agent
  chat-history/           Persisted chat transcripts
scripts/
  yws-server.mjs          y-websocket collaboration server
```

---

## Data Models

Mongoose schemas in `src/models/`:

| Model | Fields |
|---|---|
| **User** | Google profile, access_token |
| **Project** | name, emoji, userId |
| **NexusPage** | workspaceKey (Yjs room name), tiptapJson, html, yjsState (binary CRDT), title, projectId |
| **UserDocument** | rich-text Tiptap JSON content, title, projectId, userId |
| **KnowledgeBase** | fileName, source_type (upload/weblink/youtube/text/drive), summary, studyGuide, mindMap |
| **Source** | Generated multi-doc report (summary/study guide/mindmap) referencing multiple KnowledgeBase docs |

`NexusPage.yjsState` is the binary Yjs CRDT state written by the WS server on disconnect and read on connect. Pinecone holds vector embeddings (via OpenAI text-embedding-3-small) used for RAG. Uploaded files are stored in Cloudinary, not on local disk.

---

## AI Agent Architecture

A chat request to `/api/agent/stream` is handled by a LangGraph graph:

```
MemoryAgent (entry)
  ├─ reads short-term memory (STM JSON file)
  ├─ reads chat history
  └─ routes to ResearcherAgent if retrieval needed
       └─ PlannerAgent → MultiQueryAgent → LibrarianAgent → RetrieverAgent
                                              (Pinecone vector search)
```

- **STM** (`public/agent/stm.json`): Rolling context window. Summarised and pushed to Pinecone (LTM) when token budget is exceeded.
- **Chat history** (`public/chat-history/chat-history.json`): Persisted per-session.
- **Streaming**: SSE with two event types — `thinking` (chain-of-thought) and `message` (final answer).

Agent source lives in `src/lib/multi-doc-agent/`, tools in `src/lib/tools/`, embedding pipeline in `src/lib/pipelines/`.

---

## Real-Time Collaboration

Tiptap is wired to a Yjs `Y.Doc` via `@tiptap/extension-collaboration`, synced through a `WebsocketProvider` pointed at the `y-websocket` server. Presence (remote cursors and mouse positions) rides on Yjs's awareness protocol.

`scripts/yws-server.mjs` is a production-grade custom server with:
- **HMAC-SHA256 token auth** — Next.js `/api/ws-token` issues a short-lived signed token; the WS server validates it on the HTTP upgrade before the WebSocket is accepted
- **Heartbeat** — 30-second ping/pong; connections that miss a pong are terminated (max 60s dead detection)
- **pendingSaves race condition fix** — new connections wait for any in-flight last-disconnect save to complete before loading document state from MongoDB
- **Pre-populated ydoc** — client applies the saved Yjs binary from `NexusPage.yjsState` before the editor mounts, preventing content doubling on reload
- **Graceful shutdown** — SIGTERM/SIGINT flush all debounced saves and await persistence before the process exits
- **Debounced persistence** — document state is saved to MongoDB 1500ms after the last update; flushed immediately on last-disconnect and on shutdown

Three custom Tiptap extensions add AI features:
- **Autocomplete** — ghost-text suggestions on a typing pause
- **Rephrase** — stream a typewriter-style replacement of the selected text
- **Translate** — same as Rephrase, targeting a chosen language

---

## Services Layer

Singleton classes in `src/services/` expose userId/projectId-scoped MongoDB queries, providing IDOR protection by design:

- `UserService`, `ProjectService`, `UserDocumentService`, `KnowLedgeBaseService`, `SourceService`

---

## Security Properties

- All API routes wrapped with `withAuth` — requires a valid NextAuth session and opens the DB connection before the handler runs
- All MongoDB queries filter by `userId` (and `projectId` where applicable) — no cross-user data access
- Ownership check on every mutation: `session.user.id !== userId` returns 403
- `fs.promises.writeFile` (promisified) used for file writes — no callback race conditions

---

## Deployment

Three pieces deploy independently:

| Piece | Where | Why |
|---|---|---|
| Next.js app | Vercel | Standard serverless deploy — `output: "standalone"` in `next.config.ts` |
| Background jobs (`doc-embedding`) | Inngest | Invokes `/api/inngest` over HTTP per step — no long-lived process needed, so it works natively on Vercel serverless |
| y-websocket server | Render (or any always-on host) | Needs a continuously-alive event loop, which Vercel serverless can't provide. Build with `Dockerfile.ws` |

Steps:
1. **Vercel** — set every var from `.env.example` in the project's env settings (production scope), plus `NEXT_PUBLIC_YWEBSOCKET_URL` pointing at the deployed WS server (`wss://...`) and `WS_SECRET` matching it.
2. **Inngest** — create a production app at [app.inngest.com](https://app.inngest.com), ideally via its Vercel integration (auto-sets `INNGEST_SIGNING_KEY`/`INNGEST_EVENT_KEY` and auto-syncs on every deploy). Otherwise, set those two keys manually and sync `https://<domain>/api/inngest` from the Inngest dashboard after each deploy.
3. **Render** — new Web Service from this repo, Dockerfile path `./Dockerfile.ws`. Env vars: `MONGODB_URI`, `WS_SECRET` (same value as Vercel's). Use a paid tier — free tier spins down on idle, which breaks real-time collab reconnects.
4. **Google OAuth** — add `https://<domain>/api/auth/callback/google` to the Authorized redirect URIs in Google Cloud Console.

---

## Known Limitations / Development Notes

1. **File storage** is Cloudinary (`src/lib/uploadToCloudinary.ts`) — no local disk persistence to worry about.
2. **STM/chat-history** are stored per-user in MongoDB (`ShortTermMemorySchema`, `ChatHistorySchema`).
3. **Google Drive picker** requires the Google Drive API to be enabled in your Google Cloud project and the picker API key to have the correct domain restrictions.
4. **y-websocket** needs to run as a separate long-lived process — it's the one piece that can't be Vercel serverless. See Deployment below. `npx y-websocket` does not work with v3; use `scripts/yws-server.mjs`.
5. **Background embedding** (`doc-embedding`) previously ran on Agenda (MongoDB-polling job queue), which requires a continuously-alive event loop that Vercel serverless functions can't provide — jobs got enqueued but never picked up in production. This was replaced with Inngest, which invokes `/api/inngest` over HTTP per step and needs no long-lived process. See `src/inngest/functions/docEmbedding.ts`.
6. Threading a document's `fileUrl` through to the embedding job (not just its extracted text) matters: chunk metadata's `originalUrl` field is what the retriever's "scope to selected source" filter matches against. Omitting it makes chat retrieval silently return nothing for that source even though embedding reports success.
