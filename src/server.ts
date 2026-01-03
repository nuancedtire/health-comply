// DO NOT DELETE THIS FILE!!!
// This file is a good smoke test to make sure the custom server entry is working
import handler from "@tanstack/react-start/server-entry";

console.log("[server-entry]: using custom server entry in 'src/server.ts'");

// Export named entrypoints for Cloudflare Workflows / Durable Objects
export { EvidenceIngestWorkflow } from "./core/workflows/evidence-ingest";

export default {
  fetch(request: Request, env: unknown, ctx: unknown) {
    return handler.fetch(request, {
      context: {
        // @ts-ignore - env/ctx are passed to server functions
        env,
        // @ts-ignore
        ctx,
        request, // Inject Request for manual cookie handling
        fromFetch: true,
      },
    });
  },
};
