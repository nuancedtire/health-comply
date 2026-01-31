export interface Env {
    DB: D1Database;
    AI: any;
    R2: R2Bucket;
    CHAT_AGENT: DurableObjectNamespace;
    EXA_API_KEY: string;
    CEREBRAS_API_KEY: string;
    EVIDENCE_INGEST_WORKFLOW: Workflow;
    INSPECTION_PACK_WORKFLOW: Workflow;
    BETTER_AUTH_SECRET: string;
    BETTER_AUTH_URL?: string;
    BETTER_AUTH_TRUSTED_ORIGINS?: string;
}
