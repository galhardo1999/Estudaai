import { expect, test, vi, describe, beforeEach } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { trackTokenUsage } from '@/lib/tokenTracking';
import { streamText } from 'ai';

// 0. Mock rate limiter (must be before route import)
vi.mock('@/lib/rateLimit', () => ({
    applyRateLimit: vi.fn().mockResolvedValue(null),
    RATE_LIMITS: { ai: { limit: 5, windowMs: 60000 }, upload: { limit: 10, windowMs: 60000 }, register: { limit: 5, windowMs: 300000 }, default: { limit: 30, windowMs: 60000 } },
    getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
}));

// 1. Mock server side NextAuth
vi.mock('@/lib/auth', () => ({
    auth: vi.fn(),
}));

// 2. Mock AI SDKs
vi.mock('ai', () => ({
    streamText: vi.fn(),
}));

vi.mock('@ai-sdk/google', () => ({
    createGoogleGenerativeAI: vi.fn(() => vi.fn(() => 'mocked-google-model')),
}));

// 3. Mock Supabase
vi.mock('@/lib/supabase', () => ({
    supabaseAdmin: {
        storage: {
            from: vi.fn(() => ({
                download: vi.fn(),
            }))
        }
    }
}));

// 4. Mock Tracking
vi.mock('@/lib/tokenTracking', () => ({
    trackTokenUsage: vi.fn(),
}));

// 5. Mock Prisma (already mocked globally in vitest setup via __mocks__/prisma.ts, but we must explicitly tell Vitest if we are going to spy/assert on its default export)
vi.mock('@/lib/prisma', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/__mocks__/prisma')>();
    return {
        default: {
            ...actual.default,
            documento: {
                findMany: vi.fn(),
                update: vi.fn(),
            },
        }
    };
});

describe('POST /api/generate-summary', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        // Setup default env var
        process.env.GEMINI_API_KEY = 'test-key';
    });

    function createMockRequest(body: any = {}): NextRequest {
        return new Request('http://localhost:3000/api/generate-summary', {
            method: 'POST',
            body: JSON.stringify(body),
        }) as NextRequest;
    }

    test('should return 401 if user is not authenticated', async () => {
        vi.mocked(auth).mockResolvedValueOnce(null);

        const req = createMockRequest();
        const res = await POST(req);

        expect(res.status).toBe(401);
        const json = await res.json();
        expect(json.error).toBe('Unauthorized');
    });

    test('should return 400 if documentIds is missing or empty', async () => {
        vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'user-1' } } as any);

        const req = createMockRequest({ documentIds: [] });
        const res = await POST(req);

        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toContain('documentIds');
    });

    test('should return 403 if no documents are found in the DB for the user', async () => {
        vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'user-1' } } as any);
        // Mock DB finding nothing
        (prisma.documento.findMany as any).mockResolvedValueOnce([]);

        const req = createMockRequest({ documentIds: ['doc-1'] });
        const res = await POST(req);

        expect(res.status).toBe(403);
    });

    test('should successfully initiate AI stream when valid documents are provided', async () => {
        vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'user-1' } } as any);

        // Mock DB finding a document with a Gemini URI
        (prisma.documento.findMany as any).mockResolvedValueOnce([
            { id: 'doc-1', usuarioId: 'user-1', geminiUri: 'https://gemini-uri/test.pdf' }
        ]);

        // Mock streamText returning a response format the API expects
        vi.mocked(streamText).mockReturnValueOnce({
            toTextStreamResponse: () => new Response('mock-stream-response', { status: 200 })
        } as any);

        const req = createMockRequest({ documentIds: ['doc-1'], summaryType: 'resumo' });
        const res = await POST(req);

        expect(res.status).toBe(200);
        expect(prisma.documento.findMany).toHaveBeenCalledTimes(1);
        expect(streamText).toHaveBeenCalledTimes(1);
        const streamTextCallArgs = vi.mocked(streamText).mock.calls[0][0];
        // Ensure it passes the file data based on the priority 1 logic
        expect(streamTextCallArgs.messages[0].content[1].type).toBe('file');
    });

    test('should return 500 cleanly if GEMINI_API_KEY is not configured', async () => {
        vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'user-1' } } as any);
        (prisma.documento.findMany as any).mockResolvedValueOnce([
            { id: 'doc-1', usuarioId: 'user-1', geminiUri: 'https://gemini-uri/test.pdf' }
        ]);

        delete process.env.GEMINI_API_KEY;

        const req = createMockRequest({ documentIds: ['doc-1'] });
        const res = await POST(req);

        expect(res.status).toBe(500);
    });

    test('should return 400 safely if the streamText fails internally', async () => {
        vi.mocked(auth).mockResolvedValueOnce({ user: { id: 'user-1' } } as any);
        (prisma.documento.findMany as any).mockResolvedValueOnce([
            { id: 'doc-1', usuarioId: 'user-1', geminiUri: 'https://gemini-uri/test.pdf' }
        ]);

        // Simulate an invalid API key error thrown by AI SDK
        vi.mocked(streamText).mockImplementationOnce(() => {
            throw new Error('API key expired');
        });

        const req = createMockRequest({ documentIds: ['doc-1'] });
        const res = await POST(req);

        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toBe('API key expired');
    });
});
