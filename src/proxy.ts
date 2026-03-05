import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default auth((req) => {
    const isAuth = !!req.auth;
    const isAuthPage = req.nextUrl.pathname.startsWith("/login") || req.nextUrl.pathname.startsWith("/register");

    if (isAuthPage) {
        if (isAuth) {
            return NextResponse.redirect(new URL("/dashboard", req.url));
        }
        return NextResponse.next();
    }

    if (!isAuth) {
        let from = req.nextUrl.pathname;
        if (req.nextUrl.search) {
            from += req.nextUrl.search;
        }

        return NextResponse.redirect(
            new URL(`/login?from=${encodeURIComponent(from)}`, req.url)
        );
    }

    const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");
    if (isAdminRoute && req.auth?.user && (req.auth.user as { role?: string }).role !== "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
}) as unknown as (req: NextRequest) => Promise<NextResponse>;

export const config = {
    matcher: ["/dashboard/:path*", "/simulado/:path*", "/resumo/:path*", "/resumos/:path*", "/historico/:path*", "/biblioteca/:path*", "/admin/:path*", "/login", "/register"],
};
