import React, { useState, useMemo, useEffect } from 'react';
import { 
  FolderSync, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  FolderPlus, 
  Sparkles, 
  X, 
  Building2, 
  Folder, 
  FileCheck, 
  Tag, 
  HelpCircle,
  Hash,
  Scale
} from 'lucide-react';
import { FolderNode, DriveFile } from '../types/drive';
import { parseCaseFolderName, ParsedCaseFolder } from '../utils/pendingFolderMatcher';
import { ConfirmationModal } from './ConfirmationModal';
import { createFolderInDrive, moveDriveFolderOrFile, DriveContext } from '../services/driveApi';

interface PendingInitialsManagerProps {
  isOpen: boolean;
  onClose: () => void;
  driveContext: DriveContext | null;
  allFolders: FolderNode[];
  accessToken: string;
  onRefreshData: () => Promise<void>;
  showToast: (text: string, type?: 'success' | 'error') => void;
}

export const PendingInitialsManager: React.FC<PendingInitialsManagerProps> = ({
  isOpen,
  onClose,
  driveContext,
  allFolders,
  accessToken,
  onRefreshData,
  showToast,
}) => {
  const [pendingFolders, setPendingFolders] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [protocolNumbers, setProtocolNumbers] = useState<Record<string, string>>({});
  const [customTargets, setCustomTargets] = useState<Record<string, string>>({});

  // New initial form
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newCaseSubject, setNewCaseSubject] = useState('');
  const [newCaseDetail, setNewCaseDetail] = useState('');

  // Confirmation Modal state
  const [confirmMoveData, setConfirmMoveData] = useState<{
    folder: DriveFile;
    targetFolderId: string;
    targetFolderName: string;
    protocolNumber?: string;
  } | null>(null);

  // Flatten folders for destination select
  const flatFolderList = useMemo(() => {
    const list: { id: string; name: string; path: string }[] = [];
    const traverse = (nodes: FolderNode[]) => {
      for (const n of nodes) {
        list.push({ id: n.id, name: n.name, path: n.path });
        if (n.children && n.children.length > 0) traverse(n.children);
      }
    };
    traverse(allFolders);
    return list;
  }, [allFolders]);

  // Find the "Iniciais Pendentes" folder in the tree
  const pendingIntakeFolder = useMemo(() => {
    return flatFolderList.find(f => {
      const n = f.name.toLowerCase();
      return n.includes('iniciais pendentes') || n.includes('inicial pendente') || n.includes('peticoes pendentes');
    });
  }, [flatFolderList]);

  // Load items inside the "Iniciais Pendentes" folder
  const loadPendingItems = async () => {
    if (!pendingIntakeFolder || !accessToken) {
      setPendingFolders([]);
      return;
    }

    setIsLoading(true);
    try {
      const q = encodeURIComponent(
        `'${pendingIntakeFolder.id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
      );
      const url = `https://www.googleapis.com/drive/v3/files?q=${q}&supportsAllDrives=true&includeItemsFromAllDrives=true&fields=files(id,name,mimeType,parents,modifiedTime)&pageSize=100`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      setPendingFolders(data.files || []);
    } catch (err) {
      console.error('Error fetching pending folders:', err);
      showToast('Erro ao carregar pastas de iniciais pendentes.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadPendingItems();
    }
  }, [isOpen, pendingIntakeFolder]);

  // Create the "Iniciais Pendentes" folder if it doesn't exist
  const handleCreateIntakeFolder = async () => {
    if (!driveContext || !accessToken) return;
    setIsLoading(true);
    try {
      await createFolderInDrive(
        accessToken,
        driveContext,
        '00 - Iniciais Pendentes',
        driveContext.rootFolderId
      );
      showToast('Pasta "00 - Iniciais Pendentes" criada no escritório!');
      await onRefreshData();
      await loadPendingItems();
    } catch (err: any) {
      console.error('Error creating Iniciais Pendentes folder:', err);
      showToast('Falha ao criar pasta: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new pending case folder (e.g. "Ruan - Atraso de Voo (Drone)")
  const handleCreateNewCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim() || !newCaseSubject.trim() || !pendingIntakeFolder) return;

    setIsLoading(true);
    try {
      const detailStr = newCaseDetail.trim() ? ` (${newCaseDetail.trim()})` : '';
      const folderName = `${newClientName.trim()} - ${newCaseSubject.trim()}${detailStr}`;

      await createFolderInDrive(
        accessToken,
        driveContext!,
        folderName,
        pendingIntakeFolder.id
      );

      showToast(`Pasta "${folderName}" adicionada em Iniciais Pendentes!`);
      setNewClientName('');
      setNewCaseSubject('');
      setNewCaseDetail('');
      setIsCreatingNew(false);
      await loadPendingItems();
      await onRefreshData();
    } catch (err: any) {
      console.error('Error creating pending case:', err);
      showToast('Erro ao criar pasta: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Prepare and prompt for transfer confirmation
  const handleInitiateTransfer = (folder: DriveFile, parsed: ParsedCaseFolder) => {
    const selectedTargetId = customTargets[folder.id] || parsed.matchedTargetFolder?.id;
    const protocolNum = protocolNumbers[folder.id];

    let targetName = '';
    if (selectedTargetId) {
      const found = flatFolderList.find(f => f.id === selectedTargetId);
      targetName = found ? found.name : parsed.caseTopic;
    } else {
      targetName = parsed.caseTopic;
    }

    setConfirmMoveData({
      folder,
      targetFolderId: selectedTargetId || 'CREATE_NEW',
      targetFolderName: targetName,
      protocolNumber: protocolNum,
    });
  };

  // Execute transfer in Google Drive
  const handleExecuteTransfer = async () => {
    if (!confirmMoveData || !pendingIntakeFolder || !accessToken || !driveContext) return;

    const { folder, targetFolderId, targetFolderName, protocolNumber } = confirmMoveData;
    setIsLoading(true);

    try {
      let finalTargetId = targetFolderId;

      // If destination folder doesn't exist yet, create it inside BARRETO E CAMPOS
      if (targetFolderId === 'CREATE_NEW' || !targetFolderId) {
        const newTargetFolder = await createFolderInDrive(
          accessToken,
          driveContext,
          targetFolderName,
          driveContext.rootFolderId
        );
        finalTargetId = newTargetFolder.id;
      }

      // 1. Move folder from Iniciais Pendentes to target folder in Google Drive
      await moveDriveFolderOrFile(
        accessToken,
        folder.id,
        pendingIntakeFolder.id,
        finalTargetId
      );

      // 2. Tag with "Assinado / Protocolado" and record protocol number
      try {
        const protocolTag = protocolNumber ? `Processo: ${protocolNumber}` : 'Protocolado';
        await fetch(`https://www.googleapis.com/drive/v3/files/${folder.id}?supportsAllDrives=true`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            properties: {
              office_tags: `Assinado / Protocolado,${protocolTag}`,
              office_category: 'Processos Judiciais',
              protocol_number: protocolNumber || '',
              protocol_date: new Date().toISOString(),
            },
          }),
        });
      } catch (e) {
        console.warn('Could not patch Drive properties on move:', e);
      }

      showToast(`Pasta "${folder.name}" transferida com sucesso para "${targetFolderName}" pós-protocolo!`);
      setConfirmMoveData(null);
      await loadPendingItems();
      await onRefreshData();
    } catch (err: any) {
      console.error('Error transferring folder:', err);
      showToast('Falha na transferência da pasta: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <FolderSync className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-slate-900 dark:text-white text-base">
                  Fluxo de Iniciais Pendentes & Transferência Pós-Protocolo
                </h2>
                <span className="text-[10px] bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                  Automação
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Identifica pastas em "Iniciais Pendentes" e transfere para a pasta devida após o protocolo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Missing Intake Folder Notice */}
          {!pendingIntakeFolder ? (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-5 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                Pasta "Iniciais Pendentes" não encontrada em BARRETO E CAMPOS
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                Para ativar a identificação e transferência automática de processos protocolados, crie a pasta de triagem oficial.
              </p>
              <button
                onClick={handleCreateIntakeFolder}
                disabled={isLoading}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                {isLoading ? 'Criando pasta...' : 'Criar Pasta "00 - Iniciais Pendentes" Agora'}
              </button>
            </div>
          ) : (
            <>
              {/* Intake Status & Quick Actions Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-slate-600 dark:text-slate-300">
                    Pasta de Triagem:{' '}
                    <strong className="text-slate-900 dark:text-white">{pendingIntakeFolder.name}</strong>
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-amber-700 dark:text-amber-300 font-semibold">
                    {pendingFolders.length} {pendingFolders.length === 1 ? 'caso aguardando protocolo' : 'casos aguardando protocolo'}
                  </span>
                </div>

                <button
                  onClick={() => setIsCreatingNew(!isCreatingNew)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium shadow-xs transition-colors self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Nova Inicial Pendente</span>
                </button>
              </div>

              {/* Form to create a new pending case */}
              {isCreatingNew && (
                <form
                  onSubmit={handleCreateNewCase}
                  className="p-4 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/80 rounded-xl space-y-3 animate-in fade-in duration-150"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                      <FolderPlus className="w-4 h-4 text-amber-600" />
                      Cadastrar Novo Processo em "Iniciais Pendentes"
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsCreatingNew(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Nome do Cliente *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Ruan"
                        value={newClientName}
                        onChange={(e) => setNewClientName(e.target.value)}
                        className="w-full text-xs p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Assunto / Ação *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Atraso de Voo, Trabalhista..."
                        value={newCaseSubject}
                        onChange={(e) => setNewCaseSubject(e.target.value)}
                        className="w-full text-xs p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Detalhes / Observação (opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Drone, Voo 123..."
                        value={newCaseDetail}
                        onChange={(e) => setNewCaseDetail(e.target.value)}
                        className="w-full text-xs p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-500 italic">
                      A pasta será criada como:{' '}
                      <strong className="text-slate-700 dark:text-slate-300">
                        {newClientName || 'Cliente'} - {newCaseSubject || 'Assunto'}{newCaseDetail ? ` (${newCaseDetail})` : ''}
                      </strong>
                    </span>

                    <button
                      type="submit"
                      disabled={isLoading || !newClientName.trim() || !newCaseSubject.trim()}
                      className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50"
                    >
                      Salvar Pasta Pendente
                    </button>
                  </div>
                </form>
              )}

              {/* Pending Items List */}
              {isLoading ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  <div className="w-7 h-7 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <span>Carregando pastas de iniciais pendentes...</span>
                </div>
              ) : pendingFolders.length === 0 ? (
                <div className="p-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                    Nenhuma inicial pendente no momento!
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                    Todas as pastas de iniciais foram protocoladas e transferidas para suas respectivas áreas devidas.
                  </p>
                  <button
                    onClick={() => setIsCreatingNew(true)}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                  >
                    + Criar Pasta de Teste (ex: Ruan - Atraso de Voo)
                  </button>
                </div>
              ) : (
                <div className="space-y-3.5">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Pastas Identificadas para Transferência Pós-Protocolo:
                  </div>

                  {pendingFolders.map((folder) => {
                    const parsed = parseCaseFolderName(folder.id, folder.name, allFolders);
                    const selectedTargetId = customTargets[folder.id] ?? (parsed.matchedTargetFolder?.id || '');
                    const isTargetMatched = Boolean(parsed.matchedTargetFolder);

                    return (
                      <div
                        key={folder.id}
                        className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs hover:border-amber-500/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        {/* Folder Info */}
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Folder className="w-4 h-4 text-amber-500 shrink-0" />
                            <h4 className="font-semibold text-slate-900 dark:text-white text-sm truncate" title={folder.name}>
                              {folder.name}
                            </h4>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 font-semibold border border-red-500/20">
                              Inicial Pendente
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                            <span>Cliente: <strong className="text-slate-700 dark:text-slate-200">{parsed.clientName}</strong></span>
                            <span>•</span>
                            <span>Assunto Identificado: <strong className="text-amber-600 dark:text-amber-400">{parsed.caseTopic}</strong></span>
                            {parsed.details && (
                              <>
                                <span>•</span>
                                <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                                  {parsed.details}
                                </span>
                              </>
                            )}
                          </div>

                          {/* Protocol Number Input Field */}
                          <div className="pt-1.5 flex items-center gap-2 max-w-sm">
                            <span className="text-[11px] text-slate-400 flex items-center gap-1 shrink-0">
                              <Hash className="w-3.5 h-3.5 text-slate-400" />
                              Nº Processo / Protocolo:
                            </span>
                            <input
                              type="text"
                              placeholder="Ex: 8001234-56.2026.8.05.0001"
                              value={protocolNumbers[folder.id] || ''}
                              onChange={(e) =>
                                setProtocolNumbers((prev) => ({ ...prev, [folder.id]: e.target.value }))
                              }
                              className="text-xs px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-100 w-full focus:ring-1 focus:ring-amber-500"
                            />
                          </div>
                        </div>

                        {/* Destination & Action */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
                          {/* Target Folder Selector */}
                          <div className="flex flex-col">
                            <label className="text-[10px] text-slate-400 mb-1 flex items-center gap-1">
                              <ArrowRight className="w-3 h-3 text-amber-500" />
                              <span>Pasta Destino:</span>
                              {isTargetMatched && (
                                <span className="text-emerald-600 font-semibold ml-1">
                                  (Sugerida automaticamente)
                                </span>
                              )}
                            </label>
                            <select
                              value={selectedTargetId}
                              onChange={(e) =>
                                setCustomTargets((prev) => ({ ...prev, [folder.id]: e.target.value }))
                              }
                              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-800 dark:text-slate-100 max-w-[220px] focus:ring-1 focus:ring-amber-500"
                            >
                              {parsed.matchedTargetFolder ? (
                                <option value={parsed.matchedTargetFolder.id}>
                                  ⭐ {parsed.matchedTargetFolder.name} (Correspondência)
                                </option>
                              ) : (
                                <option value="CREATE_NEW">
                                  ➕ Criar pasta "{parsed.caseTopic}"
                                </option>
                              )}

                              <optgroup label="Todas as Pastas do Escritório">
                                {flatFolderList
                                  .filter(f => f.id !== pendingIntakeFolder.id)
                                  .map((f) => (
                                    <option key={f.id} value={f.id}>
                                      {f.name}
                                    </option>
                                  ))}
                              </optgroup>
                            </select>
                          </div>

                          {/* Transfer Button */}
                          <div className="flex items-end">
                            <button
                              onClick={() => handleInitiateTransfer(folder, parsed)}
                              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer w-full sm:w-auto"
                              title="Transferir pasta para o destino pós-protocolo"
                            >
                              <FileCheck className="w-4 h-4" />
                              <span>Transferir Pós-Protocolo</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Scale className="w-4 h-4 text-amber-500" />
            <span>Fluxo de trabalho específico do escritório BARRETO E CAMPOS</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Mutating Action (Required by Workspace Integration Rules) */}
      <ConfirmationModal
        isOpen={!!confirmMoveData}
        title="Confirmar Transferência Pós-Protocolo"
        message={`Deseja transferir a pasta "${confirmMoveData?.folder.name}" da pasta "${pendingIntakeFolder?.name}" para a pasta "${confirmMoveData?.targetFolderName}"?\n\nA pasta será movida diretamente no Google Drive e etiquetada como "Assinado / Protocolado"${
          confirmMoveData?.protocolNumber ? ` com o número de processo ${confirmMoveData.protocolNumber}` : ''
        }.`}
        confirmLabel="Confirmar e Transferir Pasta"
        cancelLabel="Cancelar"
        isDestructive={false}
        onConfirm={handleExecuteTransfer}
        onCancel={() => setConfirmMoveData(null)}
      />
    </div>
  );
};
