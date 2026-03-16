"use client"

import { useState } from "react"
import { Sidebar } from "@/components/layout/Sidebar"
import { Menu, LogOut } from "lucide-react"
import { useDocuments } from "@/contexts/DocumentContext"
import { ThemeToggle } from "@/components/theme/ThemeToggle"
import { ActiveExamIndicator } from "@/components/exam/ActiveExamIndicator"
import { signOut } from "next-auth/react"

export function ClientLayout({ children }: { children: React.ReactNode }) {
    const { documents, activeDocumentId, setActiveDocumentId, addDocument, removeDocument } = useDocuments()
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [isUploading, setIsUploading] = useState(false)

    const handleUpload = async (file: File) => {
        setIsUploading(true)
        try {
            const formData = new FormData()
            formData.append("file", file)

            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            })

            if (!res.ok) throw new Error("Upload failed")

            const data = await res.json()
            addDocument({ id: data.document.id, name: data.document.name, url: data.document.url, createdAt: Date.now() })
        } catch (error) {
            console.error(error)
            alert("Falha no upload")
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <div className="flex h-screen bg-background overflow-hidden flex-col md:flex-row">
            {/* Skip Navigation */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg"
            >
                Pular para o conteúdo principal
            </a>

            {/* Barra Lateral Desktop */}
            <Sidebar />

            {/* Cabeçalho e Conteúdo Móvel */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Camada de Sobreposição de Upload */}
                {isUploading && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                            <p className="text-sm font-medium animate-pulse">Enviando e processando documento...</p>
                        </div>
                    </div>
                )}

                {/* Cabeçalho Móvel */}
                <div className="md:hidden flex items-center justify-between p-4 border-b border-border/50 shrink-0">
                    <span className="font-semibold text-lg text-primary">EstudaAI</span>
                    <div className="flex items-center gap-2">
                        <button onClick={() => signOut({ callbackUrl: '/login' })} className="p-2 text-muted-foreground hover:text-foreground transition-colors" title="Sair" aria-label="Sair da conta">
                            <LogOut aria-hidden="true" className="w-5 h-5" />
                        </button>
                        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors" aria-label="Abrir menu de navegação">
                            <Menu aria-hidden="true" className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Flutuante Inferior Direito — Indicador de Exame + Alternador de Tema */}
                <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
                    <ActiveExamIndicator />
                    <div className="bg-background/80 backdrop-blur-md rounded-full shadow-lg border border-border/50 p-1">
                        <ThemeToggle />
                    </div>
                </div>

                {/* Sobreposição da Barra Lateral Móvel */}
                {isMobileMenuOpen && (
                    <div role="dialog" aria-label="Menu de navegação" className="absolute inset-0 z-50 flex md:hidden">
                        <div className="w-72 shadow-2xl h-full flex flex-col bg-background">
                            <Sidebar
                                className="flex"
                            />
                        </div>
                        <div
                            className="flex-1 bg-black/50 backdrop-blur-sm"
                            onClick={() => setIsMobileMenuOpen(false)}
                        />
                    </div>
                )}

                {/* Área de Conteúdo Principal */}
                <div id="main-content" className="flex-1 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    )
}
