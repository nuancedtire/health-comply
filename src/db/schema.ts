import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// --- Core Entities ---

export const practices = sqliteTable("practices", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
});

export const roles = sqliteTable("roles", {
    id: text("id").primaryKey(),
    practiceId: text("practice_id").references(() => practices.id),
    name: text("name").notNull(), // 'practice_manager', 'clinical_lead', 'staff'
    description: text("description"),
    isDefault: integer("is_default", { mode: "boolean" }).default(false),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
});

export const users = sqliteTable("users", {
    id: text("id").primaryKey(),
    practiceId: text("practice_id").references(() => practices.id),
    email: text("email").notNull(),
    fullName: text("full_name").notNull(),
    roleId: text("role_id").references(() => roles.id),
    passwordHash: text("password_hash"), // Basic auth for MVP
    isActive: integer("is_active", { mode: "boolean" }).default(true),
    lastLogin: integer("last_login", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
});

export const permissions = sqliteTable("permissions", {
    id: text("id").primaryKey(),
    name: text("name").notNull(), // e.g., "upload_evidence"
    resource: text("resource").notNull(), // e.g., "evidence"
    action: text("action").notNull(), // e.g., "create"
});

export const rolePermissions = sqliteTable("role_permissions", {
    id: text("id").primaryKey(),
    roleId: text("role_id").references(() => roles.id),
    permissionId: text("permission_id").references(() => permissions.id),
    grantedAt: integer("granted_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
});

// --- CQC Framework ---

export const keyQuestions = sqliteTable("key_questions", {
    id: text("id").primaryKey(),
    number: integer("number").notNull(), // 1-5
    shortName: text("short_name").notNull(), // 'safe', 'effective', etc.
    fullQuestion: text("full_question").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
});

export const qualityStatements = sqliteTable("quality_statements", {
    id: text("id").primaryKey(),
    keyQuestionId: text("key_question_id").references(() => keyQuestions.id),
    statementNumber: integer("statement_number").notNull(),
    statementText: text("statement_text").notNull(),
    description: text("description"),
    regulationLinks: text("regulation_links"), // JSON string
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
});

export const evidenceCategories = sqliteTable("evidence_categories", {
    id: text("id").primaryKey(),
    name: text("name").notNull(), // 'peoples_experience', etc.
    description: text("description"),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
});

// --- Evidence Locker ---

export const evidenceItems = sqliteTable("evidence_items", {
    id: text("id").primaryKey(),
    practiceId: text("practice_id").references(() => practices.id),
    title: text("title").notNull(),
    description: text("description"),
    ownerUserId: text("owner_user_id").references(() => users.id),
    evidenceDate: integer("evidence_date", { mode: "timestamp" }).notNull(),
    reviewDueDate: integer("review_due_date", { mode: "timestamp" }),
    status: text("status").notNull(), // 'draft', 'active', 'archived'
    confidentialityLevel: text("confidentiality_level").default("internal"),
    evidenceType: text("evidence_type"), // 'policy', 'audit_report', etc.
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
    createdBy: text("created_by").references(() => users.id),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
});

export const evidenceVersions = sqliteTable("evidence_versions", {
    id: text("id").primaryKey(),
    evidenceItemId: text("evidence_item_id").references(() => evidenceItems.id),
    versionNumber: integer("version_number").notNull(),
    sourceType: text("source_type").notNull(), // 'upload', 'external_link'
    r2Bucket: text("r2_bucket"),
    r2ObjectKey: text("r2_object_key"),
    externalUrl: text("external_url"),
    fileName: text("file_name"),
    fileSize: integer("file_size"),
    mimeType: text("mime_type"),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
});

export const evidenceItemTags = sqliteTable("evidence_item_tags", {
    id: text("id").primaryKey(),
    evidenceItemId: text("evidence_item_id").references(() => evidenceItems.id),
    qualityStatementId: text("quality_statement_id").references(() => qualityStatements.id),
    evidenceCategoryId: text("evidence_category_id").references(() => evidenceCategories.id),
    freeTags: text("free_tags"), // JSON array or comma-separated
    whyItSupports: text("why_it_supports"),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
    createdBy: text("created_by").references(() => users.id),
});

// --- Readiness Workspace ---

export const statementAssessments = sqliteTable("statement_assessments", {
    id: text("id").primaryKey(),
    qualityStatementId: text("quality_statement_id").references(() => qualityStatements.id),
    practiceId: text("practice_id").references(() => practices.id),
    assessmentText: text("assessment_text"),
    assessmentScore: text("assessment_score"), // RAG or 1-4
    assessedBy: text("assessed_by").references(() => users.id),
    assessedAt: integer("assessed_at", { mode: "timestamp" }),
    isLatest: integer("is_latest", { mode: "boolean" }).default(true),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
});

export const gaps = sqliteTable("gaps", {
    id: text("id").primaryKey(),
    qualityStatementId: text("quality_statement_id").references(() => qualityStatements.id),
    practiceId: text("practice_id").references(() => practices.id),
    title: text("title").notNull(),
    description: text("description"),
    severity: text("severity"), // 'low', 'medium', 'high', 'critical'
    status: text("status").notNull(), // 'open', 'in_progress', 'closed'
    createdBy: text("created_by").references(() => users.id),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
});

export const actions = sqliteTable("actions", {
    id: text("id").primaryKey(),
    gapId: text("gap_id").references(() => gaps.id),
    qualityStatementId: text("quality_statement_id").references(() => qualityStatements.id),
    practiceId: text("practice_id").references(() => practices.id),
    title: text("title").notNull(),
    description: text("description"),
    ownerUserId: text("owner_user_id").references(() => users.id),
    dueDate: integer("due_date", { mode: "timestamp" }),
    status: text("status").notNull(), // 'open', 'due', 'overdue', 'completed'
    priority: text("priority"),
    completedAt: integer("completed_at", { mode: "timestamp" }),
    completedBy: text("completed_by").references(() => users.id),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
});

export const actionEvidenceLinks = sqliteTable("action_evidence_links", {
    id: text("id").primaryKey(),
    actionId: text("action_id").references(() => actions.id),
    evidenceItemId: text("evidence_item_id").references(() => evidenceItems.id),
    linkedAt: integer("linked_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
    linkedBy: text("linked_by").references(() => users.id),
});

// --- AI Features ---

export const aiEvidenceSuggestions = sqliteTable("ai_evidence_suggestions", {
    id: text("id").primaryKey(),
    evidenceItemId: text("evidence_item_id").references(() => evidenceItems.id),
    suggestedType: text("suggested_type"),
    suggestedStatements: text("suggested_statements"), // JSON
    suggestedCategory: text("suggested_category"),
    suggestedSummary: text("suggested_summary"),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
});

// --- Policy Management ---

export const policyLibrary = sqliteTable("policy_library", {
    id: text("id").primaryKey(),
    practiceId: text("practice_id").references(() => practices.id),
    topic: text("topic").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
});

export const policyVersions = sqliteTable("policy_versions", {
    id: text("id").primaryKey(),
    policyId: text("policy_id").references(() => policyLibrary.id),
    versionNumber: integer("version_number").notNull(),
    content: text("content"),
    status: text("status").notNull(),
    publishedAt: integer("published_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
});

export const policyAcknowledgements = sqliteTable("policy_acknowledgements", {
    id: text("id").primaryKey(),
    policyVersionId: text("policy_version_id").references(() => policyVersions.id),
    userId: text("user_id").references(() => users.id),
    acknowledgedAt: integer("acknowledged_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
});

// --- Audit Trail ---

export const auditTrail = sqliteTable("audit_trail", {
    id: text("id").primaryKey(),
    practiceId: text("practice_id").references(() => practices.id),
    userId: text("user_id").references(() => users.id),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    event: text("event").notNull(),
    changeType: text("change_type"),
    beforeState: text("before_state"), // JSON
    afterState: text("after_state"), // JSON
    timestamp: integer("timestamp", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
});
