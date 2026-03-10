import { BookOpen, Calculator } from "lucide-react"

/* ─── Tipos ─────────────────────────────────────────────────────── */

export interface DiaSections {
    /** Chaves de seção do JSON para montar questões + prefixo interno */
    sections: { key: string; prefix: string }[]
    /** Se o dia requer seleção de idioma (dia 1) */
    requiresLanguageSelection: boolean
    /** Chaves extras para opções de idioma */
    languageSections?: {
        ingles: { key: string; prefix: string }
        espanhol: { key: string; prefix: string }
    }
}

export interface DiaConfig {
    dia: string
    slug: string
    areas: string[]
    questoes: number
    tempo: string
    tempoSegundos: number
    cor: string
    corBg: string
    corBorder: string
    corGlow: string
    icon: typeof BookOpen | typeof Calculator
    descricao: string
    /** Configuração de seções para montar questões do JSON */
    sectionConfig: DiaSections
}

/* ─── Configuração dos Dias (comum a todos os anos) ─────────── */

export const diasConfig: DiaConfig[] = [
    {
        dia: "Dia 1",
        slug: "dia1",
        areas: ["Linguagens, Códigos e suas Tecnologias", "Ciências Humanas e suas Tecnologias", "Redação"],
        questoes: 90,
        tempo: "5h30",
        tempoSegundos: 5 * 60 * 60 + 30 * 60,
        cor: "text-rose-400",
        corBg: "bg-rose-500/15",
        corBorder: "border-rose-500/30",
        corGlow: "hover:shadow-rose-500/10",
        icon: BookOpen,
        descricao: "Inclui a prova de Linguagens (45 questões) e Ciências Humanas (45 questões), além da prova de Redação.",
        sectionConfig: {
            requiresLanguageSelection: true,
            languageSections: {
                ingles: { key: "opcao_ingles_01_a_05", prefix: "ing" },
                espanhol: { key: "opcao_espanhol_01_a_05", prefix: "esp" },
            },
            sections: [
                { key: "linguagens_06_a_45", prefix: "lc" },
                { key: "ciencias_humanas_46_a_90", prefix: "ch" },
            ],
        },
    },
    {
        dia: "Dia 2",
        slug: "dia2",
        areas: ["Ciências da Natureza e suas Tecnologias", "Matemática e suas Tecnologias"],
        questoes: 90,
        tempo: "5h",
        tempoSegundos: 5 * 60 * 60,
        cor: "text-blue-400",
        corBg: "bg-blue-500/15",
        corBorder: "border-blue-500/30",
        corGlow: "hover:shadow-blue-500/10",
        icon: Calculator,
        descricao: "Inclui a prova de Ciências da Natureza (Biologia, Física e Química) e Matemática (45 questões cada).",
        sectionConfig: {
            requiresLanguageSelection: false,
            sections: [
                { key: "ciencias_natureza_91_a_135", prefix: "cn" },
                { key: "matematica_136_a_180", prefix: "mt" },
            ],
        },
    },
]

/* ─── Mapa de disponibilidade de JSONs por ano/dia ──────────── */

/**
 * Registra quais provas já possuem JSON extraído.
 * Para adicionar um novo ano, basta colocar o JSON em
 * `src/Provas/ENEM/{ano}/enem-{ano}-{dia}.json` e atualizar este mapa.
 */
export const provasDisponiveis: Record<string, string[]> = {
    "2017": ["dia1"],
    "2025": ["dia1", "dia2"],
}

/**
 * Verifica se um dia específico está disponível para um ano.
 */
export function isDiaDisponivel(ano: string, diaSlug: string): boolean {
    return provasDisponiveis[ano]?.includes(diaSlug) ?? false
}

/**
 * Lista de anos exibidos na página principal do ENEM.
 */
export const anosEnem = ["2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024", "2025"]
