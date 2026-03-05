import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'vitest-mock-extended';
import { beforeEach } from 'vitest';
import prisma from '../prisma';

// Asserção de tipo para que o TS saiba que o `prisma` importado é um mock
export const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

// Instancia o objeto mock real
const mockedPrisma = mockDeep<PrismaClient>();

// Sobrescreve o módulo `prisma` exportado por padrão 
// No Vite/Vitest, você precisa dizer ao Vitest para mockar o módulo no seu arquivo de teste usando `vi.mock('@/lib/prisma', () => (//...))`
export default mockedPrisma;
