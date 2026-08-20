# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Sensitive data (read first)

**Development sessions are streamed and recorded. Anything written into a session is published.**

A `PostToolUse` hook masks sensitive values in tool results before they reach the session, so a value returned by a shell command, a Supabase query or a file read never enters the transcript. That covers what tools return. It does not cover what you write.

**Never write a sensitive value into a reply, a commit message, a ticket, a spec or a file without asking first.** This applies to a value learned earlier in the conversation, to one you inferred, and to one supplied by the user. Ask, and wait for an answer.

Sensitive means: email addresses, JSON Web Tokens, bearer tokens and API keys, secrets of any kind, account and auth identifiers, phone numbers, postal addresses, and any raw row from `auth.users`.

- When a value must be referred to, describe it instead: "the owner's address", not the address.
- When querying production, select a masked expression rather than the raw column, so the value is never fetched in the first place.
- Reading a value in full is deliberate and single-use: run that one command with `VIDSTUBE_REVEAL=1`. Never export it for a session.
- The masking rules live in `.claude/hooks/sensitive-mask.mjs`. **The copy in `../Vids.Tube` is authoritative and is where the tests are.** A rule is changed there first and copied here, and the two files are byte-identical, so drift is a single comparison.

### Core Technologies

- **Next.js 15** with App Router
- **TypeScript** for type safety
- **TailwindCSS v4** for styling
- **Shadcn/ui** for UI components
- **Supabase** for database and authentication (Remote only, no local db)
- **Zustand** for state management
- **React Query** for data fetching

# General rules:

- Format all responses in accordance with the `/simple` skill unless otherwise specified.
- All responses should be extremely concise, specific and focused on what the user needs to know
- Any skills from the "AI Resources" repository (public; owned by AaronGazzola) should match any changes made to the local version. 
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

- `docs/template_files/template.types.ts`
- `docs/template_files/template.actions.ts`
- `docs/template_files/template.hooks.ts`
- `docs/template_files/template.stores.ts`

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

- Use React Query (`useQuery`, `useMutation`) to call actions (refer to `docs/react-query.guide.md` for implementation details)
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

# Where work happens: worktrees and branches

Development sessions are streamed, and the app being demonstrated is running locally out of **this** directory. An agent editing files here recompiles the running app mid-stream. So **implementation happens in a separate worktree, and this directory changes only when the owner says so** — one merge, one reload, at a moment of their choosing.

Three branches, one long-lived checkout:

- **`dev`** is checked out here, in the **streaming worktree** (`C:\Users\azgaz\Documents\Projects\eco3d.shop`). This is the only place the streamed server runs.
- **A branch per OpenSpec change**, cut from `dev`, checked out in its own worktree outside this folder. All implementation happens there.
- **`main`** is the published branch. It is never checked out locally; pushing to it deploys to production.

## Starting a change

```bash
git worktree add ../eco3d.shop.worktrees/<change-id> -b change/<change-id> dev
```

- Worktrees live **outside** the project folder. A worktree inside it is watched by the running dev server, which then recompiles on every agent edit — the exact interruption this whole arrangement exists to prevent.
- **Never run `npm install` in a feature worktree.** Link the existing modules instead, from inside the new worktree:

  ```powershell
  New-Item -ItemType Junction -Path node_modules -Target "C:\Users\azgaz\Documents\Projects\eco3d.shop\node_modules"
  ```

  Installing through that junction writes into the live tree, so don't. When a change genuinely needs a new dependency, **stop and ask the owner to install it** rather than installing it yourself.
- `doppler.yaml` is committed, so secrets resolve in a fresh worktree with no setup step.

## Verifying in a feature worktree

`npx tsc --noEmit`, `npm run lint` and read-only scripts run in the worktree as normal.

**The observation loop is the exception that needs a server**, and it needs its own one. Run it from the feature worktree on a spare port (`npm run prod:3002` or `prod:3003`), never on the port the stream is showing, and never against the streaming worktree's server — see `docs/observation-loop.md`. That build is a CPU spike on the machine encoding video, so keep captures purposeful and say when one is about to start.

**Migrations are written but not pushed.** Supabase is remote-only. `npx supabase db push` from a feature worktree changes the database under whatever is on screen. Write the migration file in the worktree; push it after the merge, on the owner's word.

## Merging into the streaming worktree

Merging is the owner's call, never the agent's own initiative, and it is deliberately one recompile:

```bash
git -C C:/Users/azgaz/Documents/Projects/eco3d.shop merge --no-ff change/<change-id>
```

- It must run **from the streaming worktree**. Git refuses to move a branch that is checked out elsewhere, so a feature worktree cannot update `dev` by itself — which is the point.
- That tree usually holds uncommitted parallel work. If git refuses the merge because of local changes, **stop and report it.** Never stash, force, reset or check out over it.
- Commit in the feature worktree as work progresses, so a merge is always available the moment it is asked for.

## Publishing to viewers

```bash
git push origin dev:main   # deploys to production
git branch -f main dev     # keep the local ref in step
```

## Finishing

Remove the worktree when the change is archived:

```bash
git worktree remove ../eco3d.shop.worktrees/<change-id>
git branch -d change/<change-id>
```

# Spec & task governance

How OpenSpec changes and deferred work are managed. These rules exist to prevent process poisoning (incomplete active changes being treated as a mandate and re-implemented, causing regressions) and corner-cutting, and to keep each spec small, specific, and unambiguous so its tasks pin down exactly what will be done and how. Follow them exactly.

1. **Active changes are build-now-only.** An active OpenSpec change contains only tasks that will be implemented in code in the current cycle. Never leave "manual verification," "legal review," "blocked on external," or "future enhancement" tasks as unchecked boxes in an active change.
2. **Non-code work leaves the change.** The moment a task cannot be finished in code (needs live data, user sign-off, an external key, or it is a future idea), move it to a **Linear issue** and remove it from `tasks.md`. Do not leave it unchecked.
3. **Archive when code-complete + verified.** Run `openspec-verify-change` before archiving. Never leave a change active with lingering unchecked tasks — that lingering is the poisoning vector.
4. **Linear is the idea-channel, never the build-channel.** Never implement directly from a Linear issue. To build a backlog item, first promote it into a **new** OpenSpec change (spec → plan → implement).
5. **No silent checking.** Check a task box only with evidence the work is actually done. "Done but unverifiable right now" becomes a Linear verification issue — never a checked box.
6. **Specs are small and specific.** Keep each change narrow — one coherent piece of work, not a grab-bag. Every task must describe exactly *what* will be done and *how* it will be done (which file, which function, which behavior), so there is no room to improvise or take shortcuts at implementation time. A task a reader could satisfy two different ways is underspecified — tighten it.
7. **Resolve ambiguity before writing, through discussion.** When anything about a spec is unclear or could be read more than one way, stop and discuss it with the user until it is settled — never paper over it with a vague task or a guessed assumption. Ambiguity is resolved in the spec, not deferred to implementation.
8. **A change is built in its own worktree.** The branch and worktree are created when the proposal is approved and removed when the change is archived — see "Where work happens". No implementation is ever written in the streaming worktree; it only receives merges, on the owner's word.


**Backlog location:** Linear, Gazzola (personal) workspace, **"Az"** team, **"Eco3D.Shop"** project. Read open issues there before starting deferred work.

# Handover documents

Sessions hand over through `docs/handover/`: one file per session, named `TEMP` plus the date, for example `docs/handover/TEMP-12-Aug-2026.md`.

A handover document is a **one-shot baton, not a reference.** It is written by `/handover` at the end of a session, and read then **deleted** by `/sync` at the start of the next one.

- **Never cite one as a source**, and never carry an undated claim from one into a report as current. Confirm it against the code, the roadmap or the spec, and cite that instead.
- **Never update one in place in a later session.** The old one is deleted and a fresh one is written.
- Where a handover document disagrees with `docs/animation-roadmap.md` or a spec, those win.

A single long-lived handover file was tried first, went stale twice and misled once, which is why the convention is now one dated, disposable file per session.

# Animation

Read these before proposing, specifying or implementing anything to do with creature motion:

- `docs/locomotion.md` — how the paper's model is applied to our rig, and the fixed substrate that never changes.
- `docs/reference/locomotion-reference.md` — the verified extraction of the source paper. Single source of truth for every equation, coupling and constant. Where any other document disagrees, the reference wins.
- `docs/animation-roadmap.md` — the living plan, the locked decisions, and the decision log.
- `docs/observation-loop.md` — how to observe the running system before making any claim about its behaviour.

Locomotion is CPG-driven inside a physics simulation. Movement emerges from controller → muscles → body dynamics → environment forces. Never hand-author locomotion, and never claim a behaviour without an observation to back it.
