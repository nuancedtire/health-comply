# Compass by aiigent.io — Client Testing Handbook

**Version:** 1.0
**Product:** Compass — Healthcare Compliance Management Platform
**Prepared by:** aiigent.io Engineering Team
**Date:** March 2026

---

## How to Use This Handbook

This handbook is your guided tour of everything Compass can do. Work through each section in order — the journey mirrors the real workflow a Practice Manager and their team would follow in day-to-day compliance management.

**For each section you will find:**

- **What it does** — a plain-English description of the feature
- **Why we built it this way** — our reasoning and any design trade-offs we made consciously
- **Step-by-step test instructions** — exactly what to do and what to look for
- **Pass / Fail checkboxes** — mark what works and what doesn't
- **Feedback space** — your thoughts on usability, wording, missing capabilities, and anything you'd do differently

Please be candid. You are the actual end user. If something feels wrong, clunky, or is missing entirely, we want to know — this feedback directly shapes what gets built next.

---

## Tester Information

| Field | Your Entry |
|---|---|
| **Tester Name** | |
| **Role in Practice** | |
| **Date of Testing** | |
| **Browser / Device** | |
| **Overall First Impression (1–10)** | |

---

## Contents

1. [Account Setup & Authentication](#1-account-setup--authentication)
2. [First-Time Site Setup & Onboarding](#2-first-time-site-setup--onboarding)
3. [Dashboard](#3-dashboard)
4. [Compliance Hub (Controls & Quality Statements)](#4-compliance-hub-controls--quality-statements)
5. [Evidence Library (Documents)](#5-evidence-library-documents)
6. [Evidence Sign-off & Review](#6-evidence-sign-off--review)
7. [Inspection Packs](#7-inspection-packs)
8. [Team Management](#8-team-management)
9. [Settings & Account Preferences](#9-settings--account-preferences)
10. [Notifications](#10-notifications)
11. [Admin Panel](#11-admin-panel-practice-manager--system-admin-only)
12. [AI Features — Across the Platform](#12-ai-features--across-the-platform)
13. [Multi-Site & Role Switching](#13-multi-site--role-switching)
14. [Overall Feedback & Prioritisation](#14-overall-feedback--prioritisation)

---

## 1. Account Setup & Authentication

### 1.1 What It Does

Authentication in Compass is email-and-password based. The first person to register becomes the system administrator automatically. Every subsequent user must be invited — you cannot self-register once an account exists. This is by design: it keeps your practice data closed to strangers.

### 1.2 Why We Built It This Way

> **Design rationale:** Healthcare practices need tight access control. Open self-registration would be a security risk in a setting where patient-adjacent compliance data lives. The invite-only model means a Practice Manager always controls who enters the system. We chose email/password (rather than SSO or magic links) as the lowest-friction starting point for GP practices where staff may not have Google Workspace or Microsoft 365 accounts.
>
> **Trade-off we're asking about:** Some practices might prefer Google or NHS login integration. Your feedback here is valuable.

---

#### Test 1.1 — Sign Up (First User / System Admin)

> Only applicable if testing a fresh environment. Skip if an account already exists.

**Steps:**
1. Navigate to the application URL
2. Click **Sign Up**
3. Enter your name, email, and a password (minimum 8 characters)
4. Submit the form
5. Verify you are redirected to the dashboard

| Check | Pass | Fail | Notes |
|---|---|---|---|
| Sign-up form loads correctly | ☐ | ☐ | |
| Password minimum length is enforced | ☐ | ☐ | |
| After submit, redirected to dashboard | ☐ | ☐ | |
| First user gets system admin access | ☐ | ☐ | |

**Your feedback:**

_Does the sign-up flow feel straightforward? Is the wording clear?_

```
[Space for comments]




```

---

#### Test 1.2 — Login

**Steps:**
1. Navigate to `/login`
2. Enter valid credentials
3. Click **Sign In**
4. Verify you land on the Dashboard

| Check | Pass | Fail | Notes |
|---|---|---|---|
| Login form loads | ☐ | ☐ | |
| Incorrect credentials show an error | ☐ | ☐ | |
| Successful login redirects to Dashboard | ☐ | ☐ | |
| Session persists on page refresh | ☐ | ☐ | |

---

#### Test 1.3 — Forgot Password Flow

**Steps:**
1. Navigate to `/login` and click **Forgot Password**
2. Enter your email address and submit
3. Check your inbox for a reset link
4. Click the link and set a new password
5. Log in with the new password

| Check | Pass | Fail | Notes |
|---|---|---|---|
| Forgot password page loads | ☐ | ☐ | |
| Submission shows a confirmation message | ☐ | ☐ | |
| Reset link in email works | ☐ | ☐ | |
| New password can be used to log in | ☐ | ☐ | |

**Your feedback:**

_Is the password reset flow clear? Did the email arrive promptly? Any wording issues?_

```
[Space for comments]




```

---

#### Test 1.4 — Invitation-Only Registration (Subsequent Users)

> This test requires a Practice Manager or Admin account to send the invite.

**Steps:**
1. As Practice Manager, go to **Team** in the sidebar
2. Click **Invite Team Member**
3. Enter a colleague's email and select a role
4. Submit — a toast notification should confirm success
5. Have your colleague open the invite link
6. Verify they can complete registration and land on the dashboard

| Check | Pass | Fail | Notes |
|---|---|---|---|
| Invite dialog opens | ☐ | ☐ | |
| Email and role fields work | ☐ | ☐ | |
| Invite email received promptly | ☐ | ☐ | |
| Colleague can register via the link | ☐ | ☐ | |
| Colleague's role is correctly set | ☐ | ☐ | |
| Attempting to self-register without invite is blocked | ☐ | ☐ | |

**Your feedback:**

_Would you prefer a different registration approach (e.g. Google login, NHS login, magic link)? How well does the invite flow fit your team's workflow?_

```
[Space for comments — this is particularly important for us]




```

---

## 2. First-Time Site Setup & Onboarding

### 2.1 What It Does

After logging in for the first time, the Practice Manager needs to create a **Site** (a physical location) and then run through a 3-step onboarding wizard:

1. **Seed compliance controls** — we pre-populate your site with a curated "Starter Pack" of CQC controls tailored for GP practices
2. **Invite your team** — assign site-level roles (GP Partner, Nurse Lead, etc.)
3. **Completion summary** — view what's been set up

### 2.2 Why We Built It This Way

> **Design rationale:** Building a compliance framework from scratch is overwhelming. We pre-seed a set of evidence-gathering controls based on the 5 CQC key questions (Safe, Effective, Caring, Responsive, Well-led). These are not the official CQC quality statements themselves — they are the *actions* your site needs to regularly complete and document. The Starter Pack saves days of setup time.
>
> **Trade-off we're asking about:** The controls we seed are our interpretation of what a typical GP practice needs. They may not perfectly match your workflow or your existing processes. We want to know: what's missing, what doesn't apply, and what would you rename?

---

#### Test 2.1 — Create First Site

**Steps:**
1. After logging in with a fresh account, notice the prompt to create a site
2. Click **Create Your First Site**
3. Enter a site name (e.g. "Main Surgery") and optionally an address
4. Submit — you should be redirected to the onboarding wizard

| Check | Pass | Fail | Notes |
|---|---|---|---|
| "No site yet" prompt shows on dashboard | ☐ | ☐ | |
| Site creation form works | ☐ | ☐ | |
| Redirected to onboarding wizard after creation | ☐ | ☐ | |

---

#### Test 2.2 — Onboarding Step 1: Seed Controls

**Steps:**
1. Read the description of compliance controls on the screen
2. Click **Seed Controls**
3. Wait for confirmation — the system will load a set of CQC-aligned controls
4. Note the count of controls seeded

| Check | Pass | Fail | Notes |
|---|---|---|---|
| Step 1 explanation is clear | ☐ | ☐ | |
| Seed Controls button works | ☐ | ☐ | |
| Success message shows with a count | ☐ | ☐ | |
| Progress bar advances to Step 2 | ☐ | ☐ | |

**Your feedback:**

_Does the explanation of "compliance controls" make sense to you? After seeding, do the controls that appear in your Checklist look appropriate for your practice?_

```
[Space for comments — tell us which controls look wrong or are missing]




```

---

#### Test 2.3 — Onboarding Step 2: Invite Team

**Steps:**
1. Review the role cards shown (GP Partner, Nurse Lead, Safeguarding Lead, Clinician, Receptionist)
2. Click **Invite [Role]** for at least one role
3. Enter a colleague's email and submit
4. Observe the "Pending Invites" section update
5. Click **Continue** (or **Skip for Now** if you want to proceed without inviting)

| Check | Pass | Fail | Notes |
|---|---|---|---|
| Role cards display correctly | ☐ | ☐ | |
| Invite dialog opens and accepts email | ☐ | ☐ | |
| Invite appears in pending list | ☐ | ☐ | |
| Skip option works | ☐ | ☐ | |

**Your feedback:**

_Are the role names familiar and correct for your practice? Are any roles missing? Does the permissions description on each role card make sense?_

```
[Space for comments]




```

---

#### Test 2.4 — Onboarding Step 3: Completion Screen

**Steps:**
1. Review the completion summary card
2. Click **View Checklist** or **Go to Dashboard**

| Check | Pass | Fail | Notes |
|---|---|---|---|
| Completion screen shows seeded count and invited count | ☐ | ☐ | |
| Navigation buttons work | ☐ | ☐ | |

---

## 3. Dashboard

### 3.1 What It Does

The Dashboard is the home screen for Practice Managers, Admins, and Compliance Officers. It shows:

- **KPI Cards** — Compliance Score, Evidence Uploaded (last 7 days), Open Actions
- **Compliance Progress by Domain** — radar-style breakdown across Safe / Effective / Caring / Responsive / Well-led
- **Alerts** — overdue controls
- **This Month's Progress** — QS coverage and gaps
- **Upcoming Milestones** — static placeholder (currently hardcoded; see feedback request)
- **Recent Evidence Submissions** — last few uploads across the site
- **Team Activity** — audit log feed for Practice Managers/Admins/Compliance Officers only
- **Quick Actions** — shortcuts to common tasks

### 3.2 Why We Built It This Way

> **Design rationale:** The dashboard is role-sensitive. Clinical staff (GP Partner, Nurse Lead, etc.) who log in will see a simplified view — they don't need audit trail visibility. The Team Activity feed is restricted because lower-level staff should not see who uploaded what or what was rejected. This protects workflow privacy.
>
> The Compliance Score is a weighted calculation based on how many quality statements have at least one approved piece of evidence, and how recently that evidence was collected relative to the control's due date.
>
> **Upcoming Milestones are currently static placeholders.** We will wire these to real data once we understand what milestones matter most to you.

---

#### Test 3.1 — KPI Cards

**Steps:**
1. Log in as Practice Manager and navigate to `/dashboard`
2. Review the three KPI cards at the top
3. Upload a piece of evidence (in Documents), then return to dashboard and refresh
4. Verify the "Evidence Uploaded" count updates

| Check | Pass | Fail | Notes |
|---|---|---|---|
| Compliance Score displays a percentage | ☐ | ☐ | |
| Evidence Uploaded shows recent activity | ☐ | ☐ | |
| Open Actions count is correct | ☐ | ☐ | |

**Your feedback:**

_Do these three KPIs tell you what you need to know at a glance? Are there other metrics you wish you could see on the front page?_

```
[Space for comments]




```

---

#### Test 3.2 — Compliance Progress by Domain

**Steps:**
1. Look at the Compliance Progress panel (centre of dashboard)
2. Check that each of the 5 CQC domains (Safe, Effective, Caring, Responsive, Well-led) shows a progress indicator
3. Click through to Checklist to verify the numbers are consistent

| Check | Pass | Fail | Notes |
|---|---|---|---|
| All 5 domains are shown | ☐ | ☐ | |
| Percentages match reality (if you have evidence uploaded) | ☐ | ☐ | |

**Your feedback:**

_Is this breakdown by CQC domain useful? Would you prefer a different view — e.g. by control category, by staff member, by due date?_

```
[Space for comments]




```

---

#### Test 3.3 — Overdue Alerts

**Steps:**
1. Find the Alerts card (right side of compliance progress)
2. If no overdue controls appear, go to Checklist, find a control, and set its "last evidence date" back in time so it becomes overdue
3. Return to dashboard and verify it appears in the alerts list

| Check | Pass | Fail | Notes |
|---|---|---|---|
| Overdue alerts list loads | ☐ | ☐ | |
| Each alert shows the control name and overdue duration | ☐ | ☐ | |
| Clicking an alert navigates to the correct area (if implemented) | ☐ | ☐ | |

---

#### Test 3.4 — Team Activity Feed

**Steps:**
1. Log in as Practice Manager and scroll to the Team Activity card
2. Verify you see recent actions (e.g. evidence uploads, user invites)
3. Log out, log in as a Clinician or Receptionist
4. Verify the Team Activity feed is empty / shows a "restricted" message

| Check | Pass | Fail | Notes |
|---|---|---|---|
| Activity feed shows events for Practice Manager | ☐ | ☐ | |
| Activity feed is hidden/restricted for lower roles | ☐ | ☐ | |
| Action labels are readable and meaningful | ☐ | ☐ | |

**Your feedback:**

_Is the activity feed useful for you as a Practice Manager? Are there events you'd want to see that aren't shown? Any events shown that feel unnecessary?_

```
[Space for comments]




```

---

#### Test 3.5 — Quick Actions

**Steps:**
1. Use each Quick Action button from the dashboard:
   - Upload Evidence → opens Documents page
   - View Controls → opens Checklist
   - Manage Actions → opens Checklist
   - Invite Team Member → opens Admin Users page
   - Settings → opens Settings page

| Check | Pass | Fail | Notes |
|---|---|---|---|
| All Quick Action buttons navigate correctly | ☐ | ☐ | |
| Buttons are visible and easy to find | ☐ | ☐ | |

---

## 4. Compliance Hub (Controls & Quality Statements)

### 4.1 What It Does

The **Compliance Hub** (`/checklist`) is the core of the platform. It shows your site's compliance framework organised by:

- **CQC Key Questions** — the 5 domains (Safe, Effective, Caring, Responsive, Well-led)
- **Quality Statements** — the specific statements under each key question
- **Controls** — your site's specific recurring tasks and checks (e.g. "Monthly fire safety audit")

For each quality statement you can:
- View all assigned controls and their due dates
- See how many approved evidence items exist
- Assign ownership of a quality statement to a team member
- Create new controls
- Log gap actions (remediation tasks when evidence is missing)
- View evidence hints (AI-suggested or manually written guidance)

### 4.2 Why We Built It This Way

> **Design rationale:** The CQC framework has 5 key questions and ~34 quality statements. Rather than showing a flat list of everything, we group controls by quality statement so Practice Managers can clearly see which areas of care are evidence-rich and which are gaps. This mirrors how inspectors think when they visit.
>
> Controls are separate from quality statements because multiple controls can contribute evidence to a single statement, and a single piece of evidence can be tagged to multiple statements.
>
> **Trade-off:** We pre-populate controls from our Starter Pack, but you can add, edit, or delete them. We want to understand whether our starter pack reflects your existing processes or if you need to build from scratch.

---

#### Test 4.1 — Browse Quality Statements by Key Question

**Steps:**
1. Navigate to **Checklist** in the sidebar
2. Observe the list of 5 CQC Key Questions
3. Click on **Safe** to expand it
4. Review the quality statements listed underneath
5. Repeat for at least one other domain

| Check | Pass | Fail | Notes |
|---|---|---|---|
| All 5 key questions are displayed | ☐ | ☐ | |
| Expanding a key question shows quality statements | ☐ | ☐ | |
| Progress indicators are visible per statement | ☐ | ☐ | |

**Your feedback:**

_Is the organisation by CQC Key Question intuitive? Or would you prefer a different grouping — e.g. by staff responsibility, by frequency, by evidence type?_

```
[Space for comments]




```

---

#### Test 4.2 — View and Expand a Quality Statement

**Steps:**
1. Click on a quality statement (e.g. "Learning Culture" under Safe)
2. Review the controls listed within it
3. Check the evidence count badge on each control
4. Click on a control to see its details

| Check | Pass | Fail | Notes |
|---|---|---|---|
| Quality statement expands to show controls | ☐ | ☐ | |
| Evidence count is shown per control | ☐ | ☐ | |
| Due date / overdue status is visible | ☐ | ☐ | |
| Control details panel opens | ☐ | ☐ | |

**Your feedback:**

_Does the information shown for each control (title, due date, evidence count) give you what you need? What else would you want to see here?_

```
[Space for comments]




```

---

#### Test 4.3 — Create a New Control

**Steps:**
1. Within a quality statement, find the option to add a new control
2. Fill in the control title, description, frequency (recurring / one-off / ad hoc), and optionally an evidence hint
3. Save the control
4. Verify it appears in the quality statement's control list

| Check | Pass | Fail | Notes |
|---|---|---|---|
| "Add Control" option is easy to find | ☐ | ☐ | |
| Form accepts title, description, frequency | ☐ | ☐ | |
| Saved control appears immediately | ☐ | ☐ | |
| Default reviewer role can be set | ☐ | ☐ | |

**Your feedback:**

_Is the control creation form simple enough? Are there fields missing that you'd want (e.g. responsible department, priority level, linked policy)? Does the frequency setting (recurring/one-off/ad hoc) cover your needs?_

```
[Space for comments]




```

---

#### Test 4.4 — Assign Quality Statement Ownership

**Steps:**
1. Within a quality statement, look for an "Owner" or "Assign" option
2. Assign a team member as the owner of that quality statement
3. Verify the assignment is saved and displayed

| Check | Pass | Fail | Notes |
|---|---|---|---|
| Ownership assignment option is visible | ☐ | ☐ | |
| Team member list populates correctly | ☐ | ☐ | |
| Assignment saves and persists on refresh | ☐ | ☐ | |

**Your feedback:**

_Is assigning QS ownership important to your workflow? Would you prefer ownership at the control level instead of (or in addition to) the quality statement level?_

```
[Space for comments]




```

---

#### Test 4.5 — Log a Gap Action

**Steps:**
1. Find a quality statement with missing evidence
2. Look for an option to log an action/gap
3. Create an action with a title, description, assigned owner, and due date
4. Save and verify it appears in the action list

| Check | Pass | Fail | Notes |
|---|---|---|---|
| Gap action creation is accessible | ☐ | ☐ | |
| Required fields are clear | ☐ | ☐ | |
| Action appears after saving | ☐ | ☐ | |
| Action shows on Dashboard as "Open Actions" | ☐ | ☐ | |

**Your feedback:**

_Is "Gap Actions" a term that makes sense to you, or would you call this something else (e.g. "Improvement Actions", "To-Do Items", "Remediation Tasks")? What other information would you capture per action?_

```
[Space for comments — terminology feedback is very useful here]




```

---

#### Test 4.6 — Evidence Hints

**Steps:**
1. Open a control and look for an "Evidence Hint" section
2. Note whether the hint is AI-generated or manually written
3. Check if good/bad evidence examples are shown (some controls have these from the Starter Pack)

| Check | Pass | Fail | Notes |
|---|---|---|---|
| Evidence hints are displayed | ☐ | ☐ | |
| Hints are clear and relevant | ☐ | ☐ | |
| Good/bad evidence examples show where available | ☐ | ☐ | |

**Your feedback:**

_Are the evidence hints helpful? Do they accurately describe what you should upload? Are there any hints that are confusing or wrong for your context?_

```
[Space for comments]




```

---

## 5. Evidence Library (Documents)

### 5.1 What It Does

The **Evidence Library** (`/documents`) is where all uploaded compliance evidence lives. Every piece of evidence is:

1. **Uploaded** — PDF, Word, images, and other document types
2. **AI-analysed** — the system reads the document, extracts text, generates a summary, and attempts to match it to the right control
3. **Reviewed** — evidence moves through `pending_review` → `approved` or `rejected`

The library view shows status chips (Total, Needs Attention, In Review, Approved) and a resizable detail panel on the right when you click an item.

### 5.2 Why We Built It This Way

> **Design rationale:** We deliberately separated evidence *upload* from evidence *review*. Anyone on the team can upload a document. Approval is restricted to those with reviewer permissions (Practice Manager, GP Partner, Nurse Lead, etc. depending on the control's assigned reviewer role). This mirrors the real-world workflow where, say, a Receptionist might upload a fire drill record but a Practice Manager should sign it off.
>
> AI classification runs in the background after upload — it reads the document and tries to match it to a control automatically. This reduces manual tagging effort. The AI confidence score (0–100%) is shown so reviewers can decide how much to trust the auto-match.
>
> **Trade-off:** AI matching is not perfect. Documents with poor formatting, scanned images, or unusual terminology may get low confidence scores. We want to know: how often does the AI get it right for your document types?

---

#### Test 5.1 — Upload a Document

**Steps:**
1. Navigate to **Documents** in the sidebar
2. Click **Upload** (top right)
3. Select a document type (PDF recommended)
4. Fill in the title, select a quality statement, optionally select a control, set the evidence date
5. Upload and wait for the AI to process it (usually a few seconds; you'll see a "processing" status)

| Check | Pass | Fail | Notes |
|---|---|---|---|
| Upload button is easily found | ☐ | ☐ | |
| File picker works | ☐ | ☐ | |
| Quality statement selector populates | ☐ | ☐ | |
| Control selector narrows based on selected QS | ☐ | ☐ | |
| Evidence date field works | ☐ | ☐ | |
| Upload completes without error | ☐ | ☐ | |
| Processing status appears after upload | ☐ | ☐ | |
| Status updates to pending_review after processing | ☐ | ☐ | |

**Your feedback:**

_Is the upload flow clear? Are there fields missing (e.g. "valid until" / expiry date)? Does the AI auto-match the document to the right control? What's the confidence score it gives?_

```
[Space for comments — please note the document type and AI confidence score if you can]




```

---

#### Test 5.2 — Browse and Filter Evidence

**Steps:**
1. In the Documents page, review the list of uploaded evidence
2. Try filtering by status (Approved, Pending Review, etc.)
3. Click on an item to open the detail panel on the right
4. Check the AI summary, assigned control, and quality statement shown in the panel

| Check | Pass | Fail | Notes |
|---|---|---|---|
| Evidence list loads | ☐ | ☐ | |
| Status filter/chips work | ☐ | ☐ | |
| Clicking an item opens the detail panel | ☐ | ☐ | |
| AI summary is shown in the panel | ☐ | ☐ | |
| Control and QS assignment are visible | ☐ | ☐ | |
| AI confidence score is visible | ☐ | ☐ | |

**Your feedback:**

_Is the detail panel useful? Are there other pieces of information you'd want to see about a document (e.g. who reviewed it, when it expires, related policies)?_

```
[Space for comments]




```

---

#### Test 5.3 — Bulk Delete Evidence

**Steps:**
1. Select multiple evidence items using the checkboxes
2. Use the bulk delete option that appears
3. Confirm the deletion
4. Verify the items are removed

| Check | Pass | Fail | Notes |
|---|---|---|---|
| Checkboxes appear on hover/click | ☐ | ☐ | |
| Bulk delete option appears when items are selected | ☐ | ☐ | |
| Confirmation dialog shows before deletion | ☐ | ☐ | |
| Items are removed after deletion | ☐ | ☐ | |

**Your feedback:**

_Is bulk selection/delete intuitive? Should there be any safeguard preventing deletion of approved evidence?_

```
[Space for comments]




```

---

#### Test 5.4 — Reassign Evidence to a Different Control

**Steps:**
1. Open a piece of evidence in the detail panel
2. Look for the option to change which control it is assigned to
3. Select a different control
4. Verify the change saves

| Check | Pass | Fail | Notes |
|---|---|---|---|
| Reassignment option is visible | ☐ | ☐ | |
| Control selector works | ☐ | ☐ | |
| Change saves correctly | ☐ | ☐ | |

---

## 6. Evidence Sign-off & Review

### 6.1 What It Does

The **Sign-off** page (`/signoff`) is the review queue for evidence. Authorised reviewers (Practice Manager, GP Partner, Nurse Lead, Safeguarding Lead — depending on the control's assigned reviewer role) see documents that need their attention and can:

- **Preview** the document content and AI summary
- **Approve** with optional notes
- **Reject** with a mandatory reason (this is sent back to the uploader)

The page also shows a "Recently Reviewed" table of approved/rejected documents.

### 6.2 Why We Built It This Way

> **Design rationale:** Separating upload from sign-off is intentional. CQC inspectors will ask how your evidence was validated — having a documented approval trail with named reviewers and timestamps satisfies that requirement. Rejection always requires a reason because the uploader needs to know *why* it wasn't acceptable so they can provide better evidence next time.
>
> The AI confidence score shown in the sign-off queue is to help reviewers prioritise. High confidence (≥80%) might need only a quick glance; low confidence (<50%) warrants careful reading.
>
> **Trade-off:** Currently the sign-off page shows *all* evidence pending review for the site, filtered by the reviewer's role permissions. We haven't yet built per-person notification emails. Reviewers must check this page manually.

---

#### Test 6.1 — Review Pending Evidence

**Steps:**
1. Log in as a user with reviewer permissions (e.g. Practice Manager)
2. Navigate to **Sign-off** in the sidebar
3. Review the pending items table
4. Note the document name, assigned control, uploader, date, and AI confidence

| Check | Pass | Fail | Notes |
|---|---|---|---|
| Sign-off page loads with pending items | ☐ | ☐ | |
| Table shows document, control, uploader, date, confidence | ☐ | ☐ | |
| "All caught up" message shows when queue is empty | ☐ | ☐ | |

---

#### Test 6.2 — Preview a Document

**Steps:**
1. Click **Review** (eye icon) on a pending evidence item
2. Check the preview dialog:
   - AI summary
   - Assigned control and quality statement
   - Document text content (first 1000 characters)
3. Close the dialog without approving or rejecting

| Check | Pass | Fail | Notes |
|---|---|---|---|
| Preview dialog opens | ☐ | ☐ | |
| AI summary is displayed if available | ☐ | ☐ | |
| Document text content is shown | ☐ | ☐ | |
| Control and QS are visible | ☐ | ☐ | |

---

#### Test 6.3 — Approve Evidence

**Steps:**
1. Click **Approve** on a pending evidence item
2. Optionally add a note in the dialog
3. Click **Approve** to confirm
4. Verify the item moves out of the pending queue
5. Verify in Documents that the status is now "approved"

| Check | Pass | Fail | Notes |
|---|---|---|---|
| Approve confirmation dialog appears | ☐ | ☐ | |
| Notes field is optional | ☐ | ☐ | |
| Success toast appears | ☐ | ☐ | |
| Item removed from pending queue | ☐ | ☐ | |
| Evidence status shows "approved" in Documents | ☐ | ☐ | |
| Compliance score updates on Dashboard | ☐ | ☐ | |

---

#### Test 6.4 — Reject Evidence

**Steps:**
1. Click **Reject** on a pending evidence item
2. Observe that a reason is **required** before you can submit
3. Leave the reason blank and try to submit — verify it is blocked
4. Enter a reason and click **Reject**
5. Verify the item is marked as rejected

| Check | Pass | Fail | Notes |
|---|---|---|---|
| Reject dialog opens | ☐ | ☐ | |
| Submit is blocked without a reason | ☐ | ☐ | |
| Rejection with a reason succeeds | ☐ | ☐ | |
| Success toast appears | ☐ | ☐ | |
| Item shows as "rejected" in Documents | ☐ | ☐ | |

**Your feedback:**

_Does the sign-off workflow match your existing approval process? Is there anything missing — e.g. multi-person sign-off, delegating reviews, email notifications when items are waiting? Should rejected evidence automatically notify the uploader?_

```
[Space for comments — this workflow is central to CQC compliance so detailed feedback here is very valuable]




```

---

## 7. Inspection Packs

### 7.1 What It Does

**Inspection Packs** (`/presentation`) are the "go-bag" for a CQC visit. When you generate a pack, the system:

1. Collects all approved evidence for the selected scope
2. Groups it by quality statement and key question
3. AI-generates an executive summary for the overall pack
4. AI-generates domain-level summaries for each key question
5. Identifies gaps (missing evidence, outdated evidence, evidence expiring soon)
6. Compiles everything into a downloadable **ZIP archive** (organised folder structure) and a **PDF report**

**Scope options:**
- **Full Site** — all quality statements across all 5 key questions
- **Single Key Question** — e.g. just "Is it Safe?"
- **Specific Quality Statements** — a custom pick of statements

### 7.2 Why We Built It This Way

> **Design rationale:** CQC inspectors often request an evidence portfolio in advance or at the start of the inspection. Manually assembling this from shared drives or filing cabinets takes hours or days. We generate it in minutes, with an AI narrative that helps inspectors quickly understand your practice's position.
>
> We offer both ZIP and PDF because inspectors may prefer different formats — ZIP gives them a structured folder they can browse; PDF gives a single document they can annotate and share.
>
> **Trade-off:** The AI executive summary quality depends on the quality and quantity of evidence in the system. If you have little evidence uploaded, the summary will be sparse. We want your feedback on whether the AI summary reads well and is accurate to your situation.

---

#### Test 7.1 — Create an Inspection Pack

**Steps:**
1. Navigate to **Inspection Packs** (sometimes labelled **Presentation** in the sidebar)
2. Click **Create New Pack**
3. Select **Full Site** scope
4. Click **Create Pack**
5. Watch the status badge — it will show "Building" while AI summaries are generated, then "Ready"

| Check | Pass | Fail | Notes |
|---|---|---|---|
| Create New Pack button works | ☐ | ☐ | |
| Scope selector (Full Site / Key Question / Specific QS) works | ☐ | ☐ | |
| Pack appears in the list with "Building" status | ☐ | ☐ | |
| Status updates to "Ready" automatically (no page refresh needed) | ☐ | ☐ | |

---

#### Test 7.2 — Review Pack Details

**Steps:**
1. Select the pack you just created from the left panel
2. Review the stats: Evidence Items, Controls, Gaps, Coverage %
3. Read the AI Executive Summary
4. Expand the Gap Analysis to see which controls are missing/outdated
5. Expand the Key Questions breakdown to see evidence per domain

| Check | Pass | Fail | Notes |
|---|---|---|---|
| Coverage stats load correctly | ☐ | ☐ | |
| AI Executive Summary is readable and relevant | ☐ | ☐ | |
| Gap Analysis shows the correct gaps | ☐ | ☐ | |
| Key Question breakdown is correct | ☐ | ☐ | |
| Domain AI summaries are readable | ☐ | ☐ | |

**Your feedback:**

_Is the AI Executive Summary useful? Does it read like something you'd want to hand to an inspector? What would you change about it? Are the gap categories (Missing, Outdated, Expiring Soon) the right ones?_

```
[Space for comments — quality of AI narrative is something we can tune based on your feedback]




```

---

#### Test 7.3 — Download the Pack

**Steps:**
1. With a "Ready" pack selected, scroll to the Download section
2. Click **ZIP Archive** and verify it downloads
3. Open the ZIP and check the folder structure
4. Click **PDF Report** and verify it downloads
5. Open the PDF and check the layout

| Check | Pass | Fail | Notes |
|---|---|---|---|
| ZIP download works | ☐ | ☐ | |
| ZIP folder structure is logical | ☐ | ☐ | |
| PDF download works | ☐ | ☐ | |
| PDF layout is readable | ☐ | ☐ | |

**Your feedback:**

_Is the ZIP folder structure organised in a way that makes sense to you? Is the PDF report formatted in a way you'd be comfortable sharing with a CQC inspector? What's missing from either format?_

```
[Space for comments]




```

---

#### Test 7.4 — Create a Scoped Pack (Key Question or Specific QS)

**Steps:**
1. Click **Create New Pack**
2. Select **Single Key Question**, choose **Safe**
3. Create the pack and wait for it to be ready
4. Verify it only contains evidence from the Safe domain
5. Repeat with **Specific Quality Statements**, selecting 2–3 statements manually

| Check | Pass | Fail | Notes |
|---|---|---|---|
| Key Question scoped pack creates correctly | ☐ | ☐ | |
| QS selector allows multi-select with checkboxes | ☐ | ☐ | |
| Scoped pack only contains relevant evidence | ☐ | ☐ | |

---

#### Test 7.5 — Delete a Pack

**Steps:**
1. Open a pack
2. Click the delete (trash) icon
3. Confirm deletion in the dialog
4. Verify the pack is removed from the list

| Check | Pass | Fail | Notes |
|---|---|---|---|
| Delete option is visible | ☐ | ☐ | |
| Confirmation dialog appears | ☐ | ☐ | |
| Pack is removed after confirmation | ☐ | ☐ | |

---

## 8. Team Management

### 8.1 What It Does

The **Team** page (`/team`) allows authorised users (Practice Manager, Admin, Compliance Officer, GP Partner) to:

- View all active team members and pending invitations in one table
- Search and filter by name, role, or status
- Sort by any column
- **Invite** new team members (email + role)
- **Change email** of an existing user
- **Change role** of an existing user
- **Generate a password reset link** (shared manually)
- **Remove** a user from the team
- **Revoke** a pending invitation

### 8.2 Why We Built It This Way

> **Design rationale:** We show active users and pending invitations in a single unified table rather than separate tabs. This gives a Practice Manager one place to see who is confirmed and who hasn't accepted yet. The search is multi-term (space-separated) so you can type "Jane nurse" and find "Jane Smith, Nurse Lead".
>
> Password reset is currently a "generate link" model — the Practice Manager copies the link and sends it to the staff member manually. This was chosen because we haven't yet built automated email infrastructure beyond invitations. We plan to automate this.
>
> **Trade-off:** There is no self-service "I forgot my password" mechanism that sends an email to that user's inbox *from the team page* — only from the login page. Managers generating reset links is a workaround for now.

---

#### Test 8.1 — View the Team Table

**Steps:**
1. Navigate to **Team** in the sidebar
2. Review the table — you should see your own user, plus any invited/accepted users
3. Check that columns show: Name, Email, Role, Site, Status, Joined date, Actions

| Check | Pass | Fail | Notes |
|---|---|---|---|
| Team table loads | ☐ | ☐ | |
| Active users and pending invites both appear | ☐ | ☐ | |
| Columns are readable and sortable | ☐ | ☐ | |

---

#### Test 8.2 — Search and Filter

**Steps:**
1. Type a name into the search bar
2. Apply a role filter using the Role dropdown
3. Switch the status filter between All / Active / Pending
4. Clear all filters using the "Clear" button

| Check | Pass | Fail | Notes |
|---|---|---|---|
| Search narrows the list in real time | ☐ | ☐ | |
| Role filter works | ☐ | ☐ | |
| Status filter works | ☐ | ☐ | |
| Clear button resets all filters | ☐ | ☐ | |

---

#### Test 8.3 — Invite a New Team Member

**Steps:**
1. Click **Invite Team Member**
2. Enter an email, select tenant role (Practice Manager, Admin, Compliance Officer) or site role
3. Submit the invitation
4. Verify the invitation appears in the table with "Pending" status

| Check | Pass | Fail | Notes |
|---|---|---|---|
| Invite dialog opens | ☐ | ☐ | |
| Email and role fields are required | ☐ | ☐ | |
| Invitation appears as pending in the table | ☐ | ☐ | |
| Invited user receives an email | ☐ | ☐ | |

---

#### Test 8.4 — Change Role

**Steps:**
1. Find an existing user in the table
2. Open their actions menu and select **Change Role**
3. Select a new role and confirm
4. Verify the role updates in the table

| Check | Pass | Fail | Notes |
|---|---|---|---|
| Change Role dialog opens | ☐ | ☐ | |
| New role can be selected | ☐ | ☐ | |
| Role updates in the table after save | ☐ | ☐ | |

**Your feedback:**

_Is the role change process straightforward? Are the available roles the right set for your practice? Are there roles you'd add or rename?_

```
[Space for comments]




```

---

#### Test 8.5 — Generate Password Reset Link

**Steps:**
1. Find a user in the table and open their actions menu
2. Select **Reset Password**
3. Confirm the action
4. Copy the generated link and paste it into a browser to verify it works

| Check | Pass | Fail | Notes |
|---|---|---|---|
| Reset confirmation dialog appears | ☐ | ☐ | |
| Link is generated and displayed | ☐ | ☐ | |
| Copy button works | ☐ | ☐ | |
| Link successfully resets password when followed | ☐ | ☐ | |

**Your feedback:**

_Is manually copying and sending reset links an acceptable workflow, or would you expect the system to email the reset link automatically to the user?_

```
[Space for comments]




```

---

#### Test 8.6 — Revoke an Invitation

**Steps:**
1. Find a pending invitation in the table
2. Open actions and select **Revoke Invitation**
3. Confirm and verify the invitation disappears from the table

| Check | Pass | Fail | Notes |
|---|---|---|---|
| Revoke option appears on pending invitations | ☐ | ☐ | |
| Confirmation dialog appears | ☐ | ☐ | |
| Invitation removed after revoke | ☐ | ☐ | |

---

## 9. Settings & Account Preferences

### 9.1 What It Does

The **Settings** page (`/settings`) lets each user manage:

- **Profile** — display name (email is read-only; change via team management)
- **Appearance** — Light / Dark / System theme
- **Notifications** — toggles for Weekly Digest, Action Reminders, Evidence Uploads, Compliance Alerts (currently UI-only; email delivery coming soon)
- **Security** — change password, view and revoke active sessions across all devices

### 9.2 Why We Built It This Way

> **Design rationale:** We display email as read-only in the settings because email changes require admin verification — we don't want a user accidentally locking themselves out by changing to an email they don't own. Email changes go through the Team management page (admin-controlled).
>
> The Dark/Light/System theme is driven by your system preference by default. We'll persist your explicit choice to the database in a future update so it carries across devices.
>
> **Notification toggles** are shown but are currently UI-only — the backend email delivery hasn't been built yet. We're showing you the intended UX to get your feedback before we build it.

---

#### Test 9.1 — Profile Settings

**Steps:**
1. Navigate to **Settings**
2. Update your display name
3. Click **Save Changes**
4. Refresh the page and verify the name is saved
5. Attempt to edit the email field — confirm it is disabled

| Check | Pass | Fail | Notes |
|---|---|---|---|
| Display name field is editable | ☐ | ☐ | |
| Save button works | ☐ | ☐ | |
| Name persists after refresh | ☐ | ☐ | |
| Email field is disabled | ☐ | ☐ | |
| Role badge shows your current role | ☐ | ☐ | |

---

#### Test 9.2 — Theme / Appearance

**Steps:**
1. In Settings, find the Appearance section
2. Switch to **Dark** mode
3. Verify the UI switches to dark
4. Switch to **Light** mode
5. Switch to **System** (inherits your OS preference)

| Check | Pass | Fail | Notes |
|---|---|---|---|
| Dark mode applies correctly | ☐ | ☐ | |
| Light mode applies correctly | ☐ | ☐ | |
| System mode follows OS setting | ☐ | ☐ | |
| Theme persists on page refresh | ☐ | ☐ | |

**Your feedback:**

_Is there a preferred default theme for your practice? Any styling that looks wrong in dark mode?_

```
[Space for comments]




```

---

#### Test 9.3 — Change Password

**Steps:**
1. In Settings, find the Security section and click **Change Password**
2. Enter your current password and a new password (8+ characters)
3. Confirm the new password
4. Submit and verify success
5. Log out and log back in with the new password

| Check | Pass | Fail | Notes |
|---|---|---|---|
| Change Password dialog opens | ☐ | ☐ | |
| Minimum 8 character rule is enforced | ☐ | ☐ | |
| Password mismatch is caught | ☐ | ☐ | |
| Wrong current password shows an error | ☐ | ☐ | |
| Successful change allows new password login | ☐ | ☐ | |

---

#### Test 9.4 — Active Sessions

**Steps:**
1. In Settings, click **View Sessions**
2. Review the list of devices/sessions
3. Identify your current session (it should be labelled "Current Session")
4. Revoke a session from another device if available
5. Try **Sign Out All Other Devices** if you have multiple sessions

| Check | Pass | Fail | Notes |
|---|---|---|---|
| Sessions dialog opens | ☐ | ☐ | |
| Current session is labelled | ☐ | ☐ | |
| Revoke button works for other sessions | ☐ | ☐ | |
| Sign Out All Other Devices works | ☐ | ☐ | |

---

## 10. Notifications

### 10.1 What It Does

The **Notifications** page (`/notifications`) currently shows a placeholder: "Notification features are coming soon." The notification settings in the Settings page are also currently UI-only.

### 10.2 Why We Built It This Way

> **Design rationale:** We deliberately built the navigation item and settings toggles first so you can tell us *what* notifications you actually want before we build the delivery mechanism. There is no point sending you emails you'll ignore.

---

**Your feedback:**

_What notifications would be genuinely useful to you? Please rank or list the ones you care about most:_

| Notification Type | Would Use (Yes/No) | Preferred Frequency | Notes |
|---|---|---|---|
| Weekly compliance summary | | | |
| Evidence pending your review | | | |
| Action/gap coming due soon | | | |
| Evidence rejected (if you uploaded it) | | | |
| New team member joined | | | |
| Overdue control alert | | | |
| Inspection pack ready to download | | | |
| Other (describe below) | | | |

```
[Space for additional notification feedback]




```

---

## 11. Admin Panel (Practice Manager / System Admin Only)

### 11.1 What It Does

The **Admin** section contains:

- **Users** (`/admin/users`) — a system-wide view of all users across all tenants (system admin only)
- **Tenants** (`/admin/tenants`) — manage organisations (system admin only)
- **Audit Log** (`/admin/audit`) — a full audit trail of every action taken across the tenant

### 11.2 Why We Built It This Way

> **Design rationale:** The Audit Log satisfies CQC's requirement for a demonstrable governance trail. Every upload, approval, rejection, user change, and pack generation is timestamped and attributed to a named user. This cannot be deleted by regular users.
>
> The Admin panel's Users and Tenants views are only accessible to the system administrator (the first user who signed up). Practice Managers can only see their own tenant's data.

---

#### Test 11.1 — Audit Log (Practice Manager)

**Steps:**
1. Navigate to **Admin** → **Audit Log**
2. Review the log entries
3. Try filtering by date range or action type if available
4. Look for your own recent actions (uploads, approvals, etc.)

| Check | Pass | Fail | Notes |
|---|---|---|---|
| Audit log loads with entries | ☐ | ☐ | |
| Each entry shows user, action, entity, and timestamp | ☐ | ☐ | |
| Filtering or search works (if available) | ☐ | ☐ | |
| Your own recent actions appear | ☐ | ☐ | |

**Your feedback:**

_Is the audit log format useful? What would you want to be able to do with this log — e.g. export to CSV, filter by user, filter by document? Does it contain the right level of detail for a CQC inspector?_

```
[Space for comments]




```

---

## 12. AI Features — Across the Platform

### 12.1 Overview

AI is used in several places:

| Feature | Where | What AI does |
|---|---|---|
| **Document classification** | After upload | Reads the document, extracts text, matches to a control, generates a summary |
| **Evidence hints** | Control detail | Suggests what evidence is needed for a control |
| **Inspection pack summaries** | Presentation | Generates executive summary and per-domain narratives |
| **AI chat agent** | (Durable Object) | Available via API; conversational assistant with CQC knowledge |

### 12.2 Why We Built It This Way

> **Design rationale:** The AI runs in the background and never blocks your workflow. If the AI fails or produces a low-confidence result, the system degrades gracefully — you can still manually assign evidence to controls and everything works without AI. AI is a time-saver, not a dependency.
>
> The AI confidence score (0–100%) is always shown so you can make an informed decision about whether to trust the auto-classification. We do not auto-approve evidence — a human always signs off.

---

**AI Quality Feedback:**

_For each AI feature you experienced, please rate the quality:_

| AI Feature | Accuracy (1–5) | Usefulness (1–5) | Comments |
|---|---|---|---|
| Document auto-classification (matching to correct control) | | | |
| AI-generated document summary | | | |
| Inspection pack executive summary | | | |
| Domain-level AI narratives (per key question) | | | |
| Evidence hints on controls | | | |

```
[Space for additional AI feedback]




```

---

## 13. Multi-Site & Role Switching

### 13.1 What It Does

A Practice Manager can manage **multiple sites** (physical locations) from one account. The **site switcher** in the top-left sidebar allows switching between sites. All compliance data (controls, evidence, packs) is scoped to the active site.

Users can have different roles on different sites — e.g. a Nurse Lead at Site A but a Clinician at Site B.

### 13.2 Why We Built It This Way

> **Design rationale:** Many GP practices operate from multiple premises. Rather than creating separate accounts for each location, we use a site-scoping model so one Practice Manager can oversee all sites, and staff can be assigned specifically where they work.

---

#### Test 13.1 — Create a Second Site

**Steps:**
1. In the top-left sidebar, find the team/site switcher
2. Click **Create New Site** or find the option in Create Site (`/create-site`)
3. Create a second site with a different name
4. Switch between sites using the switcher
5. Verify that evidence and controls from Site A do not appear when Site B is selected

| Check | Pass | Fail | Notes |
|---|---|---|---|
| Second site can be created | ☐ | ☐ | |
| Site switcher shows both sites | ☐ | ☐ | |
| Switching sites changes the data shown | ☐ | ☐ | |
| Site A data is not visible when Site B is selected | ☐ | ☐ | |

**Your feedback:**

_Does the multi-site model match how your practice is organised? Is there anything confusing about switching sites?_

```
[Space for comments]




```

---

#### Test 13.2 — Role Differences in the UI

**Steps:**
1. Log in as a **Practice Manager** and note what you see in the sidebar and on each page
2. Log in (in a private window or different browser) as a **Clinician** or **Receptionist**
3. Compare what is visible to each role:
   - Can the Clinician see the Sign-off page?
   - Can the Clinician see the Team page?
   - Can the Clinician see the Admin panel?
   - Can the Clinician upload documents?

| Check | Pass | Fail | Notes |
|---|---|---|---|
| Practice Manager sees all pages | ☐ | ☐ | |
| Clinician cannot access sign-off (if intended) | ☐ | ☐ | |
| Clinician cannot access admin panel | ☐ | ☐ | |
| Clinician can upload evidence | ☐ | ☐ | |
| Role-appropriate navigation is shown | ☐ | ☐ | |

**Your feedback:**

_Do the permissions feel right for each role? Is there anything a Clinician should be able to see that they currently cannot, or vice versa?_

```
[Space for comments — role permissions are complex and your real-world perspective is essential here]




```

---

## 14. Overall Feedback & Prioritisation

### 14.1 Overall System Rating

| Dimension | Rating (1–10) | Comments |
|---|---|---|
| **Ease of use overall** | | |
| **Visual design & clarity** | | |
| **Speed & performance** | | |
| **Feature completeness** | | |
| **Confidence it would help with CQC compliance** | | |
| **Likelihood to use it daily** | | |

---

### 14.2 What Works Well

_Please list the features or aspects of Compass that you found genuinely useful, well-designed, or that exceeded your expectations:_

```
1.

2.

3.

4.

5.

```

---

### 14.3 What Needs the Most Improvement

_Please list the areas that feel broken, confusing, or frustratingly incomplete. Be as specific as possible:_

```
1.

2.

3.

4.

5.

```

---

### 14.4 Missing Features — What's Not Here That Should Be

_What features do you need that aren't in the platform at all yet?_

```
1.

2.

3.

4.

5.

```

---

### 14.5 Feature Prioritisation

_Of everything you've tested, please rank these areas by how important they are to your day-to-day workflow (1 = most important):_

| Feature Area | Your Priority Rank | Comments |
|---|---|---|
| Dashboard & at-a-glance reporting | | |
| Compliance Hub (controls management) | | |
| Evidence upload & AI classification | | |
| Evidence sign-off & approval workflow | | |
| Inspection pack generation | | |
| Team management & invitations | | |
| Audit trail | | |
| Notifications (currently coming soon) | | |
| Multi-site management | | |
| AI narratives & summaries | | |

---

### 14.6 Terminology Check

_Some words we use might not match how your practice talks about compliance. Please flag any that feel wrong:_

| Our Term | Does it make sense? | What would you call it instead? |
|---|---|---|
| "Compliance Controls" | Yes / No / Unsure | |
| "Quality Statements" | Yes / No / Unsure | |
| "Key Questions" | Yes / No / Unsure | |
| "Evidence Library" | Yes / No / Unsure | |
| "Sign-off" (for approving evidence) | Yes / No / Unsure | |
| "Inspection Pack" | Yes / No / Unsure | |
| "Compliance Hub" | Yes / No / Unsure | |
| "Gap Actions" | Yes / No / Unsure | |
| "AI Confidence Score" | Yes / No / Unsure | |
| "Quality Statement Coverage" | Yes / No / Unsure | |

---

### 14.7 Final Open Feedback

_Anything else you'd like to tell us — about the product, the workflow, the terminology, the design, or the direction:_

```
[Space for free-form feedback]




```

---

### 14.8 Would You Like to Be Involved in Future Testing?

| Question | Your Answer |
|---|---|
| Would you participate in follow-up testing sessions? | Yes / No |
| Would you be willing to join a 30-minute video call to walk through your feedback? | Yes / No |
| Best way to reach you for follow-up | |

---

## Appendix A — User Roles Quick Reference

| Role | Type | Can Approve Evidence | Can Invite Users | Can See Audit Log | Can Create Packs |
|---|---|---|---|---|---|
| Practice Manager | Tenant | ✅ | ✅ | ✅ | ✅ |
| Admin | Tenant | ✅ | ✅ | ✅ | ✅ |
| Compliance Officer | Tenant | ✅ | ✅ | ✅ | ✅ |
| GP Partner | Site | ✅ | ✅ | ❌ | ✅ |
| Nurse Lead | Site | ✅ | ❌ | ❌ | ❌ |
| Safeguarding Lead | Site | ✅ | ❌ | ❌ | ❌ |
| Clinician | Site | ❌ | ❌ | ❌ | ❌ |
| Receptionist | Site | ❌ | ❌ | ❌ | ❌ |

> Note: Exact permission boundaries may differ from this table — the above is our intended design. Part of testing is confirming these permissions work as stated.

---

## Appendix B — CQC Key Questions & Quality Statements

The five CQC Key Questions assessed during inspection:

| Key Question | What It Asks |
|---|---|
| **Safe** | Is the service safe? Learning culture, Safe systems, Safeguarding, Involving people, Safe environments, Safe medicines, Infection control, Staffing |
| **Effective** | Is the service effective? Evidence-based care, Assessing needs, Staff competence, Staff training, Good information, Effective organisation, Partnerships |
| **Caring** | Is the service caring? Dignity and respect, Treating people as individuals, Independence, Emotional support |
| **Responsive** | Is the service responsive? Person-centred care, Timely care, Equity of access, Patient feedback, Complaint handling |
| **Well-led** | Is it well-led? Shared direction, Capable leadership, Freedom to speak up, Governance and oversight, Workforce equality, Continuous learning |

---

## Appendix C — Evidence Status Lifecycle

```
Uploaded
   │
   ▼
[Processing] ← AI classification runs here
   │
   ▼
[Pending Review] ← Waiting for a reviewer
   │
   ├── Approved ✅ → Counts toward compliance score
   │
   └── Rejected ❌ → Reason provided; uploader notified
```

---

## Appendix D — Glossary

| Term | Definition |
|---|---|
| **Tenant** | An organisation (e.g. your GP practice) |
| **Site** | A physical location within a tenant (e.g. Main Surgery, Branch Clinic) |
| **Control** | A specific recurring task your site must complete and document evidence for |
| **Quality Statement (QS)** | One of the ~34 statements within the 5 CQC Key Questions that define what "good" looks like |
| **Evidence Item** | A document uploaded to demonstrate compliance with a control |
| **Inspection Pack** | A compiled bundle of all evidence, summaries, and gaps for a CQC inspection |
| **AI Confidence** | The AI system's certainty (0–100%) that it has matched a document to the right control |
| **Gap** | A control with missing, outdated, or expiring evidence |
| **Audit Log** | An immutable record of every action taken in the system |

---

*Thank you for taking the time to test Compass. Every comment in this handbook directly influences what we build next. Your experience as a real-world healthcare compliance practitioner is more valuable than any internal assumption we might make.*

*— The aiigent.io Engineering Team*
