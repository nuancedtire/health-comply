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
    RESEND_API_KEY?: string;
    E2E_TEST_MODE?: string;
    E2E_TEST_SECRET?: string;
    E2E_RESEND_MODE?: "configured" | "missing" | "failing";
}
