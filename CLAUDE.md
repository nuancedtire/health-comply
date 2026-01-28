# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Health Comply (Compass by aiigent.io)** is a healthcare compliance management platform for UK CQC (Care Quality Commission) regulations. It helps healthcare organizations track quality statements, manage evidence, assign controls, and prepare for inspections.

## Commands

### Development
- `pnpm dev` - Start development server on port 3000
- `pnpm build` - Build for production (uses increased memory: 8GB)
- `pnpm serve` - Preview production build
- `pnpm test` - Run tests with Vitest
- `pnpm deploy` - Build and deploy to Cloudflare Workers

### Database
- `pnpm db:generate` - Generate Drizzle migrations from schema changes
- `pnpm db:local` - Apply migrations to local D1 database
- `pnpm cf-typegen` - Generate Cloudflare Worker types

### Shadcn Components
- `pnpx shadcn@latest add <component>` - Add new Shadcn components (use latest version)

## Architecture

### Core Stack
- **TanStack Start**: Type-safe, client-first, full-stack React framework
- **TanStack Router**: File-based routing with type-safe navigation
- **TanStack Query**: Server state management with SSR integration
- **React 19**: Latest React with concurrent features
- **Vite**: Build tool and dev server
- **TypeScript**: Strict mode enabled
- **Tailwind CSS v4**: Utility-first styling with CSS variables

### Cloudflare Workers Platform
- **D1 Database**: SQLite-based serverless database
- **R2 Storage**: Object storage for evidence files
- **Durable Objects**: Stateful ChatAgent for AI conversations
- **Workflows**: Background processing (evidence-ingest workflow)
- **Workers AI**: AI capabilities (remote binding)

### Database & ORM
- **Drizzle ORM**: Type-safe SQL query builder
- **SQLite/D1**: Database dialect
- Migrations stored in `drizzle/` directory

### Authentication
- **Better Auth**: Authentication library with Drizzle adapter
- Email/password authentication
- Invitation-only registration (after first user)
- Multi-tenant with role-based access control

## Project Structure

```
src/
├── agent/              # Cloudflare Durable Objects
│   └── ChatAgent.ts    # AI chat agent with tool calling
├── components/
│   ├── ui/             # Shadcn UI components (new-york style)
│   ├── app/            # Application-level components (sidebar, header)
│   ├── ai/             # AI chat interface components
│   ├── dashboard/      # Dashboard widgets
│   ├── evidence/       # Evidence management components
│   ├── checklist/      # Controls hub and checklists
│   ├── landing/        # Marketing/landing page components
│   ├── users/          # User management components
│   ├── theme/          # Theme provider and toggle
│   └── navigation/     # Navigation components
├── core/
│   ├── data/           # Static data (extended_controls.json, taxonomy)
│   ├── functions/      # Server functions (TanStack Start createServerFn)
│   ├── middleware/     # Request middleware (auth, db, session)
│   └── workflows/      # Cloudflare Workflows (evidence-ingest)
├── db/
│   ├── schema.ts       # Drizzle schema definitions
│   ├── relations.ts    # Drizzle relations
│   └── index.ts        # Database exports
├── hooks/              # Custom React hooks
├── integrations/       # Third-party integrations
│   └── tanstack-query/ # Query client setup
├── lib/
│   ├── config/         # Static configuration (roles, permissions)
│   ├── services/       # Business logic services
│   ├── auth.ts         # Better Auth configuration
│   ├── auth-client.ts  # Client-side auth utilities
│   ├── auth-server.ts  # Server-side auth utilities
│   ├── audit.ts        # Audit logging utilities
│   └── utils.ts        # General utilities (cn, clsx)
├── routes/             # File-based routes (auto-generates routeTree.gen.ts)
│   ├── __root.tsx      # Root layout with providers
│   ├── api/            # API routes
│   │   └── auth/       # Auth API endpoints
│   ├── admin/          # Admin pages (audit, users, tenants)
│   └── legal/          # Legal pages
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
│   ├── seo.ts          # SEO helper functions
│   ├── csv.ts          # CSV parsing utilities
│   ├── cn.ts           # Class name utilities
│   └── env.ts          # Environment utilities
├── router.tsx          # Router setup with SSR query integration
├── server.ts           # Server entry point
├── start.tsx           # Client entry point
├── styles.css          # Global styles with Tailwind
└── routeTree.gen.ts    # Auto-generated route tree (DO NOT EDIT)
```

## Database Schema

### Multi-Tenant Core
- `tenants` - Organization/practice records
- `sites` - Physical locations within a tenant
- `users` - User accounts with tenant association
- `sessions` - Authentication sessions
- `accounts` - OAuth accounts
- `verifications` - Email verification tokens
- `userRoles` - User role assignments (tenant or site-scoped)
- `invitations` - Pending user invitations

### CQC Taxonomy (Seeded/Immutable)
- `cqcKeyQuestions` - CQC key questions (Safe, Effective, Caring, Responsive, Well-led)
- `cqcQualityStatements` - Quality statements under each key question
- `evidenceCategories` - Evidence classification categories

### Compliance Management
- `localControls` - Site-specific compliance controls with scheduling
- `qsOwners` - Quality statement ownership assignments
- `evidenceItems` - Uploaded evidence documents
- `evidenceLinks` - Links between evidence and other entities
- `actions` - Gap remediation actions
- `actionApprovals` - Action approval records
- `policies` - Policy documents
- `policyVersions` - Policy version history
- `policyApprovals` - Policy approval records
- `policyReadAttestations` - Policy read confirmations

### Inspection & Audit
- `inspectionPacks` - Inspection preparation packages
- `inspectionPackOutputs` - Generated pack files (ZIP, PDF)
- `auditLog` - System-wide audit trail

## Key Patterns

### Server Functions
Server functions use TanStack Start's `createServerFn` with middleware chains:

```typescript
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/core/middleware/auth-middleware";

const baseFunction = createServerFn().middleware([authMiddleware]);

export const myFunction = baseFunction
  .validator((data) => schema.parse(data))
  .handler(async ({ data, context }) => {
    const { user, db, env } = context;
    // Implementation
  });
```

### Middleware
Middleware provides context to server functions:
- `authMiddleware` - Validates session, provides user/db/env
- `dbMiddleware` - Provides database connection
- `sessionMiddleware` - Session management

### Route Protection
Routes use `beforeLoad` for authentication checks:

```typescript
export const Route = createFileRoute('/dashboard')({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/login' });
    }
  },
  component: DashboardPage,
});
```

### Root Context
The root route provides global context:
- `queryClient` - TanStack Query client
- `user` - Current authenticated user
- `session` - Current session
- `uiSettings` - UI preferences

### Layouts
Use `MainLayout` component for authenticated pages with sidebar:

```typescript
import { MainLayout } from '@/components/main-layout';

function MyPage() {
  return (
    <MainLayout title="Page Title">
      {/* Page content */}
    </MainLayout>
  );
}
```

## Cloudflare Integration

### Environment Bindings (via wrangler.jsonc)
- `DB` - D1 database binding
- `R2` - R2 bucket for file storage
- `AI` - Workers AI (remote mode)
- `CHAT_AGENT` - Durable Object for AI chat
- `EVIDENCE_INGEST_WORKFLOW` - Background workflow

### Durable Objects
`ChatAgent` manages stateful AI conversations with:
- Conversation history persistence
- Tool calling (web search, CQC guidance lookup)
- Context awareness (current page, user role, site)

### Workflows
`EvidenceIngestWorkflow` processes uploaded evidence:
1. Fetches file from R2
2. Extracts text content
3. Classifies document with AI
4. Matches to controls or suggests new ones
5. Updates evidence record

## Roles System

Roles are defined statically in `src/lib/config/roles.ts`:

**Tenant-scoped roles:**
- Practice Manager - Full access
- Admin - Administrative access
- Compliance Officer - Compliance monitoring

**Site-scoped roles:**
- GP Partner - Site leadership
- Nurse Lead - Lead nurse
- Safeguarding Lead - Safeguarding responsibility
- Clinician - Clinical staff
- Receptionist - Front desk

## Styling

### Shadcn Configuration
- Style: `new-york`
- Base color: `zinc`
- CSS variables enabled
- Icon library: `lucide-react`

### Additional UI Libraries
- `@tabler/icons-react` - Additional icons
- `motion` (Framer Motion) - Animations
- `cmdk` - Command palette
- `sonner` - Toast notifications

### Path Aliases
- `@/*` maps to `src/*`

## Development Notes

- File-based routing auto-generates `routeTree.gen.ts` - DO NOT EDIT manually
- Demo files (prefixed with `demo`) can be safely deleted
- The project uses pnpm as the package manager
- Devtools are available for Router and Query in development (currently commented out)
- Routes support loaders, error boundaries, and not-found components
- Environment variables go in `.dev.vars` (gitignored)
- First user to sign up becomes system admin automatically
- Subsequent users require invitations

## Testing

Tests use Vitest with:
- `@cloudflare/vitest-pool-workers` for Worker testing
- `@testing-library/react` for component testing
- `jsdom` for DOM environment
