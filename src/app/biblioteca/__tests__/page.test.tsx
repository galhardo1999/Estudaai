import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BibliotecaPage from '../page';
import * as DocumentContext from '@/contexts/DocumentContext';

// Mock the lucide-react icons to avoid SVG rendering issues in simple tests
vi.mock('lucide-react', () => ({
    FolderPlus: () => <div data-testid="icon-folder-plus" />,
    UploadCloud: () => <div data-testid="icon-upload" />,
    Folder: () => <div data-testid="icon-folder" />,
    FileText: () => <div data-testid="icon-file" />,
    Trash2: () => <div data-testid="icon-trash" />,
    ChevronRight: () => <div data-testid="icon-chevron" />,
    Home: () => <div data-testid="icon-home" />,
    Eye: () => <div data-testid="icon-eye" />,
    X: () => <div data-testid="icon-x" />,
    Loader2: () => <div data-testid="icon-loader" />,
    Pencil: () => <div data-testid="icon-pencil" />,
}));

describe('BibliotecaPage Component', () => {

    const mockAddFolder = vi.fn();
    const mockRemoveFolder = vi.fn();
    const mockSetCurrentFolderId = vi.fn();

    const baseContextValue = {
        documents: [],
        folders: [],
        addFolder: mockAddFolder,
        removeFolder: mockRemoveFolder,
        renameFolder: vi.fn(),
        currentFolderId: null,
        setCurrentFolderId: mockSetCurrentFolderId,
        removeDocument: vi.fn(),
        moveDocument: vi.fn(),
        addDocument: vi.fn(),
        isLoading: false,
        activeDocumentId: null,
        setActiveDocumentId: vi.fn(),
        activeDocument: null,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Setup default mock return for useDocuments hook
        vi.spyOn(DocumentContext, 'useDocuments').mockReturnValue(baseContextValue);

        // Mock window.confirm
        global.confirm = vi.fn(() => true);
    });

    it('renders empty state correctly at root level', () => {
        render(<BibliotecaPage />);

        expect(screen.getByText('Biblioteca de Documentos')).toBeInTheDocument();
        expect(screen.getByText('Início')).toBeInTheDocument();
        // Since there are no documents and no folders
        expect(screen.getByText('Nenhum arquivo encontrado')).toBeInTheDocument();
        expect(screen.getByText(/Não há arquivos soltos na raiz/i)).toBeInTheDocument();
    });

    it('renders folders and documents correctly when provided by context', () => {
        const mockFolders = [
            { id: 'folder-1', name: 'Math Classes', parentId: undefined, createdAt: Date.now() },
        ];
        const mockDocs = [
            { id: 'doc-1', name: 'Algebra.pdf', url: '', size: 1024, folderId: undefined, createdAt: Date.now() },
        ];

        vi.spyOn(DocumentContext, 'useDocuments').mockReturnValue({
            ...baseContextValue,
            folders: mockFolders,
            documents: mockDocs,
        });

        render(<BibliotecaPage />);

        // Folders section should be visible
        expect(screen.getByText('Pastas')).toBeInTheDocument();
        expect(screen.getByText('Math Classes')).toBeInTheDocument();
        expect(screen.getByText('0 arquivos')).toBeInTheDocument(); // Doc belongs to root, not folder-1

        // Documents section
        expect(screen.getByText('Arquivos')).toBeInTheDocument();
        expect(screen.getByText('Algebra.pdf')).toBeInTheDocument();
        expect(screen.getByText('1 KB')).toBeInTheDocument(); // 1024 bytes mapped to 1 KB
    });

    it('opens create folder modal and submits form correctly', async () => {
        render(<BibliotecaPage />);

        // Click New Folder button
        const newFolderBtn = screen.getByText('Nova Pasta');
        fireEvent.click(newFolderBtn);

        expect(screen.getByText('Crie uma nova pasta para organizar seus materiais.')).toBeInTheDocument();

        // Find input and type
        const input = screen.getByPlaceholderText('Ex: Concurso Banco do Brasil');
        fireEvent.change(input, { target: { value: 'My New Folder  ' } });

        // Submit
        const submitBtn = screen.getByText('Criar Pasta');
        fireEvent.click(submitBtn);

        expect(mockAddFolder).toHaveBeenCalledTimes(1);
        expect(mockAddFolder).toHaveBeenCalledWith('My New Folder', undefined); // Notice it trims the mapped value
    });

    it('deletes folder when trash button is clicked and confirmed', () => {
        const mockFolders = [
            { id: 'folder-1', name: 'Secret Folder', parentId: undefined, createdAt: Date.now() },
        ];
        vi.spyOn(DocumentContext, 'useDocuments').mockReturnValue({ ...baseContextValue, folders: mockFolders });

        render(<BibliotecaPage />);

        // Need to grab the trash icon container button
        const trashIcons = screen.getAllByTestId('icon-trash');
        // Folder trash icon is the first one since folders render before documents
        const deleteButton = trashIcons[0].closest('button');

        // Because the button has an onClick with `e.stopPropagation()`, we can just fire a click
        if (deleteButton) {
            fireEvent.click(deleteButton);
        }

        expect(global.confirm).toHaveBeenCalled();
        expect(mockRemoveFolder).toHaveBeenCalledWith('folder-1');
    });
});
