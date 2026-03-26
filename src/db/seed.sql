-- =========================================================================================
-- COMPLETE SEED SCRIPT
-- Replaces all previous seed files.
-- Run this to reset the database to a known state with CQC taxonomy and demo data.
-- =========================================================================================

-- 1. CLEANUP (Delete in reverse dependency order)
-- =========================================================================================
DELETE FROM audit_log;

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

DELETE FROM cqc_quality_statements;

DELETE FROM cqc_key_questions;

DELETE FROM evidence_categories;

-- 2. TAXONOMY (CQC Framework & Evidence Categories)
-- =========================================================================================

-- Evidence Categories
INSERT INTO
    evidence_categories (id, title)
VALUES (
        'peoples_experience',
        'People''s experience of health and care services'
    ),
    (
        'staff_feedback',
        'Feedback from staff and leaders'
    ),
    (
        'partner_feedback',
        'Feedback from partners'
    ),
    ('observation', 'Observation'),
    ('processes', 'Processes'),
    ('outcomes', 'Outcomes');

-- Key Questions
INSERT INTO
    cqc_key_questions (id, title, display_order)
VALUES ('safe', 'Safe', 10),
    ('effective', 'Effective', 20),
    ('caring', 'Caring', 30),
    (
        'responsive',
        'Responsive',
        40
    ),
    ('well_led', 'Well-led', 50);

-- Quality Statements (Safe)
INSERT INTO
    cqc_quality_statements (
        id,
        key_question_id,
        code,
        title,
        display_order
    )
VALUES (
        'safe.learning_culture',
        'safe',
        'learning-culture',
        'Learning culture',
        1
    ),
    (
        'safe.safeguarding',
        'safe',
        'safeguarding',
        'Safeguarding',
        2
    ),
    (
        'safe.involving_people_to_manage_risks',
        'safe',
        'involving-people-to-manage-risks',
        'Involving people to manage risks',
        3
    ),
    (
        'safe.safe_environments',
        'safe',
        'safe-environments',
        'Safe environments',
        4
    ),
    (
        'safe.infection_prevention_and_control',
        'safe',
        'infection-prevention-and-control',
        'Infection prevention and control',
        5
    ),
    (
        'safe.medicines_optimisation',
        'safe',
        'medicines-optimisation',
        'Medicines optimisation',
        6
    );

-- Quality Statements (Effective)
INSERT INTO
    cqc_quality_statements (
        id,
        key_question_id,
        code,
        title,
        display_order
    )
VALUES (
        'effective.assessing_needs',
        'effective',
        'assessing-needs',
        'Assessing needs',
        1
    ),
    (
        'effective.delivering_evidence_based_care',
        'effective',
        'delivering-evidence-based-care-and-treatment',
        'Delivering evidence-based care and treatment',
        2
    ),
    (
        'effective.how_staff_teams_work_together',
        'effective',
        'how-staff-teams-and-services-work-together',
        'How staff, teams and services work together',
        3
    ),
    (
        'effective.supporting_healthier_lives',
        'effective',
        'supporting-people-to-live-healthier-lives',
        'Supporting people to live healthier lives',
        4
    ),
    (
        'effective.monitoring_and_improving_outcomes',
        'effective',
        'monitoring-and-improving-outcomes',
        'Monitoring and improving outcomes',
        5
    ),
    (
        'effective.consent_to_care',
        'effective',
        'consent-to-care-and-treatment',
        'Consent to care and treatment',
        6
    );

-- Quality Statements (Caring)
INSERT INTO
    cqc_quality_statements (
        id,
        key_question_id,
        code,
        title,
        display_order
    )
VALUES (
        'caring.kindness_compassion_dignity',
        'caring',
        'kindness-compassion-and-dignity',
        'Kindness, compassion and dignity',
        1
    ),
    (
        'caring.treating_people_as_individuals',
        'caring',
        'treating-people-as-individuals',
        'Treating people as individuals',
        2
    ),
    (
        'caring.independence_choice_control',
        'caring',
        'independence-choice-and-control',
        'Independence, choice and control',
        3
    ),
    (
        'caring.responding_to_immediate_needs',
        'caring',
        'responding-to-peoples-immediate-needs',
        'Responding to people''s immediate needs',
        4
    ),
    (
        'caring.workforce_wellbeing_enablement',
        'caring',
        'workforce-wellbeing-and-enablement',
        'Workforce wellbeing and enablement',
        5
    );

-- Quality Statements (Responsive)
INSERT INTO
    cqc_quality_statements (
        id,
        key_question_id,
        code,
        title,
        display_order
    )
VALUES (
        'responsive.person_centred_care',
        'responsive',
        'person-centred-care',
        'Person-centred care',
        1
    ),
    (
        'responsive.providing_information',
        'responsive',
        'providing-information',
        'Providing information',
        2
    ),
    (
        'responsive.listening_involving_people',
        'responsive',
        'listening-to-and-involving-people',
        'Listening to and involving people',
        3
    ),
    (
        'responsive.planning_for_the_future',
        'responsive',
        'planning-for-the-future',
        'Planning for the future',
        4
    );

-- Quality Statements (Well-led)
INSERT INTO
    cqc_quality_statements (
        id,
        key_question_id,
        code,
        title,
        display_order
    )
VALUES (
        'well_led.shared_direction_and_culture',
        'well_led',
        'shared-direction-and-culture',
        'Shared direction and culture',
        1
    ),
    (
        'well_led.capable_compassionate_inclusive_leaders',
        'well_led',
        'capable-compassionate-and-inclusive-leaders',
        'Capable, compassionate and inclusive leaders',
        2
    ),
    (
        'well_led.freedom_to_speak_up',
        'well_led',
        'freedom-to-speak-up',
        'Freedom to speak up',
        3
    ),
    (
        'well_led.governance_management_sustainability',
        'well_led',
        'governance-management-and-sustainability',
        'Governance, management and sustainability',
        4
    ),
    (
        'well_led.learning_improvement_innovation',
        'well_led',
        'learning-improvement-and-innovation',
        'Learning, improvement and innovation',
        5
    ),
    (
        'well_led.environmental_sustainability',
        'well_led',
        'environmental-sustainability',
        'Environmental sustainability',
        6
    );

-- 3. TENANTS, SITES & USERS (Demo Data)
-- =========================================================================================

-- Tenant
INSERT INTO
    tenants (id, name, created_at)
VALUES (
        't_demo',
        'Riverside Medical Group',
        strftime('%s', 'now')
    );

-- Site
INSERT INTO
    sites (
        id,
        tenant_id,
        name,
        address,
        created_at
    )
VALUES (
        's_demo',
        't_demo',
        'Riverside Surgery',
        '123 High Street, London',
        strftime('%s', 'now')
    );

-- Roles
INSERT INTO
    roles (id, tenant_id, name)
VALUES (
        'r_pm',
        't_demo',
        'Director'
    ),
    (
        'r_gp',
        't_demo',
        'GP Partner'
    ),
    (
        'r_nurse',
        't_demo',
        'Lead Nurse'
    ),
    (
        'r_admin',
        't_demo',
        'Administrator'
    );

-- Users
-- Passwords are 'password' (pbkdf2 hash placeholder or specific hash if known, using a dummy for now)
INSERT INTO
    users (
        id,
        tenant_id,
        email,
        password_hash,
        name,
        created_at,
        last_login_at
    )
VALUES (
        'u_pm',
        't_demo',
        'sarah.pm@riverside.test',
        'pbkdf2_sha256$100000$+FZ8ppKYwzqMK3SIKJNwzw==$AM1R/HVJr5l3gfrVEMtCeT8kHfqvndvTyS3P0bNifbc=',
        'Sarah Johnson',
        strftime('%s', 'now'),
        strftime('%s', 'now')
    ),
    (
        'u_gp',
        't_demo',
        'dr.james@riverside.test',
        'pbkdf2_sha256$100000$7Qke19GWPgyhWdNt+6zr3Q==$95F2ocophyO2JjGGXbJH1oSdijZHp12xS1CWm9q16n4=',
        'Dr. James Patterson',
        strftime('%s', 'now'),
        strftime('%s', 'now')
    ),
    (
        'u_nurse',
        't_demo',
        'nurse.emma@riverside.test',
        'pbkdf2_sha256$100000$YOtzW9lRe8uVbQ2E2lRO3w==$gmFs9RR+qcYfC3gTKtY6DK9NUVsy4CJxkYvIdK7jG5I=',
        'Emma Wilson',
        strftime('%s', 'now'),
        strftime('%s', 'now')
    ),
    (
        'u_admin',
        't_demo',
        'admin@riverside.test',
        'pbkdf2_sha256$100000$smY0ZQdgOJmhWiBVRWW5/A==$y9hZIbvO3gK1cR40ySsgq0mf7g3SyN+4k6Rb8SZK0Tc=',
        'System Admin',
        strftime('%s', 'now'),
        strftime('%s', 'now')
    );

-- User Roles
INSERT INTO
    user_roles (
        user_id,
        role_id,
        site_id,
        created_at
    )
VALUES (
        'u_pm',
        'r_pm',
        's_demo',
        strftime('%s', 'now')
    ),
    (
        'u_gp',
        'r_gp',
        's_demo',
        strftime('%s', 'now')
    ),
    (
        'u_nurse',
        'r_nurse',
        's_demo',
        strftime('%s', 'now')
    ),
    (
        'u_admin',
        'r_admin',
        's_demo',
        strftime('%s', 'now')
    );

-- 4. QS OWNERSHIP ASSIGNMENTS
-- =========================================================================================

-- Sarah (PM) owns Safe Environments, Governance
INSERT INTO
    qs_owners (
        id,
        tenant_id,
        site_id,
        qs_id,
        owner_user_id,
        review_cadence_days,
        status,
        created_at,
        updated_at
    )
VALUES (
        'qso_1',
        't_demo',
        's_demo',
        'safe.safe_environments',
        'u_pm',
        90,
        'assigned',
        strftime('%s', 'now'),
        strftime('%s', 'now')
    ),
    (
        'qso_2',
        't_demo',
        's_demo',
        'well_led.governance_management_sustainability',
        'u_pm',
        90,
        'in_progress',
        strftime('%s', 'now'),
        strftime('%s', 'now')
    );

-- Dr. James (GP) owns Safeguarding, Medicines
INSERT INTO
    qs_owners (
        id,
        tenant_id,
        site_id,
        qs_id,
        owner_user_id,
        review_cadence_days,
        status,
        created_at,
        updated_at
    )
VALUES (
        'qso_3',
        't_demo',
        's_demo',
        'safe.safeguarding',
        'u_gp',
        90,
        'reviewed',
        strftime('%s', 'now'),
        strftime('%s', 'now')
    ),
    (
        'qso_4',
        't_demo',
        's_demo',
        'safe.medicines_optimisation',
        'u_gp',
        30,
        'assigned',
        strftime('%s', 'now'),
        strftime('%s', 'now')
    );

-- Emma (Nurse) owns Infection Control
INSERT INTO
    qs_owners (
        id,
        tenant_id,
        site_id,
        qs_id,
        owner_user_id,
        review_cadence_days,
        status,
        created_at,
        updated_at
    )
VALUES (
        'qso_5',
        't_demo',
        's_demo',
        'safe.infection_prevention_and_control',
        'u_nurse',
        30,
        'in_progress',
        strftime('%s', 'now'),
        strftime('%s', 'now')
    );

-- 5. CONTENT (Policies, Evidence, Actions)
-- =========================================================================================

-- POLICIES
-- -----------------------------------------------------------------------------------------

-- Safeguarding Policy (Dr James)
INSERT INTO
    policies (
        id,
        tenant_id,
        site_id,
        qs_id,
        title,
        status,
        owner_user_id,
        created_at,
        updated_at
    )
VALUES (
        'pol_safe',
        't_demo',
        's_demo',
        'safe.safeguarding',
        'Safeguarding Adults & Children Policy',
        'published',
        'u_gp',
        strftime('%s', 'now'),
        strftime('%s', 'now')
    );

INSERT INTO
    policy_versions (
        id,
        tenant_id,
        policy_id,
        version_no,
        r2_key,
        created_by,
        created_at,
        summary
    )
VALUES (
        'pv_safe_1',
        't_demo',
        'pol_safe',
        1,
        'dummy_r2_key_safe_v1',
        'u_gp',
        strftime('%s', 'now'),
        'Initial version based on ICB guidelines.'
    );

-- Infection Control Policy (Nurse Emma)
INSERT INTO
    policies (
        id,
        tenant_id,
        site_id,
        qs_id,
        title,
        status,
        owner_user_id,
        created_at,
        updated_at
    )
VALUES (
        'pol_inf',
        't_demo',
        's_demo',
        'safe.infection_prevention_and_control',
        'Infection Prevention & Control Policy',
        'published',
        'u_nurse',
        strftime('%s', 'now'),
        strftime('%s', 'now')
    );

INSERT INTO
    policy_versions (
        id,
        tenant_id,
        policy_id,
        version_no,
        r2_key,
        created_by,
        created_at,
        summary
    )
VALUES (
        'pv_inf_1',
        't_demo',
        'pol_inf',
        1,
        'dummy_r2_key_inf_v1',
        'u_nurse',
        strftime('%s', 'now'),
        'Annual update.'
    );

-- EVIDENCE ITEMS
-- -----------------------------------------------------------------------------------------

-- Fire Risk Assessment (Uploaded by PM) - Observation
INSERT INTO
    evidence_items (
        id,
        tenant_id,
        site_id,
        qs_id,
        evidence_category_id,
        title,
        r2_key,
        mime_type,
        size_bytes,
        uploaded_by,
        uploaded_at,
        status,
        created_at
    )
VALUES (
        'ev_fire_ra',
        't_demo',
        's_demo',
        'safe.safe_environments',
        'observation',
        'Fire Risk Assessment 2024.pdf',
        'dummy_r2_fire',
        'application/pdf',
        1024000,
        'u_pm',
        strftime('%s', 'now'),
        'approved',
        strftime('%s', 'now')
    );

-- Hand Hygiene Audit (Uploaded by Nurse) - Processes
INSERT INTO
    evidence_items (
        id,
        tenant_id,
        site_id,
        qs_id,
        evidence_category_id,
        title,
        r2_key,
        mime_type,
        size_bytes,
        uploaded_by,
        uploaded_at,
        status,
        created_at
    )
VALUES (
        'ev_hh_audit',
        't_demo',
        's_demo',
        'safe.infection_prevention_and_control',
        'processes',
        'Hand Hygiene Audit Q4.xlsx',
        'dummy_r2_hh',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        50000,
        'u_nurse',
        strftime('%s', 'now'),
        'approved',
        strftime('%s', 'now')
    );

-- Patient Survey (Uploaded by Admin) - People's Experience
INSERT INTO
    evidence_items (
        id,
        tenant_id,
        site_id,
        qs_id,
        evidence_category_id,
        title,
        r2_key,
        mime_type,
        size_bytes,
        uploaded_by,
        uploaded_at,
        status,
        created_at
    )
VALUES (
        'ev_pat_survey',
        't_demo',
        's_demo',
        'responsive.person_centred_care',
        'peoples_experience',
        'Annual Patient Survey Results.pdf',
        'dummy_r2_survey',
        'application/pdf',
        2048000,
        'u_admin',
        strftime('%s', 'now'),
        'draft',
        strftime('%s', 'now')
    );

-- ACTIONS
-- -----------------------------------------------------------------------------------------

-- Action: Fix broken fire door (Linked to Safe Environments)
INSERT INTO
    actions (
        id,
        tenant_id,
        site_id,
        qs_id,
        title,
        description,
        owner_user_id,
        due_at,
        status,
        created_at,
        updated_at
    )
VALUES (
        'act_fire_door',
        't_demo',
        's_demo',
        'safe.safe_environments',
        'Repair rear fire exit door',
        'Door sticking - identified in risk assessment.',
        'u_pm',
        strftime('%s', 'now') + 604800,
        'open',
        strftime('%s', 'now'),
        strftime('%s', 'now')
    );

-- Action: Update Safeguarding Training (Linked to Safeguarding)
INSERT INTO
    actions (
        id,
        tenant_id,
        site_id,
        qs_id,
        title,
        description,
        owner_user_id,
        due_at,
        status,
        created_at,
        updated_at
    )
VALUES (
        'act_sg_train',
        't_demo',
        's_demo',
        'safe.safeguarding',
        'Book Level 3 Safeguarding Update',
        'For all clinical staff.',
        'u_pm',
        strftime('%s', 'now') + 1209600,
        'in_progress',
        strftime('%s', 'now'),
        strftime('%s', 'now')
    );

-- LOCAL CONTROLS
-- -----------------------------------------------------------------------------------------

INSERT INTO
    local_controls (
        id,
        tenant_id,
        site_id,
        qs_id,
        title,
        description,
        cadence_days,
        active,
        created_at
    )
VALUES (
        'lc_fridge',
        't_demo',
        's_demo',
        'safe.medicines_optimisation',
        'Daily Vaccine Fridge Temperature Checks',
        'Record max/min temps twice daily.',
        1,
        1,
        strftime('%s', 'now')
    ),
    (
        'lc_legionella',
        't_demo',
        's_demo',
        'safe.safe_environments',
        'Monthly Legionella Water Flushing',
        'Run all taps for 2 mins.',
        30,
        1,
        strftime('%s', 'now')
    );