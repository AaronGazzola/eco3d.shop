# Eco3d.Shop

An eCommerce web app for biodegradable 3D printed gifts.

## Development set up:

1. Copy `.env.local.example` to `.env.local` and complete the details.
2. Run `npm i` and `npm run dev` in a terminal.
3. Use the auth form to create a user with an email magic link.
4. Run `makeAdmin [your@email.com]` and refresh the page.
5. Run `supabase login`, then `supabase link` and then `supabase db push`

### Supabase Migrations

1. Create a New Migration with `supabase migration [name_of_new_migration]`
2. Edit the migration file in SQL (use "add or replace" logic where possible).
3. Run the migrations with `supabase db push`.
4. Generate types from the db schema with `node generateTypes.ts`
5. If you have multiple migrations on your working branch, then combine (squash) them into a single migration before merging. Run `supabase db push` before and after squashing, you'll see an error the second time - use the revert commands shown in the error output. Then comment out the SQL in the squashed migration so you can run `supabase db push`. (Make sure to un-comment the SQL)
6. Before merging to `main`, run `node dateMigrations.js [name_of_first_new_migration]` - this will update the migration names to include the present time to avoid conflicts.
