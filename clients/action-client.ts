"use server";
import getSupabaseClientKeys from "@/clients/client-keys";
import type { Database } from "@/types/database.types";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import "server-only";

export const createServerSupabaseClient = async () => {
  const keys = getSupabaseClientKeys();

  return createServerClient<Database>(keys.url, keys.anonKey, {
    cookies: getCookiesStrategy({ readOnly: true }),
  });
};

const getSupabaseServerActionClient = async (
  params = {
    admin: false,
  },
) => {
  const keys = getSupabaseClientKeys();

  if (params.admin) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      throw new Error("Supabase Service Role Key not provided");
    }

    return createServerClient<Database>(keys.url, serviceRoleKey, {
      auth: {
        persistSession: false,
      },
      cookies: {},
    });
  }

  return createServerSupabaseClient();
};

// Only allows reading cookies here, no modification
function getCookiesStrategy({ readOnly = false } = {}) {
  const cookieStore = cookies();

  if (readOnly) {
    return {
      get: (name: string) => {
        return cookieStore.get(name)?.value;
      },
    };
  }

  return {
    get: (name: string) => {
      return cookieStore.get(name)?.value;
    },
    set: (name: string, value: string, options: any) => {
      if (typeof window !== "undefined") {
        // Logic to set cookie in client-side if necessary
      } else {
        throw new Error(
          "Cookies can only be modified in a Server Action or Route Handler",
        );
      }
    },
    remove: (name: string, options: any) => {
      if (typeof window !== "undefined") {
        // Logic to remove cookie in client-side if necessary
      } else {
        throw new Error(
          "Cookies can only be modified in a Server Action or Route Handler",
        );
      }
    },
  };
}

export default getSupabaseServerActionClient;
