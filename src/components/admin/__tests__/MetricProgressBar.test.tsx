import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MetricProgressBar } from '../MetricProgressBar';

describe('MetricProgressBar Component', () => {

    it('renders with 0% when current is 0', () => {
        render(<MetricProgressBar current={0} max={100} />);

        // It should render the text "0 / 100"
        expect(screen.getByText('0 / 100')).toBeInTheDocument();
    });

    it('renders correctly at 50% capacity', () => {
        const { container } = render(<MetricProgressBar current={50} max={100} />);

        // Custom formatted text test
        expect(screen.getByText('50 / 100')).toBeInTheDocument();

        // The inner progress div should have width 50%
        const progressBar = container.querySelector('.bg-zinc-400');
        expect(progressBar).toHaveStyle({ width: '50%' });
    });

    it('uses the warning color when capacity is 100%', () => {
        const { container } = render(<MetricProgressBar current={100} max={100} />);

        // Full capacity should trigger warning styles (red-500)
        const progressBar = container.querySelector('.bg-red-500');
        expect(progressBar).toBeInTheDocument();
        expect(progressBar).toHaveStyle({ width: '100%' });

        // Ensure the text span also gets the red error color 
        const textSpan = container.querySelector('.text-red-400');
        expect(textSpan).toBeInTheDocument();
    });

    it('caps width at 100% and displays correct text even when current > max', () => {
        const { container } = render(<MetricProgressBar current={120} max={100} />);

        expect(screen.getByText('120 / 100')).toBeInTheDocument();

        const progressBar = container.querySelector('.bg-red-500');
        // Width should not exceed 100% visually
        expect(progressBar).toHaveStyle({ width: '100%' });
    });

    it('displays custom formattedText when provided', () => {
        render(<MetricProgressBar current={1500} max={2000} formattedText="1.5k / 2k" />);

        expect(screen.getByText('1.5k / 2k')).toBeInTheDocument();
    });
});
