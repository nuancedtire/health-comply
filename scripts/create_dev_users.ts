// Standalone password hashing function (Better Auth uses bcrypt internally)
// This script is for generating SQL, so we use a simple approach
import { createHash } from 'node:crypto';

// Polyfill for Node.js environments if needed (though mostly using Node 20+ now)
if (!globalThis.crypto) {
    // @ts-ignore
    globalThis.crypto = await import('node:crypto').then(c => c.webcrypto);
}

// Simple password hash for dev purposes (Better Auth handles real hashing)
async function hashPassword(password: string): Promise<string> {
    // Using SHA-256 for dev script - NOT production secure!
    // Real auth uses bcrypt via Better Auth
    const salt = crypto.randomUUID().slice(0, 16);
    const hash = createHash('sha256').update(salt + password).digest('hex');
    return `$dev$${salt}$${hash}`;
}

const PASSWORD = 'Password123!';

async function createDevUsers() {
    const lines: string[] = [];

    // Tenant
    const tenantId = 't_demo';
    lines.push(`INSERT INTO tenants (id, name, created_at) VALUES ('${tenantId}', 'Demo Practice Group', strftime('%s', 'now')) ON CONFLICT DO NOTHING`);

    // Site
    const siteId = 's_demo';
    lines.push(`INSERT INTO sites (id, tenant_id, name, address, created_at) VALUES ('${siteId}', '${tenantId}', 'Demo Surgery', '123 Main Street', strftime('%s', 'now')) ON CONFLICT DO NOTHING`);

    // Roles
    const roles = [
        'Director',
        'Site Lead',
        'Clinical Lead',
        'Safety Lead',
        'Admin',
    ];

    for (let i = 0; i < roles.length; i++) {
        const roleId = `r_${roles[i].toLowerCase().replace(/\s+/g, '_')}`;
        lines.push(
            `INSERT INTO roles (id, tenant_id, name) VALUES ('${roleId}', '${tenantId}', '${roles[i]}') ON CONFLICT DO NOTHING`
        );
    }

    // Users
    const users = [
        { id: 'u_pm', email: 'pm@example.com', name: 'Director', role: 'r_practice_manager' },
        { id: 'u_gp', email: 'gp@example.com', name: 'Site Lead', role: 'r_site_lead' },
        { id: 'u_nurse', email: 'nurse@example.com', name: 'Clinical Lead', role: 'r_clinical_lead' },
        { id: 'u_safe', email: 'safeguarding@example.com', name: 'Safety Lead', role: 'r_safety_lead' },
        { id: 'u_admin', email: 'admin@example.com', name: 'Admin', role: 'r_admin' },
    ];

    for (const user of users) {
        const hash = await hashPassword(PASSWORD);
        lines.push(
            `INSERT INTO users (id, tenant_id, email, password_hash, name, created_at) VALUES ('${user.id}', '${tenantId}', '${user.email}', '${hash}', '${user.name}', strftime('%s', 'now')) ON CONFLICT(tenant_id, email) DO UPDATE SET password_hash='${hash}'`
        );
        // User Roles - ensuring unique combination
        lines.push(
            `INSERT INTO user_roles (user_id, role_id, site_id, created_at) VALUES ('${user.id}', '${user.role}', '${siteId}', strftime('%s', 'now')) ON CONFLICT DO NOTHING`
        );
    }

    console.log(lines.join(';\n') + ';');
}

createDevUsers().catch(console.error);
