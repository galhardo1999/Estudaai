import { expect, test, vi, describe, beforeEach } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { trackTokenUsage } from '@/lib/tokenTracking';
import { streamObject } from 'ai';

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));
vi.mock('ai', () => ({ streamObject: vi.fn() }));
vi.mock('@ai-sdk/google', () => ({
    createGoogleGenerativeAI: vi.fn(() => vi.fn(() => 'mocked-google-model')),
}));

// Mock GoogleAIFileManager used in generate-exam
vi.mock('@google/generative-ai/server', () => {
    return {
        GoogleAIFileManager: class {
            getFile = vi.fn();
            uploadFile = vi.fn().mockResolvedValue({ file: { uri: 'mock-reupload-uri' } });
        }
    };
});

vi.mock('@/lib/supabase', () => ({
    supabaseAdmin: {
        storage: {
            from: vi.fn(() => ({ download: vi.fn() }))
        }
    }
}));

vi.mock('@/lib/tokenTracking', () => ({ trackTokenUsage: vi.fn() }));

vi.mock('@/lib/prisma', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/__mocks__/prisma')>();
    return {
        default: {
            ...actual.default,
            documento: { findMany: vi.fn(), update: vi.fn() },
        }
    };
});

describe('POST /api/generate-exam', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.GEMINI_API_KEY = 'test-key';
    });

    function createMockRequest(body: any = {}): NextRequest {
        return new Request('http://localhost:3000/api/generate-exam', {
            method: 'POST',
            body: JSON.stringify(body),
        }) as NextRequest;
    }

    test('should return 401 if user is not authenticated', async () => {
        vi.mocked(getServerSession).mockResolvedValueOnce(null);
        const res = await POST(createMockRequest());
        expect(res.status).toBe(401);
    });

    test('should return 400 if both documentIds and tempDocs are empty', async () => {
        vi.mocked(getServerSession).mockResolvedValueOnce({ user: { id: 'user-1' } } as any);
        const res = await POST(createMockRequest({ documentIds: [], tempDocs: [] }));

        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toBe('At least one document is required');
    });

    test('should process valid document payloads and initiate streamObject', async () => {
        vi.mocked(getServerSession).mockResolvedValueOnce({ user: { id: 'user-1' } } as any);

        // Mock a document coming from the DB with a valid gemini URI
        (prisma.documento.findMany as any).mockResolvedValueOnce([
            { id: 'doc-1', usuarioId: 'user-1', geminiUri: 'https://gemini-uri/ok.pdf', descricao: 'application/pdf' }
        ]);

        vi.mocked(streamObject).mockReturnValueOnce({
            toTextStreamResponse: () => new Response('mock-stream', { status: 200 })
        } as any);

        const req = createMockRequest({
            documentIds: ['doc-1'],
            tempDocs: [{ geminiUri: 'https://gemini-uri/temp.pdf', name: 'temp' }],
            questionCount: 3,
            difficulty: 'facil'
        });

        const res = await POST(req);

        // Stream should begin successfully
        expect(res.status).toBe(200);
        expect(streamObject).toHaveBeenCalledTimes(1);

        // Verify stream object was called with correct structure
        const callArgs = vi.mocked(streamObject).mock.calls[0][0];
        const messagesContent = callArgs.messages?.[0].content as any[];

        // We provided 1 library doc + 1 temp doc = 2 file parts + 2 text parts (prompt + prefix) = 4 total contents
        expect(messagesContent.length).toBe(4);
        expect(messagesContent[2].type).toBe('file');

        // Check difficulty injection in prompt
        expect(messagesContent[0].text).toContain('Dificuldade: FACIL');
        expect(messagesContent[0].text).toContain('Quantidade desejada: 3');
    });

    test('should return 400 if filtering results in zero valid accessible files', async () => {
        vi.mocked(getServerSession).mockResolvedValueOnce({ user: { id: 'user-1' } } as any);
        // DB finds document but it has NO url and NO geminiUri
        (prisma.documento.findMany as any).mockResolvedValueOnce([
            { id: 'doc-1', usuarioId: 'user-1' }
        ]);

        const req = createMockRequest({ documentIds: ['doc-1'] });
        const res = await POST(req);

        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toContain('Nenhum documento acessível encontrado');
    });
});
