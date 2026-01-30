import * as schema from "@/db/schema";
import type { DrizzleD1Database } from "drizzle-orm/d1";

type DB = DrizzleD1Database<typeof schema>;

/**
 * Audit Event Types - Key events we track for compliance
 */
export const AUDIT_ACTIONS = {
  // Evidence lifecycle
  EVIDENCE_UPLOADED: "evidence.uploaded",
  EVIDENCE_UPDATED: "evidence.updated",
  EVIDENCE_DELETED: "evidence.deleted",
  EVIDENCE_SUBMITTED: "evidence.submitted_for_review",
  EVIDENCE_APPROVED: "evidence.approved",
  EVIDENCE_REJECTED: "evidence.rejected",

  // Control lifecycle
  CONTROL_CREATED: "control.created",
  CONTROL_UPDATED: "control.updated",
  CONTROL_DELETED: "control.deleted",

  // User lifecycle
  USER_INVITED: "user.invited",
  USER_ROLE_CHANGED: "user.role_changed",
  USER_DELETED: "user.deleted",

  // Policy lifecycle
  POLICY_CREATED: "policy.created",
  POLICY_APPROVED: "policy.approved",
  POLICY_PUBLISHED: "policy.published",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

/**
 * Entity types for audit log categorization
 */
export type AuditEntityType =
  | "evidence"
  | "local_control"
  | "user"
  | "invitation"
  | "policy"
  | "action";

/**
 * Audit event details structure
 */
export interface AuditDetails {
  // For status changes
  previousStatus?: string;
  newStatus?: string;

  // For evidence
  fileName?: string;
  controlId?: string;
  controlTitle?: string;
  qsId?: string;

  // For approvals/rejections
  reviewNotes?: string;

  // For user changes
  previousRole?: string;
  newRole?: string;
  targetUserId?: string;
  targetUserEmail?: string;

  // Generic
  reason?: string;
  metadata?: Record<string, unknown>;

  // For bulk operations
  bulkDelete?: boolean;
}

/**
 * Log an audit event for compliance tracking
 *
 * @example
 * await logAuditEvent(db, {
 *   tenantId: user.tenantId,
 *   actorUserId: user.id,
 *   action: AUDIT_ACTIONS.EVIDENCE_APPROVED,
 *   entityType: 'evidence',
 *   entityId: evidenceId,
 *   details: { previousStatus: 'pending_review', newStatus: 'approved' }
 * });
 */
export async function logAuditEvent(
  db: DB,
  params: {
    tenantId: string;
    actorUserId: string | null; // null for system actions
    action: AuditAction;
    entityType: AuditEntityType;
    entityId: string;
    details?: AuditDetails;
  }
): Promise<void> {
  try {
    await db.insert(schema.auditLog).values({
      id: `aud_${crypto.randomUUID()}`,
      tenantId: params.tenantId,
      actorUserId: params.actorUserId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      jsonDiff: params.details ? JSON.stringify(params.details) : null,
      createdAt: new Date(),
    });
  } catch (error) {
    // Audit logging should never break the main operation
    // Log to console but don't throw
    console.error("Failed to write audit log:", error, params);
  }
}

/**
 * Convenience function for evidence-specific audit events
 */
export async function logEvidenceEvent(
  db: DB,
  params: {
    tenantId: string;
    actorUserId: string;
    evidenceId: string;
    action:
      | typeof AUDIT_ACTIONS.EVIDENCE_UPLOADED
      | typeof AUDIT_ACTIONS.EVIDENCE_UPDATED
      | typeof AUDIT_ACTIONS.EVIDENCE_DELETED
      | typeof AUDIT_ACTIONS.EVIDENCE_SUBMITTED
      | typeof AUDIT_ACTIONS.EVIDENCE_APPROVED
      | typeof AUDIT_ACTIONS.EVIDENCE_REJECTED;
    details?: AuditDetails;
  }
): Promise<void> {
  return logAuditEvent(db, {
    tenantId: params.tenantId,
    actorUserId: params.actorUserId,
    action: params.action,
    entityType: "evidence",
    entityId: params.evidenceId,
    details: params.details,
  });
}

/**
 * Convenience function for user-related audit events
 */
export async function logUserEvent(
  db: DB,
  params: {
    tenantId: string;
    actorUserId: string;
    targetUserId: string;
    action:
      | typeof AUDIT_ACTIONS.USER_INVITED
      | typeof AUDIT_ACTIONS.USER_ROLE_CHANGED
      | typeof AUDIT_ACTIONS.USER_DELETED;
    details?: AuditDetails;
  }
): Promise<void> {
  return logAuditEvent(db, {
    tenantId: params.tenantId,
    actorUserId: params.actorUserId,
    action: params.action,
    entityType: "user",
    entityId: params.targetUserId,
    details: params.details,
  });
}

/**
 * Convenience function for control-related audit events
 */
export async function logControlEvent(
  db: DB,
  params: {
    tenantId: string;
    actorUserId: string;
    controlId: string;
    action:
      | typeof AUDIT_ACTIONS.CONTROL_CREATED
      | typeof AUDIT_ACTIONS.CONTROL_UPDATED
      | typeof AUDIT_ACTIONS.CONTROL_DELETED;
    details?: AuditDetails;
  }
): Promise<void> {
  return logAuditEvent(db, {
    tenantId: params.tenantId,
    actorUserId: params.actorUserId,
    action: params.action,
    entityType: "local_control",
    entityId: params.controlId,
    details: params.details,
  });
}
