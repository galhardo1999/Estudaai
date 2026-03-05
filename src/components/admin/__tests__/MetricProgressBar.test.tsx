import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MetricProgressBar } from '../MetricProgressBar';

describe('MetricProgressBar Component', () => {

    it('renders with 0% when current is 0', () => {
        render(<MetricProgressBar current={0} max={100} />);

        // Deve renderizar o texto "0 / 100"
        expect(screen.getByText('0 / 100')).toBeInTheDocument();
    });

    it('renders correctly at 50% capacity', () => {
        const { container } = render(<MetricProgressBar current={50} max={100} />);

        // Teste de texto formatado personalizado
        expect(screen.getByText('50 / 100')).toBeInTheDocument();

        // O div interno de progresso deve ter largura de 50%
        const progressBar = container.querySelector('.bg-zinc-400');
        expect(progressBar).toHaveStyle({ width: '50%' });
    });

    it('uses the warning color when capacity is 100%', () => {
        const { container } = render(<MetricProgressBar current={100} max={100} />);

        // Capacidade total deve acionar estilos de alerta (red-500)
        const progressBar = container.querySelector('.bg-red-500');
        expect(progressBar).toBeInTheDocument();
        expect(progressBar).toHaveStyle({ width: '100%' });

        // Garante que o span de texto também recebe a cor vermelha de erro 
        const textSpan = container.querySelector('.text-red-400');
        expect(textSpan).toBeInTheDocument();
    });

    it('caps width at 100% and displays correct text even when current > max', () => {
        const { container } = render(<MetricProgressBar current={120} max={100} />);

        expect(screen.getByText('120 / 100')).toBeInTheDocument();

        const progressBar = container.querySelector('.bg-red-500');
        // A largura não deve exceder 100% visualmente
        expect(progressBar).toHaveStyle({ width: '100%' });
    });

    it('displays custom formattedText when provided', () => {
        render(<MetricProgressBar current={1500} max={2000} formattedText="1.5k / 2k" />);

        expect(screen.getByText('1.5k / 2k')).toBeInTheDocument();
    });
});
