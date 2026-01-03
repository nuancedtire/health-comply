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
    createdAt: integer('created_at').notNull(),
});

export const sites = sqliteTable('sites', {
    id: text('id').primaryKey(),           // 's_<random>'
    tenantId: text('tenant_id').notNull().references(() => tenants.id),
    name: text('name').notNull(),
    address: text('address'),
    createdAt: integer('created_at').notNull(),
}, (table) => [
    index('idx_sites_tenant_id').on(table.tenantId),
]);

export const users = sqliteTable('users', {
    id: text('id').primaryKey(),           // 'u_<random>'
    tenantId: text('tenant_id').notNull().references(() => tenants.id),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    name: text('name'),
    createdAt: integer('created_at').notNull(),
    lastLoginAt: integer('last_login_at'),
}, (table) => [
    unique('uq_users_tenant_email').on(table.tenantId, table.email),
    index('idx_users_tenant_id').on(table.tenantId),
]);

export const roles = sqliteTable('roles', {
    id: text('id').primaryKey(),           // 'r_pm', 'r_gp', etc.
    tenantId: text('tenant_id').notNull().references(() => tenants.id),
    name: text('name').notNull(),          // 'Practice Manager', 'GP Partner', etc.
}, (table) => [
    index('idx_roles_tenant_id').on(table.tenantId),
]);

export const userRoles = sqliteTable('user_roles', {
    userId: text('user_id').notNull().references(() => users.id),
    roleId: text('role_id').notNull().references(() => roles.id),
    siteId: text('site_id').references(() => sites.id),  // optional: site-scoped role
    createdAt: integer('created_at').notNull(),
}, (table) => [
    primaryKey({ columns: [table.userId, table.roleId, table.siteId || 'userId'] }), // Fallback for siteId being null in PK if needed, but strict SQL requires non-null PK parts usually. Drizzle handles composite PKs well.
    index('idx_user_roles_user_id').on(table.userId),
    index('idx_user_roles_role_id').on(table.roleId),
]);

// ===== QS WORKSPACE =====

export const qsOwners = sqliteTable('qs_owners', {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().references(() => tenants.id),
    siteId: text('site_id').notNull().references(() => sites.id),
    qsId: text('qs_id').notNull().references(() => cqcQualityStatements.id),
    ownerUserId: text('owner_user_id').notNull().references(() => users.id),
    reviewCadenceDays: integer('review_cadence_days'),
    status: text('status').notNull().default('assigned'), // 'assigned', 'in_progress', 'reviewed'
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
}, (table) => [
    unique('uq_qs_owners').on(table.tenantId, table.siteId, table.qsId),
    index('idx_qs_owners_site').on(table.tenantId, table.siteId),
]);

export const localControls = sqliteTable('local_controls', {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().references(() => tenants.id),
    siteId: text('site_id').notNull().references(() => sites.id),
    qsId: text('qs_id').notNull().references(() => cqcQualityStatements.id),
    title: text('title').notNull(),
    description: text('description'),
    cadenceDays: integer('cadence_days'),
    active: integer('active').notNull().default(1),
    createdAt: integer('created_at').notNull(),
}, (table) => [
    index('idx_local_controls_qs').on(table.tenantId, table.siteId, table.qsId),
]);

// ===== EVIDENCE =====

export const evidenceItems = sqliteTable('evidence_items', {
    id: text('id').primaryKey(),           // 'ev_<random>'
    tenantId: text('tenant_id').notNull().references(() => tenants.id),
    siteId: text('site_id').notNull().references(() => sites.id),
    qsId: text('qs_id').notNull().references(() => cqcQualityStatements.id),
    evidenceCategoryId: text('evidence_category_id').notNull().references(() => evidenceCategories.id),
    title: text('title').notNull(),
    r2Key: text('r2_key').notNull(),      // e.g., 't/{tenantId}/s/{siteId}/qs/{qsId}/evidence/...'
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    uploadedBy: text('uploaded_by').notNull().references(() => users.id),
    uploadedAt: integer('uploaded_at').notNull(),
    reviewDueAt: integer('review_due_at'),
    status: text('status').notNull().default('draft'), // 'draft', 'approved', 'expired'
    createdAt: integer('created_at').notNull(),
}, (table) => [
    index('idx_evidence_items_qs').on(table.tenantId, table.siteId, table.qsId),
    index('idx_evidence_items_date').on(table.uploadedAt),
]);

export const evidenceLinks = sqliteTable('evidence_links', {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().references(() => tenants.id),
    fromType: text('from_type').notNull(),  // 'policy', 'action', 'local_control'
    fromId: text('from_id').notNull(),
    evidenceId: text('evidence_id').notNull().references(() => evidenceItems.id),
    createdAt: integer('created_at').notNull(),
}, (table) => [
    unique('uq_evidence_links').on(table.tenantId, table.fromType, table.fromId, table.evidenceId),
]);

// ===== ACTIONS / GAPS =====

export const actions = sqliteTable('actions', {
    id: text('id').primaryKey(),           // 'ac_<random>'
    tenantId: text('tenant_id').notNull().references(() => tenants.id),
    siteId: text('site_id').notNull().references(() => sites.id),
    qsId: text('qs_id').notNull().references(() => cqcQualityStatements.id),
    title: text('title').notNull(),
    description: text('description'),
    ownerUserId: text('owner_user_id').notNull().references(() => users.id),
    dueAt: integer('due_at'),
    status: text('status').notNull().default('open'), // 'open', 'in_progress', 'closed'
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
}, (table) => [
    index('idx_actions_qs').on(table.tenantId, table.siteId, table.qsId),
    index('idx_actions_owner').on(table.ownerUserId),
]);

export const actionApprovals = sqliteTable('action_approvals', {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().references(() => tenants.id),
    actionId: text('action_id').notNull().references(() => actions.id),
    approvedBy: text('approved_by').notNull().references(() => users.id),
    approvedAt: integer('approved_at').notNull(),
    comment: text('comment'),
    closureEvidenceId: text('closure_evidence_id').references(() => evidenceItems.id),
}, (table) => [
    index('idx_action_approvals_action').on(table.actionId),
]);

// ===== POLICIES =====

export const policies = sqliteTable('policies', {
    id: text('id').primaryKey(),           // 'po_<random>'
    tenantId: text('tenant_id').notNull().references(() => tenants.id),
    siteId: text('site_id').notNull().references(() => sites.id),
    qsId: text('qs_id').notNull().references(() => cqcQualityStatements.id),
    title: text('title').notNull(),
    status: text('status').notNull().default('draft'), // 'draft', 'published', 'archived'
    ownerUserId: text('owner_user_id').notNull().references(() => users.id),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
}, (table) => [
    index('idx_policies_qs').on(table.tenantId, table.siteId, table.qsId),
]);

export const policyVersions = sqliteTable('policy_versions', {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().references(() => tenants.id),
    policyId: text('policy_id').notNull().references(() => policies.id),
    versionNo: integer('version_no').notNull(),
    r2Key: text('r2_key').notNull(),       // e.g., 't/{tenantId}/s/{siteId}/qs/{qsId}/policies/...'
    createdBy: text('created_by').notNull().references(() => users.id),
    createdAt: integer('created_at').notNull(),
    summary: text('summary'),
}, (table) => [
    unique('uq_policy_versions').on(table.policyId, table.versionNo),
    index('idx_policy_versions_policy').on(table.policyId),
]);

export const policyApprovals = sqliteTable('policy_approvals', {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().references(() => tenants.id),
    policyVersionId: text('policy_version_id').notNull().references(() => policyVersions.id),
    approvedBy: text('approved_by').notNull().references(() => users.id),
    approvedAt: integer('approved_at').notNull(),
    comment: text('comment'),
}, (table) => [
    index('idx_policy_approvals_version').on(table.policyVersionId),
]);

export const policyReadAttestations = sqliteTable('policy_read_attestations', {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().references(() => tenants.id),
    policyVersionId: text('policy_version_id').notNull().references(() => policyVersions.id),
    userId: text('user_id').notNull().references(() => users.id),
    readAt: integer('read_at').notNull(),
}, (table) => [
    unique('uq_read_attestations').on(table.policyVersionId, table.userId),
]);

// ===== INSPECTION PACKS =====

export const inspectionPacks = sqliteTable('inspection_packs', {
    id: text('id').primaryKey(),           // 'pk_<random>'
    tenantId: text('tenant_id').notNull().references(() => tenants.id),
    siteId: text('site_id').notNull().references(() => sites.id),
    scopeType: text('scope_type').notNull(), // 'full_site', 'quality_statements'
    scopeData: text('scope_data'),         // JSON array of QS IDs or null for full
    createdBy: text('created_by').notNull().references(() => users.id),
    createdAt: integer('created_at').notNull(),
    status: text('status').notNull().default('building'), // 'building', 'ready', 'error'
}, (table) => [
    index('idx_inspection_packs_site').on(table.tenantId, table.siteId),
]);

export const inspectionPackOutputs = sqliteTable('inspection_pack_outputs', {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().references(() => tenants.id),
    packId: text('pack_id').notNull().references(() => inspectionPacks.id),
    kind: text('kind').notNull(),          // 'zip', 'pdf', 'tree'
    r2Key: text('r2_key').notNull(),       // e.g., 't/{tenantId}/packs/{packId}/zip/...'
    createdAt: integer('created_at').notNull(),
}, (table) => [
    unique('uq_pack_outputs').on(table.packId, table.kind),
    index('idx_pack_outputs_pack').on(table.packId),
]);

// ===== AUDIT LOG =====

export const auditLog = sqliteTable('audit_log', {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().references(() => tenants.id),
    actorUserId: text('actor_user_id').references(() => users.id),
    action: text('action').notNull(),      // 'created', 'updated', 'deleted', 'approved', etc.
    entityType: text('entity_type').notNull(), // 'evidence_item', 'policy', 'action', etc.
    entityId: text('entity_id').notNull(),
    jsonDiff: text('json_diff'),           // JSON representation of changes
    createdAt: integer('created_at').notNull(),
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
