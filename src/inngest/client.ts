import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "nexusai",
  // Without this, the SDK defaults to "cloud mode" and refuses to serve
  // /api/inngest (500s with "no signing key found") unless INNGEST_SIGNING_KEY
  // is set — which it never is locally, since `npx inngest-cli dev` needs no keys.
  isDev: process.env.NODE_ENV !== "production",
});
