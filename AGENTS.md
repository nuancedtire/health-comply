# Health Comply - Agent Guide

This documentation provides essential context and guidelines for AI agents working in the Health Comply codebase.

## 🛠 Project Overview

**Health Comply** is a multi-tenant compliance management platform built on the **TanStack Start** framework (React 19, TanStack Router, TanStack Query). It deploys to Cloudflare Workers and uses D1 (SQLite) for the database.

### Core Stack
- **Framework:** TanStack Start (SSR, File-based routing)
- **Runtime:** Cloudflare Workers
- **Language:** TypeScript (Strict)
- **Database:** Drizzle ORM + SQLite (Cloudflare D1)
- **Styling:** Tailwind CSS v4 + Shadcn/UI
- **Auth:** Better Auth
- **Testing:** Vitest

## ⚡️ Common Commands

### Build & Dev
- **Start Dev Server:** `pnpm dev` (Port 3000)
- **Build Production:** `pnpm build`
- **Type Check:** `npx tsc --noEmit` (Run this to verify type safety)

### Testing
- **Run All Tests:** `pnpm test`
- **Run Single Test File:** `pnpm test <filename>`
  - *Example:* `pnpm test src/utils/seo.test.ts`
- **Run Tests with Filter:** `pnpm test -t "pattern"`

### Database (Drizzle/D1)
- **Generate Migrations:** `pnpm db:generate`
- **Apply Local Migrations:** `pnpm db:local`

## 📐 Code Style & Conventions

### File Organization
- **Routes:** `src/routes/` - File-based routing.
  - Files named `__root.tsx` are layouts.
  - `$` handles parameters/wildcards.
- **Components:** `src/components/`
  - `ui/` for Shadcn primitives.
  - Feature folders (e.g., `checklist/`, `users/`) for domain components.
- **Lib/Utils:**
  - `src/lib/` for configuration and core logic.
  - `src/utils/` for pure helper functions.
- **Database:** `src/db/` contains `schema.ts` and `relations.ts`.

### Naming Conventions
- **Files:** Kebab-case (e.g., `user-profile.tsx`, `auth-utils.ts`).
- **Components:** PascalCase (e.g., `UserProfile`, `Button`).
- **Functions/Variables:** CamelCase (e.g., `getUserData`, `isLoading`).
- **Constants:** UPPER_SNAKE_CASE for true constants, CamelCase for configuration objects.
- **Types/Interfaces:** PascalCase.

### Imports
- **Absolute Paths:** ALWAYS use the `@/` alias.
  - ✅ `import { Button } from "@/components/ui/button"`
  - ❌ `import { Button } from "../../components/ui/button"`
- **Order:**
  1. External libraries (React, TanStack, etc.)
  2. Internal absolute imports (`@/components`, `@/lib`)
  3. Relative imports (if absolutely necessary and very close)
  4. Styles (if separate)

### Typing & TypeScript
- **Strict Mode:** The project runs in strict mode. No `any` unless absolutely unavoidable.
- **Zod:** Use Zod for schema validation (API inputs, form data).
- **Inferred Types:** Prefer inferring types from Zod schemas or Drizzle models.
  - `type User = typeof users.$inferSelect`

### Component Architecture (TanStack Start)
- **Loaders:** Use `loader` in `createFileRoute` for SSR data fetching.
- **Querying:** Use `useQuery` with `queryOptions` factories for type-safe data fetching.
  - Example: `queryOptions({ queryKey: [...], queryFn: ... })`
- **Mutations:** Use `useMutation` for server actions. Invalidating queries is preferred over manual state updates.

### Database (Drizzle ORM)
- **Schema:** Defined in `src/db/schema.ts`.
- **Relations:** Defined in `src/db/relations.ts`.
- **Queries:** Use the query builder syntax (e.g., `db.query.users.findFirst(...)`).
- **Migrations:** Do not manually edit SQL files. Modify schema.ts and run `db:generate`.

### Styling (Tailwind CSS v4)
- **Utility First:** Use utility classes directly in JSX.
- **`cn` Helper:** Use `cn()` (clsx + tailwind-merge) for conditional classes.
  - Example: `className={cn("bg-primary", isActive && "bg-secondary")}`
- **Shadcn/UI:** Extend existing primitives in `@/components/ui`. Avoid rewriting base styles.
- **Colors:** Use CSS variables defined in themes (e.g., `bg-background`, `text-foreground`) rather than hardcoded hex values to support dark mode.

## 🛡 Error Handling
- **API:** Return standard error responses. Use proper HTTP status codes.
- **UI:** Use Error Boundaries (supported by TanStack Router) for route-level errors.
- **Forms:** Display validation errors inline using `react-hook-form` and `zod`.

## 🧪 Testing Guidelines
- **Unit Tests:** Focus on utility functions and complex logic.
- **Component Tests:** Test interaction and rendering using `@testing-library/react`.
- **Mocks:** Mock external services and database calls.

## 🤖 Agent Workflow
1. **Analyze:** Read `package.json`, `schema.ts`, and relevant source files first.
2. **Plan:** Outline changes before editing.
3. **Implement:** Follow existing patterns (check adjacent files).
4. **Verify:**
   - Run `npx tsc --noEmit` to check types.
   - Run `pnpm test` if tests exist or were added.
   - Run `pnpm build` to ensure the build succeeds.
