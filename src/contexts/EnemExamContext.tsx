"use client"

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from "next-auth/react"

/* ─── Types ────────────────────────────────────────────────────── */

export type EnemQuestion = {
    id: string;
    text: string;
    options: {
        id: string;
        letter: string;
        text: string;
        isCorrect: boolean;
    }[];
};

export type EnemExamState = {
    examId: string;
    ano: string;
    dia: string;
    questions: EnemQuestion[];
    currentQuestionIndex: number;
    userAnswers: Record<string, string>;
    correctCount: number;
    wrongCount: number;
    timeRemaining: number;
    timeLimit: number;
    isActive: boolean;
    isFinished: boolean;
};

/* ─── Storage ──────────────────────────────────────────────────── */

const STORAGE_KEY = 'active-enem-exams';

function loadFromStorage(userId: string | null | undefined): Record<string, EnemExamState> {
    if (typeof window === 'undefined') return {};
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw) as { userId?: string; exams?: Record<string, EnemExamState> };
        if (userId && parsed.userId && parsed.userId !== userId) {
            sessionStorage.removeItem(STORAGE_KEY);
            return {};
        }
        return parsed.exams ?? {};
    } catch {
        return {};
    }
}

function saveToStorage(userId: string | null | undefined, exams: Record<string, EnemExamState>) {
    if (typeof window === 'undefined' || !userId) return;
    try {
        const activeExams: Record<string, EnemExamState> = {};
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
        // quota exceeded, ignore
    }
}

/* ─── Context ──────────────────────────────────────────────────── */

interface EnemExamContextType {
    exams: Record<string, EnemExamState>;
    activeEnemExams: EnemExamState[];
    viewingExamId: string | null;
    startEnemExam: (examId: string, ano: string, dia: string, questions: EnemQuestion[], timeLimitSeconds: number) => void;
    getExam: (examId: string) => EnemExamState | null;
    answerQuestion: (examId: string, questionId: string, optionId: string, isCorrect: boolean) => void;
    setCurrentQuestionIndex: (examId: string, indexOrFn: number | ((prev: number) => number)) => void;
    finishExam: (examId: string) => void;
    clearExam: (examId: string) => void;
    setViewingExamId: (examId: string | null) => void;
}

const EnemExamContext = createContext<EnemExamContextType | undefined>(undefined);

/* ─── Provider ─────────────────────────────────────────────────── */

export function EnemExamProvider({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();
    const prevUserId = useRef<string | null | undefined>(session?.user?.id);

    const [exams, setExams] = useState<Record<string, EnemExamState>>(() => {
        return loadFromStorage(session?.user?.id);
    });

    // Limpa se o usuário mudar
    useEffect(() => {
        const currentUserId = session?.user?.id;
        if (prevUserId.current !== undefined && currentUserId !== prevUserId.current) {
            setExams({});
            sessionStorage.removeItem(STORAGE_KEY);
        }
        prevUserId.current = currentUserId;
    }, [session?.user?.id]);

    // Rastreia qual exame o usuário está visualizando
    const [viewingExamId, setViewingExamId] = useState<string | null>(null);

    // Cronômetro regressivo — roda apenas para o exame visualizado
    useEffect(() => {
        if (!viewingExamId) return;

        const exam = exams[viewingExamId];
        if (!exam || !exam.isActive || exam.isFinished || exam.timeRemaining <= 0) return;

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
    }, [viewingExamId, viewingExamId ? exams[viewingExamId]?.isActive : null, viewingExamId ? exams[viewingExamId]?.isFinished : null]); // eslint-disable-line react-hooks/exhaustive-deps

    // Persiste no sessionStorage
    const isFirstMount = useRef(true);
    useEffect(() => {
        if (isFirstMount.current) {
            isFirstMount.current = false;
            return;
        }
        saveToStorage(session?.user?.id, exams);
    }, [exams]); // eslint-disable-line react-hooks/exhaustive-deps

    const activeEnemExams = Object.values(exams).filter(e => e.isActive && !e.isFinished);

    const startEnemExam = useCallback((examId: string, ano: string, dia: string, questions: EnemQuestion[], timeLimitSeconds: number) => {
        setExams(prev => ({
            ...prev,
            [examId]: {
                examId,
                ano,
                dia,
                questions,
                currentQuestionIndex: 0,
                userAnswers: {},
                correctCount: 0,
                wrongCount: 0,
                timeRemaining: timeLimitSeconds,
                timeLimit: timeLimitSeconds,
                isActive: true,
                isFinished: false,
            },
        }));
    }, []);

    const getExam = useCallback((examId: string): EnemExamState | null => {
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
            // Se já respondeu essa questão, ajustar contagem
            const previousAnswer = exam.userAnswers[questionId];
            let { correctCount, wrongCount } = exam;
            if (previousAnswer) {
                const prevOption = exam.questions
                    .flatMap(q => q.id === questionId ? q.options : [])
                    .find(o => o.id === previousAnswer);
                if (prevOption?.isCorrect) correctCount--;
                else wrongCount--;
            }
            if (isCorrect) correctCount++;
            else wrongCount++;

            return {
                ...prev,
                [examId]: {
                    ...exam,
                    userAnswers: { ...exam.userAnswers, [questionId]: optionId },
                    correctCount,
                    wrongCount,
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
    }, []);

    return (
        <EnemExamContext.Provider value={{
            exams,
            activeEnemExams,
            viewingExamId,
            startEnemExam,
            getExam,
            answerQuestion,
            setCurrentQuestionIndex,
            finishExam,
            clearExam,
            setViewingExamId,
        }}>
            {children}
        </EnemExamContext.Provider>
    );
}

export function useEnemExam() {
    const context = useContext(EnemExamContext);
    if (context === undefined) {
        throw new Error('useEnemExam must be used within an EnemExamProvider');
    }
    return context;
}
