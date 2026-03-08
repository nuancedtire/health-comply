# Document Upload Flow Design

**Date:** 2026-01-17  
**Status:** Draft  
**Author:** AI-assisted design session

---

## Problem Statement

When users upload documents to Health Comply, the system needs to intelligently classify them and guide users through a review workflow:

1. **Relevant + Match**: Document is relevant AND matches an existing local control - assign automatically
2. **Relevant + Suggestion**: Document is relevant BUT no perfect match exists - suggest a control or prompt creation
3. **Irrelevant**: Document doesn't fit any compliance context - mark as irrelevant

The document page needs a two-tab structure:
- **Drafts Tab**: Documents awaiting triage (irrelevant, needs suggestion, or ready to assign)
- **Pending Review / Approved Tab**: Documents in the approval workflow

---

## Design Decisions

### 1. Database Schema: Metadata JSON Approach

**Decision:** Use a hybrid approach with a `status` enum for workflow state and a `classificationResult` JSON column for analysis outcomes.

**Rationale:** This provides flexibility for evolving classification data without migration overhead while maintaining clear workflow state tracking.

#### Schema Changes to `evidenceItems`

```typescript
// Add new fields to evidenceItems table
export const evidenceItems = sqliteTable('evidence_items', {
  // ... existing fields ...
  
  // Workflow status (clear, queryable states)
  status: text('status').notNull().default('draft'), 
  // Values: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'archived'
  
  // Classification result from AI analysis (flexible JSON)
  classificationResult: text('classification_result'), // JSON blob
  
  // Suggested control (for "relevant but no match" case)
  suggestedControlId: text('suggested_control_id')
    .references(() => localControls.id, { onDelete: 'set null' }),
  
  // Review notes for audit trail
  reviewNotes: text('review_notes'),
  reviewedBy: text('reviewed_by').references(() => users.id),
  reviewedAt: integer('reviewed_at', { mode: 'timestamp' }),
});
```

#### Classification Result JSON Structure

```typescript
type ClassificationResult = {
  // Classification type
  type: 'match' | 'suggestion' | 'irrelevant';
  
  // Confidence score (0-100)
  confidence: number;
  
  // For matches: the matched control
  matchedControlId?: string;
  matchedControlTitle?: string;
  
  // For suggestions: what control could be created
  suggestedControlTitle?: string;
  suggestedQsId?: string;
  
  // AI reasoning for transparency
  reasoning: string;
  
  // Keywords/topics detected
  detectedTopics?: string[];
  
  // Timestamp of analysis
  analyzedAt: string; // ISO date
};
```

### 2. UI Layout: Split-View with Comprehensive Actions

**Decision:** Master-detail split view with document preview on one side and control details/actions on the other.

**Key Actions Available:**
- **Approve** - For matched documents, confirm and move to pending_review
- **Reject** - Mark irrelevant documents as rejected with reason
- **Reassign** - Change the assigned control when suggestion is wrong
- **Create Control** - Create a new local control from suggestion
- **Re-analyze** - Request fresh AI classification
- **Edit Metadata** - Update tags, descriptions, evidence date
- **Add Notes** - Audit trail comments

### 3. Analysis Strategy: Confidence Thresholds

**Decision:** Use confidence thresholds to differentiate between matches and suggestions.

| Confidence | Classification | Action |
|------------|----------------|--------|
| 80%+ | Match | Auto-suggest assignment to specific control |
| 40-79% | Suggestion | Flag for manual review, suggest creating control |
| <40% | Irrelevant | Mark as potentially irrelevant, user confirms |

---

## Implementation Plan

### Phase 1: Schema & API

1. **Migrate `evidenceItems` table**
   - Add `classificationResult` JSON column
   - Add `suggestedControlId` foreign key
   - Add `reviewNotes`, `reviewedBy`, `reviewedAt` columns
   - Update status enum to include 'draft'

2. **Create classification service**
   - `src/lib/services/document-classifier.ts`
   - Interface with AI for document analysis
   - Return structured `ClassificationResult`

3. **Update upload flow**
   - On upload, status = 'draft'
   - Trigger async classification job
   - Store results in `classificationResult`

### Phase 2: Documents Page UI

#### Route Structure
```
/app/sites/$siteId/documents
  - index.tsx (main page with tabs)
  - drafts/
    - route.tsx (drafts list + detail view)
  - review/
    - route.tsx (pending review + approved)
```

#### Tab Structure

**Tab 1: Drafts**
- Filters: All | Matched | Suggestions | Irrelevant
- Columns: Document, Classification, Confidence, Suggested Control, Actions
- Detail panel: Preview, metadata, action buttons

**Tab 2: Pending Review / Approved**
- Filters: Pending Review | Approved | Rejected
- Columns: Document, Control, Status, Reviewer, Date
- Detail panel: Approval workflow, history

### Phase 3: Workflow Actions

#### Draft Document Actions

```typescript
// Accept match - assign to suggested control
async function acceptMatch(documentId: string, controlId: string) {
  await db.update(evidenceItems)
    .set({
      localControlId: controlId,
      status: 'pending_review',
      reviewedBy: currentUser.id,
      reviewedAt: new Date(),
    })
    .where(eq(evidenceItems.id, documentId));
}

// Reject as irrelevant
async function rejectAsIrrelevant(documentId: string, reason: string) {
  await db.update(evidenceItems)
    .set({
      status: 'rejected',
      reviewNotes: reason,
      reviewedBy: currentUser.id,
      reviewedAt: new Date(),
    })
    .where(eq(evidenceItems.id, documentId));
}

// Create control from suggestion and assign
async function createControlAndAssign(
  documentId: string, 
  controlData: NewLocalControl
) {
  const control = await db.insert(localControls).values(controlData).returning();
  await acceptMatch(documentId, control[0].id);
}
```

---

## UI Mockups

### Drafts Tab Layout

```
+------------------------------------------------------------------+
| Documents                                          [+ Upload]     |
+------------------------------------------------------------------+
| [Drafts] [Pending Review / Approved]                              |
+------------------------------------------------------------------+
| Filter: [All v]  [Matched] [Suggestions] [Irrelevant]   Search:[] |
+------------------------------------------------------------------+
| DOCUMENT LIST                    | DOCUMENT DETAIL                |
|                                  |                                |
| [x] Training_Cert_2024.pdf       | Training_Cert_2024.pdf         |
|     Match (92%) - Fire Safety    | ================================|
|                                  | [Preview Image/PDF]            |
| [ ] Staff_Meeting_Notes.docx     |                                |
|     Suggestion (65%)             | Classification: Match          |
|                                  | Confidence: 92%                |
| [ ] Holiday_Photo.jpg            | Matched Control: Fire Safety   |
|     Irrelevant (15%)             | Training                       |
|                                  |                                |
|                                  | Reasoning:                     |
|                                  | "Document contains fire safety |
|                                  | training certificates dated    |
|                                  | 2024, matching the Fire Safety |
|                                  | Training control..."           |
|                                  |                                |
|                                  | [Approve & Assign] [Reassign]  |
|                                  | [Reject] [Re-analyze]          |
+------------------------------------------------------------------+
```

### Suggestion Flow

```
+------------------------------------------------------------------+
| Staff_Meeting_Notes.docx                                          |
+------------------------------------------------------------------+
| Classification: Suggestion                                        |
| Confidence: 65%                                                   |
|                                                                   |
| AI suggests creating a new control:                               |
| +--------------------------------------------------------------+ |
| | Title: Staff Meeting Minutes                                  | |
| | Quality Statement: Safe > Governance                          | |
| | Frequency: Monthly                                            | |
| +--------------------------------------------------------------+ |
|                                                                   |
| [Create Control & Assign]  [Assign to Existing]  [Mark Irrelevant]|
+------------------------------------------------------------------+
```

### Irrelevant Document

```
+------------------------------------------------------------------+
| Holiday_Photo.jpg                                                 |
+------------------------------------------------------------------+
| Classification: Irrelevant                                        |
| Confidence: 15%                                                   |
|                                                                   |
| ! This document doesn't appear to be relevant to any compliance   |
|   controls. It may have been uploaded in error.                   |
|                                                                   |
| Reasoning: "Image appears to be a personal photograph without     |
| any compliance, training, or policy content."                     |
|                                                                   |
| [Confirm Irrelevant]  [Actually Relevant - Assign]                |
+------------------------------------------------------------------+
```

---

## Technical Considerations

### 1. Async Classification

Documents should be classified asynchronously after upload:

```typescript
// On upload complete
await queueDocumentClassification({
  documentId: newDoc.id,
  r2Key: newDoc.r2Key,
  siteId: params.siteId,
});
```

### 2. Re-analysis

Users can request re-analysis if classification seems wrong:

```typescript
async function reanalyzeDocument(documentId: string) {
  await db.update(evidenceItems)
    .set({ 
      classificationResult: null, // Clear old result
      status: 'draft' 
    })
    .where(eq(evidenceItems.id, documentId));
    
  await queueDocumentClassification({ documentId });
}
```

### 3. Bulk Actions

Support bulk operations on drafts:
- Approve all matched documents
- Reject all irrelevant documents
- Re-analyze selected documents

---

## Migration Path

Since `evidenceItems` already has a `status` field with values `'pending_review' | 'approved' | 'rejected' | 'archived'`, we need to:

1. Add `'draft'` as a new valid status
2. Add new columns: `classificationResult`, `suggestedControlId`, `reviewNotes`, `reviewedBy`, `reviewedAt`
3. Existing documents remain unchanged (they have `localControlId` set)
4. New uploads without `localControlId` start with `status: 'draft'`

---

## Success Metrics

- **Classification Accuracy**: % of AI classifications confirmed by users
- **Triage Time**: Average time from upload to assignment
- **Suggestion Adoption**: % of suggestions that lead to new controls
- **User Overrides**: % of classifications manually changed

---

## Open Questions

1. Should we allow documents to be assigned to multiple controls?
2. What's the retry strategy for failed classifications?
3. Should irrelevant documents be auto-deleted after X days?
4. Do we need email notifications for documents awaiting review?
