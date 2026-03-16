import { z } from "zod";

// ─── Constantes ───────────────────────────────────────────────────────────────

const DIFICULDADES = ["facil", "medio", "dificil"] as const;
const SUMMARY_TYPES = ["resumo", "flashcards"] as const;
const ALLOWED_MIME_TYPES = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
    "text/plain",
] as const;

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// ─── Schemas para JSON columns ────────────────────────────────────────────────
// (Definidos antes dos schemas de input porque são referenciados por eles)

/** Schema para validar dados da coluna `questoes` (Json) do model Exame */
export const examQuestionSchema = z.object({
    id: z.string(),
    text: z.string(),
    options: z.array(z.object({
        id: z.string(),
        letter: z.string(),
        text: z.string(),
        isCorrect: z.boolean(),
        explanation: z.string().optional(),
    })),
});

export const examQuestionsArraySchema = z.array(examQuestionSchema);

/** Schema para validar dados da coluna `respostas` (Json) do model Exame */
export const examAnswersSchema = z.record(z.string(), z.string());

// ─── Schemas de Input das API Routes ──────────────────────────────────────────

/** POST /api/register */
export const registerInputSchema = z.object({
    email: z.string().email("Email inválido"),
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
    password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").max(128),
});

/** POST /api/generate-exam */
export const generateExamInputSchema = z.object({
    documentIds: z.array(z.string()).default([]),
    tempDocs: z.array(z.object({
        geminiUri: z.string().url(),
        name: z.string(),
    })).default([]),
    questionCount: z.number().int().min(1).max(50).default(5),
    topic: z.string().max(500).default("Qualquer assunto abordado no texto"),
    difficulty: z.enum(DIFICULDADES).default("medio"),
});

/** POST /api/generate-summary */
export const generateSummaryInputSchema = z.object({
    documentIds: z.array(z.string()).min(1, "Pelo menos um documento é necessário"),
    summaryType: z.enum(SUMMARY_TYPES).default("resumo"),
});

/** POST /api/analyze-exam */
export const analyzeExamInputSchema = z.object({
    questions: z.array(z.object({
        id: z.string(),
        text: z.string(),
        options: z.array(z.object({
            id: z.string(),
            letter: z.string(),
            text: z.string(),
            isCorrect: z.boolean(),
            explanation: z.string().optional(),
        })),
    })),
    userAnswers: z.record(z.string(), z.string()),
    correctCount: z.number().int().min(0),
    totalQuestions: z.number().int().min(1),
    dificuldade: z.enum(DIFICULDADES).default("medio"),
});

/** POST /api/save-exam */
export const saveExamInputSchema = z.object({
    pontuacao: z.number().int().min(0),
    totalQuestoes: z.number().int().min(1),
    duracao: z.number().int().min(0).default(0),
    documentoId: z.string().nullable().optional().default(null),
    questoes: examQuestionsArraySchema.optional(),
    respostas: examAnswersSchema.optional(),
    codigo: z.string().nullable().optional(),
    dificuldade: z.enum(DIFICULDADES).default("medio"),
    documentNames: z.array(z.string()).default([]),
});

/** POST /api/save-resumo */
export const saveResumoInputSchema = z.object({
    tipo: z.enum(SUMMARY_TYPES),
    nomeArquivo: z.string().min(1, "Nome do arquivo é obrigatório"),
    conteudo: z.string().min(1, "Conteúdo é obrigatório"),
});

/** PUT /api/exam-state/[codigo] */
export const examStateUpdateSchema = z.object({
    estadoAtual: z.object({
        currentQuestionIndex: z.number().int().min(0),
        userAnswers: z.record(z.string(), z.string()),
        correctCount: z.number().int().min(0),
        wrongCount: z.number().int().min(0),
        timeRemaining: z.number().int().min(0),
    }).optional(),
    status: z.enum(["em_andamento", "finalizado"]).optional(),
});

/** POST /api/save-questions */
export const saveQuestionsInputSchema = z.object({
    codigo: z.string().min(1, "Código do exame é obrigatório"),
    questoes: z.array(z.object({
        id: z.string(),
        text: z.string(),
        options: z.array(z.object({
            id: z.string(),
            letter: z.string(),
            text: z.string(),
            isCorrect: z.boolean(),
            explanation: z.string().optional(),
        })),
    })),
});

/** POST /api/folders */
export const createFolderInputSchema = z.object({
    name: z.string().min(1, "Nome da pasta é obrigatório").max(100),
    parentId: z.string().nullable().optional(),
});

/** PATCH /api/folders/[id] */
export const renameFolderInputSchema = z.object({
    name: z.string().min(1, "Nome é obrigatório").max(100),
});

/** PATCH /api/documents/[id] */
export const moveDocumentInputSchema = z.object({
    folderId: z.string().nullable(),
});

// ─── Schemas de file upload ───────────────────────────────────────────────────

export const allowedMimeTypes = ALLOWED_MIME_TYPES;

export function isAllowedMimeType(mimeType: string): boolean {
    return ALLOWED_MIME_TYPES.some(allowed => {
        if (allowed.endsWith("/*")) {
            return mimeType.startsWith(allowed.replace("/*", "/"));
        }
        return mimeType === allowed;
    });
}

// ─── Helper para formatar erros do Zod ────────────────────────────────────────

export function formatZodErrors(error: z.ZodError): string {
    return error.issues.map(e => `${e.path.join(".")}: ${e.message}`).join("; ");
}
