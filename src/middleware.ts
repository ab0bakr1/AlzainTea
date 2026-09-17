import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const role = (token as { role?: string } | null)?.role;

    const isAdminRoute =
      req.nextUrl.pathname.startsWith("/admin") ||
      req.nextUrl.pathname.startsWith("/api/admin");

    if (isAdminRoute && role !== "ADMIN" && role !== "SUPER_ADMIN") {
      // API: نرجع 403 بدل إعادة توجيه لصفحة تسجيل الدخول
      if (req.nextUrl.pathname.startsWith("/api/admin")) {
        return NextResponse.json(
          {
            success: false,
            error: { code: "FORBIDDEN", message: "لا تملك صلاحية الوصول", statusCode: 403 },
          },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // withAuth يتحقق فقط من وجود توكن؛ التحقق من الدور يتم أعلاه
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};