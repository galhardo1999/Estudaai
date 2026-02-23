"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
    const { theme, setTheme, resolvedTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return <div className="p-2 w-9 h-9 shrink-0" />
    }

    const currentTheme = theme === 'system' ? resolvedTheme : theme

    return (
        <button
            onClick={() => setTheme(currentTheme === "dark" ? "light" : "dark")}
            className="relative w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground dark:hover:bg-zinc-800/30 transition-colors shrink-0"
            title="Alternar tema"
        >
            <Sun className={`absolute h-5 w-5 transition-all duration-300 ${currentTheme === "dark" ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"}`} />
            <Moon className={`absolute h-5 w-5 transition-all duration-300 ${currentTheme === "dark" ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"}`} />
            <span className="sr-only">Toggle theme</span>
        </button>
    )
}
