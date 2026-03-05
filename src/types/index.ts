import { Prisma } from "@prisma/client";

// ─── Tipos extraídos do Prisma ────────────────────────────────────────────────

export type DocumentoRecord = Prisma.DocumentoGetPayload<{}>;
export type ExameRecord = Prisma.ExameGetPayload<{}>;
export type ExameWithDocumento = Prisma.ExameGetPayload<{ include: { documento: true } }>;
export type ResumoRecord = Prisma.ResumoGetPayload<{}>;
export type UserRecord = Prisma.UserGetPayload<{}>;
export type PastaRecord = Prisma.PastaGetPayload<{}>;

// ─── Tipos de domínio (questões de exame) ─────────────────────────────────────

export type ExamQuestionOption = {
    id: string;
    letter: string;
    text: string;
    isCorrect: boolean;
    explanation?: string;
};

export type ExamQuestion = {
    id: string;
    text: string;
    options: ExamQuestionOption[];
};

/** Mapeamento de id_da_questão → id_da_opção escolhida */
export type ExamAnswers = Record<string, string>;

// ─── Tipos de API ─────────────────────────────────────────────────────────────

/** Documento formatado para o frontend */
export type DocumentoDTO = {
    id: string;
    name: string;
    url: string;
    geminiUri: string | null;
    folderId?: string;
    size: number | null;
    createdAt: number;
};

/** Pasta formatada para o frontend */
export type PastaDTO = {
    id: string;
    name: string;
    parentId?: string;
    createdAt: number;
};

/** Documento temporário (upload direto ao Gemini, não persiste no banco) */
export type TempDoc = {
    geminiUri: string;
    name: string;
};

// ─── Tipos de estado do exame ─────────────────────────────────────────────────

export type ExamStatus = "em_andamento" | "finalizado";

export type ExamCurrentState = {
    currentQuestionIndex: number;
    userAnswers: ExamAnswers;
    correctCount: number;
    wrongCount: number;
    timeRemaining: number;
};

// ─── Tipos de file part para a IA ─────────────────────────────────────────────

export type AIFilePart = {
    type: "file";
    data: URL | Buffer | Uint8Array;
    mediaType: string;
};
