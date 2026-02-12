export function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL");
  }
  return url;
}

export function getSupabasePublishableKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }
  return key;
}

export function getSupabaseSecretKey(): string {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) {
    throw new Error("Missing environment variable: SUPABASE_SECRET_KEY");
  }
  return key;
}
