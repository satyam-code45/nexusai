import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { docEmbeddingFunction } from "@/inngest/functions/docEmbedding";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [docEmbeddingFunction],
});
