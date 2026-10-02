import React, { useState } from 'react';
import { X, FolderPlus, Folder } from 'lucide-react';

interface CreateFolderModalProps {
  isOpen: boolean;
  parentFolderName: string;
  onClose: () => void;
  onConfirmCreate: (folderName: string) => Promise<void>;
}

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  isOpen,
  parentFolderName,
  onClose,
  onConfirmCreate,
}) => {
  const [folderName, setFolderName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    setIsSubmitting(true);
    try {
      await onConfirmCreate(folderName.trim());
      setFolderName('');
      onClose();
    } catch (err) {
      console.error('Error creating folder:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <FolderPlus className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-base">
              Criar Nova Pasta
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-2">
              <Folder className="w-3.5 h-3.5 text-amber-500" />
              Local de criação:{' '}
              <strong className="text-slate-700 dark:text-slate-200">{parentFolderName}</strong>
            </span>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Nome da Pasta
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ex: 001 - Contratos 2026, Processo XYZ..."
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
            />
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-300">
            A nova pasta será criada diretamente no Google Drive do escritório com as permissões correspondentes.
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !folderName.trim()}
              className="px-5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? 'Criando no Drive...' : 'Confirmar e Criar Pasta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
