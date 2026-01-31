/**
 * Types for CQC Inspection Pack feature
 */

export type PackStatus = 'building' | 'ready' | 'error';
export type PackScopeType = 'full_site' | 'key_question' | 'quality_statements';
export type GapType = 'missing' | 'outdated' | 'expiring_soon';

export interface EvidenceGap {
  controlId: string;
  controlTitle: string;
  qsId: string;
  qsTitle?: string;
  gapType: GapType;
  lastEvidenceDate?: Date | null;
  daysOverdue?: number;
  frequencyDays?: number;
}

export interface QualityStatementSummary {
  id: string;
  title: string;
  code: string;
  controlCount: number;
  evidenceCount: number;
  gapCount: number;
  coveragePercentage: number;
}

export interface KeyQuestionSummary {
  id: string;
  title: string;
  totalEvidence: number;
  totalControls: number;
  totalGaps: number;
  coveragePercentage: number;
  aiSummary?: string;
  qualityStatements: QualityStatementSummary[];
}

export interface PackOutput {
  id: string;
  kind: 'zip' | 'pdf' | 'tree';
  r2Key: string;
  createdAt: Date;
}

export interface InspectionPackDetail {
  id: string;
  tenantId: string;
  siteId: string;
  siteName: string;
  scopeType: PackScopeType;
  scopeData?: string[] | null;
  status: PackStatus;
  createdBy: string;
  createdByName?: string;
  createdAt: Date;
  keyQuestions: KeyQuestionSummary[];
  totalEvidenceCount: number;
  totalControlsCount: number;
  totalGapsCount: number;
  coveragePercentage: number;
  executiveSummary?: string;
  gaps: EvidenceGap[];
  outputs: PackOutput[];
}

export interface InspectionPackListItem {
  id: string;
  siteId: string;
  siteName: string;
  scopeType: PackScopeType;
  scopeData?: string[] | null;
  status: PackStatus;
  createdBy: string;
  createdByName?: string;
  createdAt: Date;
  evidenceCount?: number;
  qualityStatementCount?: number;
}

export interface CreatePackInput {
  siteId: string;
  scopeType: PackScopeType;
  scopeData?: string[] | null; // Array of QS IDs for 'quality_statements' scope, or single KQ ID for 'key_question'
}
