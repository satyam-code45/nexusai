// Standalone Agenda worker — runs `startAgenda()` in a genuinely persistent
// process instead of an ephemeral Vercel serverless function invocation.
//
// Agenda's poller only works if the process stays alive continuously (it
// checks the `jobs` collection every `processEvery` ms, 5s by default). A
// Vercel function's event loop freezes the moment a response is sent, so a
// poller started inside a page render (as this app previously did, from
// `src/app/(private)/(admin)/workspace/layout.tsx`) may never get a chance
// to tick before the instance freezes — jobs get enqueued but never picked
// up. This script gives the poller a real home: deploy it as its own
// long-lived Render service (same pattern as scripts/yws-server.mjs).
import http from "http";
import { connectDB } from "../src/lib/mongodb/mongodb";
import { startAgenda, agenda } from "../src/lib/agenda/agenda";

const PORT = Number(process.env.AGENDA_WORKER_PORT ?? 3002);

async function main() {
  await connectDB();
  await startAgenda();
  console.log("✅ Agenda worker started — polling for jobs every 5s");
}

main().catch((err) => {
  console.error("❌ Fatal: agenda worker failed to start:", err);
  process.exit(1);
});

// Minimal health check server so Render can verify liveness.
const server = http.createServer((_, res) => {
  res.writeHead(200);
  res.end("nexusai agenda worker");
});
server.listen(PORT, () => console.log(`[agenda-worker] health check listening on :${PORT}`));

async function shutdown(signal: string) {
  console.log(`${signal} received, shutting down agenda worker`);
  server.close();
  await agenda.stop();
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
