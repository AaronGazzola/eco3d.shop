import createMiddlewareClient from "@/clients/middleware-client";
import configuration from "@/configuration";
import { NextRequest, NextResponse } from "next/server";

async function adminMiddleware(request: NextRequest, response: NextResponse) {
  const isAdminPath = request.nextUrl.pathname.startsWith("/admin");

  if (!isAdminPath) return response;

  const supabase = createMiddlewareClient(request, response);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user)
    return NextResponse.redirect(
      new URL(configuration.paths.notFound, request.url),
    );
  const { data: roles, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin");

  if (error || !roles.length)
    return NextResponse.redirect(
      new URL(configuration.paths.notFound, request.url),
    );

  return response;
}

export default adminMiddleware;
