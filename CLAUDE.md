# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

### Core Technologies

- **Next.js 15** with App Router
- **TypeScript** for type safety
- **TailwindCSS v4** for styling
- **Shadcn/ui** for UI components
- **Supabase** for database and authentication (Remote only, no local db)
- **Zustand** for state management
- **React Query** for data fetching

# General rules:

- Don't include any comments in any files.
- Don't use `console.log` in any app code unless requested, delete all logs after the related development is completed
- All errors should be thrown - no "fallback" functionality
- All errors should be logged with `console.error`
- Import "cn" from "@/lib/utils" to concatenate classes.
- Don't use middleware - route protection and feature gating should be handled by database queries implemented in react-query hooks.

# Loading skeletons

- Full page UI should be loaded initially, with loading skeletons data-dependent content
- Loading skeletons should only replace the content that requires data
  - Example: if a username is loading then only the username text content should be replaced with an inline loading skeleton.
-

# File Organization and Naming Conventions

## Example App Structure

```txt
app/
├── layout.tsx
├── layout.stores.ts
├── layout.actions.ts
├── layout.types.ts
│
├── (auth)/
│   ├── layout.tsx
│   └── login/
│       ├── page.tsx
│       ├── page.hooks.tsx
│       └── page.types.ts
│
├── (dashboard)/
│   ├── layout.tsx
│   ├── layout.stores.ts
│   ├── page.tsx
│   ├── page.hooks.tsx
│   │
│   └── analytics/
│       ├── page.tsx
│       ├── page.stores.ts
│       └── page.hooks.tsx
│
└── [username]/
    ├── page.tsx
    ├── page.actions.ts
    ├── page.types.ts
    │
    └── edit/
        ├── page.tsx
        ├── page.stores.ts
        └── page.hooks.tsx
```

## Utility File Placement Strategy

**Shared functionality → Higher in tree:**

- Auth state → `app/layout.stores.ts` (used everywhere)
- User profile actions → `app/layout.actions.ts` (used in multiple places)
- Theme state → `app/layout.stores.ts` (global)

**Section-specific → Middle level:**

- Dashboard sidebar → `app/dashboard/layout.stores.ts` (all dashboard pages)
- Admin permissions → `app/(admin)/layout.stores.ts` (all admin pages)

**Page-specific → Same directory:**

- Chart data → `app/analytics/page.stores.ts` (only analytics page)
- Form state → `app/contact/page.stores.ts` (only contact page)

## Next.js Routing Patterns

**page.tsx creates routes:**

- `/dashboard` → `app/dashboard/page.tsx`
- `/` → `app/page.tsx`
- `/users/alice` → `app/users/[username]/page.tsx`

**Route Groups (parentheses) organize without affecting URL:**

- `app/(auth)/login/page.tsx` → URL: `/login` (NOT `/auth/login`)
- `app/(dashboard)/page.tsx` → URL: `/` (root page with both `app/layout.tsx` and `app/(dashboard)/layout.tsx` applied)
- Use for: grouping related pages that share a layout

**Dynamic Routes [brackets]:**

- `[id]`, `[slug]`, `[username]` for single parameter
- `[...slug]` for catch-all
- `[[...slug]]` for optional catch-all

**Layouts wrap child pages:**

- `app/layout.tsx` wraps entire app (REQUIRED)
- `app/dashboard/layout.tsx` wraps all `/dashboard/*` pages
- Use for: navigation, sidebars, auth checks

# Hook, action, store and type patterns

**Template files:** Refer to the following template files for examples demonstrating each of the utility file types:

- `documentation/template_files/template.types.ts`
- `documentation/template_files/template.actions.ts`
- `documentation/template_files/template.hooks.ts`
- `documentation/template_files/template.stores.ts`

## Types (`*.types.ts`)

- Export all types, constructed from generated Supabase types (`@/supabase/types`)
- **Shared types** → `layout.types.ts` (User, AuthState, global entities)
- **Page-specific types** → `page.types.ts` (form inputs, page-specific entities)

## Actions (`*.actions.ts`)

- Use Supabase **server client** (publishable key) for database table queries (INSERT, DELETE, UPDATE, SELECT)
- Always validate auth with `auth.getUser()` before queries
- Called actions exclusively from React Query hooks
- Function naming: `featureNameAction` (e.g., `loginAction`, `getUserProfileAction`)

## Hooks (`*.hooks.tsx`)

- Use React Query (`useQuery`, `useMutation`) to call actions (refer to `documentation/react-query.guide.md` for implementation details)
- Use Supabase **browser client** (publishable key) for auth operations (`auth.signIn`, `auth.signOut`, etc.) and real-time subscriptions
- Update zustand stores (if appropriate) in `onSuccess` callbacks of useMutation hooks, or in the `queryFn` of useQuery hooks.
- Manage loading and error states via react-query hooks (NOT the store)
- Function naming: `useFeatureName` (e.g., `useUserAuth`, `useProductList`)

## Stores (`*.stores.ts`)

- Use Zustand for data requiring direct client management beyond React Query
- Never use `persist` for sensitive user data (email, etc.)
- Function naming: `useFeatureNameStore` (e.g., `useAuthStore`, `useSidebarStore`)
- File naming: **plural** `page.stores.ts` (NOT singular `page.store.ts`)

# Supabase CLI

This project uses a remote Supabase repository. There is no local database.

## Create migrations:

`npx supabase migration new [migration name]`
(do not create migration files manually)

## Push migrations:

`npx supabase db push`

## Query the database:

In order to query the database, create and run a custom typescript script. (Do not use `psql`)

## Generate types:

`npx supabase gen types typescript --project-id <project-ref> > supabase/types.ts`

# Spec & task governance

How OpenSpec changes and deferred work are managed. These rules exist to prevent process poisoning (incomplete active changes being treated as a mandate and re-implemented, causing regressions) and corner-cutting, and to keep each spec small, specific, and unambiguous so its tasks pin down exactly what will be done and how. Follow them exactly.

1. **Active changes are build-now-only.** An active OpenSpec change contains only tasks that will be implemented in code in the current cycle. Never leave "manual verification," "legal review," "blocked on external," or "future enhancement" tasks as unchecked boxes in an active change.
2. **Non-code work leaves the change.** The moment a task cannot be finished in code (needs live data, user sign-off, an external key, or it is a future idea), move it to a **Linear issue** and remove it from `tasks.md`. Do not leave it unchecked.
3. **Archive when code-complete + verified.** Run `openspec-verify-change` before archiving. Never leave a change active with lingering unchecked tasks — that lingering is the poisoning vector.
4. **Linear is the idea-channel, never the build-channel.** Never implement directly from a Linear issue. To build a backlog item, first promote it into a **new** OpenSpec change (spec → plan → implement).
5. **No silent checking.** Check a task box only with evidence the work is actually done. "Done but unverifiable right now" becomes a Linear verification issue — never a checked box.
6. **Specs are small and specific.** Keep each change narrow — one coherent piece of work, not a grab-bag. Every task must describe exactly *what* will be done and *how* it will be done (which file, which function, which behavior), so there is no room to improvise or take shortcuts at implementation time. A task a reader could satisfy two different ways is underspecified — tighten it.
7. **Resolve ambiguity before writing, through discussion.** When anything about a spec is unclear or could be read more than one way, stop and discuss it with the user until it is settled — never paper over it with a vague task or a guessed assumption. Ambiguity is resolved in the spec, not deferred to implementation.


**Backlog location:** Linear, Gazzola (personal) workspace, **"Az"** team, **"Eco3D.Shop"** project. Read open issues there before starting deferred work.
