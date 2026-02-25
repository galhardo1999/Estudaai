"use client"

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { experimental_useObject as useObject } from "@ai-sdk/react"
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
};

const STORAGE_KEY = 'active-exams';

const createDefaultExam = (examId: string, timeLimit: number, questionCount: number): ExamState => ({
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
    fileUris: (string | null | undefined)[];
    topic: string;
    questionCount: number;
    difficulty: string;
};

interface ExamContextType {
    exams: Record<string, ExamState>;
    activeExams: ExamState[];
    generatingExamId: string | null;
    isGenerating: boolean;
    viewingExamId: string | null;
    startExam: (timeLimit: number, questionCount: number, examId: string) => void;
    generateExam: (examId: string, params: GenParams) => void;
    getExam: (examId: string) => ExamState | null;
    answerQuestion: (examId: string, questionId: string, optionId: string, isCorrect: boolean) => void;
    setCurrentQuestionIndex: (examId: string, indexOrFn: number | ((prev: number) => number)) => void;
    finishExam: (examId: string) => void;
    clearExam: (examId: string) => void;
    setViewingExamId: (examId: string | null) => void;
}

const ExamContext = createContext<ExamContextType | undefined>(undefined);

function loadFromStorage(): Record<string, ExamState> {
    if (typeof window === 'undefined') return {};
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        return JSON.parse(raw) as Record<string, ExamState>;
    } catch {
        return {};
    }
}

function saveToStorage(exams: Record<string, ExamState>) {
    if (typeof window === 'undefined') return;
    try {
        // Only save active exams
        const activeExams: Record<string, ExamState> = {};
        for (const [id, exam] of Object.entries(exams)) {
            if (exam.isActive) {
                activeExams[id] = exam;
            }
        }
        if (Object.keys(activeExams).length > 0) {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(activeExams));
        } else {
            sessionStorage.removeItem(STORAGE_KEY);
        }
    } catch {
        // quota exceeded or similar, ignore
    }
}

export function ExamProvider({ children }: { children: React.ReactNode }) {
    const [exams, setExams] = useState<Record<string, ExamState>>(() => {
        return loadFromStorage();
    });

    const [generatingExamId, setGeneratingExamId] = useState<string | null>(null);

    // AI streaming — lives here so it persists across navigation
    const { submit, isLoading, object } = useObject({
        api: "/api/generate-exam",
        schema: questionSchema
    })

    const questionsStream = object?.questions ?? []

    // Sync streamed questions into the generating exam
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
            prevStreamCount.current = questionsStream.length;
        }
    }, [questionsStream.length, generatingExamId]);

    // Clear generatingExamId when generation finishes
    useEffect(() => {
        if (generatingExamId && !isLoading && prevStreamCount.current > 0) {
            setGeneratingExamId(null);
        }
    }, [isLoading, generatingExamId]);

    // Persist to sessionStorage on every state change
    const isFirstMount = useRef(true);
    useEffect(() => {
        if (isFirstMount.current) {
            isFirstMount.current = false;
            return;
        }
        saveToStorage(exams);
    }, [exams]);

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
    }, [viewingExamId, viewingExamId ? exams[viewingExamId]?.isActive : null, viewingExamId ? exams[viewingExamId]?.isFinished : null, viewingExamId ? exams[viewingExamId]?.questions.length : null]);

    const activeExams = Object.values(exams).filter(e => e.isActive && !e.isFinished);

    const startExam = useCallback((timeLimit: number, questionCount: number, examId: string) => {
        setExams(prev => ({
            ...prev,
            [examId]: createDefaultExam(examId, timeLimit, questionCount),
        }));
    }, []);

    const generateExam = useCallback((examId: string, params: GenParams) => {
        prevStreamCount.current = 0;
        setGeneratingExamId(examId);
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
        }
    }, [generatingExamId]);

    return (
        <ExamContext.Provider value={{
            exams,
            activeExams,
            generatingExamId,
            isGenerating: isLoading,
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
