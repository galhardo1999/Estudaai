"use client"

import { usePathname } from "next/navigation"
import { ClientLayout } from "@/components/layout/ClientLayout"

export function MainLayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()

    // Do not wrap login/register pages with the Dashboard Sidebar layout
    if (pathname === '/login' || pathname === '/register') {
        return <>{children}</>
    }

    return <ClientLayout>{children}</ClientLayout>
}
