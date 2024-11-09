# Eco3d.Shop

An eCommerce web app for biodegradable 3D printed gifts.

## Development set up:

1. Create or access a Supabase db
2. Copy `.env.local.example` to `.env.local` and complete the details
3. Run `npm i` and `npm run dev` in a terminal
4. Use the auth form to create a user with an email magic link
5. Run `makeAdmin [your@email.com]` and refresh the page
6. Run `supabase login` and `supabase link`

## Development processes:

### Adding and Running Migrations

1. Create a New Migration with `supabase migration new [name]`
2. Edit the migration file (use add or replace logic where possible).
3. Run the Migrations with `supabase db push`
4. Generate type from the db schema with `node generateTypes.ts`
