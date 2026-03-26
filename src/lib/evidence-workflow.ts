import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";

type DB = DrizzleD1Database<typeof schema>;

/**
 * Evidence Status Types
 */
export const EVIDENCE_STATUS = {
  PROCESSING: "processing", // AI workflow in progress
  FAILED: "failed", // AI workflow failed
  DRAFT: "draft", // Awaiting user confirmation of classification
  PENDING_REVIEW: "pending_review", // Submitted for approval
  APPROVED: "approved", // Approved by reviewer
  REJECTED: "rejected", // Rejected by reviewer
  ARCHIVED: "archived", // Historical record
} as const;

export type EvidenceStatus = (typeof EVIDENCE_STATUS)[keyof typeof EVIDENCE_STATUS];

/**
 * Valid state transitions for evidence workflow
 * Key = current status, Value = array of allowed next statuses
 */
export const VALID_STATUS_TRANSITIONS: Record<EvidenceStatus, EvidenceStatus[]> = {
  [EVIDENCE_STATUS.PROCESSING]: [
    EVIDENCE_STATUS.DRAFT, // AI completed successfully
    EVIDENCE_STATUS.FAILED, // AI failed
  ],
  [EVIDENCE_STATUS.FAILED]: [
    EVIDENCE_STATUS.DRAFT, // User manually classifies
    // Note: No delete here - handled separately
  ],
  [EVIDENCE_STATUS.DRAFT]: [
    EVIDENCE_STATUS.PENDING_REVIEW, // Submit for review
    // Note: No delete here - handled separately
  ],
  [EVIDENCE_STATUS.PENDING_REVIEW]: [
    EVIDENCE_STATUS.APPROVED, // Reviewer approves
    EVIDENCE_STATUS.REJECTED, // Reviewer rejects
    EVIDENCE_STATUS.DRAFT, // Return to draft for edits (by uploader)
  ],
  [EVIDENCE_STATUS.APPROVED]: [
    EVIDENCE_STATUS.ARCHIVED, // Archive old evidence
  ],
  [EVIDENCE_STATUS.REJECTED]: [
    EVIDENCE_STATUS.DRAFT, // Return to draft for revision
  ],
  [EVIDENCE_STATUS.ARCHIVED]: [], // Terminal state
};

/**
 * Validate a status transition
 * @throws Error if transition is invalid
 */
export function validateStatusTransition(
  currentStatus: EvidenceStatus,
  newStatus: EvidenceStatus
): void {
  const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus];

  if (!allowedTransitions) {
    throw new Error(`Unknown current status: ${currentStatus}`);
  }

  if (!allowedTransitions.includes(newStatus)) {
    throw new Error(
      `Invalid status transition: ${currentStatus} → ${newStatus}. ` +
        `Allowed transitions: ${allowedTransitions.join(", ") || "none"}`
    );
  }
}

/**
 * Check if a user can approve/reject evidence based on local control's reviewer role
 *
 * Logic:
 * 1. If evidence has a localControlId, check the control's defaultReviewerRole
 * 2. User must have that role for the evidence's site
 * 3. Fallback: if no control, check if user is QS owner
 * 4. Directors can always approve (override)
 */
export async function canUserApproveEvidence(
  db: DB,
  params: {
    userId: string;
    evidenceId: string;
    tenantId: string;
  }
): Promise<{ allowed: boolean; reason: string }> {
  // 1. Fetch the evidence with its control and QS
  const evidence = await db.query.evidenceItems.findFirst({
    where: and(
      eq(schema.evidenceItems.id, params.evidenceId),
      eq(schema.evidenceItems.tenantId, params.tenantId)
    ),
    columns: {
      id: true,
      uploadedBy: true,
      localControlId: true,
      qsId: true,
      siteId: true,
    },
  });

  if (!evidence) {
    return { allowed: false, reason: "Evidence not found" };
  }

  // 2. Self-approval check
  if (evidence.uploadedBy === params.userId) {
    return { allowed: false, reason: "Cannot approve your own uploads" };
  }

  // 3. Get user's roles for this site
  const userRoles = await db
    .select({
      role: schema.userRoles.role,
      siteId: schema.userRoles.siteId,
    })
    .from(schema.userRoles)
    .where(eq(schema.userRoles.userId, params.userId));

  // Check for Director (tenant-level override)
  const isPracticeManager = userRoles.some(
    (r) => r.role === "Director" && r.siteId === null
  );
  if (isPracticeManager) {
    return { allowed: true, reason: "Director override" };
  }

  // Get roles for this specific site
  const siteRoles = userRoles
    .filter((r) => r.siteId === evidence.siteId || r.siteId === null)
    .map((r) => r.role);

  // 4. If evidence has a local control, check control's reviewer role
  if (evidence.localControlId) {
    const control = await db.query.localControls.findFirst({
      where: eq(schema.localControls.id, evidence.localControlId),
      columns: {
        defaultReviewerRole: true,
        fallbackReviewerRole: true,
        title: true,
      },
    });

    if (control) {
      const requiredRole = control.defaultReviewerRole;
      const fallbackRole = control.fallbackReviewerRole;

      if (requiredRole && siteRoles.includes(requiredRole)) {
        return {
          allowed: true,
          reason: `User has required reviewer role: ${requiredRole}`,
        };
      }

      if (fallbackRole && siteRoles.includes(fallbackRole)) {
        return {
          allowed: true,
          reason: `User has fallback reviewer role: ${fallbackRole}`,
        };
      }

      // User doesn't have the required role
      return {
        allowed: false,
        reason: `Only ${requiredRole}${fallbackRole ? ` or ${fallbackRole}` : ""} can approve evidence for "${control.title}"`,
      };
    }
  }

  // 5. Fallback: Check QS ownership
  const qsOwner = await db.query.qsOwners.findFirst({
    where: and(
      eq(schema.qsOwners.qsId, evidence.qsId),
      eq(schema.qsOwners.siteId, evidence.siteId),
      eq(schema.qsOwners.ownerUserId, params.userId)
    ),
  });

  if (qsOwner) {
    return { allowed: true, reason: "User is QS owner" };
  }

  // 6. Check if user has Compliance Officer role (can approve anything)
  if (siteRoles.includes("Compliance Officer")) {
    return { allowed: true, reason: "Compliance Officer can review all evidence" };
  }

  return {
    allowed: false,
    reason: "User does not have permission to approve this evidence",
  };
}

/**
 * Check if a user can delete evidence
 * Only Directors and Admins can delete, or the uploader can delete drafts
 */
export async function canUserDeleteEvidence(
  db: DB,
  params: {
    userId: string;
    evidenceId: string;
    tenantId: string;
  }
): Promise<{ allowed: boolean; reason: string }> {
  const evidence = await db.query.evidenceItems.findFirst({
    where: and(
      eq(schema.evidenceItems.id, params.evidenceId),
      eq(schema.evidenceItems.tenantId, params.tenantId)
    ),
    columns: {
      uploadedBy: true,
      status: true,
      siteId: true,
    },
  });

  if (!evidence) {
    return { allowed: false, reason: "Evidence not found" };
  }

  // Uploader can delete their own drafts or failed items
  if (
    evidence.uploadedBy === params.userId &&
    (evidence.status === "draft" || evidence.status === "failed")
  ) {
    return { allowed: true, reason: "Uploader can delete own draft/failed evidence" };
  }

  // Check for admin roles
  const userRoles = await db
    .select({ role: schema.userRoles.role, siteId: schema.userRoles.siteId })
    .from(schema.userRoles)
    .where(eq(schema.userRoles.userId, params.userId));

  const canDelete = userRoles.some(
    (r) =>
      (r.role === "Director" || r.role === "Admin") &&
      (r.siteId === null || r.siteId === evidence.siteId)
  );

  if (canDelete) {
    return { allowed: true, reason: "Admin/Director can delete evidence" };
  }

  return {
    allowed: false,
    reason: "Only Directors, Admins, or the uploader (for drafts) can delete evidence",
  };
}
