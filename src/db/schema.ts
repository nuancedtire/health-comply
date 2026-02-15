import {
    sqliteTable,
    text,
    integer,
    primaryKey,
    unique,
    index,
} from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ===== SEEDED TAXONOMY (IMMUTABLE) =====

export const cqcKeyQuestions = sqliteTable('cqc_key_questions', {
    id: text('id').primaryKey(),           // e.g., 'safe', 'effective'
    title: text('title').notNull(),
    displayOrder: integer('display_order').notNull(),
});

export const cqcQualityStatements = sqliteTable('cqc_quality_statements', {
    id: text('id').primaryKey(),           // e.g., 'safe.learning_culture'
    keyQuestionId: text('key_question_id').notNull().references(() => cqcKeyQuestions.id),
    code: text('code').notNull(),          // slug: 'learning-culture'
    title: text('title').notNull(),
    cqcUrl: text('cqc_url'),
    displayOrder: integer('display_order').notNull(),
    active: integer('active').notNull().default(1),
});

export const evidenceCategories = sqliteTable('evidence_categories', {
    id: text('id').primaryKey(),           // 'peoples_experience', 'staff_feedback', etc.
    title: text('title').notNull(),
});

// ===== MULTI-TENANT CORE =====

export const tenants = sqliteTable('tenants', {
    id: text('id').primaryKey(),           // 't_<random>'
    name: text('name').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const sites = sqliteTable('sites', {
    id: text('id').primaryKey(),           // 's_<random>'
    tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    address: text('address'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => [
    index('idx_sites_tenant_id').on(table.tenantId),
]);

export const users = sqliteTable('user', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: integer('email_verified').notNull().default(0),
    image: text('image'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
    // Custom fields for multi-tenancy
    tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
    isSystemAdmin: integer('is_system_admin', { mode: 'boolean' }).notNull().default(false),
});

// Roles are now static config in src/lib/config/roles.ts
// Deleted roles table


export const sessions = sqliteTable('session', {
    id: text('id').primaryKey(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    token: text('token').notNull().unique(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id').notNull().references(() => users.id),
});

export const accounts = sqliteTable('account', {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id').notNull().references(() => users.id),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
    refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
    scope: text('scope'),
    password: text('password'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const verifications = sqliteTable('verification', {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }),
    updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

export const userRoles = sqliteTable('user_roles', {
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull(), // Static role ID from ROLES config
    siteId: text('site_id').references(() => sites.id, { onDelete: 'cascade' }),  // optional: site-scoped role
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => [
    primaryKey({ columns: [table.userId, table.role, table.siteId || 'userId'] }), // Composite PK
]);

export const invitations = sqliteTable('invitations', {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    siteId: text('site_id').references(() => sites.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    token: text('token').notNull().unique(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    status: text('status').notNull().default('pending'), // 'pending', 'accepted'
    invitedBy: text('invited_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => [
    index('idx_invitations_email').on(table.email),
    index('idx_invitations_tenant').on(table.tenantId),
]);

// ===== QS WORKSPACE =====

export const qsOwners = sqliteTable('qs_owners', {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().references(() => tenants.id),
    siteId: text('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
    qsId: text('qs_id').notNull().references(() => cqcQualityStatements.id),
    ownerUserId: text('owner_user_id').notNull().references(() => users.id),
    reviewCadenceDays: integer('review_cadence_days'),
    status: text('status').notNull().default('assigned'), // 'assigned', 'in_progress', 'reviewed'
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => [
    unique('uq_qs_owners').on(table.tenantId, table.siteId, table.qsId),
    index('idx_qs_owners_site').on(table.tenantId, table.siteId),
]);

export const localControls = sqliteTable('local_controls', {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    siteId: text('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
    qsId: text('qs_id').notNull().references(() => cqcQualityStatements.id),
    title: text('title').notNull(),
    description: text('description'),
    evidenceHint: text('evidence_hint'), // AI or manual hint for what to upload

    // Scheduling
    frequencyType: text('frequency_type').notNull().default('recurring'), // 'recurring' | 'one_off' | 'ad_hoc'
    frequencyDays: integer('frequency_days'), // e.g. 30, 90, 365

    // Status / Timeline
    lastEvidenceAt: integer('last_evidence_at', { mode: 'timestamp' }), // Date of the "event" (not upload)
    nextDueAt: integer('next_due_at', { mode: 'timestamp' }), // lastEvidenceAt + frequencyDays

    // Assignments
    defaultReviewerRole: text('default_reviewer_role'), // e.g., 'Practice Manager', 'Nurse Lead'
    fallbackReviewerRole: text('fallback_reviewer_role'),

    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),

    // Control Pack & Enhanced Evidence
    evidenceExamples: text('evidence_examples'), // JSON: { good: string[], bad: string[] }
    cqcMythbusterUrl: text('cqc_mythbuster_url'), // External URL to CQC guidance
}, (table) => [
    index('idx_local_controls_qs').on(table.tenantId, table.siteId, table.qsId),
]);

// ===== EVIDENCE =====

export const evidenceItems = sqliteTable('evidence_items', {
    id: text('id').primaryKey(),           // 'ev_<random>'
    tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    siteId: text('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),

    // Links
    qsId: text('qs_id').notNull().references(() => cqcQualityStatements.id),
    localControlId: text('local_control_id').references(() => localControls.id, { onDelete: 'set null' }), // The specific bucket
    evidenceCategoryId: text('evidence_category_id').references(() => evidenceCategories.id), // Can be null if tied to control? Keeping it for now.

    title: text('title').notNull(),
    r2Key: text('r2_key').notNull(),      // e.g., 't/{tenantId}/s/{siteId}/qs/{qsId}/evidence/...'
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),

    uploadedBy: text('uploaded_by').notNull().references(() => users.id),
    uploadedAt: integer('uploaded_at', { mode: 'timestamp' }).notNull(),

    // Time Machine Dates
    evidenceDate: integer('evidence_date', { mode: 'timestamp' }), // When it actually happened
    validUntil: integer('valid_until', { mode: 'timestamp' }),     // When it expires

    // Review Workflow
    status: text('status').notNull().default('pending_review'), // 'draft', 'pending_review', 'approved', 'rejected', 'archived'

    // Classification & Analysis
    classificationResult: text('classification_result', { mode: 'json' }), // JSON: { type: 'match'|'suggestion'|'irrelevant', confidence: number, ... }
    suggestedControlId: text('suggested_control_id').references(() => localControls.id, { onDelete: 'set null' }),
    
    // Manual Review Details
    reviewNotes: text('review_notes'),
    reviewedBy: text('reviewed_by').references(() => users.id),
    reviewedAt: integer('reviewed_at', { mode: 'timestamp' }),

    summary: text('summary'),
    textContent: text('text_content'), // Extracted text/markdown from the file
    aiConfidence: integer('ai_confidence'), // Store as integer percentage (0-100)
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),

}, (table) => [
    index('idx_evidence_items_qs').on(table.tenantId, table.siteId, table.qsId),
    index('idx_evidence_items_date').on(table.uploadedAt),
]);

export const evidenceLinks = sqliteTable('evidence_links', {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    fromType: text('from_type').notNull(),  // 'policy', 'action', 'local_control'
    fromId: text('from_id').notNull(),
    evidenceId: text('evidence_id').notNull().references(() => evidenceItems.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => [
    unique('uq_evidence_links').on(table.tenantId, table.fromType, table.fromId, table.evidenceId),
]);

// ===== ACTIONS / GAPS =====

export const actions = sqliteTable('actions', {
    id: text('id').primaryKey(),           // 'ac_<random>'
    tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    siteId: text('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
    qsId: text('qs_id').notNull().references(() => cqcQualityStatements.id),
    title: text('title').notNull(),
    description: text('description'),
    ownerUserId: text('owner_user_id').notNull().references(() => users.id),
    dueAt: integer('due_at', { mode: 'timestamp' }),
    status: text('status').notNull().default('open'), // 'open', 'in_progress', 'closed'
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => [
    index('idx_actions_qs').on(table.tenantId, table.siteId, table.qsId),
    index('idx_actions_owner').on(table.ownerUserId),
]);

export const actionApprovals = sqliteTable('action_approvals', {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    actionId: text('action_id').notNull().references(() => actions.id, { onDelete: 'cascade' }),
    approvedBy: text('approved_by').notNull().references(() => users.id),
    approvedAt: integer('approved_at', { mode: 'timestamp' }).notNull(),
    comment: text('comment'),
    closureEvidenceId: text('closure_evidence_id').references(() => evidenceItems.id),
}, (table) => [
    index('idx_action_approvals_action').on(table.actionId),
]);

// ===== POLICIES =====

export const policies = sqliteTable('policies', {
    id: text('id').primaryKey(),           // 'po_<random>'
    tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    siteId: text('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
    qsId: text('qs_id').notNull().references(() => cqcQualityStatements.id),
    title: text('title').notNull(),
    status: text('status').notNull().default('draft'), // 'draft', 'published', 'archived'
    ownerUserId: text('owner_user_id').notNull().references(() => users.id),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => [
    index('idx_policies_qs').on(table.tenantId, table.siteId, table.qsId),
]);

export const policyVersions = sqliteTable('policy_versions', {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    policyId: text('policy_id').notNull().references(() => policies.id, { onDelete: 'cascade' }),
    versionNo: integer('version_no').notNull(),
    r2Key: text('r2_key').notNull(),       // e.g., 't/{tenantId}/s/{siteId}/qs/{qsId}/policies/...'
    createdBy: text('created_by').notNull().references(() => users.id),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    summary: text('summary'),
}, (table) => [
    unique('uq_policy_versions').on(table.policyId, table.versionNo),
]);

export const policyApprovals = sqliteTable('policy_approvals', {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    policyVersionId: text('policy_version_id').notNull().references(() => policyVersions.id, { onDelete: 'cascade' }),
    approvedBy: text('approved_by').notNull().references(() => users.id),
    approvedAt: integer('approved_at', { mode: 'timestamp' }).notNull(),
    comment: text('comment'),
}, (table) => [
    index('idx_policy_approvals_version').on(table.policyVersionId),
]);

export const policyReadAttestations = sqliteTable('policy_read_attestations', {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    policyVersionId: text('policy_version_id').notNull().references(() => policyVersions.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    readAt: integer('read_at', { mode: 'timestamp' }).notNull(),
}, (table) => [
    unique('uq_read_attestations').on(table.policyVersionId, table.userId),
]);

// ===== INSPECTION PACKS =====

export const inspectionPacks = sqliteTable('inspection_packs', {
    id: text('id').primaryKey(),           // 'pk_<random>'
    tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    siteId: text('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
    scopeType: text('scope_type').notNull(), // 'full_site', 'quality_statements'
    scopeData: text('scope_data'),         // JSON array of QS IDs or null for full
    createdBy: text('created_by').notNull().references(() => users.id),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    status: text('status').notNull().default('building'), // 'building', 'ready', 'error'
    executiveSummary: text('executive_summary'), // AI-generated executive summary
    keyQuestionSummaries: text('key_question_summaries'), // JSON object with KQ ID -> summary mapping
}, (table) => [
    index('idx_inspection_packs_site').on(table.tenantId, table.siteId),
]);

export const inspectionPackOutputs = sqliteTable('inspection_pack_outputs', {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    packId: text('pack_id').notNull().references(() => inspectionPacks.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),          // 'zip', 'pdf', 'tree'
    r2Key: text('r2_key').notNull(),       // e.g., 't/{tenantId}/packs/{packId}/zip/...'
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => [
    unique('uq_pack_outputs').on(table.packId, table.kind),
]);

// ===== AUDIT LOG =====

export const auditLog = sqliteTable('audit_log', {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    actorUserId: text('actor_user_id').references(() => users.id),
    action: text('action').notNull(),      // 'created', 'updated', 'deleted', 'approved', etc.
    entityType: text('entity_type').notNull(), // 'evidence_item', 'policy', 'action', etc.
    entityId: text('entity_id').notNull(),
    jsonDiff: text('json_diff'),           // JSON representation of changes
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => [
    index('idx_audit_log_tenant').on(table.tenantId),
    index('idx_audit_log_entity').on(table.entityType, table.entityId),
    index('idx_audit_log_created').on(table.createdAt),
]);

// ===== DRIZZLE RELATIONS =====

export const tenantRelations = relations(tenants, ({ many }) => ({
    sites: many(sites),
    users: many(users),
}));

export const siteRelations = relations(sites, ({ one, many }) => ({
    tenant: one(tenants, { fields: [sites.tenantId], references: [tenants.id] }),
    users: many(users),
    evidence: many(evidenceItems),
}));

export const userRelations = relations(users, ({ one, many }) => ({
    tenant: one(tenants, { fields: [users.tenantId], references: [tenants.id] }),
    roles: many(userRoles),
    evidence: many(evidenceItems),
}));

export const evidenceItemRelations = relations(evidenceItems, ({ one, many }) => ({
    site: one(sites, { fields: [evidenceItems.siteId], references: [sites.id] }),
    category: one(evidenceCategories, { fields: [evidenceItems.evidenceCategoryId], references: [evidenceCategories.id] }),
    qs: one(cqcQualityStatements, { fields: [evidenceItems.qsId], references: [cqcQualityStatements.id] }),
    localControl: one(localControls, { fields: [evidenceItems.localControlId], references: [localControls.id] }),
    uploadedByUser: one(users, { fields: [evidenceItems.uploadedBy], references: [users.id] }),
    links: many(evidenceLinks),
}));

export const policyRelations = relations(policies, ({ one, many }) => ({
    site: one(sites, { fields: [policies.siteId], references: [sites.id] }),
    qs: one(cqcQualityStatements, { fields: [policies.qsId], references: [cqcQualityStatements.id] }),
    owner: one(users, { fields: [policies.ownerUserId], references: [users.id] }),
    versions: many(policyVersions),
}));

export const actionRelations = relations(actions, ({ one, many }) => ({
    site: one(sites, { fields: [actions.siteId], references: [sites.id] }),
    qs: one(cqcQualityStatements, { fields: [actions.qsId], references: [cqcQualityStatements.id] }),
    owner: one(users, { fields: [actions.ownerUserId], references: [users.id] }),
    approvals: many(actionApprovals),
}));

// Role relations deleted


export const invitationRelations = relations(invitations, ({ one }) => ({
    tenant: one(tenants, { fields: [invitations.tenantId], references: [tenants.id] }),
    site: one(sites, { fields: [invitations.siteId], references: [sites.id] }),
    invitedByUser: one(users, { fields: [invitations.invitedBy], references: [users.id] }),
}));

export const localControlRelations = relations(localControls, ({ one }) => ({
    qs: one(cqcQualityStatements, { fields: [localControls.qsId], references: [cqcQualityStatements.id] }),
    site: one(sites, { fields: [localControls.siteId], references: [sites.id] }),
}));

export const cqcQualityStatementRelations = relations(cqcQualityStatements, ({ one }) => ({
    keyQuestion: one(cqcKeyQuestions, {
        fields: [cqcQualityStatements.keyQuestionId],
        references: [cqcKeyQuestions.id],
    }),
}));

export const cqcKeyQuestionRelations = relations(cqcKeyQuestions, ({ many }) => ({
    qualityStatements: many(cqcQualityStatements),
}));

export const inspectionPackRelations = relations(inspectionPacks, ({ one, many }) => ({
    tenant: one(tenants, { fields: [inspectionPacks.tenantId], references: [tenants.id] }),
    site: one(sites, { fields: [inspectionPacks.siteId], references: [sites.id] }),
    createdByUser: one(users, { fields: [inspectionPacks.createdBy], references: [users.id] }),
    outputs: many(inspectionPackOutputs),
}));

export const inspectionPackOutputRelations = relations(inspectionPackOutputs, ({ one }) => ({
    tenant: one(tenants, { fields: [inspectionPackOutputs.tenantId], references: [tenants.id] }),
    pack: one(inspectionPacks, { fields: [inspectionPackOutputs.packId], references: [inspectionPacks.id] }),
}));
