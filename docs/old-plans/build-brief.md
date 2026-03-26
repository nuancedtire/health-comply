# CQC Compliance Management System – Complete Build Brief
## MVP for Single GP Practice

**Document Version:** 1.0  
**Status:** Ready for Development  
**Last Updated:** December 2025  
**Audience:** Development Team, Product Manager, QA Lead

---

## EXECUTIVE SUMMARY

This document specifies the MVP for a **CQC-ready compliance and evidence management system** for a single GP practice. The system centralises evidence collection, assessment, gap detection, and policy management against the CQC's 5 key questions and 34 quality statements. AI handles first-pass processing (evidence tagging, gap detection, policy drafting); humans approve, modify, and own all decisions.

**Key principle:** *Inspection readiness = continuous, auditable, evidence-backed assessments mapped to CQC standards.*

**Deployment model:** SaaS web application (responsive design). Mobile-optimised capture flows for staff uploads desirable but **not MVP scope**.

---

## 1. PRODUCT VISION & GOALS

### 1.1 Problem Statement
GP practices face fragmented compliance workflows:
- Evidence scattered across email, Google Drive, SharePoint, paper records
- No clear mapping of evidence to CQC quality statements
- Gap detection is reactive (post-inspection) rather than continuous
- Policy creation and version control are manual and untracked
- Staff don't know about or acknowledge policy changes
- Audit trails are incomplete or non-existent
- Inspection packs are hastily assembled, missing key evidence

**Impact:** Practices are unprepared for CQC inspection, face enforcement notices, and waste time on compliance firefighting.

### 1.2 Solution Vision
A **single, AI-assisted compliance hub** where:
1. Evidence is centralised, tagged, and linked to CQC standards in real-time
2. AI suggests tagging, gaps, and policy improvements—humans decide
3. Compliance dashboards show statement readiness at a glance
4. Actions are tracked to completion with evidence linkage
5. Inspection packs are auto-generated with full audit trails
6. Every decision (AI approval, action close-out, policy publication) is logged and attributable

**Outcome:** Practice manager and clinical leaders maintain **continuous inspection readiness** with confidence, supported by transparent AI and human governance.

### 1.3 Success Metrics (Post-MVP)
- Evidence coverage: ≥2 evidence categories per quality statement (target: across all 34 statements)
- Action closure rate: 90%+ of actions closed with linked evidence within due date
- Time saved: 50% reduction in time to export inspection packs vs. manual approach
- AI accuracy: >85% correct evidence category predictions; >70% correct statement tag suggestions
- User adoption: >80% of staff acknowledge policy changes within 2 weeks of publication
- Audit readiness: 100% of compliance decisions traceable (user, timestamp, before/after state)

---

## 2. REGULATORY FRAMEWORK

### 2.1 CQC Assessment Framework (As of Dec 2025)
The CQC evaluates healthcare services against:

**5 Key Questions (KQs):**
1. **Is it Safe?** – Patients protected from harm; staffing, systems, and training in place
2. **Is it Effective?** – Evidence-based care; outcomes monitored; staff competent
3. **Is it Caring?** – Compassion, dignity, person-centred care; people's experience captured
4. **Is it Responsive?** – Services accessible; individual needs met; waiting times acceptable
5. **Is it Well-led?** – Leaders set vision and values; governance clear; culture of learning

**34 Quality Statements** – Specific, achievable statements of good care under each KQ (e.g. under Safe: "Learning culture", "Safe systems, pathways, and transitions", "Safeguarding", etc.)

### 2.2 Six Evidence Categories
The CQC triangulates evidence across six categories; the system must support tagging evidence to **one or more** category. For detailed definitions, refer to the [official CQC evidence categories page](https://www.cqc.org.uk/about-us/how-we-work/how-we-use-evidence-and-information/evidence-categories).

1. **People's Experience** – Service user/patient feedback, surveys, interviews, accessibility
2. **Feedback from Staff and Leaders** – Staff surveys, focus groups, interviews, appraisals, whistleblowing reports
3. **Feedback from Partners** – Referrer feedback, commissioner views, partner organisation reports
4. **Observation of Care** – Direct observation by inspectors (or your own spot checks, shadowing records)
5. **Processes** – Policies, procedures, audit reports, governance meeting minutes, HR/recruitment records, training logs, clinical records spot checks
6. **Outcomes** – Patient safety incidents, infection control metrics, complaints, clinical audit results, staff retention rates, training completion rates

The product uses CQC’s evidence categories to support triangulation and internal readiness analysis rather than attempting to replicate CQC scoring mechanics.

### 2.3 Regulatory Context
- **Scope:** GP practices regulated under Health and Social Care Act 2008 (Regulated Activities) Regulations 2014 and Care Quality Commission (Registration) Regulations 2009
- **Inspection frequency:** Typically every 2–3 years for "Good" practices; more frequent if rated "Requires Improvement" or "Inadequate"
- **Inspection notice:** Usually 28 days, but unannounced inspections are possible
- **Outcome:** Practice rated as Outstanding, Good, Requires Improvement, or Inadequate; individual KQs are rated separately

---

## 3. PRODUCT SCOPE & FEATURES

### 3.1 Feature Overview

| Feature | Scope | Priority | Notes |
|---------|-------|----------|-------|
| Evidence Locker | Upload/link; versioning; metadata | **MVP** | Core feature |
| Tagging UI | Quality statements + evidence categories + free tags | **MVP** | Critical for CQC mapping |
| Statement Readiness Workspace | Per-statement view, dashboards, coverage | **MVP** | Decision-making hub |
| Actions & Gaps | Create, assign, track, close with evidence | **MVP** | Compliance execution |
| Inspection Pack Export | Auto-generate by KQ/statement with audit trail | **MVP** | Final deliverable |
| AI Evidence Processing | Suggest type, tags, category, summary | **MVP** | Reduces manual tagging |
| AI Gap Detection & Action Drafting | Readiness scan, suggest gaps, draft actions | **MVP** | Proactive readiness |
| AI Policy Drafting | Generate policy from source docs + notes | **MVP** | Reduces policy writing time |
| User & Role Management | Practice manager, GP/clinical lead, staff roles | **MVP** | Core access control |
| Audit Trail | Log all decisions, who/when/what changed | **MVP** | Regulatory requirement |
| Notifications & Task Assignments | Alert on due actions, policy acknowledgements | **Post-MVP** | Nice-to-have; use in-app for MVP |
| Mobile-first Capture | Optimised UI for staff uploads on mobile | **Post-MVP** | Improve field adoption |
| Integrations | SharePoint, Google Drive, O365 | **MVP (Links)** | Link support; full sync post-MVP |
| Analytics & Reporting | Readiness trends, action KPIs, AI accuracy | **Post-MVP** | Useful but not blocking |

### 3.2 Core Features – Detailed Spec

---

#### 3.2.1 EVIDENCE LOCKER

**Overview:** Centralised repository for all compliance evidence (documents, links, metadata). Evidence is versioned and immutable once approved.

**User Flow:**
1. Practice manager or staff member uploads a file (PDF, Word, Excel, image) or adds a link (Google Drive, SharePoint, web URL)
2. System prompts for metadata: title, owner, evidence date/period, review due date, confidentiality level
3. AI suggests: evidence type, quality statement tags (top 3 + confidence), evidence category, summary, key metadata (extracted dates, roles, version numbers)
4. Human reviews and approves AI suggestions; edits as needed
5. Evidence is marked "active" and added to the locker; AI suggestions + final approved fields are logged
6. To update evidence, user creates a new version (old version becomes read-only; audit trail links them)

**Data Model:**

```
EvidenceItem
├─ id (UUID)
├─ practice_id (FK)
├─ title (string)
├─ description (text)
├─ owner_user_id (FK)
├─ evidence_date / evidence_period (date / date range)
├─ review_due_date (date)
├─ status (enum: draft, active, archived)
├─ confidentiality_level (enum: public, internal, restricted)
├─ evidence_type (enum: policy, audit_report, training_record, meeting_minutes, 
    incident_report, metric, complaint, feedback, observation, clinical_record, 
    staff_appraisal, other)
├─ created_at (timestamp)
├─ created_by (FK User)
├─ updated_at (timestamp)
├─ updated_by (FK User)
├─ superseded_by_version_id (FK EvidenceItem, nullable)

EvidenceVersion
- id (UUID)
- evidence_item_id (FK)
- version_number (int)
- source_type (enum: upload, external_link)
- r2_bucket (string, nullable; if upload)
- r2_object_key (string, nullable; if upload)
- external_url (string, nullable; if external_link)
- file_name (string, nullable)
- file_size (int, nullable)
- mime_type (string, nullable)
- extracted_text_pointer (string, nullable; either small inline text in D1 or R2 key for large text)
- created_at (timestamp)

EvidenceItemTag
├─ id (UUID)
├─ evidence_item_id (FK)
├─ quality_statement_id (FK, nullable)
├─ evidence_category_id (FK)
├─ free_tag (string, nullable; e.g., "infection control", "staffing")
├─ why_it_supports (text; user's explanation of link)
├─ created_at (timestamp)
├─ created_by (FK User)

AIEvidenceSuggestion
├─ id (UUID)
├─ evidence_item_id (FK)
├─ ai_job_id (FK)
├─ suggested_type (string, confidence float)
├─ suggested_statements (JSON: [{statement_id, confidence}, ...])
├─ suggested_category (string, confidence float)
├─ suggested_summary (text)
├─ suggested_metadata (JSON: {extracted_dates, roles, etc.})
├─ approved_at (timestamp, nullable)
├─ approved_by (FK User, nullable)
├─ rejected_at (timestamp, nullable)
├─ notes (text)
```

**UI Components:**
- **Upload modal:** Drag-and-drop or file picker; metadata form; preview
- **Link adder:** URL field; metadata form; URL validation
- **AI review panel:** Side-by-side: AI suggestions vs. approved fields; edit, approve, reject buttons; confidence scores visible
- **Evidence card:** Title, owner, evidence date, review due date, status badge, tag list, action buttons (view, edit metadata, create version, archive)
- **Search & filter:** By title, owner, date range, status, evidence type, statement tag, evidence category, free tag, confidentiality level

**Validation:**
- File size limit: 50 MB per file
- Supported formats: PDF, DOC/DOCX, XLS/XLSX, PNG, JPG, JPEG, GIF, TXT, CSV
- External URLs: Validate HTTPS, check domain whitelist (e.g., sharepoint.com, drive.google.com)
- Metadata: Title required; owner auto-populated from logged-in user; evidence date required; review due date optional but recommended

**Permissions:**
- Practice manager: Upload, link, create versions, archive, review AI suggestions
- Clinical lead: Upload, link, review AI suggestions (for clinically-relevant evidence)
- Staff: Upload evidence related to their role; cannot archive or review AI suggestions for others' uploads

---

#### 3.2.2 TAGGING UI & QUALITY STATEMENT MAPPING

**Overview:** Intuitive interface to tag evidence against CQC quality statements, evidence categories, and free tags.

**User Flow:**
1. User opens evidence item (new or existing)
2. "Tags" section shows:
   - Quality statement(s): Multi-select dropdown or searchable list (34 statements grouped by KQ); shows statement text and KQ name
   - Evidence category: Single-select dropdown (6 categories)
   - Free tags: Add/remove text tags (e.g., "infection control", "safeguarding")
   - "Why it supports" note: Free-text field (1–2 sentences explaining the link)
3. AI pre-populates suggestions; user can accept, modify, or ignore
4. User submits; tagging is logged with user, timestamp, and version

**Data Model:**

```
QualityStatement
├─ id (UUID)
├─ key_question_id (FK)
├─ statement_number (int; 1–7 per KQ)
├─ statement_text (text)
├─ description (text, nullable)
├─ regulation_links (JSON; links to specific regulations)
├─ created_at (timestamp)

KeyQuestion
├─ id (UUID)
├─ number (int; 1–5)
├─ short_name (enum: safe, effective, caring, responsive, well_led)
├─ full_question (text; "Is it Safe?")
├─ created_at (timestamp)

EvidenceCategory
├─ id (UUID)
├─ name (enum: peoples_experience, staff_leader_feedback, partner_feedback, 
         observation, processes, outcomes)
├─ description (text)
├─ created_at (timestamp)
```

**UI Components:**
- **Statement selector:** Grouped dropdown or searchable list; show KQ and statement number for context; allow multiple selections
- **Category selector:** Simple dropdown; only one selection
- **Free tag input:** Autocomplete from existing tags + ability to add new; max 5 tags per evidence item
- **Why it supports field:** Text area (max 500 chars); optional but encouraged
- **AI suggestion panel:** Show AI's top 3 statement suggestions with confidence%; one-click accept or ignore
- **Visual feedback:** Show which statements are already tagged; highlight additions/removals

**Validation:**
- At least one quality statement + one evidence category required before "Active" status
- "Why it supports" encouraged but not mandatory
- Free tags: lowercase, max 20 chars, alphanumeric + hyphen

**Permissions:**
- Practice manager, clinical lead, staff can all tag their own evidence
- Practice manager can review/modify tags for any evidence

---

#### 3.2.3 STATEMENT READINESS WORKSPACE

**Overview:** Dashboard-driven interface showing the readiness of each quality statement (33+ statements, grouped by KQ). Centralises evidence, assessments, gaps, actions, and review schedules.

**User Flow:**
1. Practice manager opens "Readiness" dashboard
2. Views two layouts:
   a. **By Key Question:** Shows 5 KQs (Safe, Effective, Caring, Responsive, Well-led); each expandable to show child statements with readiness summary
   b. **By Statement:** Shows all 34 statements; filterable by KQ, assessment status, or gap count
3. Clicking a statement opens a **Statement Detail View:**
   - Statement text and regulation links
   - **Evidence section:** List of linked evidence; filter by evidence category; add/remove evidence links
   - **Assessment section:** Latest statement assessment (free-text summary + RAG score or 1–4); last assessed by/date; history of assessments
   - **Gaps section:** List of linked gaps; create new gap; edit/close gaps
   - **Actions section:** List of linked actions; create new action; filter by status (open, in progress, due, overdue, closed)
   - **Reviews section:** Last review date; next review due date; manual "review now" button; review schedule (e.g., quarterly)

**Data Model:**

```
StatementAssessment
├─ id (UUID)
├─ quality_statement_id (FK)
├─ practice_id (FK)
├─ assessment_text (text; free-form summary)
├─ assessment_score (enum: RAG [red, amber, green] OR 1–4 scale)
├─ assessed_by (FK User)
├─ assessed_at (timestamp)
├─ is_latest (boolean)
├─ created_at (timestamp)

StatementReview
├─ id (UUID)
├─ quality_statement_id (FK)
├─ practice_id (FK)
├─ last_reviewed_at (timestamp)
├─ next_review_due_at (timestamp)
├─ review_frequency (enum: monthly, quarterly, bi_annual, annual, as_needed)
├─ created_at (timestamp)

Gap
├─ id (UUID)
├─ quality_statement_id (FK)
├─ practice_id (FK)
├─ title (string)
├─ description (text)
├─ severity (enum: low, medium, high, critical)
├─ status (enum: open, in_progress, closed)
├─ root_cause (text, nullable)
├─ created_by (FK User)
├─ created_at (timestamp)
├─ closed_at (timestamp, nullable)
├─ closed_by (FK User, nullable)

Action
├─ id (UUID)
├─ gap_id (FK, nullable)
├─ quality_statement_id (FK, nullable)
├─ practice_id (FK)
├─ title (string)
├─ description (text)
├─ owner_user_id (FK)
├─ due_date (date)
├─ status (enum: open, in_progress, due, overdue, completed, cancelled)
├─ priority (enum: low, medium, high, critical)
├─ created_by (FK User)
├─ created_at (timestamp)
├─ completed_at (timestamp, nullable)
├─ completed_by (FK User, nullable)
├─ completion_reason (enum: completed_with_evidence, completed_no_evidence, cancelled)
├─ completion_evidence_note (text, nullable; explanation if "no evidence needed")
├─ completion_approved_by (FK User, nullable)
├─ is_overdue (boolean, computed)

ActionComment
├─ id (UUID)
├─ action_id (FK)
├─ comment_text (text)
├─ created_by (FK User)
├─ created_at (timestamp)

ActionEvidenceLink
├─ id (UUID)
├─ action_id (FK)
├─ evidence_item_id (FK)
├─ linked_at (timestamp)
├─ linked_by (FK User)
```

**UI Components:**
- **KQ Summary card:** Shows KQ name, count of statements with gaps, count of overdue actions, overall readiness % (estimated from linked evidence breadth)
- **Statement card:** Shows statement number, title, assessment score (RAG/1–4), last assessed date, count of linked evidence, count of open gaps, count of overdue actions; click to expand or open detail view
- **Statement Detail View:**
  - **Evidence list:** Cards showing each linked evidence item; icons for evidence category; "Remove" option; "Add evidence" button opens search/link dialog
  - **Assessment panel:** Display latest assessment text + score; "Edit assessment" button; show assessment history (collapsible timeline)
  - **Gaps panel:** List gaps; colour-coded by severity; "Create gap" button; click gap to edit
  - **Actions panel:** List actions; colour-code by status (open=blue, due=amber, overdue=red, completed=green); filter by status; "Create action" button; click action to edit
  - **Reviews panel:** Show "Last reviewed: X days ago" + "Next review due: Y days" + "Review frequency: Quarterly"; "Review now" button

**Dashboards:**
- **Readiness by KQ:** 5 cards, one per KQ; each shows: count of statements, count of statements with ≥1 evidence item, count of gaps, count of overdue actions, % coverage (statements with ≥2 evidence categories), trend (vs. last month)
- **Readiness by Statement:** Table with columns: KQ, Statement #, Title, Assessment Score, Evidence Count, Gaps Count, Actions Count (open/overdue), Last Reviewed, Next Review Due; sortable, filterable; export to CSV
- **Evidence coverage heat map (optional, Post-MVP):** 34×6 grid (statements × evidence categories); colour each cell by coverage depth (no evidence = grey, 1 item = light, 2+ items = dark); helps spot gaps like "Safe but only processes evidence, missing outcomes"

**Validations:**
- Assessment score required before "ready" status
- Action completion rule: cannot mark action "completed" without either:
  - Linking ≥1 evidence item, OR
  - Selecting "No evidence needed" + providing reason + approval from GP/practice manager
- Gap severity triggers alerts: "Critical" gaps should have owner + due date; "High" gaps reviewed monthly

**Permissions:**
- Practice manager: View all, edit assessments, manage gaps, manage actions
- Clinical lead: View all, edit clinical assessments, approve action completion
- Staff: View own actions and assigned gaps; cannot edit assessments

---

#### 3.2.4 ACTIONS, GAPS & RISKS MANAGEMENT

**Overview:** Structured workflow for creating, assigning, tracking, and closing compliance gaps and associated actions. Actions must be evidence-backed or explicitly justified.

**Workflows:**

**Creating a Gap (Manual):**
1. Practice manager opens a statement detail view or gaps dashboard
2. Clicks "Create Gap"; fills in title, description, severity, assigns to owner
3. Gap created with status "open"; linked to statement
4. Owner notified (in-app; post-MVP: email)

**Creating an Action:**
1. Action can be linked to a gap or directly to a statement
2. Creator fills in: title, description, owner, due date, priority
3. Action created with status "open"
4. Owner sees action in task list; can add comments

**Closing an Action (with Evidence Rule):**
1. Owner marks action "completed"
2. System checks: Does action have ≥1 linked evidence item?
   - **YES:** Action marked "completed with evidence"; practice manager approves (optional but logged); action closed
   - **NO:** System asks: "No evidence linked. Is evidence needed?" 
     - If YES: Owner must link evidence before closing
     - If NO: Owner must provide reason + get clinical lead or practice manager approval; reason logged; action closed with "completed_no_evidence" status

**Closing a Gap:**
1. Gap can only be "closed" if all linked actions are completed
2. Practice manager or clinical lead reviews gap status; if ready, marks "closed"
3. Closure date and closer's name logged

**Risk Management (Stretch Goal, MVP Scope):**
- Simple 1-to-many: Gap can be linked to one or more "risks" (e.g., "Patient harm", "Enforcement notice")
- Risk card shows: title, severity (probability × impact), mitigation strategy, owner, review date
- Risks feed into practice risk register; no deep integration required for MVP

**Data Model (see 3.2.3 above for Action/Gap tables)**

**UI Components:**
- **Gap creation form:** Title, description, severity (dropdown), owner (user search), statement (pre-populated if from statement view)
- **Action creation form:** Title, description, owner (user search), due date (date picker), priority (dropdown), gap link (search/autocomplete)
- **Action card (in list):** Title, owner, due date (colour-coded: green if future, amber if <7 days, red if overdue), status badge, priority icon, "View" button
- **Action detail view:** Full form; comments thread; linked evidence list; "Add evidence" button; completion section
- **Completion modal:** Evidence check → if none linked, ask "Is evidence needed?"; if no, show reason field + approval dropdown; if yes, redirect to link evidence
- **Gap status board (Kanban, optional):** Columns: open, in progress, resolved; drag-and-drop to update status (optional, drag may be over-engineered for MVP)

**Validations:**
- Action title + owner + due date required
- Due date must be future date or today
- Cannot close action without evidence link or explicit "no evidence" reason + approval
- Cannot close gap until all linked actions are closed

**Notifications (Post-MVP, but plan for):**
- Action due in 7 days → in-app alert
- Action overdue → daily in-app alert
- Action assigned to user → in-app notification

**Permissions:**
- Practice manager: Create, edit, close all gaps and actions
- Clinical lead: Create, edit clinical gaps/actions; approve action completion
- Action owner: View own actions, add comments, mark complete (subject to evidence rule)
- Staff: View own assigned actions; cannot create or edit

---

#### 3.2.5 INSPECTION PACK EXPORT

**Overview:** Auto-generate polished, CQC-ready export bundle by Key Question or by Quality Statement. Includes evidence index, linked documents, and audit trail summary.

**User Flow:**
1. Practice manager opens "Export" section
2. Chooses export scope: "By Key Question" (5 PDFs, one per KQ) or "By Statement" (34 PDFs, one per statement)
3. Reviews preview: which statements included, which evidence bundled, which links included
4. Clicks "Generate & Download"; system creates ZIP file (or allows per-file download)

**Export Structure (By Key Question example):**

```
CQC_Inspection_Pack_[PracticeName]_[Date].zip
├── 1_Safe_Summary.pdf
│   ├── KQ overview (auto-generated summary of all statements under "Safe")
│   ├── For each statement:
│   │   ├── Statement title + text
│   │   ├── Assessment summary (latest assessment text + score)
│   │   ├── Evidence list (title, owner, date, evidence category, version)
│   │   ├── Gaps summary (open/closed gap counts)
│   │   ├── Actions summary (open/completed action counts)
│   │   ├── Audit trail snippet (last 3 assessments: who, when, score)
│   ├── Appendix: all linked evidence summaries
├── 2_Effective_Summary.pdf
├── 3_Caring_Summary.pdf
├── 4_Responsive_Summary.pdf
├── 5_Well_Led_Summary.pdf
├── Evidence_Attachments/
│   ├── [Evidence_Item_ID]_[Title].pdf
│   ├── [Evidence_Item_ID]_[Title].docx
│   ├── ...
├── Links_Reference.txt
│   (List of all external links: Google Drive, SharePoint URLs with access notes)
└── Audit_Trail_Summary.txt
    (Timeline of assessments, gaps, actions, policy updates)
```

**Export Structure (By Statement example):**

```
CQC_Inspection_Pack_[PracticeName]_[Date].zip
├── 01_Safe_01_Learning_Culture.pdf
├── 01_Safe_02_Safe_Systems.pdf
├── ...
├── 05_Well_Led_07_Culture.pdf
├── Evidence_Attachments/ (as above)
├── Links_Reference.txt
└── Audit_Trail_Summary.txt
```

**PDF Content per Statement:**

```
┌─────────────────────────────────────────────────────────┐
│ CQC INSPECTION READINESS PACK                           │
│ [Practice Name]                                         │
│ Generated: [Date]                                       │
└─────────────────────────────────────────────────────────┘

KEY QUESTION: [Safe / Effective / Caring / Responsive / Well-led]
QUALITY STATEMENT: [#.N] [Statement Title]

STATEMENT TEXT:
[Full CQC quality statement text]

ASSESSMENT SUMMARY:
Assessment Score: [RAG or 1–4]
Last Assessed: [Date] by [Name]
Assessment Notes:
[Free-text summary]

EVIDENCE COVERAGE:
[Table: Evidence Item | Category | Date | Owner | Link/Attachment]
- Total evidence items: [N]
- Categories represented: [list]
- Gaps in evidence: [auto-generated note, e.g., "Missing outcomes data"]

COMPLIANCE GAPS:
[Table: Gap Title | Severity | Status | Owner]

ACTIONS IN PROGRESS:
[Table: Action Title | Owner | Due Date | Status]

AUDIT TRAIL (Last 3 Updates):
[Timeline: Date | Who | What Changed | Before/After]

────────────────────────────────────────────────────────
[Repeat for each statement]
────────────────────────────────────────────────────────

APPENDIX: EVIDENCE ITEM SUMMARIES
[For each evidence item linked above:]
- Title: [Title]
- Owner: [Name]
- Date: [Date]
- Evidence Category: [Category]
- Why It Supports: [User's explanation]
- Extraction (if available): [Key dates, roles, metrics extracted by AI]

EXTERNAL LINKS REFERENCE:
[List all SharePoint, Google Drive, web URLs; include access instructions]
- Link 1: [URL] (Owner: [Name], Last Verified: [Date])
- Link 2: [URL]
...

AUDIT TRAIL SUMMARY:
Full timeline of all assessments, gap creations, action completions, 
policy publications, and staff acknowledgements. [Optional: detailed log]
```

**Technical Implementation:**
- Use a PDF generation library (e.g., LibreOffice/unoconv, Puppeteer, ReportLab for Python) to template and render
- Store generated PDFs in R2 (object storage); clean up after 30 days (or allow user to re-download within 30 days)
- ZIP bundling: Use Node.js `archiver` or Python `zipfile`
- Evidence attachments: Embed PDFs/images directly if <5 MB; for larger files or external links, include references + instructions

**UI Components:**
- **Export wizard:** Step 1: Choose scope (by KQ or statement). Step 2: Filter (which statements, which evidence types, date range). Step 3: Preview (show list of statements, evidence count, total file size). Step 4: Download (ZIP + option to email)
- **Export history:** List of recent exports; ability to re-download; delete old exports

**Validations:**
- Cannot export until ≥1 statement has an assessment
- Warn if >50% of statements have gaps or overdue actions ("Practice may not be inspection-ready")
- Check file size; warn if >100 MB total; offer filtered export

**Permissions:**
- Practice manager: Can export anytime
- Clinical lead: Can export (informational)
- Staff: Cannot export

**Post-MVP Enhancements:**
- Email export to external stakeholders (e.g., CCG commissioner, CQC inspector)
- Scheduled exports (weekly/monthly readiness reports to leadership)
- Custom templates (re-order sections, add practice logo/branding)

---

### 3.3 AI Features – Detailed Spec

---

#### 3.3.1 AI EVIDENCE PROCESSING

**Overview:** On upload or link addition, AI models process the evidence and suggest: evidence type, quality statement tags (top 3), evidence category, summary, and extracted metadata. Human reviews and approves suggestions before evidence enters the active locker.

**Triggers:**
- File uploaded to evidence locker
- External link added to evidence locker

**AI Processing Pipeline:**

```
Input: File or Link
         ↓
Step 1: Text Extraction
        - If file: OCR (for images) or PDF/Office parsing
        - If link: Fetch & extract text (for web URLs); for SharePoint/Drive, use preview
        - Output: Full text + metadata (embedded dates, author, version number)
        
        ↓
Step 2: Document Type Classification
        - Model: Few-shot or fine-tuned classifier (Logistic Regression, BERT-based)
        - Input: Document text + filename
        - Output: Predicted type (policy, audit_report, training_record, meeting_minutes, 
                 incident_report, metric, complaint, feedback, observation, clinical_record,
                 staff_appraisal, other)
        - Confidence: Float 0–1
        
        ↓
Step 3: Quality Statement Tag Suggestion
        - Model: Semantic similarity (embedding-based) or fine-tuned classifier
        - Input: Document text + metadata + CQC statement descriptions
        - Method: 
          Option A (Simpler, MVP-friendly): 
            - Embed document using transformer (e.g., sentence-transformers)
            - Embed all 34 CQC statements
            - Compute cosine similarity; rank top 3
          Option B (More Accurate, post-MVP):
            - Fine-tune classifier on corpus of practice documents + correct statement tags
            - Train/validate on historical evidence items
        - Output: [(statement_id_1, confidence_0.92), (statement_id_2, confidence_0.78), ...]
        
        ↓
Step 4: Evidence Category Suggestion
        - Model: Multi-label classifier or heuristic rules
        - Input: Document type + text + metadata
        - Method:
          - Rule-based heuristic (fast, MVP-friendly):
            Policy files → Processes
            Audit files → Outcomes
            Training records → Processes
            Patient feedback → People's Experience
            Staff survey → Staff & Leader Feedback
            Clinical record → Outcomes
            Meeting minutes → Processes (or Feedback, depending on content)
          - Or: Fine-tuned classifier on training data
        - Output: One of [peoples_experience, staff_leader_feedback, partner_feedback, 
                 observation, processes, outcomes]
        - Confidence: Float
        
        ↓
Step 5: Summary & Metadata Extraction
        - Extract: Document title, dates (creation, modified), version number, 
                  mentioned roles/departments, key metrics/findings
        - Generate summary: 5–10 bullet points of key facts
        - Method: Extractive (select top sentences) or abstractive (fine-tuned summarizer)
        - Output: {summary: "...", extracted_dates: [...], extracted_roles: [...], 
                  extracted_metrics: [...]}
        
        ↓
Output: AIEvidenceSuggestion record
        (Store all suggestions; wait for human approval before confirming)
```

**Models & Technologies (MVP-Friendly Recommendations):**
- **Text extraction:** PyPDF2 (PDF), python-docx (Word), openpyxl (Excel), Tesseract (OCR)
- **Document type classification:** Pre-trained transformer (e.g., DistilBERT) + few-shot prompting, or simple Logistic Regression on TF-IDF features (faster, lighter)
- **Statement tagging:** Sentence-transformers library (all-MiniLM-L6-v2 or all-mpnet-base-v2) for semantic similarity
- **Evidence category:** Rule-based heuristic (fastest for MVP) or sklearn RandomForest classifier
- **Summary:** Extractive approach (select top 3–5 sentences using TF-IDF + position bias) or use abstractive model (Hugging Face `facebook/bart-large-cnn`, slower but better quality)
- **Metadata extraction:** Regex + spaCy NER (named entity recognition) for roles/departments + built-in file metadata

**Data Model (see 3.2.1 above for AIEvidenceSuggestion table)**

**Human Review Workflow:**
1. After AI processing completes, evidence status set to "draft"
2. "Review AI Suggestions" screen shows:
   - Left side: AI suggestions (type with confidence, top 3 statements with confidence, category with confidence, summary, extracted metadata)
   - Right side: Input form (edit suggested values, add/remove statements, add free tags, edit "why it supports" note)
   - Buttons: "Approve As-Is", "Approve & Edit" (save changes), "Reject & Re-Run" (reprocess with hints)
3. On approval, suggestions are logged + final values saved; evidence status → "active"
4. On rejection, AI may re-run with user feedback (e.g., "This is a policy, not a training record"; system re-weights model inputs)

**Accuracy & Feedback Loop:**
- Log AI suggestions vs. human-approved values
- Monthly review: Compare predictions to approvals; measure precision/recall per model
- Retrain models if <85% precision or <75% recall (post-MVP: active learning)

**Error Handling:**
- If text extraction fails (corrupted file, unsupported format): Notify user; allow manual override
- If suggestion low-confidence (<50%): Flag in UI ("AI unsure; please review carefully")
- If link unreachable: Notify user; allow retry or manual description

**API & Async Processing:**
- Evidence upload triggers a **Cloudflare Workflow** (durable async job) that processes extraction + AI inference, then writes suggestions back to D1 and optionally pauses until a human approves or edits the suggested fields.
- AI processing runs in background (target: <30 sec for typical file)
- User can upload multiple files; queue shown in UI
- Webhooks/polling to update UI when suggestions ready

---

#### 3.3.2 AI GAP DETECTION & ACTION DRAFTING

**Overview:** Automated "readiness scan" analyzes statement evidence coverage and flags gaps. User can then manually approve AI-drafted gaps and actions or refine them.

**Trigger:**
- Manual "Run Readiness Scan" button (or scheduled daily/weekly, post-MVP)

**Gap Detection Logic:**

```
For each Quality Statement:

  Step 1: Analyse Evidence Coverage
  - Collect all evidence items linked to statement
  - Map to evidence categories: which categories represented?
  - Count items per category
  
  Step 2: Coverage Scoring (Rules-Based)
  - Ideal: 2+ categories represented (triangulation)
  - Strong: 3+ categories represented + ≥1 outcome-based evidence
  - Weak: Only 1 category (e.g., only processes)
  - Critical: No evidence or assessment not updated in >6 months
  
  Step 3: Flag Specific Issues
  - Evidence outdated: Review due date passed?
  - Missing assessment: No assessment in >30 days?
  - Missing outcomes: No outcome-based evidence (e.g., audit results, patient feedback)?
  - No observation: No direct observation evidence?
  - Staffing gaps: If "Safe" or "Effective", check if staff feedback included
  
  Step 4: Draft Gap (If Issue Found)
  - Generate gap description from rule triggered
  - Suggest severity: Critical (no evidence), High (weak coverage), Medium (mild gap)
  - Suggest root cause (if confidence >60%)

  Step 5: Draft Action (For Each Gap)
  - Action title: Auto-generated from gap (e.g., "Collect patient feedback for 'Safe' KQ")
  - Action description: Specific guidance (e.g., "Run patient satisfaction survey; aim for 20+ responses")
  - Suggested owner: Based on gap type (Clinical gaps → GP; Process gaps → Director; Staffing → HR)
  - Suggested due date: Today + 28 days (or sooner if critical)
  - Link to gap + statement
  - Suggest priority: High if critical gap, Medium otherwise
```

**Rules Engine Example:**

```
IF statement.assessment IS NULL OR assessment.date < NOW() - 30 days:
   THEN flag "Assessment Outdated"
        severity = HIGH
        action = "Review statement readiness; update assessment"
        owner = practice_manager

IF statement.evidence_count = 0:
   THEN flag "No Evidence"
        severity = CRITICAL
        action = "Gather evidence for statement; target 2+ categories"
        owner = practice_manager

IF statement.evidence_categories NOT IN ['outcomes', 'peoples_experience', 'observation']:
   AND statement.key_question IN ['safe', 'effective']:
   THEN flag "Missing Outcomes/People/Observation Evidence"
        severity = HIGH
        action = "Gather outcome-based evidence (e.g., audit results, patient feedback)"
        owner = practice_manager

IF NOW() > statement.review_due_date:
   THEN flag "Review Overdue"
        severity = MEDIUM
        action = "Schedule statement review; refresh assessment"
        owner = practice_manager
```

**Data Model:**

```
AIReadinessScan
├─ id (UUID)
├─ practice_id (FK)
├─ run_at (timestamp)
├─ run_by (FK User, nullable; if manual)
├─ status (enum: running, completed, failed)
├─ summary (text; e.g., "12 gaps identified; 3 critical")
├─ created_at (timestamp)

AIGapDraft
├─ id (UUID)
├─ readiness_scan_id (FK)
├─ quality_statement_id (FK)
├─ title (string)
├─ description (text)
├─ root_cause (text, nullable)
├─ suggested_severity (enum: low, medium, high, critical)
├─ created_at (timestamp)

AIActionDraft
├─ id (UUID)
├─ ai_gap_draft_id (FK)
├─ title (string)
├─ description (text)
├─ suggested_owner_user_id (FK)
├─ suggested_due_date (date)
├─ suggested_priority (enum: low, medium, high, critical)
├─ created_at (timestamp)
```

**Human Review Workflow:**
1. Practice manager clicks "Run Readiness Scan"; system processes (may take 1–2 min for 34 statements)
2. "Scan Results" dashboard shows:
   - Summary: "12 gaps identified: 2 critical, 5 high, 5 medium"
   - Table of drafted gaps: statement, title, severity, suggested action, "Approve", "Edit", "Reject" buttons
3. For each gap, user can:
   - **Approve As-Is:** Gap created in system with suggested action + severity; action added to task queue
   - **Edit:** Open dialog to adjust title, description, severity, suggested action, owner, due date; then approve
   - **Reject:** Skip this gap (don't create); optionally add reason (e.g., "Already addressed by action XYZ")
4. Once approved, AI gaps/actions are converted to real Gap and Action records; audit trail notes "Created from AI scan"

**Accuracy & Thresholds:**
- Rules-based approach is deterministic; no retraining needed
- Review threshold: If gap severity "critical" or "high", require human approval (default: approve)
- Track user edits to drafted suggestions; adjust rules if patterns found (e.g., "Users always lower severity by 1 level" → adjust baseline)

**Notifications:**
- Scan completed → in-app alert to practice manager
- High/critical gaps detected → in-app alert (consider email post-MVP)

**Post-MVP Enhancements:**
- Scheduled scans (daily/weekly, results emailed to practice manager)
- Trend tracking (are gaps decreasing over time? Coverage improving?)
- Predictive: "Based on current rate of action closure, when will statement reach 'good' coverage?"

---

#### 3.3.3 AI POLICY DRAFTING FROM PRACTICE DOCUMENTS

**Overview:** Tool to generate draft policies from existing practice documents (e.g., governance meeting minutes, guidelines, staff feedback) and optional templates. Practice manager reviews, edits, and publishes; publishing triggers staff acknowledgement tasks.

**Workflow:**

```
Step 1: Policy Topic & Sources
  User selects:
  - Policy topic (string; e.g., "Infection Control", "Safeguarding")
  - Source documents (multi-select: choose 0–N evidence items from locker)
  - Optional template (choose from library; e.g., CQC guidance, NHS template)
  - Local practice notes (free-text: any local context/priorities)
  
  ↓
Step 2: AI Drafting (Async Job)
  Input: Topic, source docs (text extracted), template, local notes
  
  Process:
  a) Retrieve template (if selected): e.g., standard CQC policy outline
  b) Extract key points from source documents (NLP summarization)
  c) If no template: Infer policy structure from sources + topic (Introduction, 
     Scope, Roles & Responsibilities, Procedures, Risk Management, Review Cycle)
  d) Draft each section:
     - Intro: Standard regulatory context + local practice statement
     - Scope: Who does policy apply to; what is in/out of scope
     - Roles: Extract roles mentioned in sources; flesh out responsibilities
     - Procedures: Extract from sources; organize chronologically/by step
     - Risk/Compliance: Link to relevant CQC statements (auto-find via topic)
     - Review: Standard language; suggest 12-month cycle
  e) Flag assumptions and questions: "Assumes all staff have annual training; 
     is this current? Does practice want to mandate quarterly refreshers?"
  f) Generate "What Changed" summary (if updating existing policy)
  
  ↓
Step 3: Human Review (Draft Workspace)
  Practice manager views:
  - Draft policy (formatted document)
  - Assumptions/questions list
  - Metadata: Topic, version (if update), last reviewed
  - Buttons: "Publish", "Edit Draft", "Request Review", "Archive"
  
  Practice manager + Clinical Lead review via:
  - Comments on draft (inline or summary)
  - "Edit Draft" opens policy editor (rich text)
  - Discuss assumptions; resolve questions
  
  ↓
Step 4: Approval & Publication
  When ready to publish:
  - Practice manager clicks "Publish"
  - System creates new policy version (timestamped, immutable)
  - Old version archived
  - Status: Published
  
  ↓
Step 5: Staff Acknowledgement (Trigger)
  Publishing policy triggers:
  - Create task for all staff: "Acknowledge policy: [Topic]"
  - Task links to published policy document
  - Staff must read + click "I acknowledge" to mark complete
  - Practice manager can see completion % in dashboard
  
  Optional: Create training evidence task (e.g., "Deliver safeguarding training")
```

**Data Model:**

```
PolicyLibrary
├─ id (UUID)
├─ practice_id (FK)
├─ topic (string)
├─ created_at (timestamp)

PolicyVersion
├─ id (UUID)
├─ policy_id (FK)
├─ version_number (int)
├─ content (text)
├─ status (enum: draft, under_review, published, archived)
├─ created_by (FK User)
├─ created_at (timestamp)
├─ published_at (timestamp, nullable)
├─ published_by (FK User, nullable)
├─ review_due_date (date)
├─ source_documents (JSON: [evidence_item_ids])
├─ change_summary (text; if update)
├─ assumptions (text; AI-generated questions for review)

PolicyAcknowledgement
├─ id (UUID)
├─ policy_version_id (FK)
├─ user_id (FK)
├─ acknowledged_at (timestamp, nullable)
├─ created_at (timestamp)
├─ reminder_count (int)

AIPolicyDraft
├─ id (UUID)
├─ topic (string)
├─ source_document_ids (JSON)
├─ template_id (FK, nullable)
├─ local_notes (text)
├─ draft_content (text)
├─ draft_metadata (JSON: {assumptions, questions, extracted_sections})
├─ approved_at (timestamp, nullable)
├─ approved_by (FK User, nullable)
├─ published_as_policy_id (FK, nullable)
├─ created_at (timestamp)
```

**UI Components:**
- **Policy drafting wizard:** Step 1: Topic (text input). Step 2: Select source documents (checkboxes, search). Step 3: Optional template (dropdown). Step 4: Local notes (text area). Step 5: "Generate Draft" (async, shows progress)
- **Policy draft view:** Full document display; "Assumptions/Questions" panel (expandable); metadata; "Publish", "Edit", "Delete" buttons
- **Policy editor (rich text):** If user clicks "Edit Draft"; simple WYSIWYG editor (or Markdown); save drafts
- **Policy library:** List of published policies; version history (collapse/expand); "View", "Edit", "Archive", "Create New" buttons
- **Staff acknowledgement view:** List of policies requiring acknowledgement; document preview; "I acknowledge" button; timestamp recorded
- **Acknowledgement dashboard (Director):** Policy name, publication date, % staff acknowledged, list of staff not yet acknowledged, "Send Reminder" button

**Validations:**
- Topic required; max 100 chars
- At least one source document recommended (not required)
- Draft content required before publishing
- All staff must acknowledge before policy considered "fully published" (flag in dashboard if <100%)

**AI Configuration (Tuning):**
- Template library: CQC guidance, NHS Confederation templates, practice custom templates
- Extraction model: Use spaCy for NER (roles, procedures); TF-IDF for key sentences
- Draft model: Fine-tune abstractive summarizer on sample practice policies + regulations (post-MVP)
- Assumption detection: Rule-based (e.g., if "annual training" mentioned, flag assumption "Is annual training current?")

**Post-MVP Enhancements:**
- Policy linking: Auto-link published policies to relevant CQC quality statements
- Training integration: Auto-create training event evidence task when policy published
- Scheduled review reminders: 1 month before review due date, practice manager notified

---

### 3.4 User & Role Management

**Overview:** Three primary roles (Director, Clinical Lead, Staff) with cascading permissions. Future: granular role builder.

**Roles & Permissions:**

| Feature | Director | Clinical Lead | Staff |
|---------|-----------------|---------------|-------|
| **Evidence Locker** | | |
| Upload evidence | ✓ | ✓ | ✓ (own only) |
| Link evidence | ✓ | ✓ | ✗ |
| Edit metadata | ✓ | ✓ (clinical) | ✗ |
| Create versions | ✓ | ✓ (clinical) | ✗ |
| Archive evidence | ✓ | ✗ | ✗ |
| Review AI suggestions | ✓ | ✓ (clinical) | ✗ |
| **Readiness Workspace** | | |
| View all statements | ✓ | ✓ | ✗ (own only) |
| Edit assessment | ✓ | ✓ (clinical) | ✗ |
| Create/edit gaps | ✓ | ✓ (clinical) | ✗ |
| **Actions & Gaps** | | |
| Create action | ✓ | ✓ (clinical) | ✗ |
| Own/complete action | ✓ | ✓ | ✓ (own) |
| Approve completion (evidence rule) | ✓ | ✓ | ✗ |
| **Export & Reports** | | |
| Export inspection pack | ✓ | ✓ (informational) | ✗ |
| View audit trail | ✓ | ✓ | ✗ |
| **AI Tools** | | |
| Run readiness scan | ✓ | ✗ | ✗ |
| Review scan results | ✓ | ✓ (advisory) | ✗ |
| Draft policies | ✓ | ✗ | ✗ |
| Review/publish policies | ✓ | ✓ (approval) | ✗ |
| **User Management** | | |
| Invite users | ✓ | ✗ | ✗ |
| Edit roles | ✓ | ✗ | ✗ |
| View audit trail | ✓ | ✓ (own activity) | ✗ |

**Data Model:**

```
User
├─ id (UUID)
├─ practice_id (FK)
├─ email (string, unique)
├─ full_name (string)
├─ role_id (FK)
├─ is_active (boolean)
├─ last_login (timestamp, nullable)
├─ created_at (timestamp)
├─ created_by (FK User)

Role
├─ id (UUID)
├─ practice_id (FK)
├─ name (enum: practice_manager, clinical_lead, staff)
├─ description (text)
├─ is_default (boolean)
├─ created_at (timestamp)

Permission
├─ id (UUID)
├─ name (string; e.g., "upload_evidence", "export_pack", "edit_assessment")
├─ resource (string; e.g., "evidence", "action", "policy")
├─ action (string; e.g., "create", "read", "update", "delete")

RolePermission
├─ id (UUID)
├─ role_id (FK)
├─ permission_id (FK)
├─ granted_at (timestamp)
├─ granted_by (FK User)
```

**Authentication & Access Control:**
- OAuth 2.0 (Google Workspace / Office 365 SSO recommended for GP practices with existing email)
- Alternative: Email + password (with password reset flow)
- JWT tokens for API access (post-MVP)
- Multi-factor authentication (post-MVP, optional but recommended)

**UI Components:**
- **User settings:** Profile page (name, email, role, last login)
- **Practice admin:** User list; invite new user (email form); edit user role (dropdown); deactivate user; audit of role changes
- **Role management (future):** Edit permissions per role; create custom roles

---

### 3.5 Audit Trail & Compliance Logging

**Overview:** Complete, immutable audit trail of all compliance-relevant actions (evidence approvals, assessment changes, action closures, policy publications). Every change logged with user, timestamp, before/after state.

**Audit Trail Schema:**

```
AuditTrail
├─ id (UUID)
├─ practice_id (FK)
├─ user_id (FK)
├─ entity_type (string; e.g., "EvidenceItem", "StatementAssessment", "Action", "Policy")
├─ entity_id (UUID)
├─ event (string; e.g., "created", "updated", "approved", "closed", "published")
├─ timestamp (timestamp)
├─ change_type (enum: create, update, delete, approve, reject, publish)
├─ before_state (JSON; nullable for create)
├─ after_state (JSON)
├─ reason_notes (text; optional; user explanation)
├─ created_at (timestamp)

# Example records:
# 1. Evidence item approved:
#    {entity_type: "EvidenceItem", event: "approved", user: "jane_pm",
#     before_state: {status: "draft"}, after_state: {status: "active"},
#     timestamp: "2024-12-28 14:30:00"}
#
# 2. Statement assessment updated:
#    {entity_type: "StatementAssessment", event: "updated", user: "dr_smith_clinical",
#     before_state: {score: "amber", text: "..."}, after_state: {score: "green", text: "..."},
#     timestamp: "2024-12-28 15:45:00"}
#
# 3. Action completed:
#    {entity_type: "Action", event: "closed", user: "staff_member",
#     before_state: {status: "open", completed_evidence: null}, 
#     after_state: {status: "completed", completed_evidence: [item_123]},
#     timestamp: "2024-12-28 16:20:00"}
#
# 4. Policy published:
#    {entity_type: "Policy", event: "published", user: "jane_pm",
#     before_state: {version: 1, status: "draft"}, 
#     after_state: {version: 2, status: "published"},
#     timestamp: "2024-12-28 17:00:00"}
```

**Audit Trail UI:**
- **Audit log view (Admin/Director):** Filterable table: date range, user, entity type, event type; show before/after state (collapsible); export to CSV
- **Entity-specific history:** E.g., on evidence detail page, show timeline: "Created Dec 20 by Jane", "Approved Dec 21 by Jane", "Version 2 created Dec 28 by Jane"
- **Statement assessment history:** Timeline showing all past assessments; scores, dates, who assessed, notes

**Compliance:** 
- Audit trail immutable once written (no delete, only append)
- Exported audit trail included in inspection packs (CQC can verify governance)

---

### 3.6 Data Model – Complete Summary

**Core Entities:**
- Practice, User, Role, Permission, RolePermission
- KeyQuestion, QualityStatement, EvidenceCategory (CQC framework)
- EvidenceItem, EvidenceVersion, EvidenceItemTag
- StatementAssessment, StatementReview, Gap, Action, ActionComment, ActionEvidenceLink
- AIJob, AISuggestion, AIEvidenceSuggestion, AIGapDraft, AIActionDraft, AIPolicyDraft
- ReviewDecision
- PolicyLibrary, PolicyVersion, PolicyAcknowledgement
- Risk, RiskStatementLink (optional MVP)
- AuditTrail

**Relationships (ER Diagram Summary):**
```
Practice
├── User (1:many)
├── EvidenceItem (1:many)
├── StatementAssessment (1:many)
├── Gap (1:many)
├── Action (1:many)
├── PolicyLibrary (1:many)
├── Role (1:many)

EvidenceItem
├── EvidenceVersion (1:many)
├── EvidenceItemTag (1:many; joins EvidenceItem ↔ QualityStatement)
└── EvidenceCategory (many:1, via EvidenceItemTag)

StatementAssessment
├── QualityStatement (many:1)
├── Action (1:many, via quality_statement_id)
└── Gap (1:many, via quality_statement_id)

Action
├── Gap (many:1, nullable)
├── QualityStatement (many:1, nullable)
├── ActionComment (1:many)
└── ActionEvidenceLink (1:many, joins Action ↔ EvidenceItem)

Policy*
├── PolicyVersion (1:many)
└── PolicyAcknowledgement (1:many, per user per policy)

AIJob, AISuggestion (generic logging; parents of AI*Draft/Suggestion records)
```

**Keys & Constraints:**
- Primary key: All entities have UUID `id` + `created_at`
- Foreign keys: Explicitly named (e.g., `practice_id`, `user_id`, `quality_statement_id`)
- Unique constraints:
  - User.email (per practice)
  - RolePermission (role_id, permission_id)
  - StatementAssessment (per practice per statement; only one "is_latest=true")
  - PolicyAcknowledgement (policy_version_id, user_id)
- Indexes: On foreign keys, timestamps, status enums (for filtering)

---

## 4. TECHNICAL ARCHITECTURE

### 4.1 Tech Stack (Cloudflare-first)
- **Frontend + full-stack routing:** TanStack Start (React) deployed on **Cloudflare Workers** (SSR/edge).
- **API runtime:** Cloudflare Workers (TypeScript), using Hono (optional) for routing if needed, or TanStack Start server handlers.
- **Relational datastore:** **Cloudflare D1** (SQLite-based) for all relational data (evidence metadata, statements, actions, audit trail, AI suggestion records).   
- **Binary/object storage:** **Cloudflare R2** for uploaded evidence files, exports, and any large extracted text blobs.
- **AI inference:** **Cloudflare Workers AI** for summarisation, classification, embedding/tag suggestions, and policy drafting prompts.
- **Durable orchestration + scheduling:** **Cloudflare Workflows** to run multi-step jobs (evidence processing, readiness scan, export build) with retries and wait/sleep steps (including “pause for human approval”).
- **Search (MVP):** basic SQL filters in D1 + optional lightweight text indexing; upgrade later to dedicated search (post‑MVP).   
- **Observability:** Workers logs + Workflow execution history (post‑MVP: Logpush/SIEM integration).

### 4.2 Cloudflare-first architecture (how the MVP runs)
- **UI/API (TanStack Start on Workers):** One codebase serves SSR pages + JSON endpoints from Workers.
- **Primary relational state (D1):** All entities from your model (EvidenceItem, StatementAssessment, Gap, Action, AuditTrail, AISuggestions) live in D1.
- **Files + export artifacts (R2):** Evidence uploads and generated inspection packs are stored in R2; D1 stores pointers and metadata.
- **AI processing (Workers AI):** Evidence tagging/summarising and policy drafting call Workers AI from workflow steps and return structured JSON suggestions.
- **Scheduling/automation (Workflows):** “Readiness scan”, “evidence processing”, “export generation” are implemented as workflows with durable retries and explicit wait states.
### 4.2 API Design (RESTful)

**Core Endpoints (MVP):**

```
# Evidence Locker
POST   /api/v1/evidence/upload              # Upload file → trigger AI processing
POST   /api/v1/evidence/{id}/link           # Add external link
GET    /api/v1/evidence                     # List evidence (filterable)
GET    /api/v1/evidence/{id}                # Get evidence detail + AI suggestions
PATCH  /api/v1/evidence/{id}                # Update metadata (title, review_due_date, etc.)
POST   /api/v1/evidence/{id}/versions       # Create new version (upload replacement file)
PATCH  /api/v1/evidence/{id}/approve-ai     # Approve AI suggestions + mark active
DELETE /api/v1/evidence/{id}                # Archive evidence

# Tagging
POST   /api/v1/evidence/{id}/tags           # Add/update tags
GET    /api/v1/quality-statements           # List all 34 statements
GET    /api/v1/evidence-categories          # List 6 categories

# Statement Readiness
GET    /api/v1/statements/{id}              # Get statement detail + linked evidence, assessment, gaps, actions
GET    /api/v1/statements                   # List all statements (with summary stats)
GET    /api/v1/dashboards/readiness-by-kq  # Dashboard: readiness per KQ
GET    /api/v1/dashboards/readiness-by-statement # Dashboard: readiness per statement

# Assessments
POST   /api/v1/assessments                  # Create/update statement assessment
GET    /api/v1/assessments/{statement_id}   # Get latest + history

# Gaps & Actions
POST   /api/v1/gaps                         # Create gap
PATCH  /api/v1/gaps/{id}                    # Update gap
DELETE /api/v1/gaps/{id}                    # Close gap (if all actions closed)
POST   /api/v1/actions                      # Create action
PATCH  /api/v1/actions/{id}                 # Update action status, owner, due date
POST   /api/v1/actions/{id}/comments        # Add comment
POST   /api/v1/actions/{id}/complete        # Mark action completed (with evidence check)
GET    /api/v1/actions                      # List actions (filterable by status, owner, due date)

# AI Processing
POST   /api/v1/ai/evidence-process          # Trigger evidence AI processing (async)
POST   /api/v1/ai/readiness-scan            # Run readiness scan (async)
GET    /api/v1/ai/readiness-scan/{scan_id}  # Get scan results + drafted gaps/actions
PATCH  /api/v1/ai/readiness-scan/{scan_id}/approve # Approve drafted gaps/actions

# Policy Management
POST   /api/v1/policies                     # Create new policy (start drafting)
GET    /api/v1/policies                     # List policies
GET    /api/v1/policies/{id}                # Get policy detail + versions + acknowledgement status
PATCH  /api/v1/policies/{id}                # Update draft content
POST   /api/v1/policies/{id}/publish        # Publish policy version (triggers acknowledgement tasks)
POST   /api/v1/policies/{id}/acknowledge    # Staff acknowledge policy

# Export
POST   /api/v1/export/inspection-pack       # Generate inspection pack (async; returns download link)
GET    /api/v1/export/inspection-pack/{id}  # Download previously generated pack

# Audit Trail
GET    /api/v1/audit-trail                  # List audit events (filterable)
GET    /api/v1/entities/{entity_type}/{entity_id}/history # Get entity change history

# User & Admin
POST   /api/v1/users                        # Invite user
GET    /api/v1/users                        # List practice users
PATCH  /api/v1/users/{id}                   # Update user role, deactivate
GET    /api/v1/roles                        # List roles + permissions
```

**Response Format (JSON):**
```json
{
  "status": "success|error",
  "data": { ... },
  "errors": [ ... ],
  "meta": { "total": 10, "page": 1, "per_page": 20 }
}
```

### 4.3 Security & Compliance

**HIPAA Compliance:**
- **Data at rest:** AES-256 encryption (R2 + D1 encryption)
- **Data in transit:** TLS 1.2+ (HTTPS enforced)
- **Access control:** RBAC (role-based); MFA recommended
- **Audit logging:** Full immutable audit trail (see section 3.5)
- **Data retention:** Configurable; purge old audit logs after 7 years (HIPAA requirement)
- **Breach notification:** Built-in alerting for suspicious access patterns

**Additional Security:**
- API rate limiting (e.g., 100 requests/min per user) to prevent abuse
- Input validation: Sanitise all text inputs; prevent SQL injection, XSS
- CSRF protection (SameSite cookies, anti-CSRF tokens)
- File upload validation: Check MIME type, file size, scan for malware (ClamAV)
- Secrets management: Use environment variables or Cloudflare Secrets (not hardcoded)

**Data Privacy:**
- GDPR compliance (if applicable to practices with UK staff)
- Right to be forgotten: Allow data deletion (with audit trail note)
- Consent tracking: Log user consent to T&Cs, data processing

---

## 5. DEPLOYMENT & OPERATIONS

### 5.1 Infrastructure (Cloudflare)
- **Compute:** Cloudflare Workers (serves TanStack Start app + API endpoints).
- **Database:** Cloudflare D1 (relational).   
- **Object storage:** Cloudflare R2 (evidence files, export bundles).
- **AI inference:** Workers AI (model execution).
- **Background orchestration:** Cloudflare Workflows (durable jobs, scheduling, retries, human-in-the-loop waits).
**Deployment:**
- Infrastructure as Code: Terraform or CloudFormation
- CI/CD: GitHub Actions (integrated with Cloudflare)
- Testing: Unit tests (Jest/pytest), integration tests, E2E (Cypress)
- Environments: Dev, Staging, Production

### 5.2 Monitoring & Support

**Uptime & Performance:**
- Target: 99.9% uptime (SLA)
- Monitor: API response time (<500ms p95), D1 query time, R2 latency
- Alerts: Slack integration for critical errors

**Incident Response:**
- On-call rotation for production issues
- Runbooks for common issues (DB connection loss, disk full, etc.)
- Post-mortem process for major incidents

**User Support:**
- Help desk ticketing (Zendesk or similar)
- FAQ + knowledge base
- Email support ([support@compliance-system.com](mailto:support@compliance-system.com))
- In-app chat (Intercom) for reactive support

---

## 6. ROLLOUT & CHANGE MANAGEMENT

### 6.1 Pre-Launch (2–4 Weeks Before Go-Live)

1. **Pilot with 2–3 practices:** Closed beta; gather feedback; fix critical issues
2. **Data migration:** Import existing evidence (if any) from practice records/email
3. **Training:** Practice manager + clinical lead attend 2-hour onboarding session
4. **Documentation:** User guide, quick-start video, FAQ
5. **Setup:** Initialise practice, invite users, seed CQC framework data

### 6.2 Launch (Go-Live)

1. **Soft launch:** Open to practice; monitor usage, errors
2. **Support:** Dedicated support person on-call first week
3. **Comms:** Email to all staff with login link + quick-start guide

### 6.3 Post-Launch (Weeks 1–4)

1. **Weekly check-ins:** Practice manager + product team; gather feedback
2. **Quick wins:** Fix usability issues, clarify UI where confused
3. **Adoption metrics:** Track login rates, evidence uploaded, actions created
4. **Iterate:** Adjust based on feedback (e.g., simplify tagging UI)

### 6.4 Steady State (Post-MVP Features)

1. **Monthly updates:** New features (e.g., email notifications, scheduled scans)
2. **Quarterly reviews:** Practice readiness trends, AI model retraining
3. **Annual:** Comprehensive audit; compliance check; feature roadmap review

---

## 7. SUCCESS CRITERIA & KPIs

### 7.1 Product Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Adoption** | ≥80% of staff log in within first month | Google Analytics / app logs |
| **Evidence Coverage** | ≥2 evidence categories per statement (avg) | Dashboard widget |
| **Assessment Freshness** | ≥80% of statements assessed within last 30 days | Readiness dashboard |
| **Action Closure Rate** | ≥90% of actions closed on/before due date | Actions dashboard |
| **AI Suggestion Accuracy** | ≥85% precision on evidence type; ≥70% on statement tags | Manual audit monthly |
| **Time Saved** | 50% less time to export inspection pack (vs. manual) | User interviews |
| **User Satisfaction** | ≥4/5 Net Promoter Score | Monthly surveys |
| **Inspection Readiness** | CQC inspection ≥ baseline rating (within 6 months of go-live) | Post-inspection feedback |

### 7.2 Technical Success Metrics

| Metric | Target |
|--------|--------|
| API response time (p95) | <500ms |
| System uptime | ≥99.9% |
| File upload success rate | ≥99% |
| AI job completion rate | ≥98% |
| Page load time (frontend) | <3s |
| Database query time (p95) | <200ms |

---

## 8. APPENDICES

### Appendix A: CQC 34 Quality Statements (Reference)

**Safe (7 statements)**
1. Learning culture
2. Safe systems, pathways, and transitions
3. Safeguarding
4. Involving people to manage risks
5. Safe environments
6. Safe and effective staffing
7. Infection prevention and control
8. Medicines optimisation

**Effective (6 statements)**
1. People's health and care outcomes
2. Care planning, assessment and monitoring
3. Evidence-based and person-centred care
4. Competent staff
5. Equipment and facilities
6. Learning, continuous improvement and innovation

**Caring (5 statements)**
1. Kindness, compassion, and dignity
2. Treating people as individuals
3. Independence, choice, and control
4. Responding to people's immediate needs
5. Workforce well-being and enablement

**Responsive (7 statements)**
1. Person-centred care
2. Care provision, integrity, and continuity
3. Providing information
4. Listening to and involving people
5. Equity in access
6. Equity in experiences and outcomes
7. Planning for the future

**Well-led (9 statements)**
1. Vision, strategy, and governance
2. Leadership at all levels
3. Managing conflicts of interest
4. Fit and proper persons employed
5. Staff expectations, support and development
6. Positive culture and values
7. Governance and management
8. Risk management and mitigation
9. Monitoring, learning and improvement

**Total: 34 statements** (Note: One source lists 8 under Safe; verify with official CQC guidance)

### Appendix B: AI Model Recommendations

**Evidence Type Classifier:**
- Model: DistilBERT (fine-tuned) or Logistic Regression on TF-IDF
- Training data: 500–1000 labelled practice documents (minimum)
- Expected accuracy: 80–90%

**Statement Tagging (Semantic Similarity):**
- Model: sentence-transformers (`all-MiniLM-L6-v2` or `all-mpnet-base-v2`)
- Method: Embed document + all 34 statements; compute cosine similarity; return top 3
- Expected accuracy: 65–80% (depends on statement similarity and document clarity)

**Evidence Category Classifier:**
- Model: Rule-based heuristic (MVP) or Random Forest on extracted features
- Features: Document type, keywords, document length, mentioned roles
- Expected accuracy: 75–90% (rule-based); up to 90%+ (Random Forest)

**Summarisation:**
- Model: Extractive (TF-IDF + position bias, fast) or Abstractive (facebook/bart, slower but better)
- Task: Generate 5–10 bullet-point summary of evidence
- Expected quality: Extractive OK for MVP; upgrade to abstractive post-MVP

**Metadata Extraction:**
- Tool: spaCy NER for roles/departments; regex for dates (simple; covers 90% of cases)
- Expected accuracy: 85%+ (simple approach works well)

### Appendix C: Sample Data Seed Scripts

**Seed CQC Framework:**
```python
# Pseudo-code: seed_cqc_framework.py

# 1. Create 5 KeyQuestions
kq_safe = KeyQuestion(number=1, short_name="safe", full_question="Is it safe?")
kq_effective = KeyQuestion(number=2, short_name="effective", full_question="Is it effective?")
# ... etc.

# 2. Create 34 QualityStatements
qs_learning = QualityStatement(
    key_question=kq_safe,
    statement_number=1,
    statement_text="Learning culture"
)
# ... (repeat for all 34)

# 3. Create 6 EvidenceCategories
ec_peoples_exp = EvidenceCategory(name="peoples_experience", description="...")
ec_staff = EvidenceCategory(name="staff_leader_feedback", description="...")
# ... etc.

# 4. Create default Roles + Permissions
role_pm = Role(name="practice_manager", permissions=[...])
role_clinical = Role(name="clinical_lead", permissions=[...])
role_staff = Role(name="staff", permissions=[...])
```

### Appendix D: Glossary

| Term | Definition |
|------|-----------|
| **CQC** | Care Quality Commission; UK regulator for health and social care |
| **Key Question (KQ)** | One of 5 overarching assessment areas (Safe, Effective, Caring, Responsive, Well-led) |
| **Quality Statement** | One of 34 specific standards under the 5 KQs |
| **Evidence Category** | One of 6 triangulation categories (People's Experience, Staff/Leader Feedback, Partner Feedback, Observation, Processes, Outcomes) |
| **Evidence Item** | A document, link, or record (policy, audit, feedback, etc.) supporting compliance |
| **Gap** | A deficiency or area of weakness in evidence/coverage for a statement |
| **Action** | A task to address a gap or improve readiness; must be evidence-backed or justified |
| **Inspection Pack** | Auto-generated export bundle (PDF + docs) summarising readiness for CQC review |
| **Audit Trail** | Immutable log of all compliance decisions (approvals, assessments, closures) |
| **RAG** | Red-Amber-Green scoring system (Red=at risk, Amber=caution, Green=on track) |
| **MVP** | Minimum Viable Product; core features to address primary pain points |
| **Post-MVP** | Future enhancements not in scope for initial release |
| **Policy Version** | Immutable, timestamped copy of a policy; old versions archived, new published |
| **Policy Acknowledgement** | Staff confirmation of reading and understanding a published policy |
| **AI Suggestion** | AI-generated recommendation (e.g., evidence tag, gap) for human review |
| **Readiness Scan** | Automated analysis of statement coverage; flags gaps and drafts actions |
| **Review Cycle** | Scheduled review of statement evidence/assessment (e.g., quarterly) |

### Appendix E: Common Use Cases & User Stories

**Use Case 1: Upload Infection Control Audit Report**
1. Practice manager uploads PDF audit report
2. AI suggests: Type="Audit Report", Category="Outcomes", Statements=["Safe-IPC", "Effective-Care Planning"], Summary="Oct 2024 audit shows 95% compliance..."
3. Practice manager reviews suggestions; edits "Why it supports" note; approves
4. Evidence marked "Active"; now searchable and linked to statements
5. Audit trail logged: "EvidenceItem 123 approved by Jane on Dec 28"

**Use Case 2: Staff Member Completes Action**
1. Staff member views assigned action: "Gather patient feedback for Safe KQ"
2. Clicks "Mark Complete"; system checks for linked evidence
3. No evidence linked; staff member tries to mark complete
4. System prompts: "Link evidence or confirm no evidence needed"
5. Staff member searches evidence locker, finds "Patient Feedback Q4 2024" survey results
6. Links evidence; system auto-approves (configurable); action marked "Completed with Evidence"
7. Audit trail: "Action 456 completed by staff_member, linked evidence 789, approved auto, on Dec 28"

**Use Case 3: Director Runs Readiness Scan**
1. Practice manager clicks "Run Readiness Scan"
2. System analyzes all 34 statements; checks evidence coverage, assessment dates, overdue reviews
3. Identifies 5 gaps:
   - Statement "Learning Culture": No observation evidence (severity=high)
   - Statement "Safe Systems": Assessment outdated (>60 days) (severity=high)
   - Statement "Medicines": Only processes evidence; missing outcomes (severity=medium)
   - Statement "Staffing": No staff feedback in >3 months (severity=high)
   - Statement "Patient Experience": No evidence (severity=critical)
4. For each gap, AI drafts action: "Conduct staff survey", "Schedule clinical observation", "Gather patient feedback"
5. Practice manager reviews; approves all 5; actions created and assigned to owners
6. Audit trail: "5 gaps created from scan #12, approved by Jane, on Dec 28"

**Use Case 4: Publish Safeguarding Policy**
1. Clinical lead initiates policy draft: Topic="Safeguarding", Sources=["Safeguarding Meeting Minutes Q4", "NHS Safeguarding Guidance"]
2. AI drafts policy: Introduction (regulatory context), Scope (who, what), Roles (clinical lead, practice manager, staff), Procedures (reporting, escalation), Risk Management
3. AI flags assumptions: "Assumes all staff receive annual safeguarding training; is this current?"
4. Clinical lead reviews draft; edits Procedures section; notes: "Add local referral pathway to [Local Safeguarding Board]"
5. Clinical lead marks ready; practice manager approves
6. Clicks "Publish"; system creates PolicyVersion v2 (v1 archived); status="Published"
7. Publishing triggers: All staff receive task "Acknowledge Safeguarding Policy"; due in 7 days
8. Audit trail: "Policy 'Safeguarding' published v2 by jane_pm, triggered 12 acknowledgement tasks, on Dec 28"

**Use Case 5: Prepare for CQC Inspection**
1. CQC inspection notice received (28 days notice)
2. Practice manager opens "Export" section; selects "By Key Question"
3. System generates 5 PDFs (one per KQ); bundles all linked evidence; creates links reference sheet
4. ZIP file downloaded: 5 MB, includes 50 evidence docs
5. Practice manager + clinical lead review pack; ensure no gaps; schedule final readiness review
6. CQC inspector arrives; practice provides download link to inspection pack
7. Inspector opens pack; navigates to "Safe" KQ; reviews all 7 statements, evidence, assessments, audit trail
8. All data current, assessments recent, evidence well-organised; contributes to "Good" rating