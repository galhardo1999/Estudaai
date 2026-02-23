"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
    const { theme, setTheme } = useTheme()

    return (
        <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-zinc-800/10 dark:hover:bg-zinc-800/30 transition-colors shrink-0"
            title="Alternar tema"
        >
            <Sun className="h-5 w-5 dark:hidden" />
            <Moon className="h-5 w-5 hidden dark:block" />
            <span className="sr-only">Toggle theme</span>
        </button>
    )
}
