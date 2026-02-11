# Starter Kit Implementation Plan - Phase 3

IMPORTANT: Implement this complete plan. Do not skip, alter or simplify any steps. Do not change the implementation order. Do not implement the plan using multiple agents in parallel, complete each step in sequence. If you're not able to complete any of the required steps, or if you need additional information then stop and ask for clarification, don't just continue and "fill in the gaps".
Complete the process using a single agent in series, do not use multiple agents in parallel.

This is a complete step-by-step guide for building a Next.js application using the starter kit configuration files.

---

## Phase 3: Build Application

Complete each of the steps in this phase for each page in each directory of `documentation/initial_configuration/App_Directory.md`.
Construct each page using the information provided in the `README.md` file.

### Build Order Strategy

Work from the root outward, completing all pages at each directory nesting level before proceeding deeper. Build layouts with their first page or before.

**Example build order:**

```txt
app/
├── 1. layout.tsx (+ layout.stores.ts, layout.actions.ts, layout.types.ts)
├── 2. page.tsx (+ page.hooks.tsx, page.types.ts, etc.)
│
├── (auth)/
│   ├── 3. layout.tsx
│   └── login/
│       └── 3. page.tsx (+ page.hooks.tsx, page.types.ts)
│
├── (dashboard)/
│   ├── 4. layout.tsx (+ layout.stores.ts)
│   ├── 4. page.tsx (+ page.hooks.tsx)
│   │
│   └── analytics/
│       └── 6. page.tsx (+ page.stores.ts, page.hooks.tsx)
│
└── [username]/
    ├── 5. page.tsx (+ page.actions.ts, page.types.ts)
    │
    └── edit/
        └── 7. page.tsx (+ page.stores.ts, page.hooks.tsx)
```

**Order explanation:**

1. Root layout (wraps entire app)
2. Root page (first level)
3. First-level directories: `(auth)/login` and `(dashboard)/` root
4. Continue first-level: `(dashboard)/` root and `[username]/`
5. Second-level: `(dashboard)/analytics/` and `[username]/edit/`

When building each page, ensure its parent layouts are already built.

### Step 3.1: Read Page Specification

From `documentation/initial_configuration/App_Directory.md`, identify:

- Page or layout path and route
- Required features
- Hooks, actions, stores, types needed

From `README.md`, identify:

- The purpose, structure and overall functionality of each page and related layout(s)

### Step 3.2: Create Types

In the corresponding `page.types.ts` or `layout.types.ts` file, define types using the types in `supabase/types.ts`, following the approach demonstrated in `documentation/template_files/template.types.ts`

### Step 3.3: Create Actions

In the corresponding `page.actions.ts` or `layout.actions.ts` file, define server action(s) following the approach demonstrated in `documentation/template_files/template.actions.ts`.
Ensure that all database queries identify and type tables and columns correctly bu referring to the schema in `supabase.types`. All types should be imported from the assigned `page.types.ts` or `layout.types.ts` file.

### Step 3.4: Create Stores

In the corresponding `page.stores.ts` or `layout.stores.ts` file, define Zustand store(s) following the approach demonstrated in `documentation/template_files/template.stores.ts`

### Step 3.5: Create Hooks

In the corresponding `page.hooks.ts` or `layout.hooks.ts` file, define React-Query hook(s) following the approach demonstrated in `documentation/template_files/template.hooks.ts`.

**Email verification workflow:**

When implementing email/password authentication, follow this pattern:

1. User signs up via the `signUp` mutation - no profile is created at this stage
2. User is redirected to `/verify`, which displays a message informing the user to check their inbox for a verification link
3. Supabase sends a verification email with a link that redirects to `/welcome`
4. User clicks the verification link in their email
5. A database trigger automatically creates their profile when the user is verified
6. User is redirected to `/welcome` where they can update their profile data using the UI on the welcome page

If a user attempts to sign in or sign up with an email that already exists but is not verified, the system automatically resends the verification email and redirects to `/verify`.

### Step 3.6: Build Page Component

In `page.tsx` or `layout.tsx`, implement the UI.

All pages and components must be fully responsive down to 320px screen width. This ensures the application works on all mobile devices, including smaller smartphones.

**Responsive design considerations:**

- Layouts may need to rearrange at lower screen widths (e.g., switching from horizontal to vertical layouts)
- Component scaling should adjust appropriately (e.g., reducing padding, font sizes, or element dimensions)
- Use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`, etc.) to handle breakpoints
- Ensure interactive elements remain accessible and usable at all screen sizes
- Horizontal scrolling should only occur when intentional (e.g., image carousels)

**Authentication workflow considerations:**

- Email verification is required before users can access protected routes
- Profiles are created on the `/welcome` page after email verification, not during sign up
- Use the email verification pattern demonstrated in `template.hooks.tsx`

---

## Phase 4: Run build and fix

Run `npm run build` and fix any errors

---

## Phase 5: Final Steps

### Step 5.1: Create Commit

```bash
git add .
git commit -m "Initialize application with starter kit

- Set up Next.js 15 with Tailwind v4 and Shadcn
- Configure Supabase with migrations and type generation
- Add all pages and features from App_Directory.md
- Apply theme configuration
- Test all functionality"
```

### Step 5.2: Push to Repository

```bash
git push
```

### Step 5.3: Inform User

IMPORTANT: Display this exact message at the end of the process:

> "Setup complete! Your application is initialized and ready to start development. The foundation is ready, including: database integration, authentication, application architecture, programming patterns, and themed components.
>
> Follow the steps below to test it out!
>
> 1. Open terminal in VS Code (Ctrl + \` or Cmd + \`)
> 2. Type `npm run dev` into the terminal and hit the `Enter` key
> 3. Type `http://localhost:3000` into your browser's URL bar
> 4. Explore your app! You can sign in with the admin email you provided and the password: `Password123!`
>
> Keep in mind that this is a first version - there will likely be bugs and some missing features. You can now chat with me to shape your app towards your vision.
>
> You can ask me to:
>
> - Add new features or pages
> - Modify existing functionality
> - Fix bugs or improve performance
>
> Where would you like to begin?"

---
