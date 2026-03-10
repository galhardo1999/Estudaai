"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Clock, FileText, Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { diasConfig, isDiaDisponivel } from "@/lib/enem-config"

export default function EnemAnoPage({ params }: { params: Promise<{ ano: string }> }) {
    const { ano } = use(params)
    const router = useRouter()

    const dias = diasConfig.map((d) => ({
        ...d,
        disponivel: isDiaDisponivel(ano, d.slug),
    }))

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground font-sans p-6 md:p-12">
            <div className="max-w-4xl mx-auto w-full">

                {/* Back button */}
                <button
                    onClick={() => router.push("/enem")}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                    Voltar para ENEM
                </button>

                {/* Header */}
                <header className="mb-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-[#0A2540] flex items-center justify-center">
                            <FileText className="w-5 h-5 text-[#00C853]" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">ENEM</p>
                            <h1 className="text-3xl font-medium leading-none">Prova {ano}</h1>
                        </div>
                    </div>
                    <p className="text-muted-foreground max-w-xl mt-3">
                        Escolha qual dia da prova deseja simular. Responda no ritmo certo, com o timer oficial.
                    </p>
                </header>

                {/* Day cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {dias.map((item) => {
                        const Icon = item.icon
                        return (
                            <div
                                key={item.dia}
                                onClick={() => item.disponivel && router.push(`/enem/${ano}/${item.slug}`)}
                                className={cn(
                                    "relative group bg-card border border-border/50 rounded-2xl overflow-hidden transition-all duration-300 flex flex-col",
                                    item.disponivel
                                        ? `cursor-pointer hover:shadow-xl ${item.corGlow} hover:border-primary/30 hover:-translate-y-1`
                                        : "cursor-not-allowed opacity-60"
                                )}
                            >
                                {/* Top accent bar */}
                                <div className={cn("h-1 w-full", item.corBg.replace("/15", "").replace("bg-", "bg-"))} />

                                <div className="p-7 flex flex-col flex-1">
                                    {/* Icon + title */}
                                    <div className="flex items-center gap-4 mb-5">
                                        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center border shrink-0", item.corBg, item.corBorder)}>
                                            <Icon className={cn("w-6 h-6", item.cor)} />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">{item.dia}</h2>
                                            <div className="flex items-center gap-3 mt-0.5">
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Clock className="w-3 h-3" /> {item.tempo}
                                                </span>
                                                <span className="text-xs text-muted-foreground">{item.questoes} questões</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <p className="text-sm text-muted-foreground leading-relaxed mb-5">{item.descricao}</p>

                                    {/* Areas */}
                                    <div className="flex flex-col gap-2 mb-6 flex-1">
                                        {item.areas.map((area) => (
                                            <div key={area} className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", item.corBg.replace("/15", ""))} />
                                                {area}
                                            </div>
                                        ))}
                                    </div>

                                    {/* CTA */}
                                    <div className="pt-4 border-t border-border/30">
                                        {item.disponivel ? (
                                            <span className="flex items-center gap-2 text-sm font-semibold text-primary group-hover:gap-3 transition-all">
                                                Iniciar simulado
                                                <span className="text-lg leading-none">→</span>
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                                <Lock className="w-4 h-4" />
                                                Em breve
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Info banner */}
                <div className="mt-8 p-4 bg-card border border-border/50 rounded-xl flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Clock className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-foreground mb-0.5">Timer oficial da prova</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            O simulado replica o tempo real do ENEM. Você pode sair e voltar — o progresso e o cronômetro são mantidos na sessão. O resultado é exibido ao finalizar.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
