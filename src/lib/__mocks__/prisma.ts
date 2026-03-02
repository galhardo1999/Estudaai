import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'vitest-mock-extended';
import { beforeEach } from 'vitest';
import prisma from '../prisma';

// Type assertion to let TS know our imported `prisma` is a mock
export const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

// Instantiate the actual mock object
const mockedPrisma = mockDeep<PrismaClient>();

// Override the actual exported default `prisma` module 
// In Vite/Vitest, you must tell Vitest to mock the module in your test file using `vi.mock('@/lib/prisma', () => (//...))`
export default mockedPrisma;
