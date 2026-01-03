-- ==========================================
-- 1. Core Entities (Practices, Roles, Users)
-- ==========================================

INSERT INTO
    practices (id, name)
VALUES (
        'practice_main',
        'Riverside Medical Practice'
    );

INSERT INTO
    roles (
        id,
        practice_id,
        name,
        description,
        is_default
    )
VALUES (
        'role_pm',
        'practice_main',
        'Practice Manager',
        'Operational and compliance management',
        1
    ),
    (
        'role_gp_partner',
        'practice_main',
        'GP Partner',
        'Clinical leadership and partnership',
        0
    ),
    (
        'role_lead_nurse',
        'practice_main',
        'Lead Nurse',
        'Nursing team leadership',
        0
    ),
    (
        'role_admin',
        'practice_main',
        'Administrator',
        'Administrative support',
        0
    ),
    (
        'role_hca',
        'practice_main',
        'Healthcare Assistant',
        'Clinical support',
        0
    );

INSERT INTO
    users (
        id,
        practice_id,
        email,
        full_name,
        role_id,
        is_active
    )
VALUES (
        'user_sarah',
        'practice_main',
        'sarah.johnson@riverside.test',
        'Sarah Johnson',
        'role_pm',
        1
    ),
    (
        'user_james',
        'practice_main',
        'james.patterson@riverside.test',
        'Dr. James Patterson',
        'role_gp_partner',
        1
    ),
    (
        'user_emma',
        'practice_main',
        'emma.wilson@riverside.test',
        'Emma Wilson',
        'role_lead_nurse',
        1
    ),
    (
        'user_michael',
        'practice_main',
        'michael.brown@riverside.test',
        'Michael Brown',
        'role_hca',
        1
    ),
    (
        'user_admin',
        'practice_main',
        'admin@riverside.test',
        'System Admin',
        'role_admin',
        1
    );

-- ==========================================
-- 2. CQC Framework (Key Questions & Quality Statements)
-- ==========================================

-- Key Questions
INSERT INTO
    key_questions (
        id,
        number,
        short_name,
        full_question
    )
VALUES (
        'kq_safe',
        1,
        'Safe',
        'Are services safe?'
    ),
    (
        'kq_effective',
        2,
        'Effective',
        'Are services effective?'
    ),
    (
        'kq_caring',
        3,
        'Caring',
        'Are services caring?'
    ),
    (
        'kq_responsive',
        4,
        'Responsive',
        'Are services responsive to people''s needs?'
    ),
    (
        'kq_well_led',
        5,
        'Well-led',
        'Are services well-led?'
    );

-- Quality Statements (Safe)
INSERT INTO
    quality_statements (
        id,
        key_question_id,
        statement_number,
        statement_text
    )
VALUES (
        'qs_safe_1',
        'kq_safe',
        1,
        'Learning culture'
    ),
    (
        'qs_safe_2',
        'kq_safe',
        2,
        'Safe systems, pathways and transitions'
    ),
    (
        'qs_safe_3',
        'kq_safe',
        3,
        'Safeguarding'
    ),
    (
        'qs_safe_4',
        'kq_safe',
        4,
        'Involving people to manage risks'
    ),
    (
        'qs_safe_5',
        'kq_safe',
        5,
        'Safe environments'
    ),
    (
        'qs_safe_6',
        'kq_safe',
        6,
        'Safe and effective staffing'
    ),
    (
        'qs_safe_7',
        'kq_safe',
        7,
        'Infection prevention and control'
    ),
    (
        'qs_safe_8',
        'kq_safe',
        8,
        'Medicines optimisation'
    );

-- Quality Statements (Effective)
INSERT INTO
    quality_statements (
        id,
        key_question_id,
        statement_number,
        statement_text
    )
VALUES (
        'qs_eff_1',
        'kq_effective',
        1,
        'Assessing needs'
    ),
    (
        'qs_eff_2',
        'kq_effective',
        2,
        'Delivering evidence-based care and treatment'
    ),
    (
        'qs_eff_3',
        'kq_effective',
        3,
        'How staff, teams and services work together'
    ),
    (
        'qs_eff_4',
        'kq_effective',
        4,
        'Supporting people to live healthier lives'
    ),
    (
        'qs_eff_5',
        'kq_effective',
        5,
        'Monitoring and improving outcomes'
    ),
    (
        'qs_eff_6',
        'kq_effective',
        6,
        'Consent to care and treatment'
    );

-- Quality Statements (Caring)
INSERT INTO
    quality_statements (
        id,
        key_question_id,
        statement_number,
        statement_text
    )
VALUES (
        'qs_car_1',
        'kq_caring',
        1,
        'Kindness, compassion and dignity'
    ),
    (
        'qs_car_2',
        'kq_caring',
        2,
        'Treating people as individuals'
    ),
    (
        'qs_car_3',
        'kq_caring',
        3,
        'Independence, choice and control'
    ),
    (
        'qs_car_4',
        'kq_caring',
        4,
        'Responding to people''s immediate needs'
    ),
    (
        'qs_car_5',
        'kq_caring',
        5,
        'Workforce wellbeing and enablement'
    );

-- Quality Statements (Responsive)
INSERT INTO
    quality_statements (
        id,
        key_question_id,
        statement_number,
        statement_text
    )
VALUES (
        'qs_resp_1',
        'kq_responsive',
        1,
        'Person-centred care'
    ),
    (
        'qs_resp_2',
        'kq_responsive',
        2,
        'Care provision, integration and continuity'
    ),
    (
        'qs_resp_3',
        'kq_responsive',
        3,
        'Providing information'
    ),
    (
        'qs_resp_4',
        'kq_responsive',
        4,
        'Listening to and involving people'
    ),
    (
        'qs_resp_5',
        'kq_responsive',
        5,
        'Equity in access'
    ),
    (
        'qs_resp_6',
        'kq_responsive',
        6,
        'Equity in experiences and outcomes'
    ),
    (
        'qs_resp_7',
        'kq_responsive',
        7,
        'Planning for the future'
    );

-- Quality Statements (Well-led)
INSERT INTO
    quality_statements (
        id,
        key_question_id,
        statement_number,
        statement_text
    )
VALUES (
        'qs_well_1',
        'kq_well_led',
        1,
        'Shared direction and culture'
    ),
    (
        'qs_well_2',
        'kq_well_led',
        2,
        'Capable, compassionate and inclusive leaders'
    ),
    (
        'qs_well_3',
        'kq_well_led',
        3,
        'Freedom to speak up'
    ),
    (
        'qs_well_4',
        'kq_well_led',
        4,
        'Workforce equality, diversity and inclusion'
    ),
    (
        'qs_well_5',
        'kq_well_led',
        5,
        'Governance, management and sustainability'
    ),
    (
        'qs_well_6',
        'kq_well_led',
        6,
        'Partnerships and communities'
    ),
    (
        'qs_well_7',
        'kq_well_led',
        7,
        'Learning, improvement and innovation'
    ),
    (
        'qs_well_8',
        'kq_well_led',
        8,
        'Environmental sustainability - sustainable development'
    );

-- Evidence Categories
INSERT INTO
    evidence_categories (id, name, description)
VALUES (
        'ec_feedback',
        'People''s experience',
        'Feedback from patients, families and carers'
    ),
    (
        'ec_staff',
        'Staff feedback',
        'Feedback from staff and leaders'
    ),
    (
        'ec_observ',
        'Observation',
        'Observation of care and environment'
    ),
    (
        'ec_process',
        'Processes',
        'Policies, procedures and governance'
    ),
    (
        'ec_outcome',
        'Outcomes',
        'Outcomes of care and treatment'
    ),
    (
        'ec_partner',
        'Partners',
        'Feedback from partners'
    );

-- ==========================================
-- 3. Realistic Evidence & Documents
-- ==========================================

-- 3.1 Policies (Some Expiring soon to generate alerts)
INSERT INTO
    evidence_items (
        id,
        practice_id,
        title,
        description,
        owner_user_id,
        evidence_date,
        review_due_date,
        status,
        confidentiality_level,
        evidence_type
    )
VALUES (
        'doc_inf_ctrl',
        'practice_main',
        'Infection Control Protocol v3.1',
        'Standard operating procedure for infection control',
        'user_emma',
        '2023-05-15',
        '2024-05-15',
        'active',
        'internal',
        'policy'
    ), -- Expired/Due
    (
        'doc_safe_pol',
        'practice_main',
        'Safeguarding Adults Policy v2.0',
        'Policy for safeguarding vulnerable adults',
        'user_james',
        '2023-11-20',
        '2024-11-20',
        'active',
        'internal',
        'policy'
    ), -- Valid
    (
        'doc_fire_ra',
        'practice_main',
        'Fire Safety Risk Assessment 2023',
        'Annual fire safety assessment report',
        'user_sarah',
        '2023-01-10',
        '2024-01-10',
        'active',
        'internal',
        'report'
    ), -- Overdue
    (
        'doc_chaperone',
        'practice_main',
        'Chaperone Policy v1.5',
        'Guidelines for chaperone usage during consultations',
        'user_sarah',
        '2023-08-01',
        '2024-08-01',
        'active',
        'internal',
        'policy'
    ), -- Valid
    (
        'doc_bus_cont',
        'practice_main',
        'Business Continuity Plan v4',
        'Disaster recovery and continuity procedures',
        'user_sarah',
        '2022-06-01',
        '2023-06-01',
        'active',
        'internal',
        'policy'
    );
-- Overdue long time

-- Link Documents to Quality Statements (Tags)
INSERT INTO
    evidence_item_tags (
        id,
        evidence_item_id,
        quality_statement_id,
        evidence_category_id,
        why_it_supports
    )
VALUES (
        'tag_inf_1',
        'doc_inf_ctrl',
        'qs_safe_7',
        'ec_process',
        'Defines core infection control procedures'
    ),
    (
        'tag_safe_1',
        'doc_safe_pol',
        'qs_safe_3',
        'ec_process',
        'Outlines safeguarding responsibilities'
    ),
    (
        'tag_fire_1',
        'doc_fire_ra',
        'qs_safe_5',
        'ec_observ',
        'Evidence of safe environment checks'
    );

-- 3.2 Audits & Feedback
INSERT INTO
    evidence_items (
        id,
        practice_id,
        title,
        description,
        owner_user_id,
        evidence_date,
        status,
        evidence_type
    )
VALUES (
        'aud_hand_hyg',
        'practice_main',
        'Hand Hygiene Audit Q4',
        'Quarterly hand hygiene compliance check',
        'user_emma',
        '2023-12-10',
        'active',
        'audit'
    ),
    (
        'fb_friends_fam',
        'practice_main',
        'Friends & Family Test - Dec 2023',
        'Patient feedback summary',
        'user_sarah',
        '2024-01-02',
        'active',
        'feedback'
    );

-- ==========================================
-- 4. Tasks & Actions (Populate Sidebar/Widgets)
-- ==========================================

-- Gaps (Problems identified)
INSERT INTO
    gaps (
        id,
        quality_statement_id,
        practice_id,
        title,
        description,
        severity,
        status,
        created_by
    )
VALUES (
        'gap_fire_train',
        'qs_safe_5',
        'practice_main',
        'Staff Fire Training Expiring',
        '3 staff members need refresher training',
        'high',
        'open',
        'user_sarah'
    ),
    (
        'gap_pat_survey',
        'qs_eff_1',
        'practice_main',
        'Patient Survey Response Low',
        'Low response rate (12%) for annual survey',
        'medium',
        'open',
        'user_james'
    );

-- Actions (To-Do items)
INSERT INTO
    actions (
        id,
        gap_id,
        practice_id,
        title,
        description,
        owner_user_id,
        due_date,
        status,
        priority
    )
VALUES (
        'act_fire_course',
        'gap_fire_train',
        'practice_main',
        'Book Fire Safety Course',
        'Schedule external trainer for next PLT',
        'user_sarah',
        '2024-02-15',
        'open',
        'high'
    ),
    (
        'act_review_inf',
        NULL,
        'practice_main',
        'Infection Control Audit',
        'Complete Q1 audit including waiting room',
        'user_emma',
        '2024-01-20',
        'due',
        'medium'
    ), -- Standalone action
    (
        'act_update_web',
        NULL,
        'practice_main',
        'Update Website Staff Profiles',
        'Add new registrar photos',
        'user_admin',
        '2024-02-01',
        'open',
        'low'
    ),
    (
        'act_vacc_fridge',
        NULL,
        'practice_main',
        'Check Vaccine Fridge Logs',
        'Weekly temp check review',
        'user_michael',
        '2024-01-10',
        'overdue',
        'high'
    );

-- ==========================================
-- 5. Readiness/Assessments
-- ==========================================

INSERT INTO
    statement_assessments (
        id,
        quality_statement_id,
        practice_id,
        assessment_text,
        assessment_score,
        assessed_by,
        assessed_at
    )
VALUES (
        'asm_safe_1',
        'qs_safe_1',
        'practice_main',
        'We have a strong system for reporting incidents.',
        'Good',
        'user_james',
        '2023-11-15'
    ),
    (
        'asm_safe_7',
        'qs_safe_7',
        'practice_main',
        'Infection control measures are robust but audit frequency needs improvement.',
        'Requires Improvement',
        'user_emma',
        '2023-12-01'
    );