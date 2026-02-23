"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { FileText, UploadCloud, BrainCircuit, Notebook, LogOut, X, Target, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme/ThemeToggle"

interface SidebarProps {
    documents: { id: string; name: string }[]
    onUpload: (file: File) => void
    activeDocumentId: string | null
    onSelectDocument: (id: string) => void
    onRemoveDocument: (id: string) => void
}

export function Sidebar({
    documents,
    onUpload,
    activeDocumentId,
    onSelectDocument,
    onRemoveDocument
}: SidebarProps) {
    const [isHovering, setIsHovering] = useState(false)
    const pathname = usePathname()

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onUpload(e.target.files[0])
        }
    }

    return (
        <aside className="w-72 h-screen bg-card border-r border-border/50 flex flex-col font-sans shrink-0 hidden md:flex">
            {/* Brand */}
            <div className="h-16 flex items-center px-6 border-b border-border/50">
                <div className="flex items-center gap-2 text-foreground font-semibold text-lg">
                    <BrainCircuit className="w-5 h-5 text-primary" />
                    <span>EstudosAI</span>
                </div>
            </div>

            {/* Main Navigation */}
            <div className="flex-1 py-6 px-4 overflow-y-auto">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-2">Menu</h3>
                <nav className="flex flex-col gap-1 mb-8">
                    <Link
                        href="/dashboard"
                        className={cn(
                            "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                            pathname === "/dashboard" ? "text-foreground bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-zinc-800/50"
                        )}
                    >
                        <BrainCircuit className={cn("w-4 h-4", pathname === "/dashboard" ? "text-primary" : "")} />
                        Dashboard
                    </Link>
                    <Link
                        href="/simulado"
                        className={cn(
                            "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                            pathname === "/simulado" ? "text-foreground bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-zinc-800/50"
                        )}
                    >
                        <Target className={cn("w-4 h-4", pathname === "/simulado" ? "text-primary" : "")} />
                        Gerar Simulado
                    </Link>
                    <Link
                        href="/resumo"
                        className={cn(
                            "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                            pathname === "/resumo" ? "text-foreground bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-zinc-800/50"
                        )}
                    >
                        <BookOpen className={cn("w-4 h-4", pathname === "/resumo" ? "text-primary" : "")} />
                        Resumo de Estudos
                    </Link>
                    <Link
                        href="/historico"
                        className={cn(
                            "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                            pathname === "/historico" ? "text-foreground bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-zinc-800/50"
                        )}
                    >
                        <Notebook className={cn("w-4 h-4", pathname === "/historico" ? "text-primary" : "")} />
                        Histórico de Simulados
                    </Link>
                </nav>

                {/* Conditionally render documents and upload */}
                {pathname !== "/dashboard" && (
                    <>
                        <div className="flex items-center justify-between px-2 mb-3 mt-6">
                            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Documentos</h3>
                        </div>

                        {/* Upload Button */}
                        <label className="mb-4 flex items-center justify-center gap-2 w-full px-4 py-2 bg-card hover:bg-card-hover border border-dashed border-zinc-700 hover:border-zinc-500 rounded-xl text-sm font-medium text-zinc-300 transition-colors cursor-pointer group">
                            <UploadCloud className="w-4 h-4 text-zinc-400 group-hover:text-primary transition-colors" />
                            <span>Fazer Upload</span>
                            <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.txt"
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
                                            "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors text-left flex-1",
                                            activeDocumentId === doc.id
                                                ? "bg-zinc-800/50 text-foreground"
                                                : "text-muted-foreground hover:bg-zinc-800/30 hover:text-foreground"
                                        )}
                                    >
                                        <FileText className="w-4 h-4 shrink-0" />
                                        <span className="truncate pr-6">{doc.name}</span>
                                    </button>
                                    <button
                                        onClick={() => onRemoveDocument(doc.id)}
                                        className="absolute right-2 p-1 text-zinc-500 hover:text-danger hover:bg-danger/10 rounded-md opacity-0 group-hover/doc:opacity-100 transition-all"
                                        title="Remover documento"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                            {documents.length === 0 && (
                                <div className="text-center py-6 text-zinc-500 text-sm px-2">
                                    Nenhum documento encontrado. Faça upload de um edital ou resumo.
                                </div>
                            )}
                        </nav>
                    </>
                )}
            </div>

            {/* User Area */}
            <div className="p-4 border-t border-border/50 flex items-center justify-between gap-2">
                <button className="flex items-center gap-3 px-3 py-2 flex-1 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-zinc-800/30 rounded-lg transition-colors">
                    <div className="w-6 h-6 rounded-full bg-zinc-700 shrink-0" />
                    <span className="flex-1 text-left truncate">Aluno Gênio</span>
                    <LogOut className="w-4 h-4 text-zinc-500" />
                </button>
                <div className="w-px h-6 bg-border/50 mx-1 shrink-0"></div>
                <ThemeToggle />
            </div>
        </aside>
    )
}
