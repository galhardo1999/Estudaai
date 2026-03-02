import { TokensDashboardClient } from '@/components/admin/TokensDashboardClient';

export const metadata = {
    title: 'Admin - Tokens | Estuda.ai',
    description: 'Genciamento de uso dos LLMs',
};

export default function AdminTokensPage() {
    return (
        <TokensDashboardClient />
    );
}
