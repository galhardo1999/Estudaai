"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { FileText, UploadCloud, BrainCircuit, LogOut, X, Target, BookOpen, Library, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { signOut } from "next-auth/react"

interface SidebarProps {
    documents: { id: string; name: string }[]
    onUpload: (file: File) => void
    activeDocumentId: string | null
    onSelectDocument: (id: string) => void
    onRemoveDocument: (id: string) => void
    className?: string
}

export function Sidebar({
    documents,
    onUpload,
    activeDocumentId,
    onSelectDocument,
    onRemoveDocument,
    className
}: SidebarProps) {
    const [isCollapsed, setIsCollapsed] = useState(false)
    const pathname = usePathname()
    const [isSimuladosExpanded, setIsSimuladosExpanded] = useState(pathname.startsWith('/simulado') || pathname.startsWith('/historico'))

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onUpload(e.target.files[0])
        }
    }

    return (
        <aside className={cn("h-screen bg-card border-r border-border/50 flex flex-col font-sans shrink-0 hidden md:flex transition-all duration-300 relative", isCollapsed ? "w-20" : "w-72", className)}>
            {/* Collapse Toggle */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-6 w-6 h-6 bg-card border border-border/50 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-zinc-800/50 transition-colors z-50 hidden md:flex"
            >
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            {/* Brand */}
            <div className="h-16 flex items-center px-6 border-b border-border/50">
                <div className={cn("flex items-center text-foreground font-semibold text-lg transition-all", isCollapsed ? "justify-center w-full" : "gap-2")}>
                    <BrainCircuit className="w-6 h-6 shrink-0 text-primary" />
                    {!isCollapsed && <span>EstudosAI</span>}
                </div>
            </div>

            {/* Main Navigation */}
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
                    {/* Simulados Group */}
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
                                (pathname.startsWith("/simulado") || pathname.startsWith("/historico")) ? "text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-zinc-800/50"
                            )}
                            title={isCollapsed ? "Simulados" : undefined}
                        >
                            <div className={cn("flex items-center", isCollapsed ? "justify-center" : "gap-3")}>
                                <Target className={cn("w-5 h-5 shrink-0", (pathname.startsWith("/simulado") || pathname.startsWith("/historico")) ? "text-primary" : "")} />
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
                                    href="/historico"
                                    className={cn(
                                        "flex items-center py-2 text-sm font-medium rounded-lg transition-colors px-3",
                                        pathname.startsWith("/historico") ? "text-foreground bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-zinc-800/50"
                                    )}
                                >
                                    <span className="truncate">Histórico de Simulados</span>
                                </Link>
                            </div>
                        )}
                    </div>

                    <Link
                        href="/resumo"
                        className={cn(
                            "flex items-center py-2 text-sm font-medium rounded-lg transition-colors",
                            isCollapsed ? "justify-center px-0" : "gap-3 px-3",
                            pathname.startsWith("/resumo") ? "text-foreground bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-zinc-800/50"
                        )}
                        title={isCollapsed ? "Resumo de Estudos" : undefined}
                    >
                        <BookOpen className={cn("w-5 h-5 shrink-0", pathname.startsWith("/resumo") ? "text-primary" : "")} />
                        {!isCollapsed && <span className="truncate">Resumo de Estudos</span>}
                    </Link>
                </nav>

                {/* Conditionally render documents and upload */}
                {pathname === "/simulado" && (
                    <>
                        {!isCollapsed && (
                            <div className="flex items-center justify-between px-2 mb-3 mt-6">
                                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Documentos</h3>
                            </div>
                        )}

                        {/* Upload Button */}
                        <label className={cn(
                            "mb-4 flex items-center justify-center gap-2 bg-card hover:bg-card-hover border border-dashed border-zinc-700 hover:border-zinc-500 rounded-xl text-sm font-medium text-zinc-300 transition-colors cursor-pointer group",
                            isCollapsed ? "w-10 h-10 mx-auto" : "w-full px-4 py-2"
                        )}
                            title={isCollapsed ? "Fazer Upload" : undefined}
                        >
                            <UploadCloud className="w-5 h-5 shrink-0 text-zinc-400 group-hover:text-primary transition-colors" />
                            {!isCollapsed && <span>Fazer Upload</span>}
                            <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.txt,.doc,.docx,.jpg,.jpeg,.png"
                                onChange={handleFileChange}
                            />
                        </label>

                        {/* Documents List */}
                        <nav className="flex flex-col gap-1">
                            {documents.map((doc) => (
                                <div key={doc.id} className="relative group/doc flex items-center">
                                    <button
                                        onClick={() => onSelectDocument(doc.id)}
                                        className={cn(
                                            "flex items-center py-2 text-sm font-medium rounded-lg transition-colors text-left flex-1",
                                            isCollapsed ? "justify-center px-0" : "gap-3 px-3",
                                            activeDocumentId === doc.id
                                                ? "bg-zinc-800/50 text-foreground"
                                                : "text-muted-foreground hover:bg-zinc-800/30 hover:text-foreground"
                                        )}
                                        title={isCollapsed ? doc.name : undefined}
                                    >
                                        <FileText className="w-5 h-5 shrink-0" />
                                        {!isCollapsed && <span className="truncate pr-6">{doc.name}</span>}
                                    </button>
                                    {!isCollapsed && (
                                        <button
                                            onClick={() => onRemoveDocument(doc.id)}
                                            className="absolute right-2 p-1 text-zinc-500 hover:text-danger hover:bg-danger/10 rounded-md opacity-0 group-hover/doc:opacity-100 transition-all"
                                            title="Remover documento"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {documents.length === 0 && !isCollapsed && (
                                <div className="text-center py-6 text-zinc-500 text-sm px-2">
                                    Nenhum documento encontrado. Faça upload de um edital ou resumo.
                                </div>
                            )}
                        </nav>
                    </>
                )}
            </div>

            {/* User Area */}
            <div className={cn("p-4 border-t border-border/50 flex flex-col items-center gap-4", !isCollapsed && "flex-row justify-between")}>
                {!isCollapsed ? (
                    <>
                        <div className="flex items-center gap-3 px-3 py-2 flex-1 text-sm font-medium text-foreground rounded-lg">
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                <span className="text-[10px] font-bold text-primary">AG</span>
                            </div>
                            <span className="flex-1 text-left truncate">Aluno Gênio</span>
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
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0" title="Aluno Gênio">
                            <span className="text-xs font-bold text-primary">AG</span>
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

