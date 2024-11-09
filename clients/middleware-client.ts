import getSupabaseClientKeys from "@/clients/client-keys";
import { Database } from "@/types/database.types";
import { type CookieOptions, createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export default function createMiddlewareClient(
  request: NextRequest,
  response: NextResponse,
) {
  const keys = getSupabaseClientKeys();

  return createServerClient<Database>(keys.url, keys.anonKey, {
    cookies: getCookieStrategy(request, response),
  });
}

function getCookieStrategy(request: NextRequest, response: NextResponse) {
  return {
    set: (name: string, value: string, options: CookieOptions) => {
      request.cookies.set({ name, value, ...options });

      response = NextResponse.next({
        request: {
          headers: request.headers,
        },
      });

      response.cookies.set({
        name,
        value,
        ...options,
      });
    },
    get: (name: string) => {
      return request.cookies.get(name)?.value;
    },
    remove: (name: string, options: CookieOptions) => {
      request.cookies.set({
        name,
        value: "",
        ...options,
      });

      response = NextResponse.next({
        request: {
          headers: request.headers,
        },
      });

      response.cookies.set({
        name,
        value: "",
        ...options,
      });
    },
  };
}
