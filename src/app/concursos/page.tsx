"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, Filter, ArrowUpDown, X, Landmark, GraduationCap, Briefcase, ChevronRight, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { concursos, type Concurso } from "@/lib/concursos-data"

type Nivel = "Todos" | "Médio" | "Superior" | "Técnico"
type Ordenacao = "destaque" | "alfabetica"

/* ─── Skeleton Card ─────────────────────────────────────────────── */
function SkeletonCard() {
    return (
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden animate-pulse">
            <div className="h-44 bg-border/30" />
            <div className="p-5 space-y-3">
                <div className="h-5 bg-border/30 rounded w-3/4" />
                <div className="flex gap-2">
                    <div className="h-5 w-16 bg-border/30 rounded-full" />
                    <div className="h-5 w-20 bg-border/30 rounded-full" />
                </div>
                <div className="h-4 bg-border/20 rounded w-full" />
                <div className="h-4 bg-border/20 rounded w-5/6" />
                <div className="space-y-2 pt-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-3 bg-border/20 rounded w-2/3" />
                    ))}
                </div>
                <div className="h-9 bg-border/30 rounded-lg w-full mt-3" />
            </div>
        </div>
    )
}

/* ─── Detail Modal ──────────────────────────────────────────────── */
function ConcursoModal({ concurso, onClose }: { concurso: Concurso; onClose: () => void }) {
    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose()
        }
        document.addEventListener("keydown", handler)
        return () => document.removeEventListener("keydown", handler)
    }, [onClose])

    // Prevent body scroll
    useEffect(() => {
        document.body.style.overflow = "hidden"
        return () => { document.body.style.overflow = "" }
    }, [])

    const nivelColor = concurso.nivel === "Superior"
        ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
        : concurso.nivel === "Técnico"
            ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
            : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label={`Detalhes do concurso ${concurso.nome}`}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-2xl max-h-[90vh] bg-card border border-border/50 rounded-2xl overflow-hidden shadow-2xl animate-fade-in flex flex-col">
                {/* Header Image */}
                <div className="relative h-48 sm:h-56 shrink-0">
                    <img
                        src={concurso.imagemUrl}
                        alt={concurso.nome}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-9 h-9 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                        aria-label="Fechar modal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-4 left-5">
                        <h2 className="text-2xl font-bold text-white drop-shadow-lg">{concurso.nome}</h2>
                        <p className="text-sm text-white/80 font-medium drop-shadow">{concurso.sigla}</p>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Tags */}
                    <div className="flex flex-wrap gap-2">
                        <span className={cn("text-xs font-semibold px-3 py-1 rounded-full border", nivelColor)}>
                            {concurso.nivel}
                        </span>
                        <span className="text-xs font-medium px-3 py-1 rounded-full bg-card-hover border border-border/50 text-muted-foreground">
                            Banca: {concurso.banca}
                        </span>
                        <span className="text-xs font-medium px-3 py-1 rounded-full bg-card-hover border border-border/50 text-muted-foreground">
                            {concurso.orgao}
                        </span>
                    </div>

                    {/* Salary */}
                    <div className="flex items-center gap-2 bg-[#00C853]/10 border border-[#00C853]/20 rounded-xl px-4 py-3">
                        <Briefcase className="w-5 h-5 text-[#00C853] shrink-0" />
                        <div>
                            <p className="text-xs text-muted-foreground">Salário inicial estimado</p>
                            <p className="text-lg font-bold text-[#00C853]">{concurso.salarioBase}</p>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <h3 className="text-sm font-semibold text-foreground mb-1">Sobre o Concurso</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{concurso.descricao}</p>
                    </div>

                    {/* Disciplines */}
                    <div>
                        <h3 className="text-sm font-semibold text-foreground mb-2">Principais Disciplinas Cobradas</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {concurso.disciplinas.map((d, i) => (
                                <div
                                    key={d}
                                    className="flex items-center gap-2 text-sm text-muted-foreground bg-card-hover/50 rounded-lg px-3 py-2"
                                >
                                    <span className="w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                                        {i + 1}
                                    </span>
                                    {d}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

/* ─── Concurso Card ─────────────────────────────────────────────── */
function ConcursoCard({ concurso, onOpenDetail }: { concurso: Concurso; onOpenDetail: (c: Concurso) => void }) {
    const nivelColor = concurso.nivel === "Superior"
        ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
        : concurso.nivel === "Técnico"
            ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
            : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"

    return (
        <div className="group bg-card border border-border/50 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 flex flex-col">
            {/* Image */}
            <div className="relative h-44 overflow-hidden">
                <img
                    src={concurso.imagemUrl}
                    alt={`Imagem representativa do concurso ${concurso.nome}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                {concurso.destaque && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 bg-amber-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg">
                        <Star className="w-3 h-3" />
                        Popular
                    </div>
                )}
                <div className="absolute bottom-3 left-4">
                    <span className="text-lg font-bold text-white drop-shadow-lg">{concurso.sigla}</span>
                </div>
            </div>

            {/* Content */}
            <div className="p-5 flex flex-col flex-1">
                <h3 className="text-base font-semibold text-foreground mb-1.5 group-hover:text-primary transition-colors">
                    {concurso.nome}
                </h3>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", nivelColor)}>
                        {concurso.nivel}
                    </span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-card-hover border border-border/50 text-muted-foreground">
                        {concurso.banca}
                    </span>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2 flex-1">
                    {concurso.descricao}
                </p>

                {/* CTA */}
                <div className="flex items-center justify-end pt-3 border-t border-border/30 mt-auto">
                    <button
                        onClick={() => onOpenDetail(concurso)}
                        className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover transition-colors group/btn"
                        aria-label={`Ver detalhes do concurso ${concurso.nome}`}
                    >
                        Ver detalhes
                        <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    )
}

/* ─── Main Page ─────────────────────────────────────────────────── */
export default function ConcursosPage() {
    const [isLoading, setIsLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [nivel, setNivel] = useState<Nivel>("Todos")
    const [ordenacao, setOrdenacao] = useState<Ordenacao>("destaque")
    const [selectedConcurso, setSelectedConcurso] = useState<Concurso | null>(null)

    // Simulated loading
    useEffect(() => {
        const t = setTimeout(() => setIsLoading(false), 400)
        return () => clearTimeout(t)
    }, [])

    const handleCloseModal = useCallback(() => setSelectedConcurso(null), [])

    // Filter & sort
    const filtered = concursos
        .filter((c) => {
            if (nivel !== "Todos" && c.nivel !== nivel) return false
            if (search.trim()) {
                const q = search.toLowerCase()
                return (
                    c.nome.toLowerCase().includes(q) ||
                    c.sigla.toLowerCase().includes(q) ||
                    c.banca.toLowerCase().includes(q) ||
                    c.orgao.toLowerCase().includes(q)
                )
            }
            return true
        })
        .sort((a, b) => {
            if (ordenacao === "alfabetica") return a.nome.localeCompare(b.nome, "pt-BR")
            // destaque first, then alphabetical
            if (a.destaque !== b.destaque) return a.destaque ? -1 : 1
            return a.nome.localeCompare(b.nome, "pt-BR")
        })

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground font-sans p-6 md:p-12">
            <div className="max-w-7xl mx-auto w-full">
                {/* ─── Header ─── */}
                <header className="mb-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-[#0A2540] flex items-center justify-center">
                            <Landmark className="w-5 h-5 text-[#00C853]" />
                        </div>
                        <h1 className="text-3xl font-medium">Concursos Públicos</h1>
                    </div>
                    <p className="text-muted-foreground max-w-2xl">
                        Conheça os principais concursos do Brasil e os conteúdos que mais caem em cada prova.
                    </p>
                </header>

                {/* ─── Filter Bar ─── */}
                <div className="flex flex-col sm:flex-row gap-3 mb-8">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Buscar concurso..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 text-sm bg-card border border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
                            aria-label="Buscar concurso por nome, sigla ou banca"
                            id="concurso-search"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                aria-label="Limpar busca"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Level Filter */}
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <select
                            value={nivel}
                            onChange={(e) => setNivel(e.target.value as Nivel)}
                            className="appearance-none pl-10 pr-8 py-2.5 text-sm bg-card border border-border/50 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all cursor-pointer"
                            aria-label="Filtrar por nível"
                            id="concurso-nivel"
                        >
                            <option value="Todos">Todos os níveis</option>
                            <option value="Médio">Nível Médio</option>
                            <option value="Superior">Nível Superior</option>
                            <option value="Técnico">Nível Técnico</option>
                        </select>
                    </div>

                    {/* Sort */}
                    <div className="relative">
                        <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <select
                            value={ordenacao}
                            onChange={(e) => setOrdenacao(e.target.value as Ordenacao)}
                            className="appearance-none pl-10 pr-8 py-2.5 text-sm bg-card border border-border/50 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all cursor-pointer"
                            aria-label="Ordenar concursos"
                            id="concurso-sort"
                        >
                            <option value="destaque">Mais procurados</option>
                            <option value="alfabetica">Ordem alfabética</option>
                        </select>
                    </div>
                </div>

                {/* ─── Results count ─── */}
                {!isLoading && (
                    <p className="text-xs text-muted-foreground mb-4">
                        {filtered.length} concurso{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
                    </p>
                )}

                {/* ─── Cards Grid ─── */}
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <SkeletonCard key={i} />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20 bg-card border border-border/50 rounded-2xl">
                        <GraduationCap className="w-14 h-14 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-xl font-medium mb-2">Nenhum concurso encontrado</h3>
                        <p className="text-muted-foreground max-w-md mx-auto">
                            Tente ajustar os filtros ou buscar por outro nome.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {filtered.map((c) => (
                            <ConcursoCard key={c.id} concurso={c} onOpenDetail={setSelectedConcurso} />
                        ))}
                    </div>
                )}
            </div>

            {/* ─── Modal ─── */}
            {selectedConcurso && (
                <ConcursoModal concurso={selectedConcurso} onClose={handleCloseModal} />
            )}
        </div>
    )
}
