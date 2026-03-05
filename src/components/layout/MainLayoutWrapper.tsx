"use client"

import { usePathname } from "next/navigation"
import { ClientLayout } from "@/components/layout/ClientLayout"

export function MainLayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()

    // Não envolve páginas de login/registro com o layout de Sidebar do Dashboard
    if (pathname === '/login' || pathname === '/register') {
        return <>{children}</>
    }

    return <ClientLayout>{children}</ClientLayout>
}
