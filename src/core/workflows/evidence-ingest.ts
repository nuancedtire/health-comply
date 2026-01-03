import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from 'cloudflare:workers';

type Env = {
    BUCKET: R2Bucket;
    AI: any;
    DB: D1Database;
};

type EvidenceIngestParams = {
    evidenceId: string;
};

export class EvidenceIngestWorkflow extends WorkflowEntrypoint<Env, EvidenceIngestParams> {
    async run(event: WorkflowEvent<EvidenceIngestParams>, step: WorkflowStep) {
        // Stub implementation for now
        await step.do('log start', async () => {
            console.log(`Starting evidence ingest for ${event.payload.evidenceId}`);
        });
    }
}
