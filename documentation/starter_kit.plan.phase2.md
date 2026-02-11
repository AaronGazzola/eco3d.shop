# Starter Kit Implementation Plan - Phase 2

IMPORTANT: Implement this complete plan. Do not skip, alter or simplify any steps. Do not change the implementation order. Do not implement the plan using multiple agents in parallel, complete each step in sequence. If you're not able to complete any of the required steps, or if you need additional information then stop and ask for clarification, don't just continue and "fill in the gaps".
Complete the process using a single agent in series, do not use multiple agents in parallel.

This is a complete step-by-step guide for building a Next.js application using the starter kit configuration files.

---

## Phase 2: Setup Supabase

- Guide me to find my Supabase credentials in the dashboard by providing the following instructions:

  ```
  To get your keys:
  1.  Go to your Supabase project dashboard
  2.  Click "Project Settings" in the left sidebar
  3.  Click "API Keys" in the left settings menu
  4.  Scroll down to "Publishable key" and click the copy button next to the "default" key and paste it here (starts with "sb*publishable*")
  5.  Scroll down to "Secret keys" and click the copy button next to the "default" key and paste it here (starts with "sb*secret*")
  6.  Also copy the URL in your browser's URL/search bar (starts with: "https://supabase.com/dashboard/project/") and paste it here
  7.  In the dashboard sidebar, click "Authentication" → "URL Configuration"
  8. Add "http://localhost:3000" to the Site URL and save.
  9. Add "http://localhost:3000/**" to the Redirect URLs and save. Also add a redirect URL for any other domain name that you will use for this app, ie "https://yourdomain.com/**"
  ```

- After I provide these credentials, create a .env.local file (extract the supabase URL and project ref from the full url provided, eg: "https://supabase.com/dashboard/project/cqblezzhywdjerslhgho/settings/api-keys/legacy" -> "https://cqblezzhywdjerslhgho.supabase.co" + "cqblezzhywdjerslhgho"):
  NEXT_PUBLIC_SUPABASE_URL=<my-project-url>
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<my-anon-key>
  NEXT_PUBLIC_SUPABASE_PROJECT_REF=<my-project-ref>
  SUPABASE_SECRET_KEY=<my-service-role-key>

- Verify .gitignore ignores ".env.local" but does not ignore ".env.example"
- Add a ".env.example" file with the supabase key variable names without the values
- Run "npx supabase projects list" to check if supabase is authenticated, if not authenticated, then prompt me to open the terminal with Cmd + \` or Ctrl + \` and enter "npx supabase login" and follow the prompts to authenticate supabase

### Step 2.1: Link Project

```bash
npx supabase link --project-ref <project-ref>
```

### Step 2.2: Create Migration

```bash
npx supabase migration new initial_schema
```

### Step 2.3: Add Database Schema

Copy complete schema from `documentation/initial_configuration/Database.md` into the migration file at `supabase/migrations/<timestamp>_initial_schema.sql`.

The schema includes:

- Table definitions
- Indexes
- RLS policies
- Enum types

### Step 2.4: Push Migration

```bash
 echo "Y" | npx supabase db push
```

Verify success message. If errors occur, check schema syntax.

### Step 2.5: Generate Types

```bash
npx supabase gen types typescript --project-id <project-ref> > supabase/types.ts
```

Verify `supabase/types.ts` file is created and contains type definitions.

### Step 2.6: Create Client Files

Copy and rename the template client files into their corresponding locations:

- `documentation/template_files/server-client.ts` → `supabase/server-client.ts`
- `documentation/template_files/browser-client.ts` → `supabase/browser-client.ts`
- `documentation/template_files/admin-client.ts` → `supabase/admin-client.ts`

### Step 2.7: Create Authentication Routes

Copy and rename the template auth files into their corresponding locations:

- `documentation/template_files/auth-callback-route.ts` → `app/auth/callback/route.ts`
- `documentation/template_files/auth-error-page.tsx` → `app/auth/error/page.tsx`

These routes handle OAuth and email confirmation flows.

### Step 2.8: Install Dependencies

```bash
npm install @supabase/supabase-js @supabase/ssr
```

### Step 2.9: Database Seeding

Ask the user for an email address that will be used to seed the admin user, this should be a valid email address that the user has access to so they can verify their account if required. If not email is provided then fallback to a generic placeholder admin email address.

1. Install tsx: `npm install -D tsx`
2. Copy and rename the template seed files into their corresponding locations:

- `documentation/template_files/seed.template.ts` → `supabase/seed.ts`
- `documentation/template_files/reset-seed.ts` → `scipts/reset-seed.ts`

3. Update `supabase/seed.ts`:
   - Replace `admin@example.com` with the user's provided email
   - Remove manual profile insertion (lines 64-88) - profiles are created by DB trigger
   - Update profile querying to wait for trigger-created profiles
   - Ensure all column names, types, and enums match generated types in `supabase/types.ts`
4. Add scripts to `package.json`:
   - `"db:seed": "tsx supabase/seed.ts"`
   - `"db:reset-seed": "bash scripts/reset-seed.sh"`
5. Run: `npm run db:seed`

---

## Next Steps

Phase 2 is now complete. To continue with Phase 3 (Build Application and Final Steps):

1. Read `documentation/starter_kit.plan.phase3.md`
2. Switch to plan mode and create a step-by-step plan from the instructions in that document
3. Follow the plan exactly as written

IMPORTANT: DO NOT PROCEED TO PHASE 3 YET. Exit plan mode and inform the user that Phase 2 is complete, then ask them if they're ready to proceed to Phase 3.
