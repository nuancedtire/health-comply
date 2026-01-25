export interface Env {
    DB: D1Database;
    AI: any;
    CHAT_AGENT: DurableObjectNamespace;
    EXA_API_KEY: string;
    CEREBRAS_API_KEY: string;
    EVIDENCE_INGEST_WORKFLOW: Workflow;
}
