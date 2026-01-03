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
        'safe',
        'Is it safe?'
    ),
    (
        'kq_effective',
        2,
        'effective',
        'Is it effective?'
    ),
    (
        'kq_caring',
        3,
        'caring',
        'Is it caring?'
    ),
    (
        'kq_responsive',
        4,
        'responsive',
        'Is it responsive?'
    ),
    (
        'kq_well_led',
        5,
        'well_led',
        'Is it well-led?'
    );

-- Evidence Categories
INSERT INTO
    evidence_categories (id, name, description)
VALUES (
        'ec_peoples_exp',
        'peoples_experience',
        'Feedback from people who use the service, their families, and carers'
    ),
    (
        'ec_staff_feedback',
        'staff_leader_feedback',
        'Feedback from staff and leaders'
    ),
    (
        'ec_partner_feedback',
        'partner_feedback',
        'Feedback from partners'
    ),
    (
        'ec_observation',
        'observation',
        'Observation of care and environment'
    ),
    (
        'ec_processes',
        'processes',
        'Policies, procedures, and governance'
    ),
    (
        'ec_outcomes',
        'outcomes',
        'Outcomes of care and treatment'
    );

-- Quality Statements (Sample set - full 34 would be added here)
-- Safe
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
        'Safe systems, pathways, and transitions'
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

-- Key Roles
INSERT INTO
    practices (id, name)
VALUES (
        'practice_default',
        'Default Practice'
    );

INSERT INTO
    roles (
        id,
        practice_id,
        name,
        is_default
    )
VALUES (
        'role_pm',
        'practice_default',
        'practice_manager',
        1
    ),
    (
        'role_clinical',
        'practice_default',
        'clinical_lead',
        0
    ),
    (
        'role_staff',
        'practice_default',
        'staff',
        0
    );

-- Default User (password handling to be implemented)
INSERT INTO
    users (
        id,
        practice_id,
        email,
        full_name,
        role_id
    )
VALUES (
        'user_admin',
        'practice_default',
        'admin@example.com',
        'Admin User',
        'role_pm'
    );