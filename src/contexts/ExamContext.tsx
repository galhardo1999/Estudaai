"use client"

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { experimental_useObject as useObject } from "@ai-sdk/react"
import { useSession } from "next-auth/react"
import { z } from "zod"

// Reutiliza o tipo Question dos componentes de exame
export type ExamQuestion = {
    id: string;
    text: string;
    options: {
        id: string;
        letter: string;
        text: string;
        isCorrect: boolean;
        explanation?: string;
    }[];
};

export type GenerationStatus = 'idle' | 'generating' | 'retrying' | 'failed';

export type ExamState = {
    examId: string;
    questions: ExamQuestion[];
    currentQuestionIndex: number;
    userAnswers: Record<string, string>;
    correctCount: number;
    wrongCount: number;
    timeRemaining: number;
    timeLimit: number;
    questionCount: number;
    isActive: boolean;
    isFinished: boolean;
    documentNames?: string[];
    retryCount: number;
    dificuldade: string;
    /** Salvo para que a geração possa ser retentada automaticamente após um refresh da página durante o streaming */
    genParams?: GenParams;
};

const STORAGE_KEY = 'active-exams';

const createDefaultExam = (examId: string, timeLimit: number, questionCount: number, documentNames?: string[], dificuldade = "medio"): ExamState => ({
    examId,
    questions: [],
    currentQuestionIndex: 0,
    userAnswers: {},
    correctCount: 0,
    wrongCount: 0,
    timeRemaining: timeLimit * 60,
    timeLimit,
    questionCount,
    isActive: true,
    isFinished: false,
    documentNames: documentNames || [],
    retryCount: 0,
    dificuldade,
});

const questionSchema = z.object({
    questions: z.array(z.object({
        id: z.string(),
        text: z.string(),
        options: z.array(z.object({
            id: z.string(),
            letter: z.string(),
            text: z.string(),
            isCorrect: z.boolean(),
            explanation: z.string().optional()
        }))
    }))
})

type GenParams = {
    documentIds: string[];
    tempDocs?: { geminiUri: string; name: string }[];
    topic: string;
    questionCount: number;
    difficulty: string;
};

interface ExamContextType {
    exams: Record<string, ExamState>;
    activeExams: ExamState[];
    generatingExamId: string | null;
    isGenerating: boolean;
    generationStatus: GenerationStatus;
    questionsReceived: number;
    viewingExamId: string | null;
    startExam: (timeLimit: number, questionCount: number, examId: string, documentNames?: string[], dificuldade?: string) => void;
    generateExam: (examId: string, params: GenParams) => void;
    getExam: (examId: string) => ExamState | null;
    answerQuestion: (examId: string, questionId: string, optionId: string, isCorrect: boolean) => void;
    setCurrentQuestionIndex: (examId: string, indexOrFn: number | ((prev: number) => number)) => void;
    finishExam: (examId: string) => void;
    clearExam: (examId: string) => void;
    setViewingExamId: (examId: string | null) => void;
}

const ExamContext = createContext<ExamContextType | undefined>(undefined);

function loadFromStorage(userId: string | null | undefined): Record<string, ExamState> {
    if (typeof window === 'undefined') return {};
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw) as { userId?: string; exams?: Record<string, ExamState> };

        // Descarta apenas quando AMBOS os IDs são conhecidos e não correspondem.
        // Se userId for undefined, a sessão ainda não carregou (refresh da página) —
        // mantém os dados armazenados e deixa o efeito de troca de usuário fazer a limpeza depois.
        if (userId && parsed.userId && parsed.userId !== userId) {
            sessionStorage.removeItem(STORAGE_KEY);
            return {};
        }

        return parsed.exams ?? {};
    } catch {
        return {};
    }
}

function saveToStorage(userId: string | null | undefined, exams: Record<string, ExamState>) {
    if (typeof window === 'undefined' || !userId) return;
    try {
        const activeExams: Record<string, ExamState> = {};
        for (const [id, exam] of Object.entries(exams)) {
            if (exam.isActive) {
                activeExams[id] = exam;
            }
        }
        if (Object.keys(activeExams).length > 0) {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ userId, exams: activeExams }));
        } else {
            sessionStorage.removeItem(STORAGE_KEY);
        }
    } catch {
        // cota excedida ou similar, ignora
    }
}

const MAX_RETRIES = 2;

export function ExamProvider({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();
    const prevUserId = useRef<string | null | undefined>(session?.user?.id);

    const [exams, setExams] = useState<Record<string, ExamState>>(() => {
        // Carrega apenas se o userId corresponder — evita vazamento entre usuários
        return loadFromStorage(session?.user?.id);
    });

    // Limpa os exames se o usuário mudar (ex: logout ou login com outro usuário)
    useEffect(() => {
        const currentUserId = session?.user?.id;
        if (prevUserId.current !== undefined && currentUserId !== prevUserId.current) {
            setExams({});
            sessionStorage.removeItem(STORAGE_KEY);
        }
        prevUserId.current = currentUserId;
    }, [session?.user?.id]);

    const [generatingExamId, setGeneratingExamId] = useState<string | null>(null);
    const [generationStatus, setGenerationStatus] = useState<GenerationStatus>('idle');
    const [questionsReceived, setQuestionsReceived] = useState(0);

    // Armazena os parâmetros de geração atuais para retentativas
    const currentGenParams = useRef<{ examId: string; params: GenParams } | null>(null);

    // Streaming da IA — fica aqui para persistir entre navegações
    const { submit, isLoading, object, error } = useObject({
        api: "/api/generate-exam",
        schema: questionSchema
    })

    const questionsStream = object?.questions ?? []

    // Sincroniza as questões recebidas via stream no exame em geração + acompanha o progresso
    const prevStreamCount = useRef(0);
    useEffect(() => {
        if (!generatingExamId) return;
        if (questionsStream.length > prevStreamCount.current) {
            const validQuestions = (questionsStream as ExamQuestion[]).filter(
                q => q && Array.isArray(q.options) && q.options.length > 0
            )
            if (validQuestions.length > 0) {
                setExams(prev => {
                    const exam = prev[generatingExamId];
                    if (!exam) return prev;
                    return { ...prev, [generatingExamId]: { ...exam, questions: validQuestions } };
                });
            }
            // Sempre acompanha a contagem bruta do stream para exibição de progresso em tempo real (inclui questões parciais)
            setQuestionsReceived(questionsStream.length);
            prevStreamCount.current = questionsStream.length;
        }
    }, [questionsStream.length, generatingExamId]);

    // Limpa generatingExamId quando a geração termina com sucesso
    useEffect(() => {
        if (generatingExamId && !isLoading && prevStreamCount.current > 0) {
            // Sincronização final: quando o streaming termina, aplica TODAS as questões válidas do stream.
            // A última questão frequentemente se torna válida apenas no tick final onde
            // questionsStream.length não mudou (apenas seu conteúdo), então o efeito incremental
            // acima não a captura. Isso garante que toda questão completa seja registrada.
            const finalValidQuestions = (questionsStream as ExamQuestion[]).filter(
                q => q && Array.isArray(q.options) && q.options.length > 0
            );
            if (finalValidQuestions.length > 0) {
                setExams(prev => {
                    const exam = prev[generatingExamId];
                    if (!exam) return prev;
                    return { ...prev, [generatingExamId]: { ...exam, questions: finalValidQuestions } };
                });
            }

            setGeneratingExamId(null);
            setGenerationStatus('idle');
            setQuestionsReceived(0);
            currentGenParams.current = null;

            // Persiste as questões geradas no banco de dados
            const examSnapshot = exams[generatingExamId];
            const questionsToSave = finalValidQuestions.length > 0 ? finalValidQuestions : examSnapshot?.questions;
            if (questionsToSave && questionsToSave.length > 0) {
                fetch('/api/save-questions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        codigo: examSnapshot?.examId ?? generatingExamId,
                        questoes: questionsToSave,
                    }),
                }).catch(e => console.error('Failed to persist questions:', e));
            }
        }
    }, [isLoading, generatingExamId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Trata erros durante a geração — retenta até MAX_RETRIES vezes
    useEffect(() => {
        if (error && generatingExamId) {
            const examSnapshot = exams[generatingExamId];
            const retryCount = examSnapshot?.retryCount ?? 0;

            if (retryCount < MAX_RETRIES && currentGenParams.current) {
                const nextRetry = retryCount + 1;
                console.warn(`Exam generation failed. Retry ${nextRetry}/${MAX_RETRIES}...`);
                setGenerationStatus('retrying');

                // Incrementa o contador de retentativas no estado
                setExams(prev => {
                    const exam = prev[generatingExamId];
                    if (!exam) return prev;
                    return { ...prev, [generatingExamId]: { ...exam, retryCount: nextRetry } };
                });

                // Retenta após um breve atraso
                const { params } = currentGenParams.current;
                const retryExamId = generatingExamId;
                setTimeout(() => {
                    prevStreamCount.current = 0;
                    submit(params);
                    setGeneratingExamId(retryExamId);
                }, 2000);

            } else {
                console.error(`Exam generation failed after ${MAX_RETRIES} retries.`, error);
                setGenerationStatus('failed');
                // Remove o exame travado do estado
                setExams(prev => {
                    const updated = { ...prev };
                    delete updated[generatingExamId];
                    return updated;
                });
                setGeneratingExamId(null);
                prevStreamCount.current = 0;
                setQuestionsReceived(0);
                currentGenParams.current = null;
            }
        }
    }, [error, generatingExamId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Persiste no sessionStorage a cada mudança de estado
    const isFirstMount = useRef(true);
    useEffect(() => {
        if (isFirstMount.current) {
            isFirstMount.current = false;
            return;
        }
        saveToStorage(session?.user?.id, exams);
    }, [exams]);

    // ─── Auto-save no banco de dados a cada 30s ───────────────────────────
    const lastDbSave = useRef(0);
    useEffect(() => {
        const AUTOSAVE_INTERVAL = 30_000; // 30 segundos

        const interval = setInterval(() => {
            const now = Date.now();
            if (now - lastDbSave.current < AUTOSAVE_INTERVAL) return;

            const activeEntries = Object.values(exams).filter(
                e => e.isActive && !e.isFinished && e.examId
            );

            for (const exam of activeEntries) {
                const estadoAtual = {
                    currentQuestionIndex: exam.currentQuestionIndex,
                    userAnswers: exam.userAnswers,
                    correctCount: exam.correctCount,
                    wrongCount: exam.wrongCount,
                    timeRemaining: exam.timeRemaining,
                };

                fetch(`/api/exam-state/${encodeURIComponent(exam.examId)}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ estadoAtual }),
                }).catch(err => console.error('Auto-save exam state failed:', err));
            }

            lastDbSave.current = now;
        }, AUTOSAVE_INTERVAL);

        return () => clearInterval(interval);
    }, [exams]);

    // Mantém uma ref dos exames para que o efeito de auto-retentativa na montagem possa ler o valor inicial
    const examsRef = useRef(exams);
    useEffect(() => { examsRef.current = exams; }, [exams]);

    // Auto-retenta exames travados na montagem (ex: página recarregada enquanto a geração estava em streaming)
    useEffect(() => {
        const stuckExam = Object.values(examsRef.current).find(
            e => e.isActive && !e.isFinished && e.questions.length === 0 && e.genParams
        );
        if (stuckExam?.genParams) {
            // Breve atraso para deixar o hook de streaming inicializar
            setTimeout(() => {
                generateExam(stuckExam.examId, stuckExam.genParams!);
            }, 800);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Rastreia qual exame o usuário está visualizando no momento
    const [viewingExamId, setViewingExamId] = useState<string | null>(null);

    // Cronômetro regressivo — roda apenas para o exame que o usuário está visualizando no momento
    useEffect(() => {
        if (!viewingExamId) return;

        const exam = exams[viewingExamId];
        if (!exam || !exam.isActive || exam.isFinished || exam.questions.length === 0 || exam.timeRemaining <= 0) return;

        const timer = setInterval(() => {
            setExams(prev => {
                const current = prev[viewingExamId];
                if (!current || current.timeRemaining <= 0) {
                    clearInterval(timer);
                    return prev;
                }
                return { ...prev, [viewingExamId]: { ...current, timeRemaining: current.timeRemaining - 1 } };
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [viewingExamId, viewingExamId ? exams[viewingExamId]?.isActive : null, viewingExamId ? exams[viewingExamId]?.isFinished : null, viewingExamId ? exams[viewingExamId]?.questions.length : null]); // eslint-disable-line react-hooks/exhaustive-deps

    const activeExams = Object.values(exams).filter(e => e.isActive && !e.isFinished);

    const startExam = useCallback((timeLimit: number, questionCount: number, examId: string, documentNames?: string[], dificuldade = "medio") => {
        setExams(prev => ({
            ...prev,
            [examId]: createDefaultExam(examId, timeLimit, questionCount, documentNames, dificuldade),
        }));
    }, []);

    const generateExam = useCallback((examId: string, params: GenParams) => {
        // Persiste genParams para permitir auto-retentativa se a página recarregar durante a geração
        setExams(prev => {
            const exam = prev[examId];
            if (!exam) return prev;
            return { ...prev, [examId]: { ...exam, genParams: params } };
        });
        prevStreamCount.current = 0;
        setGeneratingExamId(examId);
        setGenerationStatus('generating');
        setQuestionsReceived(0);
        currentGenParams.current = { examId, params };
        submit(params);
    }, [submit]);

    const getExam = useCallback((examId: string): ExamState | null => {
        return exams[examId] || null;
    }, [exams]);

    const setCurrentQuestionIndex = useCallback((examId: string, indexOrFn: number | ((prev: number) => number)) => {
        setExams(prev => {
            const exam = prev[examId];
            if (!exam) return prev;
            return {
                ...prev,
                [examId]: {
                    ...exam,
                    currentQuestionIndex: typeof indexOrFn === 'function' ? indexOrFn(exam.currentQuestionIndex) : indexOrFn,
                },
            };
        });
    }, []);

    const answerQuestion = useCallback((examId: string, questionId: string, optionId: string, isCorrect: boolean) => {
        setExams(prev => {
            const exam = prev[examId];
            if (!exam) return prev;
            return {
                ...prev,
                [examId]: {
                    ...exam,
                    userAnswers: { ...exam.userAnswers, [questionId]: optionId },
                    correctCount: isCorrect ? exam.correctCount + 1 : exam.correctCount,
                    wrongCount: isCorrect ? exam.wrongCount : exam.wrongCount + 1,
                },
            };
        });
    }, []);

    const finishExam = useCallback((examId: string) => {
        setExams(prev => {
            const exam = prev[examId];
            if (!exam) return prev;
            return { ...prev, [examId]: { ...exam, isFinished: true } };
        });
    }, []);

    const clearExam = useCallback((examId: string) => {
        setExams(prev => {
            const updated = { ...prev };
            delete updated[examId];
            return updated;
        });
        if (generatingExamId === examId) {
            setGeneratingExamId(null);
            setGenerationStatus('idle');
            currentGenParams.current = null;
        }
    }, [generatingExamId]);

    return (
        <ExamContext.Provider value={{
            exams,
            activeExams,
            generatingExamId,
            isGenerating: isLoading,
            generationStatus,
            questionsReceived,
            viewingExamId,
            startExam,
            generateExam,
            getExam,
            answerQuestion,
            setCurrentQuestionIndex,
            finishExam,
            clearExam,
            setViewingExamId,
        }}>
            {children}
        </ExamContext.Provider>
    );
}

export function useExam() {
    const context = useContext(ExamContext);
    if (context === undefined) {
        throw new Error('useExam must be used within an ExamProvider');
    }
    return context;
}
