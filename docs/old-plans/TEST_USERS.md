# Test Users Documentation

This document provides credentials and instructions for testing the Health Comply platform with pre-seeded test organizations and users.

## How to Seed Test Data

1. **Login as System Admin** - You must be logged in with a system admin account
2. **Navigate to Admin Debug Page** - Go to `/admin/debug` in your browser
3. **Reset Database (Optional)** - Click "Reset Database" to clear existing test data
   - Type `RESET` to confirm
   - This will delete all tenants except your own, and clear all operational data
4. **Seed Database** - Click "Seed Database" to create test organizations and users
   - This will create 3 test organizations with multiple sites and users
   - Each organization has one user for every role

## Universal Password

All test users share the same password for convenience:

**Password:** `Password123!`

---

## Test Organizations

### 1. Health Core Ltd

A large multi-site healthcare organization with comprehensive coverage across three locations.

**Sites:**
- Downtown Clinic
- Uptown Surgery
- Westside Health

#### Tenant-Scoped Roles

| Role | Name | Email | Description |
|------|------|-------|-------------|
| Director | Alice Manager | manager@healthcore.com | Full administrative access to all sites |
| Admin | Fiona Admin | admin1@healthcore.com | Administrative access across the organization |
| Compliance Officer | Ian Compliance | compliance@healthcore.com | Monitors compliance across all sites |

#### Site-Scoped Roles

| Role | Name | Email | Site | Description |
|------|------|-------|------|-------------|
| GP Partner | Dr. Bob GP | gp1@healthcore.com | Downtown Clinic | Lead GP at Downtown location |
| GP Partner | Dr. Sarah Smith | gp2@healthcore.com | Uptown Surgery | Lead GP at Uptown location |
| Nurse Lead | Charlie Nurse | nurse1@healthcore.com | Uptown Surgery | Lead nurse at Uptown Surgery |
| Nurse Lead | Diana Nurse | nurse2@healthcore.com | Westside Health | Lead nurse at Westside Health |
| Safeguarding Lead | Edward Guard | safeguarding@healthcore.com | Downtown Clinic | Safeguarding responsibility |
| Clinician | George Clinician | clinician1@healthcore.com | Uptown Surgery | Clinical staff member |
| Receptionist | Hannah Frontdesk | reception@healthcore.com | Westside Health | Front desk staff |

---

### 2. Rural Health Trust

A smaller rural practice serving remote communities with two sites.

**Sites:**
- Village Practice
- Remote Outpost

#### Tenant-Scoped Roles

| Role | Name | Email | Description |
|------|------|-------|-------------|
| Director | David Manager | manager@rural.com | Full administrative access |
| Admin | Isabella Admin | admin@rural.com | Administrative access |
| Compliance Officer | Jack Compliance | compliance@rural.com | Compliance monitoring |

#### Site-Scoped Roles

| Role | Name | Email | Site | Description |
|------|------|-------|------|-------------|
| GP Partner | Dr. Eve GP | gp@rural.com | Village Practice | Lead GP at Village Practice |
| GP Partner | Dr. Frank Partner | partner@rural.com | Remote Outpost | Lead GP at Remote Outpost |
| Nurse Lead | Grace Nurse | nurse@rural.com | Village Practice | Lead nurse |
| Safeguarding Lead | Karen Guard | safeguarding@rural.com | Village Practice | Safeguarding responsibility |
| Clinician | Liam Clinician | clinician@rural.com | Remote Outpost | Clinical staff member |
| Receptionist | Henry Frontdesk | reception@rural.com | Village Practice | Front desk staff |

---

### 3. Metropolitan Medical

A large metropolitan healthcare provider with three facilities.

**Sites:**
- Central Hospital
- East Wing Clinic
- West Wing Clinic

#### Tenant-Scoped Roles

| Role | Name | Email | Description |
|------|------|-------|-------------|
| Director | Julian Manager | manager@metromed.com | Full administrative access |
| Admin | Monica Admin | admin@metromed.com | Administrative access |
| Compliance Officer | Nathan Compliance | compliance@metromed.com | Compliance monitoring |

#### Site-Scoped Roles

| Role | Name | Email | Site | Description |
|------|------|-------|------|-------------|
| GP Partner | Dr. Kevin Director | gp@metromed.com | Central Hospital | Medical director |
| Nurse Lead | Laura Lead | nurse@metromed.com | Central Hospital | Lead nurse |
| Safeguarding Lead | Nina Safe | safeguarding@metromed.com | Central Hospital | Safeguarding responsibility |
| Clinician | Mike Clinician | clinician@metromed.com | East Wing Clinic | Clinical staff member |
| Receptionist | Oscar Frontdesk | reception@metromed.com | East Wing Clinic | Front desk staff |

---

## Role Descriptions

### Tenant-Scoped Roles

These roles have access across all sites within the organization:

- **Director** - Full access to all features and sites, can manage users, sites, and organizational settings
- **Admin** - Administrative access, can manage users and operational data but with some restrictions
- **Compliance Officer** - Monitors compliance, manages quality statements, evidence, and controls across all sites

### Site-Scoped Roles

These roles are assigned to specific sites and have limited access:

- **GP Partner** - Lead general practitioner, site leadership responsibilities
- **Nurse Lead** - Lead nurse at the site, manages nursing compliance
- **Safeguarding Lead** - Responsible for safeguarding at the site
- **Clinician** - Clinical staff member with basic access
- **Receptionist** - Front desk staff with limited access

---

## Testing Scenarios

### Test Multi-Site Access
Login as a Director (e.g., `manager@healthcore.com`) to see access across all sites.

### Test Single-Site Access
Login as a GP Partner (e.g., `gp@rural.com`) to see site-restricted access.

### Test Different Role Permissions
Compare the views and capabilities between:
- Director (full access)
- Compliance Officer (compliance-focused)
- Clinician (limited access)
- Receptionist (basic access)

### Test Evidence Management
1. Login as Compliance Officer
2. Upload evidence documents
3. Link evidence to quality statements and controls

### Test User Management
1. Login as Director or Admin
2. Invite new users
3. Assign roles
4. Manage existing users

---

## Notes

- All users are created with invitation records automatically accepted during seeding
- The seeding process will skip users that already exist to prevent duplicates
- After resetting the database, you'll need to seed again to recreate test data
- Your own system admin account and tenant are preserved during reset operations

---

## Troubleshooting

**Q: I can't see the Seed/Reset buttons**
- A: You must be logged in as a System Admin to access these features

**Q: Seeding failed with "User already exists"**
- A: This is expected if you've already seeded. The process will skip existing users and continue

**Q: I reset the database but my account still works**
- A: By design, the reset operation preserves your own tenant and account while clearing operational data

**Q: Can I change these test passwords?**
- A: Yes, after seeding you can login as any user and change their password through the UI
