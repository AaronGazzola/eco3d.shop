import adminMiddleware from "@/middleware/adminMiddleware";
import csrffMiddleware from "@/middleware/csrfMiddleware";
import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const csrfResponse = await csrffMiddleware(request, response);
  const adminResponse = await adminMiddleware(request, csrfResponse);
  return adminResponse;
}
