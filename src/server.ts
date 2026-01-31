// DO NOT DELETE THIS FILE!!!
// This file is a good smoke test to make sure the custom server entry is working
import handler from "@tanstack/react-start/server-entry";

import { Env } from "./utils/env";

console.log("[server-entry]: using custom server entry in 'src/server.ts'");

import { EvidenceIngestWorkflow } from "./core/workflows/evidence-ingest";
import { InspectionPackWorkflow } from "./core/workflows/inspection-pack-workflow";

import { ChatAgent } from "./agent/ChatAgent";

export { EvidenceIngestWorkflow, InspectionPackWorkflow, ChatAgent };

export default {
  fetch(request: Request, env: Env) {
    return handler.fetch(request, {
      context: {
        env,
        request,
        fromFetch: true,
      } as any,
    });
  },
};
