"use client"

import { useState } from "react"
import { Sidebar } from "@/components/layout/Sidebar"
import { Menu } from "lucide-react"
import { useDocuments } from "@/contexts/DocumentContext"
import { ThemeToggle } from "@/components/theme/ThemeToggle"

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
            addDocument({ id: data.document.id, name: data.document.name, url: data.document.url })
        } catch (error) {
            console.error(error)
            alert("Falha no upload")
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <div className="flex h-screen bg-background overflow-hidden flex-col md:flex-row">
            {/* Desktop Sidebar */}
            <Sidebar
                documents={documents}
                onUpload={handleUpload}
                activeDocumentId={activeDocumentId}
                onSelectDocument={setActiveDocumentId}
                onRemoveDocument={removeDocument}
            />

            {/* Mobile Header & Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Upload Overlay Layer */}
                {isUploading && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                            <p className="text-sm font-medium animate-pulse">Enviando e processando documento...</p>
                        </div>
                    </div>
                )}

                {/* Mobile Header */}
                <div className="md:hidden flex items-center justify-between p-4 border-b border-border/50 shrink-0">
                    <span className="font-semibold text-lg text-primary">EstudaAI</span>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
                            <Menu className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Desktop Top Header */}
                <div className="hidden md:flex justify-end p-4 shrink-0 absolute top-0 right-0 z-10">
                    <ThemeToggle />
                </div>

                {/* Mobile Sidebar Overlay */}
                {isMobileMenuOpen && (
                    <div className="absolute inset-0 z-50 flex md:hidden">
                        <div className="w-72 shadow-2xl h-full flex flex-col bg-background">
                            <Sidebar
                                documents={documents}
                                onUpload={(file) => {
                                    handleUpload(file)
                                    setIsMobileMenuOpen(false)
                                }}
                                activeDocumentId={activeDocumentId}
                                onSelectDocument={(id) => {
                                    setActiveDocumentId(id)
                                    setIsMobileMenuOpen(false)
                                }}
                                onRemoveDocument={(id) => {
                                    removeDocument(id)
                                }}
                            />
                        </div>
                        <div
                            className="flex-1 bg-black/50 backdrop-blur-sm"
                            onClick={() => setIsMobileMenuOpen(false)}
                        />
                    </div>
                )}

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    )
}
