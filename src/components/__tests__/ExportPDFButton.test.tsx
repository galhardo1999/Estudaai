import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ExportPDFButton from '../ExportPDFButton';
import { usePDF } from 'react-to-pdf';

// Mocka o hook da biblioteca react-to-pdf
vi.mock('react-to-pdf', () => ({
    usePDF: vi.fn(),
}));

describe('ExportPDFButton Component', () => {

    const mockToPDF = vi.fn();
    const mockTargetRef = { current: document.createElement('div') };

    beforeEach(() => {
        vi.clearAllMocks();

        // Configura o mock do usePDF para retornar nossa função spy e um targetRef falso
        vi.mocked(usePDF).mockReturnValue({
            toPDF: mockToPDF,
            targetRef: mockTargetRef,
        });
    });

    it('renders the download button with correct text and icon', () => {
        render(<ExportPDFButton filename="test-document.pdf" contentRef={mockTargetRef} />);

        const button = screen.getByRole('button', { name: /exportar pdf/i });
        expect(button).toBeInTheDocument();

        // Garante que não dispara inesperadamente na montagem
        expect(mockToPDF).not.toHaveBeenCalled();
    });

    it('calls toPDF() from react-to-pdf when clicked', () => {
        render(<ExportPDFButton filename="minhas-notas.pdf" contentRef={mockTargetRef} />);

        const button = screen.getByRole('button', { name: /exportar pdf/i });
        fireEvent.click(button);

        // Deve chamar o gatilho do hook
        expect(mockToPDF).toHaveBeenCalledTimes(1);
    });

    it('displays loading state correctly if we pass loading props (optional extension)', () => {
        // Valida se adicionamos um feedback visual de carregamento nas props do componente
        render(<ExportPDFButton filename="test.pdf" contentRef={mockTargetRef} isGenerating={true} />);

        expect(screen.getByText(/gerando\.\.\./i)).toBeInTheDocument();
        const button = screen.getByRole('button');
        expect(button).toBeDisabled();
    });
});
