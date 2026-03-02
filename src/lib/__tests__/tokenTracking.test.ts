import { expect, test, vi, describe, beforeEach } from 'vitest';
import { trackTokenUsage } from '@/lib/tokenTracking';
import prisma from '@/lib/prisma';

// 1. Tell vitest to replace the real prisma client with our mock
vi.mock('@/lib/prisma', () => {
    return {
        default: {
            tokenUsage: {
                create: vi.fn(),
            }
        }
    }
});

describe('trackTokenUsage', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('should call prisma.tokenUsage.create with correct data', async () => {
        const mockData = {
            usuarioId: 'user-123',
            modelo: 'gemini-test',
            operation: 'test_op',
            inputTokens: 100,
            outputTokens: 50,
            totalTokens: 150,
        };

        await trackTokenUsage(mockData);

        expect(prisma.tokenUsage.create).toHaveBeenCalledTimes(1);
        expect(prisma.tokenUsage.create).toHaveBeenCalledWith({
            data: {
                usuarioId: 'user-123',
                modelo: 'gemini-test', // Note: Because we passed it
                operation: 'test_op',
                inputTokens: 100,
                outputTokens: 50,
                totalTokens: 150,
            }
        });
    });

    test('should fallback to gemini-2.5-flash if no model provided', async () => {
        const mockData = {
            usuarioId: 'user-456',
            operation: 'generate_summary',
            inputTokens: 10,
            outputTokens: 20,
            totalTokens: 30,
        };

        await trackTokenUsage(mockData);

        expect(prisma.tokenUsage.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ modelo: 'gemini-2.5-flash' })
            })
        );
    });
});
