# CQC Compliance Management System
## Complete Technical Development Reference

**Document Version:** 1.0  
**Last Updated:** January 2026  
**Target Audience:** Development Team  
**Status:** MVP Specification

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Product Overview](#product-overview)
3. [Architecture & Technology Stack](#architecture--technology-stack)
4. [Data Model & Database Schema](#data-model--database-schema)
5. [R2 Storage & AI Search Layout](#r2-storage--ai-search-layout)
6. [Authentication & Multi-Tenancy](#authentication--multi-tenancy)
7. [Core Workflows & Background Jobs](#core-workflows--background-jobs)
8. [MVP Feature Modules](#mvp-feature-modules)
9. [AI Copilots (3 Buttons)](#ai-copilots-3-buttons)
10. [Incremental Build Plan](#incremental-build-plan)
11. [Setup & Configuration](#setup--configuration)
12. [Code Examples & Patterns](#code-examples--patterns)
13. [Testing & Reset Procedures](#testing--reset-procedures)

---

## Executive Summary

**CQC Compliance Management System** is a multi-tenant SaaS platform designed to help GP practices prepare for and maintain compliance with the **Care Quality Commission (CQC) single assessment framework**. The system is navigated **by quality statements** (seeded from CQC's canonical taxonomy) and stores evidence, policies, actions, and inspection artefacts in a structured, audit-logged manner.

**Technology Choices:**
- **Web Framework:** TanStack Start (SSR) deployed on Cloudflare Workers
- **Database:** Cloudflare D1 (SQLite) with Drizzle ORM for schema management
- **File Storage:** Cloudflare R2 with deterministic prefix scheme for multi-tenant isolation
- **Search & RAG:** Cloudflare AI Search for metadata-filtered retrieval (tenant-scoped)
- **Background Jobs:** Cloudflare Workflows for durable, multi-step pipelines (indexing, reminders, pack generation)
- **Authentication:** Better Auth (email/password with PBKDF2), integrated with Drizzle adapter and D1.

**MVP Goals:**
- Seed CQC quality statements (34 total, across 5 key questions).
- Continuous evidence tracking (upload, tag, preview, review dates).
- Policy versioning + approvals + staff attestations.
- Actions/gaps with single-person approval + closure sign-off.
- Inspection pack generation (ZIP folder tree + PDF report + deterministic tree output).
- 3 AI copilots: (1) Auto-triage upload, (2) Draft narrative, (3) Gap finder.
- Background jobs for reminders and pack generation.

**Non-MVP:**
- Patient-identifiable data (none stored).
- SSO/MFA (email/password only for MVP).
- Extended custom quality statements (seeded set is immutable; local controls added beneath).

---

## Product Overview

### Purpose & Scope

GPs face ongoing pressure to evidence compliance with CQC's assessment framework (Safe, Effective, Caring, Responsive, Well-led). This system:
- **Continuously collects evidence** (policies, audits, minutes, training records, complaints) and tags each to a quality statement and evidence category.
- **Tracks remediation** (actions) and sign-offs so leadership knows the status of known gaps.
- **Generates inspection packs** (narrative + evidence index) on demand, so inspection readiness is measurable and not scrambled together at the last moment.
- **Powers decision-making** with AI-assisted tagging, narrative drafting, and gap detection.

### Key Concepts

1. **Quality Statement:** A CQC-defined statement under one of the five key questions (Safe, Effective, Caring, Responsive, Well-led). Examples: "Learning culture", "Safeguarding", "Infection prevention and control", "Shared direction and culture". These are **seeded from a curated JSON** and immutable in the app.

2. **Evidence Item:** A file (PDF, DOCX, image, CSV) or reference (meeting minutes, audit log entry) that demonstrates compliance with a quality statement. Tagged with:
   - Quality statement ID
   - Evidence category (People's experience, Staff feedback, Partner feedback, Observation, Processes, Outcomes)
   - Review date
   - Status (draft, approved, expired)

3. **Evidence Category:** One of CQC's six evidence categories (full set) that contextualises the type of evidence.

4. **Control:** A governance activity (training schedule, audit plan, meeting cadence) that generates evidence over time. Tracked in the app.

5. **Action/Gap:** A remediation task created when evidence is insufficient or overdue. Has an owner, due date, closure evidence, and single approval.

6. **Policy:** A documented procedure (PDF or uploaded DOCX). Versioned, requires approval before publish, and staff must "read & understood" after publication.

7. **Inspection Pack:** A single output (per site/date range/QS set) containing a narrative + evidence index + links, exportable as ZIP, PDF, or tree.

---

## Architecture & Technology Stack

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      Frontend (Browser)                         │
│  TanStack Start + TanStack Router/Query/Table/Form (TypeScript) │
└────────────────────────────┬──────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Cloudflare Workers (Edge)                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  API Routes / TanStack Start Server Functions          │   │
│  │  - Auth (Better Auth: email/pass, session management) │   │
│  │  - Tenancy enforcement + RBAC                         │   │
│  │  - R2 presigned URL generation                        │   │
│  │  - Webhook handlers (AI Search callbacks, etc.)       │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────┬──────────────────────────────────────┬──────┘
                     │                                      │
         ┌───────────▼──────────┐          ┌─────────────────▼─────┐
         │  Cloudflare D1       │          │  Cloudflare R2        │
         │  (SQLite relational  │          │  (Object storage)     │
         │   data with Drizzle  │          │  - Policies, PDFs     │
         │   schema + relations)│          │  - Evidence files     │
         │  - Tenants, Users    │          │  - Generated packs    │
         │  - QS/controls/      │          │  - Policy versions    │
         │    evidence/actions  │          │  with folder scoping  │
         │  - Policies/approvals│          │  for multitenancy     │
         │  - Audit log         │          └──────────────────────┘
         └──────────────────────┘                    ▲
                     ▲                               │
                     │                          Presigned URLs
         ┌───────────┴─────────────────────────┐   (put/get)
         │                                     │
    ┌────▼──────┐                     ┌───────▼────────┐
    │  Drizzle  │                     │ Cloudflare AI  │
    │   ORM     │                     │  Search (RAG)  │
    │ (queries) │                     │ - Metadata     │
    │           │                     │   filtering    │
    │           │                     │ - Folder scope │
    │           │                     │ - Context      │
    └───────────┘                     │   metadata     │
                                      └────────────────┘
                                             ▲
                                             │
                              ┌──────────────┘
                              │
                    ┌─────────▼─────────┐
                    │ Cloudflare        │
                    │  Workflows        │
                    │ - Evidence ingest │
                    │ - Review reminders│
                    │ - Pack generation │
                    │ - AI pipelines    │
                    └───────────────────┘
```

### Technology Justification

| Component | Choice | Reason |
|-----------|--------|--------|
| **Web Framework** | TanStack Start | Full-stack SSR, integrated server functions, Cloudflare Workers support out of box |
| **Database** | D1 + Drizzle | Serverless relational DB, native Cloudflare binding, type-safe migrations + queries |
| **File Storage** | R2 | S3-compatible, serverless, same region as compute, presigned URLs for direct browser uploads |
| **Search/RAG** | AI Search | Native integration with R2, metadata filtering for multitenancy, no separate vector DB to manage |
| **Background Jobs** | Cloudflare Workflows | Durable multi-step execution, retries, scheduling/sleeps, human-in-the-loop patterns, native error handling |
| **Auth** | Better Auth | Robust, modular auth with built-in Drizzle adapter and email/password support. |

### Deployment Model

- **Development:** Wrangler local emulation (D1 local file, R2 RAM storage, Workflows in-memory).
- **Production:** Cloudflare Workers account (D1 production DB, R2 bucket, Workflows durable execution).
- **CLI:** Wrangler v3+ for migrations, deployments, and local development.

---

## Data Model & Database Schema

### Conceptual Model

```
Tenant
├─ Site(s)
│  └─ User(s) + Role(s)
│     ├─ Evidence Item(s) → QS + Evidence Category
│     ├─ Policy(ies) → Versions → Approvals + Attestations
│     ├─ Action(s) → Approvals + Closure Evidence
│     └─ QS Owner(s) + Local Control(s)
└─ Audit Log (all changes)
```

### Drizzle Schema Definition

Create `src/db/schema.ts` with the following tables (Drizzle ORM definitions):

```typescript
import { sql } from 'drizzle-orm';
import { 
  sqliteTable, 
  text, 
  integer, 
  primaryKey,
  unique,
  index,
  foreignKey
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
});

export const sessions = sqliteTable('session', {
    id: text('id').primaryKey(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    token: text('token').notNull().unique(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
});

export const accounts = sqliteTable('account', {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
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

export const roles = sqliteTable('roles', {
  id: text('id').primaryKey(),           // 'r_pm', 'r_gp', etc.
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),          // 'Practice Manager', 'GP Partner', etc.
}, (table) => [
  index('idx_roles_tenant_id').on(table.tenantId),
]);

export const userRoles = sqliteTable('user_roles', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: text('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  siteId: text('site_id').references(() => sites.id, { onDelete: 'cascade' }),  // optional: site-scoped role
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.roleId, table.siteId || 'null'] }),
  index('idx_user_roles_user_id').on(table.userId),
  index('idx_user_roles_role_id').on(table.roleId),
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
  cadenceDays: integer('cadence_days'),
  active: integer('active').notNull().default(1),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => [
  index('idx_local_controls_qs').on(table.tenantId, table.siteId, table.qsId),
]);

// ===== EVIDENCE =====

export const evidenceItems = sqliteTable('evidence_items', {
  id: text('id').primaryKey(),           // 'ev_<random>'
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  siteId: text('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  qsId: text('qs_id').notNull().references(() => cqcQualityStatements.id),
  evidenceCategoryId: text('evidence_category_id').notNull().references(() => evidenceCategories.id),
  title: text('title').notNull(),
  r2Key: text('r2_key').notNull(),      // e.g., 't/{tenantId}/s/{siteId}/qs/{qsId}/evidence/...'
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  uploadedBy: text('uploaded_by').notNull().references(() => users.id),
  uploadedAt: integer('uploaded_at', { mode: 'timestamp' }).notNull(),
  reviewDueAt: integer('review_due_at', { mode: 'timestamp' }),
  status: text('status').notNull().default('draft'), // 'draft', 'approved', 'expired'
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
  index('idx_policy_versions_policy').on(table.policyId),
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
  index('idx_pack_outputs_pack').on(table.packId),
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
```

### Key Design Notes

- **Tenant isolation:** Every table has `tenantId`, enforced at the application and query level.
- **Multi-site:** A tenant can have multiple sites; most data is scoped to (tenantId + siteId).
- **CQC seed:** `cqc_key_questions` and `cqc_quality_statements` are seeded once and immutable; marked `active = 0` if deprecated (never deleted).
- **Evidence categories:** Seeded from CQC's full set of six categories; every evidence item must reference one.
- **Timestamps:** All `createdAt`, `uploadedAt`, `approvedAt`, etc. are Unix seconds (SQLite `integer`); use `strftime('%s', 'now')` in SQL.
- **Nullable fields:** `siteId` in `user_roles` allows global roles (not site-specific); `closureEvidenceId` in `action_approvals` is set when action closed.
- **Indexes:** Foreign keys + common filters (tenant, site, QS, date range) are indexed for query performance.

---

## R2 Storage & AI Search Layout

### R2 Key Prefix Scheme

All files are stored under a **deterministic tenant/site/topic hierarchy** to enable:
1. **Multitenancy isolation:** No cross-tenant access by accident.
2. **AI Search folder filtering:** Metadata filters on folder prefix restrict retrieval scope.
3. **Inspection pack generation:** Deterministic tree structure for reproducible outputs.

**Prefix pattern:**
```
t/{tenantId}/s/{siteId}/{resourceType}/{resourceData}
```

**Concrete examples:**

Evidence:
```
t/t_demo/s/s_demo/qs/safe.learning_culture/evidence/peoples_experience/2026-01/ev_abc123.pdf
t/t_demo/s/s_demo/qs/safe.safeguarding/evidence/observation/2026-01/ev_def456.jpg
```

Policies (published):
```
t/t_demo/s/s_demo/qs/effective.assessing_needs/policies/published/po_123/v/1/policy_v1.pdf
t/t_demo/s/s_demo/qs/effective.assessing_needs/policies/published/po_123/v/2/policy_v2.pdf
```

Policies (drafts):
```
t/t_demo/s/s_demo/qs/effective.assessing_needs/policies/drafts/po_123/v/0/policy_draft.docx
```

Inspection packs:
```
t/t_demo/packs/pk_xyz/zip/pk_xyz_2026-01-03.zip
t/t_demo/packs/pk_xyz/pdf/pk_xyz_2026-01-03.pdf
t/t_demo/packs/pk_xyz/tree/safe/learning_culture/ev_abc123.pdf
```

### R2 Upload + Metadata

When a file is uploaded via presigned URL:
1. **Workers generates presigned URL** with explicit R2 key path (tenant/site/QS-scoped).
2. **Browser POSTs directly to R2** (no Workers intermediary).
3. **Workflow triggered** (via Workers webhook) to:
   - Record metadata in D1 (`evidence_items` or `policy_versions`).
   - Attach **custom metadata** to the R2 object (headers like `x-amz-meta-context`).
   - Trigger AI Search indexing.

**Example R2 object metadata (custom):**
```json
{
  "context": {
    "tenantId": "t_demo",
    "siteId": "s_demo",
    "qsId": "safe.learning_culture",
    "evidenceCategory": "peoples_experience",
    "resourceType": "evidence",
    "status": "approved",
    "indexed": true
  }
}
```

### AI Search Filtering (Multitenancy)

Cloudflare AI Search supports metadata filtering with folder-based scoping and custom context metadata. [web:54]

**Query pattern: strict tenant + site isolation**
```typescript
// Cloudflare AI Search query with folder + metadata filter
const tenantPrefix = `t/${tenantId}/s/${siteId}/`;

const filter = {
  type: "compound",
  operator: "and",
  filters: [
    { type: "comparison", key: "folder", operator: "gt",  value: tenantPrefix },
    { type: "comparison", key: "folder", operator: "lte", value: tenantPrefix + "z" },
    // Optional: filter by status
    { type: "comparison", key: "status", operator: "eq", value: "approved" },
  ],
};

const results = await env.AI_SEARCH.query({
  query: userQuestion,
  filter,
  topK: 8,
  returnMetadata: ["context", "folder"],  // return metadata in response
});

// results[i].text = chunk content
// results[i].metadata.context = custom metadata attached at upload
// results[i].metadata.folder = R2 folder key
```

**Key guardrail:** Always enforce `tenantId` + `siteId` folder filters in **every RAG query** before any LLM generation. [web:54][web:55]

---

## Authentication & Multi-Tenancy

### Session & Auth Flow

**Better Auth (Email/Password)**

We use `better-auth` with the Drizzle adapter. This handles password hashing, session management, and database interactions automatically.

**Configuration (`src/lib/auth.ts`):**

```typescript
export const createAuth = (db: any) => betterAuth({
    database: drizzleAdapter(db, {
        provider: "sqlite",
        schema: { ...schema, user: schema.users, session: schema.sessions, account: schema.accounts, verification: schema.verifications }
    }),
    emailAndPassword: {
        enabled: true,
    },
});
```

**Client-Side Usage (`src/lib/auth-client.ts`):**

```typescript
import { createAuthClient } from "better-auth/react"
export const authClient = createAuthClient({
    baseURL: "http://localhost:3000", // Needs env var in prod
})
```

**Middleware Enforcement:**

```typescript
// src/core/middleware/auth-middleware.ts
export const authMiddleware = createMiddleware().server(async ({ next, context, request }) => {
    const env = context.env;
    let session: { user: any; session: any } | null = null;

    if (env && env.DB) {
        const db = drizzle(env.DB, { schema });
        const auth = createAuth(db);
        session = await auth.api.getSession({ headers: request.headers });
    }

    return next({
        context: {
            user: session?.user || null,
            session: session?.session || null,
        }
    });
});
```

### Onboarding & Day 1 Flow

1.  **First User Signup**:
    *   User signs up via `/signup`.
    *   System creates a `User` record.
    *   **Trigger**: Create an initial `Tenant` (e.g., "My Practice") and make this user the **Admin**.
    *   User is effectively the "Owner" of this new Tenant.

2.  **Invite Flow**:
    *   The Admin can now invite other users (GPs, Nurses) via email.
    *   Invited users are added to the *existing* `Tenant`.

3.  **Site Creation**:
    *   The Admin creates `Sites` (e.g., "Main Surgery", "Branch Clinic").
    *   The Admin assigns `UserRoles` to link users to specific sites (e.g., "Dr. Smith is a GP at Main Surgery").

### Tenancy Enforcement

**Every API endpoint / server function must:**

1. Extract `tenantId` from the session cookie.
2. Load the user's record from D1 and verify `user.tenantId === tenantId`.
3. Load the user's roles and verify permission for the action.
4. Apply `tenantId` filter to all queries (e.g., `WHERE tenantId = ?`).

**Example server function (TanStack Start):**
```typescript
// src/routes/api/evidence.ts
import { createServerFn } from '@tanstack/start';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '~/db/schema';
import { eq, and } from 'drizzle-orm';

export const getEvidenceByQS = createServerFn({
  method: 'POST',
})
  .validator((data: unknown) => {
    // validate input
    return data as { qsId: string };
  })
  .handler(async (ctx, { qsId }) => {
    const env = ctx.env as Env;
    const { user, session } = ctx.context; // Accessed via context from middleware

    // Enforce tenancy
    const tenantId = session.tenantId;
    const siteId = session.siteId;

    const db = drizzle(env.DB, { schema });

    // Query with tenant + site scoping
    const items = await db
      .select()
      .from(schema.evidenceItems)
      .where(
        and(
          eq(schema.evidenceItems.tenantId, tenantId),
          eq(schema.evidenceItems.siteId, siteId),
          eq(schema.evidenceItems.qsId, qsId)
        )
      );

    return items;
  });
```

### RBAC (Roles)

**Roles (seeded per tenant):**
- `Practice Manager` — full access to all QS/evidence/policies
- `GP Partner` — QS ownership, evidence review
- `Nurse Lead` — evidence & policy review (limited)
- `Safeguarding Lead` — Safeguarding QS ownership
- `Admin` — user management, system config

**Permission checks:**

Implement a helper function that checks role + action:
```typescript
async function canApprovePolicy(
  db: D1Database,
  tenantId: string,
  userId: string,
  policyId: string
): Promise<boolean> {
  // Check if user has 'Practice Manager' or 'Admin' role for this tenant
  const roles = await db
    .select({ name: schema.roles.name })
    .from(schema.userRoles)
    .innerJoin(schema.roles, eq(schema.userRoles.roleId, schema.roles.id))
    .where(
      and(
        eq(schema.userRoles.userId, userId),
        eq(schema.roles.tenantId, tenantId)
      )
    );

  const canApprove = roles.some(r => 
    ['Practice Manager', 'Admin'].includes(r.name)
  );

  return canApprove;
}
```

---

## Core Workflows & Background Jobs

### Cloudflare Workflows (MVP)

Cloudflare Workflows is a durable execution engine that runs multi-step jobs with retries, scheduling, and human-in-the-loop patterns. Use it for:
1. **Evidence ingest & indexing**
2. **Review reminders** (scheduled daily/weekly)
3. **Inspection pack generation**

Workflows are triggered from Workers and persist state across retries/crashes.

### Workflow 1: Evidence Ingest & Index

**Trigger:** User uploads a file (presigned URL completion → webhook to Worker).

**Steps:**
1. **Persist metadata** — record in `evidence_items` table.
2. **Attach context** — add custom metadata to R2 object.
3. **Index in AI Search** — ensure object is indexed.
4. **Optional: Auto-triage** — if user requested, run AI tagging (see AI Copilots).

**Code skeleton:**
```typescript
// src/workflows/evidenceIngest.ts
import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from 'cloudflare:workers';
import type { Env } from '~/types';

type Params = {
  tenantId: string;
  siteId: string;
  evidenceId: string;
  r2Key: string;
  runAutoTriage: boolean;
};

export class EvidenceIngestWorkflow extends WorkflowEntrypoint<Env, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    const { tenantId, siteId, evidenceId, r2Key, runAutoTriage } = event.payload;

    // Step 1: Record in D1
    await step.do('Persist evidence metadata', async () => {
      const db = drizzle(this.env.DB, { schema });
      // insert or update evidence_items
    });

    // Step 2: Attach metadata to R2 object
    await step.do('Attach AI Search context', async () => {
      const obj = await this.env.BUCKET.head(r2Key);
      if (obj) {
        // Update metadata headers (x-amz-meta-context, etc.)
        // Re-upload or use copyObject with metadata
      }
    });

    // Step 3: Trigger AI Search sync (if needed)
    await step.do('Sync AI Search', async () => {
      // Ping AI Search to ensure index is updated
    });

    // Step 4: Optional auto-triage
    if (runAutoTriage) {
      await step.do('Run auto-triage AI', async () => {
        // Call AI endpoint to tag QS + category
      });
    }
  }
}
```

**In wrangler.toml:**
```toml
[[workflows]]
name = "evidenceIngest"
binding = "EVIDENCE_INGEST"
```

### Workflow 2: Review Reminders (Scheduled)

**Trigger:** Daily at 09:00 UTC (Workflows supports cron expressions).

**Steps:**
1. Find all evidence items approaching `review_due_at`.
2. Find all policies with unread attestations.
3. Send emails (Resend integration, added later).

**Code skeleton:**
```typescript
export class ReviewReminderWorkflow extends WorkflowEntrypoint<Env, {}> {
  async run(event: WorkflowEvent<{}>, step: WorkflowStep) {
    // Run daily at 09:00 UTC
    await step.sleep('Wait until tomorrow', 24 * 60 * 60); // or use cron

    await step.do('Find overdue reviews', async () => {
      const db = drizzle(this.env.DB, { schema });
      const now = Math.floor(Date.now() / 1000);
      
      const overdueEvidence = await db
        .select()
        .from(schema.evidenceItems)
        .where(and(
          lt(schema.evidenceItems.reviewDueAt, now),
          eq(schema.evidenceItems.status, 'approved')
        ));

      // Send reminders (Resend, later)
      for (const item of overdueEvidence) {
        // queue email task
      }
    });

    // Reschedule for tomorrow
    await step.sleepUntil('Reschedule', Date.now() + 24 * 60 * 60 * 1000);
  }
}
```

### Workflow 3: Inspection Pack Generation

**Trigger:** User clicks "Generate Pack" (instantaneous).

**Steps:**
1. **Freeze scope** — lock in list of QS IDs + evidence IDs + versions.
2. **Generate ZIP tree** — assemble folder structure + files in deterministic order.
3. **Generate PDF** — narrative + evidence index + links.
4. **Upload to R2** — store ZIP + PDF under `t/{tenantId}/packs/{packId}/`.
5. **Mark ready** — set status to "ready" + notify user.

**Code skeleton:**
```typescript
export class PackBuildWorkflow extends WorkflowEntrypoint<Env, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    const { tenantId, siteId, packId, qsIdList } = event.payload;

    await step.do('Freeze scope', async () => {
      // Query evidence items, policy versions, etc. for the QS list
      // Store frozen list in D1 or temp storage
    });

    await step.do('Build ZIP tree', async () => {
      // Construct deterministic folder structure:
      // /safe/learning_culture/evidence/
      //   - ev_abc.pdf
      //   - ev_def.jpg
      // /safe/learning_culture/policies/
      //   - policy_v2.pdf
      // Zip and upload to R2
    });

    await step.do('Generate PDF report', async () => {
      // Use a library like PDFKit or headless browser
      // to render narrative + evidence index
      // Upload to R2
    });

    await step.do('Mark pack ready', async () => {
      const db = drizzle(this.env.DB, { schema });
      await db
        .update(schema.inspectionPacks)
        .set({ status: 'ready' })
        .where(eq(schema.inspectionPacks.id, packId));
    });
  }
}
```

---

## MVP Feature Modules

### Module 1: Evidence Library (Milestone 3)

**Features:**
- Upload files (PDF, DOCX, images, CSV) via presigned R2 URLs.
- Tag to quality statement + evidence category.
- Set review date (optional).
- Mark status (draft, approved, expired).
- In-browser preview (PDF/images render; CSV shows table; DOCX shows download + fallback HTML).
- Evidence index (per QS, per site): "Show all evidence for Learning Culture".

**Key components:**
- `UploadForm.tsx` — presigned URL generation + file selection + upload progress.
- `EvidencePreview.tsx` — PDF/image/CSV/DOCX rendering.
- `EvidenceTable.tsx` — TanStack Table with filtering by QS, category, date range.
- `ReviewDueDate.tsx` — calendar picker for review date.

**Database queries (Drizzle):**
```typescript
// Get evidence by QS
const evidence = await db
  .select()
  .from(schema.evidenceItems)
  .where(
    and(
      eq(schema.evidenceItems.tenantId, tenantId),
      eq(schema.evidenceItems.siteId, siteId),
      eq(schema.evidenceItems.qsId, qsId)
    )
  )
  .orderBy(desc(schema.evidenceItems.uploadedAt));

// Get overdue evidence
const overdue = await db
  .select()
  .from(schema.evidenceItems)
  .where(
    and(
      eq(schema.evidenceItems.tenantId, tenantId),
      eq(schema.evidenceItems.siteId, siteId),
      lt(schema.evidenceItems.reviewDueAt, now),
      eq(schema.evidenceItems.status, 'approved')
    )
  );
```

### Module 2: Actions / Gaps (Milestone 4)

**Features:**
- Create action from a QS (e.g., "Missing evidence for Safeguarding policy").
- Assign owner, set due date.
- Close with approval + closure evidence (link to evidence item).
- Audit trail of all changes.

**Components:**
- `ActionForm.tsx` — create/edit action, assign owner, set due date.
- `ActionApprovalModal.tsx` — approve action closure (optional comment + evidence selection).
- `ActionsDashboard.tsx` — TanStack Table: open/in-progress/closed, sorted by due date.

**Queries:**
```typescript
// Get open actions for a QS
const actions = await db
  .select()
  .from(schema.actions)
  .where(
    and(
      eq(schema.actions.tenantId, tenantId),
      eq(schema.actions.siteId, siteId),
      eq(schema.actions.qsId, qsId),
      ne(schema.actions.status, 'closed')
    )
  );

// Close action with approval
await db.insert(schema.actionApprovals).values({
  id: generateId(),
  tenantId,
  actionId,
  approvedBy: userId,
  approvedAt: Math.floor(Date.now() / 1000),
  closureEvidenceId,
});

await db
  .update(schema.actions)
  .set({ status: 'closed' })
  .where(eq(schema.actions.id, actionId));
```

### Module 3: Policy Lifecycle (Milestone 5)

**Features:**
- Upload policy document (PDF/DOCX).
- Version control (v1, v2, etc.).
- Approval workflow (single approver).
- Publish (transitions from draft to published).
- Staff "read & understood" attestations.
- Archive old versions.

**Components:**
- `PolicyUploadForm.tsx` — file + summary upload.
- `PolicyApprovalModal.tsx` — approve version + comment.
- `PolicyVersionTimeline.tsx` — visual timeline of versions.
- `PolicyReadAttestation.tsx` — staff sign-off UI.

**Queries:**
```typescript
// Get active policies for a QS
const policies = await db
  .select()
  .from(schema.policies)
  .where(
    and(
      eq(schema.policies.tenantId, tenantId),
      eq(schema.policies.siteId, siteId),
      eq(schema.policies.qsId, qsId),
      ne(schema.policies.status, 'archived')
    )
  );

// Get current policy version
const currentVersion = await db
  .select()
  .from(schema.policyVersions)
  .where(eq(schema.policyVersions.policyId, policyId))
  .orderBy(desc(schema.policyVersions.versionNo))
  .limit(1);

// Record read attestation
await db.insert(schema.policyReadAttestations).values({
  id: generateId(),
  tenantId,
  policyVersionId,
  userId,
  readAt: Math.floor(Date.now() / 1000),
});
```

### Module 4: Inspection Packs (Milestone 6)

**Features:**
- Select scope: full site or specific quality statements.
- Generate pack (triggers Workflow).
- Download ZIP, PDF, or "tree" folder.
- View pack history + previous packs.

**Components:**
- `PackBuilder.tsx` — QS selection, trigger generation.
- `PackDownloader.tsx` — links to ZIP/PDF/tree outputs.
- `PackHistory.tsx` — table of previous packs + timestamps.

**Queries:**
```typescript
// Create pack record
const pack = await db.insert(schema.inspectionPacks).values({
  id: `pk_${generateId()}`,
  tenantId,
  siteId,
  scopeType: 'quality_statements',
  scopeData: JSON.stringify(qsIdList),
  createdBy: userId,
  createdAt: Math.floor(Date.now() / 1000),
  status: 'building',
});

// Trigger workflow
await env.EVIDENCE_INGEST.create({
  payload: { tenantId, siteId, packId, qsIdList },
});

// Fetch pack outputs
const outputs = await db
  .select()
  .from(schema.inspectionPackOutputs)
  .where(eq(schema.inspectionPackOutputs.packId, packId));
```

---

## AI Copilots (3 Buttons)

### Button 1: Auto-triage Upload

**Input:** Newly uploaded file.  
**Output:** Suggested QS, evidence category, title, review date, confidence score.

**Implementation:**
1. **Retrieve context:** Use AI Search to find similar evidence from the same tenant/site. [web:54]
2. **Extract content:** Summarize file content (OCR for images, text extraction for PDFs).
3. **Generate suggestions:** Call Cloudflare AI (LLM) with context-aware prompt.
4. **Return:** Pre-fill form fields; don't auto-publish.

**Code pattern:**
```typescript
export const autoTriageEvidence = createServerFn({
  method: 'POST',
})
  .validator((data: unknown) => data as { r2Key: string; fileContent: string })
  .handler(async (ctx, { r2Key, fileContent }) => {
    const tenantId = ctx.session.tenantId;
    const siteId = ctx.session.siteId;

    // 1. Retrieve similar evidence from this tenant/site
    const similarResults = await ctx.env.AI_SEARCH.query({
      query: fileContent.substring(0, 500), // summarize
      filter: {
        type: 'compound',
        operator: 'and',
        filters: [
          { type: 'comparison', key: 'folder', operator: 'gt', value: `t/${tenantId}/s/${siteId}/` },
          { type: 'comparison', key: 'folder', operator: 'lte', value: `t/${tenantId}/s/${siteId}/z` },
        ],
      },
      topK: 5,
      returnMetadata: ['context'],
    });

    // 2. Build RAG context
    const context = similarResults
      .map(r => `- ${r.metadata.context.qsId}: ${r.text.substring(0, 200)}`)
      .join('\n');

    // 3. Call LLM
    const response = await ctx.env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
      prompt: `You are a CQC compliance expert. Given this new evidence:
"${fileContent.substring(0, 500)}"

And similar evidence from this practice:
${context}

Suggest the most likely quality statement, evidence category, title, and review date (in days from now).
Return JSON: { qsId, evidenceCategoryId, title, reviewDaysFromNow, confidence }`,
    });

    return JSON.parse(response);
  });
```

### Button 2: Draft Narrative (per Quality Statement)

**Input:** Quality statement ID.  
**Output:** Short narrative ("what we do and how we know") with citations to internal evidence.

**Implementation:**
1. **Query AI Search** for approved evidence linked to this QS (metadata filtering enforces scope). [web:54]
2. **Build RAG prompt** with evidence chunks + internal IDs.
3. **Generate narrative** with LLM.
4. **Extract citations:** Link to evidence IDs in response (not web claims).
5. **Return:** Markdown with `[Evidence ID: ev_123]` inline citations.

**Code pattern:**
```typescript
export const draftNarrative = createServerFn({
  method: 'POST',
})
  .validator((data: unknown) => data as { qsId: string })
  .handler(async (ctx, { qsId }) => {
    const tenantId = ctx.session.tenantId;
    const siteId = ctx.session.siteId;

    // 1. Retrieve approved evidence for this QS
    const results = await ctx.env.AI_SEARCH.query({
      query: qsId, // or more specific query
      filter: {
        type: 'compound',
        operator: 'and',
        filters: [
          { type: 'comparison', key: 'folder', operator: 'contains', value: `qs/${qsId}` },
          { type: 'comparison', key: 'status', operator: 'eq', value: 'approved' },
        ],
      },
      topK: 10,
      returnMetadata: ['context', 'folder'],
    });

    // 2. Build RAG context with citations
    const evidenceContext = results
      .map((r, idx) => {
        const evidenceId = r.metadata.folder.split('/').pop().replace(/\.\w+$/, '');
        return `[Evidence ${idx + 1} - ID: ${evidenceId}]: ${r.text}`;
      })
      .join('\n\n');

    // 3. Generate narrative
    const prompt = `As a CQC compliance expert, write a short narrative (2-3 paragraphs) for this quality statement:
"${qsId}"

Using this evidence:
${evidenceContext}

Include inline citations like [Evidence 1], [Evidence 2], etc. At the end, list:
Evidence Used:
- Evidence 1: ID
- Evidence 2: ID
etc.

If insufficient evidence, note what's missing and suggest actions.`;

    const response = await ctx.env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
      prompt,
    });

    return {
      narrative: response,
      evidenceUsed: results.map(r => ({
        id: r.metadata.context.evidenceId,
        title: r.metadata.context.title,
      })),
    };
  });
```

### Button 3: Gap Finder (per Quality Statement)

**Input:** Quality statement ID (or optionally: site-wide scan).  
**Output:** Ranked list of gaps with suggested actions.

**Implementation:**
1. **Load expected controls** for this QS from local controls or a "control registry".
2. **Query evidence & actions** for this QS.
3. **Detect gaps:** Missing controls, overdue evidence, open actions.
4. **Generate suggestions:** Rank gaps by severity.
5. **Create actions** (optional: auto-create low-confidence ones in draft state).

**Code pattern:**
```typescript
export const findGaps = createServerFn({
  method: 'POST',
})
  .validator((data: unknown) => data as { qsId: string })
  .handler(async (ctx, { qsId }) => {
    const tenantId = ctx.session.tenantId;
    const siteId = ctx.session.siteId;
    const now = Math.floor(Date.now() / 1000);

    const db = drizzle(ctx.env.DB, { schema });

    // 1. Get local controls for this QS
    const localControls = await db
      .select()
      .from(schema.localControls)
      .where(
        and(
          eq(schema.localControls.tenantId, tenantId),
          eq(schema.localControls.siteId, siteId),
          eq(schema.localControls.qsId, qsId),
          eq(schema.localControls.active, 1)
        )
      );

    // 2. Get evidence for this QS
    const evidence = await db
      .select()
      .from(schema.evidenceItems)
      .where(
        and(
          eq(schema.evidenceItems.tenantId, tenantId),
          eq(schema.evidenceItems.siteId, siteId),
          eq(schema.evidenceItems.qsId, qsId)
        )
      );

    // 3. Get open actions
    const openActions = await db
      .select()
      .from(schema.actions)
      .where(
        and(
          eq(schema.actions.tenantId, tenantId),
          eq(schema.actions.siteId, siteId),
          eq(schema.actions.qsId, qsId),
          ne(schema.actions.status, 'closed')
        )
      );

    // 4. Detect gaps
    const gaps = [];

    // Gap: missing evidence category coverage
    const coveredCategories = new Set(
      evidence.map(e => e.evidenceCategoryId)
    );
    const allCategories = ['peoples_experience', 'staff_feedback', 'partner_feedback', 'observation', 'processes', 'outcomes'];
    for (const cat of allCategories) {
      if (!coveredCategories.has(cat)) {
        gaps.push({
          type: 'missing_evidence_category',
          category: cat,
          severity: 'medium',
          suggestedAction: `Collect evidence for "${cat}" category`,
        });
      }
    }

    // Gap: overdue evidence
    for (const ev of evidence) {
      if (ev.reviewDueAt && ev.reviewDueAt < now && ev.status === 'approved') {
        gaps.push({
          type: 'overdue_review',
          evidenceId: ev.id,
          severity: 'high',
          suggestedAction: `Review evidence item "${ev.title}"`,
        });
      }
    }

    // Gap: missing local control
    const missingControls = localControls.filter(lc => {
      const lastEvidenceForControl = evidence
        .filter(e => e.uploadedAt > (lc.createdAt || 0))
        .sort((a, b) => b.uploadedAt - a.uploadedAt)[0];
      return !lastEvidenceForControl || lastEvidenceForControl.uploadedAt < now - (lc.cadenceDays || 30) * 86400;
    });

    for (const control of missingControls) {
      gaps.push({
        type: 'missing_control_evidence',
        control: control.title,
        severity: 'medium',
        suggestedAction: `Complete "${control.title}" and upload evidence`,
      });
    }

    return {
      gaps: gaps.sort((a, b) => {
        const severityMap = { high: 3, medium: 2, low: 1 };
        return severityMap[b.severity as keyof typeof severityMap] - severityMap[a.severity as keyof typeof severityMap];
      }),
      stats: {
        totalGaps: gaps.length,
        openActions: openActions.length,
        overdueEvidence: evidence.filter(e => e.reviewDueAt && e.reviewDueAt < now).length,
      },
    };
  });
```

---

## Incremental Build Plan

### Milestone 0: Skeleton & Config (Week 1)

**Goals:** Get TanStack Start + Drizzle + D1 + R2 wired up and deployable.

**Deliverables:**
- TanStack Start project scaffold.
- Drizzle schema defined (all tables).
- `wrangler.toml` configured (D1, R2, AI Search, Workflows bindings).
- Local dev setup working (Wrangler + D1 local + R2 RAM).
- Deployment to Cloudflare Workers (staging).

**Tasks:**
- [ ] Initialize TanStack Start project.
- [ ] Define Drizzle schema (`src/db/schema.ts`).
- [ ] Run Drizzle migrations: `drizzle-kit generate` + `drizzle-kit migrate`.
- [ ] Set up Wrangler bindings for D1, R2, AI Search, Workflows.
- [ ] Deploy empty project to staging.

### Milestone 1: Auth + Tenancy (Week 2)

**Goals:** Implement email/password auth, session cookies, tenant scoping.

**Deliverables:**
- Auth endpoints: signup, login, logout.
- Session middleware (tenancy + RBAC enforcement).
- Test users created (reset script).

**Tasks:**
- [ ] Implement `hashPassword` / `verifyPassword` (Web Crypto PBKDF2).
- [ ] Create auth server functions (signup, login, logout).
- [ ] Implement session cookie handling (TanStack Start middleware).
- [ ] Create RBAC helper functions.
- [ ] Write test users seed script.
- [ ] Test local auth flow.

### Milestone 2: CQC Seed + QS Dashboard (Week 2–3)

**Goals:** Seed CQC taxonomy; build quality statement workspace.

**Deliverables:**
- CQC seed JSON imported into D1.
- QS list view (per key question).
- QS detail view (owner, status, "what evidence do we have").

**Tasks:**
- [ ] Create seed JSON (`seed/cqc.taxonomy.json`).
- [ ] Write seed script (`seed/seed_cqc.ts`).
- [ ] Create QS list + detail components (TanStack Table/Router).
- [ ] Implement QS ownership assignment.
- [ ] Test seeding locally + remotely.

### Milestone 3: Evidence Library + Preview (Week 3–4)

**Goals:** Upload, tag, preview, and search evidence.

**Deliverables:**
- File upload (presigned URLs → R2).
- Evidence form (QS + category + review date).
- Evidence table (filter by QS, category, date range).
- File preview (PDF/image in-browser, CSV table, DOCX download + fallback).

**Tasks:**
- [ ] Implement presigned URL generation (Worker endpoint).
- [ ] Build upload form (TanStack Form).
- [ ] Create evidence preview component (PDFJS, CSV parser, etc.).
- [ ] Implement evidence table (TanStack Table).
- [ ] Wire up evidence ingest workflow (basic version).
- [ ] Test uploads locally.

### Milestone 4: Actions + Approvals (Week 4)

**Goals:** Create gaps/actions, assign owners, close with approval.

**Deliverables:**
- Action form (title, owner, due date).
- Action table (open/in-progress/closed).
- Approval modal (approve closure, comment, evidence).

**Tasks:**
- [ ] Implement action CRUD endpoints.
- [ ] Build action form + table (TanStack Form/Table).
- [ ] Implement approval workflow (single approver).
- [ ] Audit log recording for all actions.
- [ ] Test locally.

### Milestone 5: Policies + Versioning (Week 5)

**Goals:** Upload, version, approve, publish, and track staff "read" attestations.

**Deliverables:**
- Policy upload (PDF/DOCX).
- Policy version control (v1, v2, ...).
- Approval workflow.
- Publish button (transitions to published status).
- Staff read attestations.

**Tasks:**
- [ ] Implement policy CRUD + versioning.
- [ ] Build policy upload form.
- [ ] Create approval modal.
- [ ] Implement read attestation UI.
- [ ] Policy timeline view.
- [ ] Test locally.

### Milestone 6: Inspection Packs (Week 5–6)

**Goals:** Generate and export inspection packs (ZIP, PDF, tree).

**Deliverables:**
- Pack builder (select QS set, scope).
- ZIP folder tree generation.
- PDF report generation (narrative + evidence index).
- Pack download + history.

**Tasks:**
- [ ] Implement pack builder UI.
- [ ] Create PackBuild workflow (Cloudflare Workflows).
- [ ] Implement ZIP generation (JSZip or native).
- [ ] Implement PDF generation (PDFKit or headless browser).
- [ ] Create download endpoints.
- [ ] Test locally + end-to-end.

### Milestone 7: AI Copilots (Week 6–7)

**Goals:** Implement 3 AI buttons: auto-triage, draft narrative, gap finder.

**Deliverables:**
- Auto-triage upload button + form pre-fill.
- Draft narrative button + output.
- Gap finder button + suggested actions.

**Tasks:**
- [ ] Implement auto-triage AI endpoint.
- [ ] Implement draft narrative endpoint (RAG).
- [ ] Implement gap finder endpoint.
- [ ] Wire up AI Search for retrieval. [web:54]
- [ ] Test with sample data.

### Milestone 8: Background Jobs (Week 7)

**Goals:** Implement Cloudflare Workflows pipelines.

**Deliverables:**
- Evidence ingest workflow (full implementation).
- Review reminder workflow (daily, scheduled).
- Pack generation workflow (triggered on demand).

**Tasks:**
- [ ] Implement EvidenceIngestWorkflow.
- [ ] Implement ReviewReminderWorkflow (with cron).
- [ ] Implement PackBuildWorkflow.
- [ ] Test workflows locally.
- [ ] Deploy + test in staging.

### Milestone 9: Polish + Testing (Week 8)

**Goals:** UI refinement, error handling, documentation.

**Deliverables:**
- Comprehensive error handling + user-friendly messages.
- Loading states + skeleton screens.
- Mobile-responsive design.
- Developer documentation.

**Tasks:**
- [ ] Review and fix error UX.
- [ ] Add loading states (TanStack Query).
- [ ] Test mobile responsiveness.
- [ ] Write README + setup guide.
- [ ] Final testing (staging + local).

---

## Setup & Configuration

### Prerequisites

- Node.js v18+
- Wrangler v3+ (`npm install -g wrangler`)
- A Cloudflare Workers account with D1, R2, AI Search enabled.

### Local Development Setup

**1. Clone repo and install dependencies:**
```bash
git clone <repo>
cd cqc-compliance
npm install
```

**2. Set up environment variables (`.env.local`):**
```bash
# Cloudflare bindings (Wrangler uses wrangler.toml)
CLOUDFLARE_ACCOUNT_ID=<your_account_id>
CLOUDFLARE_API_TOKEN=<your_api_token>

# Database (local)
DATABASE_URL=file:.wrangler/state/v3/d1/miniflare.db

# (Optional) Remote production flags
ENVIRONMENT=local
```

**3. Initialize local D1:**
```bash
wrangler d1 create cqc-compliance --local
```

This creates `.wrangler/state/v3/d1/miniflare.db`.

**4. Run migrations:**
```bash
wrangler d1 migrations apply cqc-compliance --local
```

**5. Seed CQC taxonomy + test data:**
```bash
node scripts/seed_cqc.ts > seed/seed_cqc.sql
wrangler d1 execute cqc-compliance --local --file=./seed/seed_cqc.sql

node scripts/create_dev_users.ts > seed/dev_users.sql
wrangler d1 execute cqc-compliance --local --file=./seed/dev_users.sql
```

**6. Start local dev server:**
```bash
npm run dev
```

Opens `http://localhost:5173` (TanStack Start + Wrangler).

### Seed & Reset Scripts

#### `seed/cqc.taxonomy.json`
```json
{
  "version": "2026-01-03",
  "evidenceCategories": [
    { "id": "peoples_experience", "title": "People's experience of health and care services" },
    { "id": "staff_feedback", "title": "Feedback from staff and leaders" },
    { "id": "partner_feedback", "title": "Feedback from partners" },
    { "id": "observation", "title": "Observation" },
    { "id": "processes", "title": "Processes" },
    { "id": "outcomes", "title": "Outcomes" }
  ],
  "keyQuestions": [
    {
      "id": "safe",
      "title": "Safe",
      "displayOrder": 10,
      "qualityStatements": [
        { "id": "safe.learning_culture", "code": "learning-culture", "title": "Learning culture" },
        { "id": "safe.safeguarding", "code": "safeguarding", "title": "Safeguarding" },
        { "id": "safe.involving_people_to_manage_risks", "code": "involving-people-to-manage-risks", "title": "Involving people to manage risks" },
        { "id": "safe.safe_environments", "code": "safe-environments", "title": "Safe environments" },
        { "id": "safe.infection_prevention_and_control", "code": "infection-prevention-and-control", "title": "Infection prevention and control" },
        { "id": "safe.medicines_optimisation", "code": "medicines-optimisation", "title": "Medicines optimisation" }
      ]
    },
    {
      "id": "effective",
      "title": "Effective",
      "displayOrder": 20,
      "qualityStatements": [
        { "id": "effective.assessing_needs", "code": "assessing-needs", "title": "Assessing needs" },
        { "id": "effective.delivering_evidence_based_care", "code": "delivering-evidence-based-care-and-treatment", "title": "Delivering evidence-based care and treatment" },
        { "id": "effective.how_staff_teams_work_together", "code": "how-staff-teams-and-services-work-together", "title": "How staff, teams and services work together" },
        { "id": "effective.supporting_healthier_lives", "code": "supporting-people-to-live-healthier-lives", "title": "Supporting people to live healthier lives" },
        { "id": "effective.monitoring_and_improving_outcomes", "code": "monitoring-and-improving-outcomes", "title": "Monitoring and improving outcomes" },
        { "id": "effective.consent_to_care", "code": "consent-to-care-and-treatment", "title": "Consent to care and treatment" }
      ]
    },
    {
      "id": "caring",
      "title": "Caring",
      "displayOrder": 30,
      "qualityStatements": [
        { "id": "caring.kindness_compassion_dignity", "code": "kindness-compassion-and-dignity", "title": "Kindness, compassion and dignity" },
        { "id": "caring.treating_people_as_individuals", "code": "treating-people-as-individuals", "title": "Treating people as individuals" },
        { "id": "caring.independence_choice_control", "code": "independence-choice-and-control", "title": "Independence, choice and control" },
        { "id": "caring.responding_to_immediate_needs", "code": "responding-to-peoples-immediate-needs", "title": "Responding to people's immediate needs" },
        { "id": "caring.workforce_wellbeing_enablement", "code": "workforce-wellbeing-and-enablement", "title": "Workforce wellbeing and enablement" }
      ]
    },
    {
      "id": "responsive",
      "title": "Responsive",
      "displayOrder": 40,
      "qualityStatements": [
        { "id": "responsive.person_centred_care", "code": "person-centred-care", "title": "Person-centred care" },
        { "id": "responsive.providing_information", "code": "providing-information", "title": "Providing information" },
        { "id": "responsive.listening_involving_people", "code": "listening-to-and-involving-people", "title": "Listening to and involving people" },
        { "id": "responsive.planning_for_the_future", "code": "planning-for-the-future", "title": "Planning for the future" }
      ]
    },
    {
      "id": "well_led",
      "title": "Well-led",
      "displayOrder": 50,
      "qualityStatements": [
        { "id": "well_led.shared_direction_and_culture", "code": "shared-direction-and-culture", "title": "Shared direction and culture" },
        { "id": "well_led.capable_compassionate_inclusive_leaders", "code": "capable-compassionate-and-inclusive-leaders", "title": "Capable, compassionate and inclusive leaders" },
        { "id": "well_led.freedom_to_speak_up", "code": "freedom-to-speak-up", "title": "Freedom to speak up" },
        { "id": "well_led.governance_management_sustainability", "code": "governance-management-and-sustainability", "title": "Governance, management and sustainability" },
        { "id": "well_led.learning_improvement_innovation", "code": "learning-improvement-and-innovation", "title": "Learning, improvement and innovation" },
        { "id": "well_led.environmental_sustainability", "code": "environmental-sustainability", "title": "Environmental sustainability" }
      ]
    }
  ]
}
```

#### `scripts/seed_cqc.ts`

Reads `seed/cqc.taxonomy.json` and generates SQL `INSERT` statements.

```typescript
import * as fs from 'fs';
import * as path from 'path';

const taxonomy = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../seed/cqc.taxonomy.json'), 'utf-8')
);

const lines: string[] = [];

// Insert evidence categories
for (const cat of taxonomy.evidenceCategories) {
  lines.push(
    `INSERT INTO evidence_categories (id, title) VALUES ('${cat.id}', '${cat.title.replace(/'/g, "''")}')`
  );
}

// Insert key questions + quality statements
for (const kq of taxonomy.keyQuestions) {
  lines.push(
    `INSERT INTO cqc_key_questions (id, title, display_order) VALUES ('${kq.id}', '${kq.title}', ${kq.displayOrder})`
  );

  for (const qs of kq.qualityStatements) {
    lines.push(
      `INSERT INTO cqc_quality_statements (id, key_question_id, code, title, display_order, active) VALUES ('${qs.id}', '${kq.id}', '${qs.code}', '${qs.title.replace(/'/g, "''")}', ${qs.displayOrder || 1}, 1)`
    );
  }
}

console.log(lines.join(';\n') + ';');
```

**Run:** `node scripts/seed_cqc.ts > seed/seed_cqc.sql`

#### `scripts/create_dev_users.ts`

Creates test users with known passwords.

```typescript
import { hashPassword } from '../src/lib/auth';

const PASSWORD = 'Password123!';

async function createDevUsers() {
  const lines: string[] = [];

  // Tenant
  const tenantId = 't_demo';
  lines.push(`INSERT INTO tenants (id, name, created_at) VALUES ('${tenantId}', 'Demo Practice Group', strftime('%s', 'now'))`);

  // Site
  const siteId = 's_demo';
  lines.push(`INSERT INTO sites (id, tenant_id, name, address, created_at) VALUES ('${siteId}', '${tenantId}', 'Demo Surgery', '123 Main Street', strftime('%s', 'now'))`);

  // Roles
  const roles = [
    'Practice Manager',
    'GP Partner',
    'Nurse Lead',
    'Safeguarding Lead',
    'Admin',
  ];

  for (let i = 0; i < roles.length; i++) {
    const roleId = `r_${roles[i].toLowerCase().replace(/\s+/g, '_')}`;
    lines.push(
      `INSERT INTO roles (id, tenant_id, name) VALUES ('${roleId}', '${tenantId}', '${roles[i]}')`
    );
  }

  // Users
  const users = [
    { id: 'u_pm', email: 'pm@example.com', name: 'Practice Manager', role: 'r_practice_manager' },
    { id: 'u_gp', email: 'gp@example.com', name: 'GP Partner', role: 'r_gp_partner' },
    { id: 'u_nurse', email: 'nurse@example.com', name: 'Nurse Lead', role: 'r_nurse_lead' },
    { id: 'u_safe', email: 'safeguarding@example.com', name: 'Safeguarding Lead', role: 'r_safeguarding_lead' },
    { id: 'u_admin', email: 'admin@example.com', name: 'Admin', role: 'r_admin' },
  ];

  for (const user of users) {
    const hash = await hashPassword(PASSWORD);
    lines.push(
      `INSERT INTO users (id, tenant_id, email, password_hash, name, created_at) VALUES ('${user.id}', '${tenantId}', '${user.email}', '${hash}', '${user.name}', strftime('%s', 'now'))`
    );
    lines.push(
      `INSERT INTO user_roles (user_id, role_id, site_id, created_at) VALUES ('${user.id}', '${user.role}', '${siteId}', strftime('%s', 'now'))`
    );
  }

  console.log(lines.join(';\n') + ';');
}

createDevUsers().catch(console.error);
```

**Run:** `node scripts/create_dev_users.ts > seed/dev_users.sql`

#### `seed/reset.sql`

Wipes tenant-specific data (keeps seeded taxonomy).

```sql
DELETE FROM inspection_pack_outputs;
DELETE FROM inspection_packs;
DELETE FROM policy_read_attestations;
DELETE FROM policy_approvals;
DELETE FROM policy_versions;
DELETE FROM policies;
DELETE FROM action_approvals;
DELETE FROM actions;
DELETE FROM evidence_links;
DELETE FROM evidence_items;
DELETE FROM local_controls;
DELETE FROM qs_owners;
DELETE FROM user_roles;
DELETE FROM roles;
DELETE FROM users;
DELETE FROM sites;
DELETE FROM tenants;
DELETE FROM audit_log;
```

### Reset Procedure

**Local:**
```bash
# Reset database
wrangler d1 execute cqc-compliance --local --file=./seed/reset.sql

# Reseed dev users
node scripts/create_dev_users.ts > seed/dev_users.sql
wrangler d1 execute cqc-compliance --local --file=./seed/dev_users.sql

# Reset R2 (all files under local bucket)
# (Wrangler doesn't support rm -r, so manually delete from Miniflare state or
#  implement an admin endpoint to wipe t/{tenantId}/)
```

**Remote (staging/prod):**
```bash
# Reset database
wrangler d1 execute cqc-compliance --remote --file=./seed/reset.sql

# Reseed
wrangler d1 execute cqc-compliance --remote --file=./seed/dev_users.sql

# Reset R2 (use Cloudflare dashboard or custom Worker endpoint)
# POST /admin/reset-r2?tenantId=t_demo
# (Implement with strong auth checks)
```

### Test User Credentials (Dev)

| Email | Password | Role | Notes |
|-------|----------|------|-------|
| pm@example.com | Password123! | Practice Manager | Full access |
| gp@example.com | Password123! | GP Partner | QS ownership |
| nurse@example.com | Password123! | Nurse Lead | Review access |
| safeguarding@example.com | Password123! | Safeguarding Lead | Safeguarding QS |
| admin@example.com | Password123! | Admin | System admin |

---

## Code Examples & Patterns

### Example 1: TanStack Start Server Function (Presigned URL Generation)

```typescript
// src/routes/api/upload.server.ts
import { createServerFn } from '@tanstack/start';
import type { Env } from '~/types';

export const getPresignedUrl = createServerFn({
  method: 'POST',
})
  .validator((data: unknown) => {
    return data as {
      qsId: string;
      evidenceCategory: string;
      fileName: string;
    };
  })
  .handler(async (ctx, { qsId, evidenceCategory, fileName }) => {
    const env = ctx.env as Env;
    const session = ctx.session as Session;

    const tenantId = session.tenantId;
    const siteId = session.siteId;

    // Generate deterministic R2 key
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const evidenceId = `ev_${Date.now()}`;

    const r2Key = `t/${tenantId}/s/${siteId}/qs/${qsId}/evidence/${evidenceCategory}/${yyyy}-${mm}/${evidenceId}/${fileName}`;

    // Generate presigned URL (valid for 1 hour)
    const url = await env.BUCKET.createMultipartUpload(r2Key);

    return {
      presignedUrl: url.uploadURL,
      r2Key,
    };
  });
```

### Example 2: Drizzle Query with Tenancy Scoping

```typescript
// src/lib/queries.ts
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, lt, desc } from 'drizzle-orm';
import * as schema from '~/db/schema';

export async function getEvidenceByQS(
  db: D1Database,
  tenantId: string,
  siteId: string,
  qsId: string
) {
  return db
    .select()
    .from(schema.evidenceItems)
    .where(
      and(
        eq(schema.evidenceItems.tenantId, tenantId),
        eq(schema.evidenceItems.siteId, siteId),
        eq(schema.evidenceItems.qsId, qsId)
      )
    )
    .orderBy(desc(schema.evidenceItems.uploadedAt));
}

export async function getOverdueEvidence(
  db: D1Database,
  tenantId: string,
  siteId: string
) {
  const now = Math.floor(Date.now() / 1000);

  return db
    .select()
    .from(schema.evidenceItems)
    .where(
      and(
        eq(schema.evidenceItems.tenantId, tenantId),
        eq(schema.evidenceItems.siteId, siteId),
        lt(schema.evidenceItems.reviewDueAt, now),
        eq(schema.evidenceItems.status, 'approved')
      )
    );
}
```

### Example 3: Cloudflare Workflow (Evidence Ingest)

```typescript
// src/workflows/evidenceIngest.ts
import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from 'cloudflare:workers';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '~/db/schema';
import type { Env } from '~/types';

type Params = {
  tenantId: string;
  siteId: string;
  evidenceId: string;
  r2Key: string;
  qsId: string;
  evidenceCategoryId: string;
  title: string;
  uploadedBy: string;
  reviewDueAt?: number;
  runAutoTriage: boolean;
};

export class EvidenceIngestWorkflow extends WorkflowEntrypoint<Env, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    const {
      tenantId,
      siteId,
      evidenceId,
      r2Key,
      qsId,
      evidenceCategoryId,
      title,
      uploadedBy,
      reviewDueAt,
      runAutoTriage,
    } = event.payload;

    const db = drizzle(this.env.DB, { schema });

    // Step 1: Persist to D1
    await step.do('Record evidence metadata', async () => {
      const now = Math.floor(Date.now() / 1000);

      // Get R2 object info for size/MIME type
      const obj = await this.env.BUCKET.head(r2Key);
      const mimeType = obj?.httpMetadata?.contentType || 'application/octet-stream';
      const sizeBytes = obj?.size || 0;

      await db.insert(schema.evidenceItems).values({
        id: evidenceId,
        tenantId,
        siteId,
        qsId,
        evidenceCategoryId,
        title,
        r2Key,
        mimeType,
        sizeBytes,
        uploadedBy,
        uploadedAt: now,
        reviewDueAt,
        status: 'draft',
        createdAt: now,
      });
    });

    // Step 2: Attach metadata to R2 object
    await step.do('Attach AI Search metadata', async () => {
      // Copy object with custom metadata headers
      const context = {
        tenantId,
        siteId,
        qsId,
        evidenceCategoryId,
        resourceType: 'evidence',
        status: 'draft',
        indexed: false,
      };

      await this.env.BUCKET.put(r2Key, await this.env.BUCKET.get(r2Key), {
        customMetadata: context,
      });
    });

    // Step 3: Trigger AI Search indexing
    await step.do('Index in AI Search', async () => {
      // Call AI Search API to ensure index is updated
      // (depends on how you've set up AI Search with R2)
      const response = await fetch('https://api.cloudflare.com/client/v4/accounts/:account_id/ai/search/index', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.env.CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deployment_id: this.env.AI_SEARCH_DEPLOYMENT_ID,
          documents: [{ id: r2Key, text: title }], // minimal indexing
        }),
      });
    });

    // Step 4: Optional auto-triage
    if (runAutoTriage) {
      await step.do('Run auto-triage AI', async () => {
        // Call auto-triage endpoint (server function)
        const result = await fetch(`${this.env.WORKER_URL}/api/auto-triage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId,
            siteId,
            evidenceId,
            r2Key,
          }),
        }).then(r => r.json());

        // Update evidence item with AI suggestions
        if (result.suggestedQsId !== qsId) {
          // Log suggestion but don't auto-update
          console.log(`Auto-triage suggested QS ${result.suggestedQsId} for evidence ${evidenceId}`);
        }
      });
    }
  }
}
```

### Example 4: TanStack Table Component (Evidence List)

```typescript
// src/components/EvidenceTable.tsx
import { useQuery } from '@tanstack/react-query';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { getEvidenceByQS } from '~/lib/queries.server';

type EvidenceRow = {
  id: string;
  title: string;
  category: string;
  uploadedAt: number;
  reviewDueAt?: number;
  status: string;
};

const columns: ColumnDef<EvidenceRow>[] = [
  {
    accessorKey: 'title',
    header: 'Title',
  },
  {
    accessorKey: 'category',
    header: 'Evidence Category',
  },
  {
    accessorKey: 'uploadedAt',
    header: 'Uploaded',
    cell: info => new Date(info.getValue<number>() * 1000).toLocaleDateString(),
  },
  {
    accessorKey: 'reviewDueAt',
    header: 'Review Due',
    cell: info => {
      const date = info.getValue<number>();
      return date ? new Date(date * 1000).toLocaleDateString() : '—';
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: info => {
      const status = info.getValue<string>();
      const color = status === 'approved' ? 'text-green-600' : 'text-yellow-600';
      return <span className={color}>{status}</span>;
    },
  },
];

export function EvidenceTable({ qsId }: { qsId: string }) {
  const { data: evidence = [], isLoading } = useQuery({
    queryKey: ['evidence', qsId],
    queryFn: async () => {
      const res = await fetch(`/api/evidence?qsId=${qsId}`);
      return res.json();
    },
  });

  const table = useReactTable({
    data: evidence,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id} className="border-b">
              {headerGroup.headers.map(header => (
                <th key={header.id} className="px-4 py-2 text-left">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} className="border-b hover:bg-gray-50">
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-4 py-2">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## Testing & Reset Procedures

### Local Testing

**1. Reset local database:**
```bash
wrangler d1 execute cqc-compliance --local --file=./seed/reset.sql
```

**2. Reseed test data:**
```bash
node scripts/seed_cqc.ts > seed/seed_cqc.sql
wrangler d1 execute cqc-compliance --local --file=./seed/seed_cqc.sql

node scripts/create_dev_users.ts > seed/dev_users.sql
wrangler d1 execute cqc-compliance --local --file=./seed/dev_users.sql
```

**3. Start local dev:**
```bash
npm run dev
```

**4. Test auth flow:**
- Navigate to http://localhost:5173/login
- Sign in with `pm@example.com` / `Password123!`
- Verify session + tenant scoping.

**5. Test upload:**
- Go to Evidence tab, select a Quality Statement.
- Upload a PDF/DOCX.
- Verify file appears in R2 (check `.wrangler/state/...`).
- Verify entry in D1 (`wrangler d1 query "SELECT * FROM evidence_items" --local`).

### Remote Testing (Staging)

**1. Reset staging database:**
```bash
wrangler d1 execute cqc-compliance --remote --file=./seed/reset.sql --env staging
```

**2. Reseed:**
```bash
wrangler d1 execute cqc-compliance --remote --file=./seed/seed_cqc.sql --env staging
wrangler d1 execute cqc-compliance --remote --file=./seed/dev_users.sql --env staging
```

**3. Deploy:**
```bash
npm run deploy -- --env staging
```

**4. Test live at `https://cqc-compliance-staging.workers.dev`.**

### Reset R2 (Optional Admin Endpoint)

Implement an admin-only endpoint to wipe R2 for a tenant:

```typescript
// src/routes/api/admin/reset-r2.server.ts
import { createServerFn } from '@tanstack/start';
import type { Env } from '~/types';

export const resetR2 = createServerFn({
  method: 'POST',
})
  .validator((data: unknown) => data as { tenantId: string })
  .handler(async (ctx, { tenantId }) => {
    const env = ctx.env as Env;
    const session = ctx.session as Session;

    // Check admin role
    if (session.role !== 'Admin') {
      throw new Error('Unauthorized');
    }

    // Delete all objects under t/{tenantId}/
    const prefix = `t/${tenantId}/`;
    const objects = await env.BUCKET.list({ prefix });

    for (const obj of objects.objects) {
      await env.BUCKET.delete(obj.key);
    }

    return { deleted: objects.objects.length };
  });
```

---

## Glossary & Reference

| Term | Definition |
|------|-----------|
| **QS (Quality Statement)** | A CQC-defined assessment criterion under one of five key questions (Safe, Effective, Caring, Responsive, Well-led). |
| **Evidence Item** | A file or record (PDF, DOCX, image, CSV) that demonstrates compliance with a QS. |
| **Evidence Category** | One of six CQC categories: People's experience, Staff feedback, Partner feedback, Observation, Processes, Outcomes. |
| **Control** | A governance activity (audit, training, meeting) that generates evidence. |
| **Action / Gap** | A remediation task created when evidence is insufficient. |
| **Policy** | A documented procedure, versioned and requiring staff read attestations. |
| **Inspection Pack** | An exportable output (ZIP, PDF, tree) of QS narratives + evidence links for CQC submission. |
| **Presigned URL** | A time-limited, browser-friendly URL for direct file uploads to R2. |
| **RAG** | Retrieval-Augmented Generation; using AI Search to retrieve internal evidence before generating LLM responses. |
| **Tenant** | A single GP practice organization (multitenancy boundary). |
| **Site** | A physical location under a tenant (e.g., "Main Surgery" vs. "Satellite Clinic"). |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-03 | Initial MVP specification. |

---

**End of Document**

For questions or updates, contact the development lead or review the inline comments in code.
