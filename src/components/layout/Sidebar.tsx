"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { BrainCircuit, LogOut, Target, BookOpen, Library, ChevronLeft, ChevronRight, ClipboardList, Landmark, GraduationCap } from "lucide-react"
import { cn } from "@/lib/utils"
import { signOut, useSession } from "next-auth/react"
import { useExam } from "@/contexts/ExamContext"

interface SidebarProps {
    className?: string
}

export function Sidebar({ className }: SidebarProps) {
    const { data: session } = useSession()
    const userName = session?.user?.name || session?.user?.email || "Usuário"
    const initials = userName
        .split(" ")
        .slice(0, 2)
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
    const [isCollapsed, setIsCollapsed] = useState(false)
    const pathname = usePathname()
    const [isSimuladosExpanded, setIsSimuladosExpanded] = useState(pathname.startsWith('/simulado') || pathname.startsWith('/historico/simulados'))
    const [isResumosExpanded, setIsResumosExpanded] = useState(pathname.startsWith('/resumo') || pathname.startsWith('/historico/resumos'))
    const [isConcursosExpanded, setIsConcursosExpanded] = useState(pathname.startsWith('/concursos') || pathname.startsWith('/enem'))
    const exam = useExam()

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }

    return (
        <aside className={cn("h-screen bg-card border-r border-border/50 flex flex-col font-sans shrink-0 hidden md:flex transition-all duration-300 relative", isCollapsed ? "w-20" : "w-72", className)}>
            {/* Alternar Recolher */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-6 w-6 h-6 bg-card border border-border/50 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-zinc-800/50 transition-colors z-50 hidden md:flex"
            >
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            {/* Marca */}
            <div className="h-16 flex items-center px-6 border-b border-border/50">
                <div className={cn("flex items-center text-foreground font-semibold text-lg transition-all", isCollapsed ? "justify-center w-full" : "gap-2")}>
                    <BrainCircuit className="w-6 h-6 shrink-0 text-primary" />
                    {!isCollapsed && <span>EstudaAI</span>}
                </div>
            </div>

            {/* Navegação Principal */}
            <div className={cn("flex-1 py-6 overflow-y-auto", isCollapsed ? "px-2" : "px-4")}>
                {!isCollapsed && <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-2">Menu</h3>}
                <nav className="flex flex-col gap-1 mb-8">
                    <Link
                        href="/dashboard"
                        className={cn(
                            "flex items-center py-2 text-sm font-medium rounded-lg transition-colors",
                            isCollapsed ? "justify-center px-0" : "gap-3 px-3",
                            pathname === "/dashboard" ? "text-foreground bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-zinc-800/50"
                        )}
                        title={isCollapsed ? "Dashboard" : undefined}
                    >
                        <BrainCircuit className={cn("w-5 h-5 shrink-0", pathname === "/dashboard" ? "text-primary" : "")} />
                        {!isCollapsed && <span className="truncate">Dashboard</span>}
                    </Link>
                    <Link
                        href="/biblioteca"
                        className={cn(
                            "flex items-center py-2 text-sm font-medium rounded-lg transition-colors",
                            isCollapsed ? "justify-center px-0" : "gap-3 px-3",
                            pathname === "/biblioteca" ? "text-foreground bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-zinc-800/50"
                        )}
                        title={isCollapsed ? "Biblioteca de Documentos" : undefined}
                    >
                        <Library className={cn("w-5 h-5 shrink-0", pathname === "/biblioteca" ? "text-primary" : "")} />
                        {!isCollapsed && <span className="truncate">Biblioteca de Documentos</span>}
                    </Link>
                    {/* Grupo de Simulados */}
                    <div className="flex flex-col gap-1">
                        <button
                            onClick={() => {
                                if (isCollapsed) {
                                    setIsCollapsed(false)
                                    setIsSimuladosExpanded(true)
                                } else {
                                    setIsSimuladosExpanded(!isSimuladosExpanded)
                                }
                            }}
                            className={cn(
                                "flex items-center justify-between py-2 text-sm font-medium rounded-lg transition-colors w-full",
                                isCollapsed ? "justify-center px-0" : "px-3 gap-3",
                                (pathname.startsWith("/simulado") || pathname.startsWith("/historico/simulados")) ? "text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-zinc-800/50"
                            )}
                            title={isCollapsed ? "Simulados" : undefined}
                        >
                            <div className={cn("flex items-center", isCollapsed ? "justify-center" : "gap-3")}>
                                <Target className={cn("w-5 h-5 shrink-0", (pathname.startsWith("/simulado") || pathname.startsWith("/historico/simulados")) ? "text-primary" : "")} />
                                {!isCollapsed && <span className="truncate">Simulados</span>}
                            </div>
                            {!isCollapsed && (
                                <ChevronRight className={cn("w-4 h-4 transition-transform", isSimuladosExpanded ? "rotate-90" : "")} />
                            )}
                        </button>

                        {isSimuladosExpanded && !isCollapsed && (
                            <div className="flex flex-col gap-1 pl-9 pr-3 mt-1">
                                <Link
                                    href="/simulado"
                                    className={cn(
                                        "flex items-center py-2 text-sm font-medium rounded-lg transition-colors px-3",
                                        pathname.startsWith("/simulado") ? "text-foreground bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-zinc-800/50"
                                    )}
                                >
                                    <span className="truncate">Gerar Simulado</span>
                                </Link>
                                <Link
                                    href="/historico/simulados"
                                    className={cn(
                                        "flex items-center py-2 text-sm font-medium rounded-lg transition-colors px-3",
                                        pathname.startsWith("/historico/simulados") ? "text-foreground bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-zinc-800/50"
                                    )}
                                >
                                    <span className="truncate">Histórico de Simulados</span>
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Grupo de Resumos de Estudos */}
                    <div className="flex flex-col gap-1">
                        <button
                            onClick={() => {
                                if (isCollapsed) {
                                    setIsCollapsed(false)
                                    setIsResumosExpanded(true)
                                } else {
                                    setIsResumosExpanded(!isResumosExpanded)
                                }
                            }}
                            className={cn(
                                "flex items-center justify-between py-2 text-sm font-medium rounded-lg transition-colors w-full",
                                isCollapsed ? "justify-center px-0" : "px-3 gap-3",
                                (pathname.startsWith("/resumo") || pathname.startsWith("/historico/resumos")) ? "text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-zinc-800/50"
                            )}
                            title={isCollapsed ? "Resumo de Estudos" : undefined}
                        >
                            <div className={cn("flex items-center", isCollapsed ? "justify-center" : "gap-3")}>
                                <BookOpen className={cn("w-5 h-5 shrink-0", (pathname.startsWith("/resumo") || pathname.startsWith("/historico/resumos")) ? "text-primary" : "")} />
                                {!isCollapsed && <span className="truncate">Resumo de Estudos</span>}
                            </div>
                            {!isCollapsed && (
                                <ChevronRight className={cn("w-4 h-4 transition-transform", isResumosExpanded ? "rotate-90" : "")} />
                            )}
                        </button>

                        {isResumosExpanded && !isCollapsed && (
                            <div className="flex flex-col gap-1 pl-9 pr-3 mt-1">
                                <Link
                                    href="/resumo"
                                    className={cn(
                                        "flex items-center py-2 text-sm font-medium rounded-lg transition-colors px-3",
                                        pathname === "/resumo" ? "text-foreground bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-zinc-800/50"
                                    )}
                                >
                                    <span className="truncate">Criar Novo Resumo</span>
                                </Link>
                                <Link
                                    href="/historico/resumos"
                                    className={cn(
                                        "flex items-center py-2 text-sm font-medium rounded-lg transition-colors px-3",
                                        pathname.startsWith("/historico/resumos") ? "text-foreground bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-zinc-800/50"
                                    )}
                                >
                                    <span className="truncate">Histórico de Resumos</span>
                                </Link>
                            </div>
                        )}
                    </div>
                    {/* Grupo de Concursos */}
                    <div className="flex flex-col gap-1">
                        <button
                            onClick={() => {
                                if (isCollapsed) {
                                    setIsCollapsed(false)
                                    setIsConcursosExpanded(true)
                                } else {
                                    setIsConcursosExpanded(!isConcursosExpanded)
                                }
                            }}
                            className={cn(
                                "flex items-center justify-between py-2 text-sm font-medium rounded-lg transition-colors w-full",
                                isCollapsed ? "justify-center px-0" : "px-3 gap-3",
                                (pathname.startsWith("/concursos") || pathname.startsWith("/enem")) ? "text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-zinc-800/50"
                            )}
                            title={isCollapsed ? "Concursos" : undefined}
                        >
                            <div className={cn("flex items-center", isCollapsed ? "justify-center" : "gap-3")}>
                                <Landmark className={cn("w-5 h-5 shrink-0", (pathname.startsWith("/concursos") || pathname.startsWith("/enem")) ? "text-primary" : "")} />
                                {!isCollapsed && <span className="truncate">Concursos</span>}
                            </div>
                            {!isCollapsed && (
                                <ChevronRight className={cn("w-4 h-4 transition-transform", isConcursosExpanded ? "rotate-90" : "")} />
                            )}
                        </button>

                        {isConcursosExpanded && !isCollapsed && (
                            <div className="flex flex-col gap-1 pl-9 pr-3 mt-1">
                                <Link
                                    href="/concursos"
                                    className={cn(
                                        "flex items-center py-2 text-sm font-medium rounded-lg transition-colors px-3",
                                        pathname.startsWith("/concursos") ? "text-foreground bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-zinc-800/50"
                                    )}
                                >
                                    <span className="truncate">Concursos Públicos</span>
                                </Link>
                                <Link
                                    href="/enem"
                                    className={cn(
                                        "flex items-center py-2 text-sm font-medium rounded-lg transition-colors px-3",
                                        pathname.startsWith("/enem") ? "text-foreground bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-zinc-800/50"
                                    )}
                                >
                                    <span className="truncate">Enem</span>
                                </Link>
                            </div>
                        )}
                    </div>
                </nav>

                {/* Exames Ativos */}
                {exam.activeExams.length > 0 && !isCollapsed && (
                    <div className="mt-2 mb-4">
                        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-2">
                            Simulados Ativos ({exam.activeExams.length})
                        </h3>
                        <div className="flex flex-col gap-2">
                            {exam.activeExams.map((e) => (
                                <Link
                                    key={e.examId}
                                    href={`/simulado/active/${e.examId}`}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/15 transition-colors group"
                                >
                                    <div className="relative">
                                        <ClipboardList className="w-5 h-5 text-primary" />
                                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-success rounded-full animate-pulse" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">
                                            #{e.examId} - Simulado
                                        </p>
                                        <p className="text-xs text-muted-foreground tabular-nums">
                                            {e.questions.length === 0 ? '⏳ Gerando...' : `⏱ ${formatTime(e.timeRemaining)}`}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {exam.activeExams.length > 0 && isCollapsed && (
                    <div className="flex flex-col items-center gap-2 mb-4">
                        {exam.activeExams.map((e) => (
                            <Link
                                key={e.examId}
                                href={`/simulado/active/${e.examId}`}
                                className="flex justify-center"
                                title={`Simulado #${e.examId} — ${e.questions.length === 0 ? 'Gerando...' : formatTime(e.timeRemaining)}`}
                            >
                                <div className="relative">
                                    <ClipboardList className="w-5 h-5 text-primary" />
                                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-success rounded-full animate-pulse" />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {/* Renderizar documentos e upload condicionalmente */}
                {/* Seção de Documentos e Upload Removida */}
            </div>

            {/* Área do Usuário */}
            <div className={cn("p-4 border-t border-border/50 flex flex-col items-center gap-4", !isCollapsed && "flex-row justify-between")}>
                {!isCollapsed ? (
                    <>
                        <div className="flex items-center gap-3 px-3 py-2 flex-1 text-sm font-medium text-foreground rounded-lg">
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                <span className="text-[10px] font-bold text-primary">{initials}</span>
                            </div>
                            <span className="flex-1 text-left truncate">{userName}</span>
                        </div>
                        <div className="w-px h-6 bg-border/50 mx-1 shrink-0"></div>
                        <button
                            onClick={() => signOut({ callbackUrl: '/login' })}
                            className="p-2 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                            title="Sair"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </>
                ) : (
                    <>
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0" title={userName}>
                            <span className="text-xs font-bold text-primary">{initials}</span>
                        </div>
                        <div className="w-6 h-px bg-border/50 shrink-0"></div>
                        <button
                            onClick={() => signOut({ callbackUrl: '/login' })}
                            className="p-2 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                            title="Sair"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </>
                )}
            </div>
        </aside>
    )
}

