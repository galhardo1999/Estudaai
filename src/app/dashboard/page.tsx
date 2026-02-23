"use client"

import { BookOpen, FileQuestion } from "lucide-react"
import Link from "next/link"

export default function DashboardPage() {
    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground font-sans p-6 md:p-12">
            <div className="max-w-4xl mx-auto w-full">
                <header className="mb-12">
                    <h1 className="text-3xl font-medium mb-2">Seu Dashboard</h1>
                    <p className="text-zinc-400">Escolha o que deseja fazer com seu material de estudo hoje.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Gerar Simulado Card */}
                    <Link href="/simulado" className="group">
                        <div className="bg-card border border-border/50 hover:border-primary/50 rounded-2xl p-8 flex flex-col h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10">
                            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <FileQuestion className="w-8 h-8" />
                            </div>
                            <h2 className="text-xl font-semibold mb-3">Gerar Simulado</h2>
                            <p className="text-zinc-400 leading-relaxed">
                                Crie um teste personalizado focado no documento selecionado para testar seus conhecimentos e identificar pontos fracos.
                            </p>
                        </div>
                    </Link>

                    {/* Resumo de Estudos Card */}
                    <Link href="#" className="group">
                        <div className="bg-card border border-border/50 hover:border-purple-500/50 rounded-2xl p-8 flex flex-col h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-purple-500/10 opacity-70 cursor-not-allowed">
                            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-6">
                                <BookOpen className="w-8 h-8" />
                            </div>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-xl font-semibold">Resumo de Estudos</h2>
                                <span className="text-xs font-semibold px-2 py-1 rounded bg-zinc-800 text-zinc-300">Em Breve</span>
                            </div>
                            <p className="text-zinc-400 leading-relaxed">
                                Obtenha uma síntese inteligente dos pontos-chave do seu material, poupando horas de leitura e grifos manuais.
                            </p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    )
}
