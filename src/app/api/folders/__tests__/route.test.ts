import { expect, test, vi, describe, beforeEach } from 'vitest';
import { GET, POST } from '../route';
import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';

vi.mock('next-auth/next', () => ({
    getServerSession: vi.fn(),
}));

vi.mock('@/lib/prisma', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/__mocks__/prisma')>();
    return {
        default: {
            ...actual.default,
            pasta: {
                findMany: vi.fn(),
                findUnique: vi.fn(),
                create: vi.fn(),
            },
        }
    };
});

function createMockRequest(method: string, body?: any): NextRequest {
    return new Request('http://localhost:3000/api/folders', {
        method,
        body: body ? JSON.stringify(body) : undefined,
    }) as NextRequest;
}

describe('/api/folders', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET', () => {
        test('should return 401 if unauthenticated', async () => {
            vi.mocked(getServerSession).mockResolvedValueOnce(null);
            const res = await GET();
            expect(res.status).toBe(401);
        });

        test('should return folders mapped correctly on success', async () => {
            vi.mocked(getServerSession).mockResolvedValueOnce({ user: { id: 'user-1' } } as any);

            const mockDate = new Date();
            (prisma.pasta.findMany as any).mockResolvedValueOnce([
                { id: 'folder-1', nome: 'Root Folder', parentId: null, criadoEm: mockDate, _count: { documentos: 0 } },
                { id: 'folder-2', nome: 'Sub Folder', parentId: 'folder-1', criadoEm: mockDate, _count: { documentos: 2 } }
            ]);

            const res = await GET();
            expect(res.status).toBe(200);

            const json = await res.json();
            expect(json.folders).toHaveLength(2);
            expect(json.folders[0]).toEqual({
                id: 'folder-1',
                name: 'Root Folder',
                parentId: undefined, // ensure null is mapped to undefined per the route logic
                createdAt: mockDate.getTime(),
            });
            expect(json.folders[1].parentId).toBe('folder-1');
        });
    });

    describe('POST', () => {
        test('should return 401 if unauthenticated', async () => {
            vi.mocked(getServerSession).mockResolvedValueOnce(null);
            const res = await POST(createMockRequest('POST', { name: 'New Folder' }));
            expect(res.status).toBe(401);
        });

        test('should return 400 if name is missing or empty', async () => {
            vi.mocked(getServerSession).mockResolvedValueOnce({ user: { id: 'user-1' } } as any);
            const res1 = await POST(createMockRequest('POST', {}));
            expect(res1.status).toBe(400);

            vi.mocked(getServerSession).mockResolvedValueOnce({ user: { id: 'user-1' } } as any);
            const res2 = await POST(createMockRequest('POST', { name: '   ' }));
            expect(res2.status).toBe(400);
        });

        test('should return 403 if parentFolder does not exist or user does not own it', async () => {
            vi.mocked(getServerSession).mockResolvedValueOnce({ user: { id: 'user-1' } } as any);
            (prisma.pasta.findUnique as any).mockResolvedValueOnce(null); // Parent missing

            const res = await POST(createMockRequest('POST', { name: 'New SubFolder', parentId: 'parent-1' }));
            expect(res.status).toBe(403);

            const json = await res.json();
            expect(json.error).toContain('Forbidden');
        });

        test('should create a folder correctly on valid request', async () => {
            vi.mocked(getServerSession).mockResolvedValueOnce({ user: { id: 'user-1' } } as any);

            const mockDate = new Date();
            (prisma.pasta.create as any).mockResolvedValueOnce({
                id: 'new-folder-1',
                nome: 'My Classes',
                parentId: null,
                criadoEm: mockDate,
                usuarioId: 'user-1'
            });

            const res = await POST(createMockRequest('POST', { name: 'My Classes' }));
            expect(res.status).toBe(200);

            const json = await res.json();
            expect(json.folder.id).toBe('new-folder-1');
            expect(json.folder.name).toBe('My Classes');
        });
    });
});
