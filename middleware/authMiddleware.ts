import createMiddlewareClient from "@/clients/middleware-client";
import configuration from "@/configuration";

import { NextRequest, NextResponse } from "next/server";

async function authMiddleware(request: NextRequest, response: NextResponse) {
  const authPaths = [configuration.paths.resetPassword];
  const guestPaths = [configuration.paths.auth];
  const pathname = request.nextUrl.pathname;
  const isAuthPath = authPaths.includes(pathname);
  const isGuestPath = guestPaths.includes(pathname);

  const supabase = createMiddlewareClient(request, response);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && isGuestPath)
    return NextResponse.redirect(
      new URL(configuration.paths.appHome, request.url),
    );
  if (!user && isAuthPath)
    return NextResponse.redirect(
      new URL(configuration.paths.signIn, request.url),
    );

  return response;
}

export default authMiddleware;
