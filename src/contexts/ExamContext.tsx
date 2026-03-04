"use client"

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { experimental_useObject as useObject } from "@ai-sdk/react"
import { useSession } from "next-auth/react"
import { z } from "zod"

// Re-use Question type shape from exam components
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
    /** Saved so generation can be auto-retried after a page refresh mid-stream */
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

        // Only discard when BOTH IDs are known and they don't match.
        // If userId is undefined the session hasn't loaded yet (page refresh) —
        // keep the stored data and let the user-change effect handle cleanup later.
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
        // quota exceeded or similar, ignore
    }
}

const MAX_RETRIES = 2;

export function ExamProvider({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();
    const prevUserId = useRef<string | null | undefined>(session?.user?.id);

    const [exams, setExams] = useState<Record<string, ExamState>>(() => {
        // Load only if userId matches — prevents cross-user leakage
        return loadFromStorage(session?.user?.id);
    });

    // Clear exams if the user changes (e.g., logout or login as different user)
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

    // Store current gen params for retries
    const currentGenParams = useRef<{ examId: string; params: GenParams } | null>(null);

    // AI streaming — lives here so it persists across navigation
    const { submit, isLoading, object, error } = useObject({
        api: "/api/generate-exam",
        schema: questionSchema
    })

    const questionsStream = object?.questions ?? []

    // Sync streamed questions into the generating exam + track progress
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
            // Always track the raw stream count for real-time progress display (includes partial questions)
            setQuestionsReceived(questionsStream.length);
            prevStreamCount.current = questionsStream.length;
        }
    }, [questionsStream.length, generatingExamId]);

    // Clear generatingExamId when generation finishes successfully
    useEffect(() => {
        if (generatingExamId && !isLoading && prevStreamCount.current > 0) {
            // Final sync: when streaming ends, apply ALL valid questions from the stream.
            // The last question often becomes fully valid only on the final tick where
            // questionsStream.length hasn't changed (only its content), so the incremental
            // effect above misses it. This guarantees every complete question is captured.
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

            // Persist generated questions to DB
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

    // Handle errors during generation — retry up to MAX_RETRIES times
    useEffect(() => {
        if (error && generatingExamId) {
            const examSnapshot = exams[generatingExamId];
            const retryCount = examSnapshot?.retryCount ?? 0;

            if (retryCount < MAX_RETRIES && currentGenParams.current) {
                const nextRetry = retryCount + 1;
                console.warn(`Exam generation failed. Retry ${nextRetry}/${MAX_RETRIES}...`);
                setGenerationStatus('retrying');

                // Increment retry count in state
                setExams(prev => {
                    const exam = prev[generatingExamId];
                    if (!exam) return prev;
                    return { ...prev, [generatingExamId]: { ...exam, retryCount: nextRetry } };
                });

                // Retry after a short delay
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
                // Remove the stuck exam from state
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

    // Persist to sessionStorage on every state change
    const isFirstMount = useRef(true);
    useEffect(() => {
        if (isFirstMount.current) {
            isFirstMount.current = false;
            return;
        }
        saveToStorage(session?.user?.id, exams);
    }, [exams]);

    // Keep a ref of exams so the mount-time auto-retry effect can read the initial value
    const examsRef = useRef(exams);
    useEffect(() => { examsRef.current = exams; }, [exams]);

    // Auto-retry stuck exams on mount (e.g. page reloaded while generation was streaming)
    useEffect(() => {
        const stuckExam = Object.values(examsRef.current).find(
            e => e.isActive && !e.isFinished && e.questions.length === 0 && e.genParams
        );
        if (stuckExam?.genParams) {
            // Short delay to let the streaming hook initialise
            setTimeout(() => {
                generateExam(stuckExam.examId, stuckExam.genParams!);
            }, 800);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Track which exam the user is currently viewing
    const [viewingExamId, setViewingExamId] = useState<string | null>(null);

    // Countdown timer — only runs for the exam the user is currently viewing
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
        // Persist genParams so we can auto-retry if the page reloads mid-generation
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
