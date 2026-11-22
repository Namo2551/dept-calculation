import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next.js 16 Proxy (formerly Middleware): keeps the Supabase session fresh and guards private pages early.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // everything except static files, images and the share image
  matcher: ["/((?!_next/static|_next/image|favicon.ico|opengraph-image.png|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
