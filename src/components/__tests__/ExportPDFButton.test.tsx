import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ExportPDFButton from '../ExportPDFButton';
import { usePDF } from 'react-to-pdf';

// Mock the react-to-pdf library hook
vi.mock('react-to-pdf', () => ({
    usePDF: vi.fn(),
}));

describe('ExportPDFButton Component', () => {

    const mockToPDF = vi.fn();
    const mockTargetRef = { current: document.createElement('div') };

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup the usePDF mock to return our spy function and a dummy targetRef
        vi.mocked(usePDF).mockReturnValue({
            toPDF: mockToPDF,
            targetRef: mockTargetRef,
        });
    });

    it('renders the download button with correct text and icon', () => {
        render(<ExportPDFButton filename="test-document.pdf" contentRef={mockTargetRef} />);

        const button = screen.getByRole('button', { name: /exportar pdf/i });
        expect(button).toBeInTheDocument();

        // Ensure it doesn't trigger unexpectedly on mount
        expect(mockToPDF).not.toHaveBeenCalled();
    });

    it('calls toPDF() from react-to-pdf when clicked', () => {
        render(<ExportPDFButton filename="minhas-notas.pdf" contentRef={mockTargetRef} />);

        const button = screen.getByRole('button', { name: /exportar pdf/i });
        fireEvent.click(button);

        // It should call the hook trigger
        expect(mockToPDF).toHaveBeenCalledTimes(1);
    });

    it('displays loading state correctly if we pass loading props (optional extension)', () => {
        // This validates if we added a visual loading feedback to the component props
        render(<ExportPDFButton filename="test.pdf" contentRef={mockTargetRef} isGenerating={true} />);

        expect(screen.getByText(/gerando\.\.\./i)).toBeInTheDocument();
        const button = screen.getByRole('button');
        expect(button).toBeDisabled();
    });
});
