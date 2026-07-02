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
| Background jobs | Agenda v6 with `@agendajs/mongo-backend` — embeds uploaded docs into Pinecone |
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
cd "Collaborative-ai workspace -nextjs16"
npm install

# 2. Configure environment
cp .env.example .env.local
# Fill in all values — see .env.example for details

# 3. Run the app (two processes)
npm run dev                        # Next.js dev server → http://localhost:3000
node scripts/yws-server.mjs       # y-websocket collab server → ws://localhost:1234
```

> **y-websocket note:** `npx y-websocket` no longer works with v3 (client-only package). Use `node scripts/yws-server.mjs` instead.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js with Turbopack (hot reload) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint check |
| `node scripts/yws-server.mjs` | Start y-websocket collaboration server |
| `npx tsc --noEmit` | TypeScript type check without emit |

---

## Environment Variables

See `.env.example` for the complete list with descriptions. Required variables:

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `NEXTAUTH_URL` | App base URL (must match OAuth redirect) |
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
  lib/
    agenda/               Agenda job scheduler (docEmbedding job)
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

## Known Limitations / Development Notes

1. **File storage** is Cloudinary (`src/lib/uploadToCloudinary.ts`) — no local disk persistence to worry about.
2. **STM/chat-history** are stored per-user in MongoDB (`ShortTermMemorySchema`, `ChatHistorySchema`).
3. **Google Drive picker** requires the Google Drive API to be enabled in your Google Cloud project and the picker API key to have the correct domain restrictions.
4. **Agenda jobs** run in the Next.js server process (started in `instrumentation.ts`). In production you would want a dedicated worker process.
5. **y-websocket** needs to run as a separate long-lived process. See the Getting Started section for the correct launch command; `npx y-websocket` does not work with v3.
6. **`npm overrides` for MongoDB**: An earlier `overrides: { mongodb }` in `package.json` was causing Agenda to hang. The `overrides` field has been removed — do not re-add it.
