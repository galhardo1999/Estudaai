import prisma from '@/lib/prisma';

interface TokenUsageData {
    usuarioId?: string;
    modelo?: string;
    operation: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
}

export async function trackTokenUsage(data: TokenUsageData) {
    try {
        await prisma.tokenUsage.create({
            data: {
                usuarioId: data.usuarioId,
                modelo: data.modelo || 'gemini-2.5-flash',
                operation: data.operation,
                inputTokens: data.inputTokens,
                outputTokens: data.outputTokens,
                totalTokens: data.totalTokens,
            }
        });
    } catch (error) {
        console.error('Failed to track token usage:', error);
    }
}
