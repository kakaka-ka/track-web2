import { auth } from "@/lib/auth";

export const proxy = auth;

export const config = {
  // Only protect admin pages, not API routes
  // API routes handle auth themselves via auth() in each route handler
  matcher: ["/admin/:path*"],
};
