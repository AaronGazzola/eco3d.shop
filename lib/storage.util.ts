// utils/storage.ts
import getSupabaseBrowserClient from "@/clients/browser-client";

const supabase = getSupabaseBrowserClient();

export const getStorageUrl = (path: string) => {
  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return data.publicUrl;
};
