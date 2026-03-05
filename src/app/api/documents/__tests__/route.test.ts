import { expect, test, vi, describe, beforeEach } from 'vitest';
import { GET } from '../route';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

// 0. Mock rate limiter (prevents real Upstash Redis connection)
vi.mock('@/lib/rateLimit', () => ({
    applyRateLimit: vi.fn().mockResolvedValue(null),
    RATE_LIMITS: { ai: { limit: 5, windowMs: 60000 }, upload: { limit: 10, windowMs: 60000 }, register: { limit: 5, windowMs: 300000 }, default: { limit: 30, windowMs: 60000 } },
    getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
}));
vi.mock('@/lib/auth', () => ({
    auth: vi.fn(),
}));

vi.mock('@/lib/prisma', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/__mocks__/prisma')>();
    return {
        default: {
            ...actual.default,
            documento: {
                findMany: vi.fn(),
            },
        }
    };
});

describe('/api/documents', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET', () => {
        test('should return 401 if unauthenticated', async () => {
            vi.mocked(auth).mockResolvedValueOnce(null);
            const res = await GET();
            expect(res.status).toBe(401);
        });

        test('should return documents mapped correctly on success', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'user-1' } } as any);

            const mockDate = new Date();
            (prisma.documento.findMany as any).mockResolvedValueOnce([
                {
                    id: 'doc-1',
                    titulo: 'Math Document',
                    url: 'https://test/math.pdf',
                    geminiUri: 'uri-1',
                    pastaId: 'folder-1',
                    tamanho: 1024,
                    criadoEm: mockDate
                },
                {
                    id: 'doc-2',
                    titulo: 'Science Document',
                    url: 'https://test/science.pdf',
                    geminiUri: null,
                    pastaId: null,
                    tamanho: 2048,
                    criadoEm: mockDate
                }
            ]);

            const res = await GET();
            expect(res.status).toBe(200);

            const json = await res.json();
            expect(json.documents).toHaveLength(2);

            // Verifica mapeamentos para o doc 1
            expect(json.documents[0]).toEqual({
                id: 'doc-1',
                name: 'Math Document',
                url: 'https://test/math.pdf',
                geminiUri: 'uri-1',
                folderId: 'folder-1',
                size: 1024,
                createdAt: mockDate.getTime(),
            });

            // Verifica coerção de null para undefined em documentos na raiz (doc 2)
            expect(json.documents[1].folderId).toBeUndefined();
        });

        test('should return 500 on internal errors', async () => {
            vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'user-1' } } as any);
            (prisma.documento.findMany as any).mockRejectedValueOnce(new Error('DB Error'));

            const res = await GET();
            expect(res.status).toBe(500);
        });
    });
});
