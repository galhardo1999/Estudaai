import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ExportPDFButton from '../ExportPDFButton';

// Mock html2canvas-pro
vi.mock('html2canvas-pro', () => ({
    default: vi.fn().mockResolvedValue({
        toDataURL: vi.fn().mockReturnValue('data:image/png;base64,mock'),
        width: 100,
        height: 100,
    })
}));

// Mock jspdf
const mockAddImage = vi.fn();
const mockSave = vi.fn();
vi.mock('jspdf', () => ({
    default: vi.fn().mockImplementation(() => ({
        addImage: mockAddImage,
        save: mockSave,
    }))
}));

describe('ExportPDFButton Component', () => {
    const mockTargetRef = { current: document.createElement('div') };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the download button with correct text and icon', () => {
        render(<ExportPDFButton filename="test-document.pdf" contentRef={mockTargetRef} />);
        const button = screen.getByRole('button', { name: /exportar pdf/i });
        expect(button).toBeInTheDocument();
    });

    it('calls html2canvas and jspdf to export the document', async () => {
        render(<ExportPDFButton filename="minhas-notas.pdf" contentRef={mockTargetRef} />);
        const button = screen.getByRole('button', { name: /exportar pdf/i });
        fireEvent.click(button);

        // Aguarda as importações dinâmicas e o processo assíncrono finalizarem
        await waitFor(() => {
            expect(mockSave).toHaveBeenCalledWith('minhas-notas.pdf');
        });
    });

    it('displays loading state correctly if we pass loading props', () => {
        render(<ExportPDFButton filename="test.pdf" contentRef={mockTargetRef} isGenerating={true} />);
        expect(screen.getByText(/gerando\.\.\./i)).toBeInTheDocument();
        const button = screen.getByRole('button');
        expect(button).toBeDisabled();
    });
});
