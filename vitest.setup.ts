import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Global mocks for Next.js

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
        prefetch: vi.fn(),
        back: vi.fn(),
    }),
    useSearchParams: () => new URLSearchParams(),
    usePathname: () => '/',
}));

vi.mock('next-auth/react', () => ({
    useSession: () => ({
        data: { user: { id: 'mock-user-1', name: 'Tester', email: 'test@example.com', role: 'ADMIN' } },
        status: 'authenticated',
    }),
    signIn: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
}));
