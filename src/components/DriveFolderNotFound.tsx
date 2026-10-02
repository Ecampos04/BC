import React, { useState } from 'react';
import { FolderLock, FolderPlus, RotateCw, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { TARGET_FOLDER_NAME } from '../services/driveApi';

interface DriveFolderNotFoundProps {
  onCheckAgain: () => void;
  onCreateRootFolder: () => Promise<void>;
  isChecking: boolean;
}

export const DriveFolderNotFound: React.FC<DriveFolderNotFoundProps> = ({
  onCheckAgain,
  onCreateRootFolder,
  isChecking,
}) => {
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      await onCreateRootFolder();
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto my-12 p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center mb-5">
        <FolderLock className="w-8 h-8" />
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-semibold border border-amber-200 dark:border-amber-800 mb-3">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>Escopo Estritamente Restrito</span>
      </div>

      <h2 className="text-xl sm:text-2xl font-serif font-bold text-slate-900 dark:text-white mb-2">
        Pasta "{TARGET_FOLDER_NAME}" não localizada
      </h2>

      <p className="text-sm text-slate-600 dark:text-slate-300 max-w-lg mx-auto mb-6 leading-relaxed">
        Este aplicativo opera <strong>exclusivamente</strong> dentro da pasta ou drive corporativo{' '}
        <span className="text-amber-600 dark:text-amber-400 font-semibold">{TARGET_FOLDER_NAME}</span>{' '}
        do seu escritório. Nenhum arquivo ou pasta externo ao escritório é acessado.
      </p>

      <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-xs text-left text-slate-600 dark:text-slate-300 mb-8 space-y-2 max-w-md mx-auto">
        <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>Ao criar a pasta do escritório, configuramos automaticamente:</span>
        </div>
        <ul className="list-disc list-inside space-y-1 pl-1 text-slate-500 dark:text-slate-400">
          <li>Diretório raiz oficial <strong>{TARGET_FOLDER_NAME}</strong></li>
          <li>Subpastas para <em>Processos</em>, <em>Contratos</em>, <em>Societário</em> e <em>Clientes</em></li>
          <li>Filtro e buscador restritos aos arquivos do escritório</li>
        </ul>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={handleCreate}
          disabled={isCreating || isChecking}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-md transition-colors disabled:opacity-50 cursor-pointer"
        >
          <FolderPlus className="w-4 h-4" />
          <span>{isCreating ? 'Criando pasta no Drive...' : `Criar Pasta "${TARGET_FOLDER_NAME}" Agora`}</span>
        </button>

        <button
          onClick={onCheckAgain}
          disabled={isChecking || isCreating}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl transition-colors disabled:opacity-50"
        >
          <RotateCw className={`w-4 h-4 ${isChecking ? 'animate-spin text-amber-500' : ''}`} />
          <span>Verificar Novamente</span>
        </button>
      </div>
    </div>
  );
};
