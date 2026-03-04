"use client"

import { BookOpen, ChevronRight, Clock, FileText, Layers } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

type Resumo = {
    id: string
    tipo: string
    nomeArquivo: string
    criadoEm: Date
}

function ResumoCard({ resumo }: { resumo: Resumo }) {
    const dateObj = new Date(resumo.criadoEm)
    const formattedDate = new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    }).format(dateObj)
    const isFlashcard = resumo.tipo === "flashcards"

    return (
        <Link
            href={isFlashcard ? `/resumos/flashcard/${resumo.id}` : `/resumos/detalhado/${resumo.id}`}
            className="group bg-card border border-border/50 hover:border-primary/50 rounded-2xl p-6 transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-6"
        >
            <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 mt-1 ${isFlashcard ? "bg-purple-500/10 text-purple-500" : "bg-primary/10 text-primary"}`}>
                    {isFlashcard ? <Layers className="w-6 h-6" /> : <BookOpen className="w-6 h-6" />}
                </div>
                <div>
                    <h3 className="text-lg font-medium text-foreground mb-1 truncate max-w-md">{resumo.nomeArquivo}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                            <FileText className="w-4 h-4" />
                            {isFlashcard ? "Flashcards" : "Resumo Detalhado"}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            {formattedDate}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-end gap-4 border-t md:border-t-0 border-border/50 pt-4 md:pt-0">
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${isFlashcard ? "bg-purple-500/10 text-purple-400" : "bg-primary/10 text-primary"}`}>
                    {isFlashcard ? "Flashcards" : "Resumo"}
                </span>
                <div className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors group-hover:bg-primary group-hover:text-white shrink-0">
                    <ChevronRight className="w-5 h-5" />
                </div>
            </div>
        </Link>
    )
}

function EmptyState({ type }: { type: "resumo" | "flashcards" }) {
    return (
        <div className="text-center py-20 bg-card border border-border/50 rounded-2xl">
            {type === "flashcards"
                ? <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                : <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />}
            <h3 className="text-lg font-medium text-foreground mb-2">
                {type === "flashcards" ? "Nenhum flashcard gerado ainda" : "Nenhum resumo gerado ainda"}
            </h3>
            <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                {type === "flashcards"
                    ? "Gere flashcards a partir dos seus documentos para memorizar conteúdo de forma rápida."
                    : "Gere um resumo detalhado a partir dos seus documentos de estudo."}
            </p>
            <Link href="/resumo" className="inline-flex items-center justify-center bg-primary hover:bg-primary-hover text-white font-medium py-2.5 px-6 rounded-lg transition-colors">
                {type === "flashcards" ? "Gerar Flashcards" : "Gerar Resumo"}
            </Link>
        </div>
    )
}

export function ResumosHistoricoTabs({ resumos }: { resumos: Resumo[] }) {
    const [activeTab, setActiveTab] = useState<"resumo" | "flashcards">("resumo")

    const detalhados = resumos.filter(r => r.tipo === "resumo")
    const flashcards = resumos.filter(r => r.tipo === "flashcards")
    const current = activeTab === "resumo" ? detalhados : flashcards

    return (
        <>
            {/* Tabs */}
            <div className="flex gap-2 mb-8 bg-card border border-border/50 p-1.5 rounded-2xl w-fit">
                <button
                    onClick={() => setActiveTab("resumo")}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === "resumo"
                        ? "bg-primary text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                >
                    <BookOpen className="w-4 h-4" />
                    Resumos Detalhados
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeTab === "resumo" ? "bg-white/20" : "bg-border/50"}`}>
                        {detalhados.length}
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab("flashcards")}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === "flashcards"
                        ? "bg-purple-500 text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                >
                    <Layers className="w-4 h-4" />
                    Flashcards
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeTab === "flashcards" ? "bg-white/20" : "bg-border/50"}`}>
                        {flashcards.length}
                    </span>
                </button>
            </div>

            {/* Content */}
            <div className="grid gap-4">
                {current.length === 0
                    ? <EmptyState type={activeTab} />
                    : current.map(r => <ResumoCard key={r.id} resumo={r} />)
                }
            </div>
        </>
    )
}
