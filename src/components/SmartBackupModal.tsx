import React, { useState, useMemo } from 'react';
import { 
  FolderSync, 
  ArrowRight, 
  CheckCircle2, 
  FileQuestion, 
  X, 
  FolderPlus, 
  Eye, 
  Layers, 
  Folder, 
  Sparkles,
  Trash2,
  Tag as TagIcon,
  Search,
  Filter,
  RefreshCw,
  FolderCheck,
  Building2,
  FileText,
  AlertCircle
} from 'lucide-react';
import { DriveFile, FolderNode, CustomCategory } from '../types/drive';
import { formatDate, formatFileSize, getMimeTypeLabel } from '../utils/formatters';
import { ConfirmationModal } from './ConfirmationModal';
import { 
  createFolderInDrive, 
  moveFileOrFolderToDestination, 
  updateFileTagsAndCategory, 
  DriveContext 
} from '../services/driveApi';

interface SmartBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: DriveFile[];
  allFolders: FolderNode[];
  driveContext: DriveContext | null;
  categories: CustomCategory[];
  accessToken: string;
  onRefreshData: () => Promise<void>;
  showToast: (text: string, type?: 'success' | 'error') => void;
  onPreviewFile: (file: DriveFile) => void;
}

export const SmartBackupModal: React.FC<SmartBackupModalProps> = ({
  isOpen,
  onClose,
  files,
  allFolders,
  driveContext,
  categories,
  accessToken,
  onRefreshData,
  showToast,
  onPreviewFile,
}) => {
  const [activeTab, setActiveTab] = useState<'move' | 'clean_tags'>('move');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmBulk, setShowConfirmBulk] = useState(false);
  const [showConfirmClearTags, setShowConfirmClearTags] = useState(false);
  const [singleMoveTarget, setSingleMoveTarget] = useState<{ file: DriveFile; targetFolderId: string; targetFolderName: string } | null>(null);
  const [customFolderSelections, setCustomFolderSelections] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');

  // Flatten all folders for dropdown selection and matching
  const flatFolders = useMemo(() => {
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

  // Map folder id to folder name
  const folderMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of flatFolders) {
      map.set(f.id, f.name);
    }
    if (driveContext?.rootFolderId) {
      map.set(driveContext.rootFolderId, driveContext.driveName || 'BARRETO E CAMPOS (Raiz)');
    }
    return map;
  }, [flatFolders, driveContext]);

  // Helper to normalize strings for comparison
  const normalize = (str: string) => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  };

  // Smart folder matching logic for each file
  const findBestTargetFolder = (file: DriveFile): { folderId: string; folderName: string; reason: string } => {
    const normFileName = normalize(file.name);

    // 1. Check if file name matches a specific client/case folder in the tree
    for (const folder of flatFolders) {
      const normFolderName = normalize(folder.name);
      if (normFolderName.length > 4 && (normFileName.includes(normFolderName) || normFolderName.includes(normFileName.replace(/\.[^/.]+$/, '')))) {
        return {
          folderId: folder.id,
          folderName: folder.name,
          reason: `Correspondência direta com a pasta "${folder.name}"`,
        };
      }
    }

    // 2. Extract potential client name (e.g., "Ruan - Peticao Inicial" or "Silva & Santos Contrato")
    for (const folder of flatFolders) {
      const parts = folder.name.split(/[-:]/);
      if (parts.length > 1) {
        const clientPart = normalize(parts[0]);
        if (clientPart.length > 3 && normFileName.includes(clientPart)) {
          return {
            folderId: folder.id,
            folderName: folder.name,
            reason: `Cliente correspondente: ${parts[0].trim()}`,
          };
        }
      }
    }

    // 3. Match by Legal Matter / Subject Keywords to established firm folders
    const legalKeywords: { keywords: string[]; targetFolderNames: string[] }[] = [
      {
        keywords: ['contrato', 'minuta', 'acordo', 'distrato', 'locacao', 'locação', 'comodato'],
        targetFolderNames: ['Contratos & Minutas', 'Contratos', '01 - Contratos'],
      },
      {
        keywords: ['peticao', 'petição', 'inicial', 'recurso', 'contestacao', 'contestação', 'processo', 'agravo', 'sentenca', 'sentença', 'despacho', 'laudo'],
        targetFolderNames: ['Processos Judiciais', 'Processos', '02 - Processos Judiciais'],
      },
      {
        keywords: ['darf', 'tribut', 'fiscal', 'imposto', 'das', 'receita', 'simples nacional', 'nfe', 'danfe', 'pis', 'cofins'],
        targetFolderNames: ['Tributário & Fiscal', 'Tributário', '03 - Tributário & Fiscal'],
      },
      {
        keywords: ['trabalh', 'rescis', 'rescisao', 'clt', 'holerite', 'fgts', 'inss', 'demissao', 'admissao'],
        targetFolderNames: ['Trabalhista & RH', 'Trabalhista', '04 - Trabalhista & RH'],
      },
      {
        keywords: ['societ', 'estatuto', 'ata', 'sociedade', 'alteracao contratual', 'junta comercial'],
        targetFolderNames: ['Societário & Atas', 'Societário', '05 - Societário & Atas'],
      },
      {
        keywords: ['recibo', 'honorario', 'honorário', 'custas', 'comprovante', 'despesa', 'pagamento', 'deposito'],
        targetFolderNames: ['Financeiro & Custas', 'Financeiro', '06 - Financeiro & Custas'],
      },
      {
        keywords: ['procuracao', 'procuração', 'rg', 'cpf', 'cnh', 'documento cliente', 'residencia', 'comprovante'],
        targetFolderNames: ['Clientes & Cadastros', 'Clientes', '07 - Clientes & Cadastros'],
      },
      {
        keywords: ['modelo', 'padrao', 'template', 'formulario'],
        targetFolderNames: ['Modelos de Peças', 'Modelos', '08 - Modelos'],
      }
    ];

    for (const group of legalKeywords) {
      if (group.keywords.some(k => normFileName.includes(k))) {
        // Try finding one of the preferred folders in flatFolders
        for (const targetName of group.targetFolderNames) {
          const match = flatFolders.find(f => normalize(f.name).includes(normalize(targetName)));
          if (match) {
            return {
              folderId: match.id,
              folderName: match.name,
              reason: `Assunto identificado: ${group.keywords.find(k => normFileName.includes(k))}`,
            };
          }
        }
      }
    }

    // 4. Default: first non-root folder or general Administrative folder
    const adminFolder = flatFolders.find(f => normalize(f.name).includes('administrativo') || normalize(f.name).includes('geral'));
    if (adminFolder) {
      return {
        folderId: adminFolder.id,
        folderName: adminFolder.name,
        reason: 'Pasta administrativa padrão',
      };
    }

    if (flatFolders.length > 0) {
      return {
        folderId: flatFolders[0].id,
        folderName: flatFolders[0].name,
        reason: 'Pasta do escritório',
      };
    }

    return {
      folderId: driveContext?.rootFolderId || '',
      folderName: driveContext?.driveName || 'BARRETO E CAMPOS',
      reason: 'Raiz do escritório',
    };
  };

  // Candidate files that should be placed in the correct folders:
  // Files loose at root of BARRETO E CAMPOS, or in a generic folder, or all non-folder files
  const filesNeedingOrganization = useMemo(() => {
    return files.filter(f => {
      if (f.isFolder) return false;

      // If at root of BARRETO E CAMPOS
      const isAtRoot = f.parents?.includes(driveContext?.rootFolderId || '');
      
      // If in a generic "revisão" folder
      const parentName = f.parents?.[0] ? folderMap.get(f.parents[0]) || '' : '';
      const isInRevisao = parentName.toLowerCase().includes('revisao') || parentName.toLowerCase().includes('revisão');

      // Or files with no category or loose
      return isAtRoot || isInRevisao || !f.category;
    });
  }, [files, driveContext, folderMap]);

  // Files with messy tags that the user wants to clean up
  const filesWithTags = useMemo(() => {
    return files.filter(f => !f.isFolder && f.tags && f.tags.length > 0);
  }, [files]);

  // Filtered files for search
  const displayedFiles = useMemo(() => {
    if (!searchTerm.trim()) return filesNeedingOrganization;
    const term = normalize(searchTerm);
    return filesNeedingOrganization.filter(f => normalize(f.name).includes(term));
  }, [filesNeedingOrganization, searchTerm]);

  // Move a single file to its correct destination folder (WITHOUT creating messy tags)
  const handleExecuteSingleMove = async () => {
    if (!singleMoveTarget || !accessToken) return;

    setIsProcessing(true);
    const { file, targetFolderId, targetFolderName } = singleMoveTarget;
    setSingleMoveTarget(null);

    try {
      const oldParent = file.parents && file.parents.length > 0 ? file.parents[0] : null;
      await moveFileOrFolderToDestination(accessToken, file.id, targetFolderId, oldParent);

      showToast(`Arquivo "${file.name}" movido com sucesso para a pasta "${targetFolderName}"!`);
      await onRefreshData();
    } catch (err: any) {
      console.error('Error moving file:', err);
      showToast('Falha ao mover arquivo: ' + err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Bulk move files to their designated target folders (WITHOUT creating messy tags)
  const handleExecuteBulkMove = async () => {
    if (filesNeedingOrganization.length === 0 || !accessToken) return;

    setIsProcessing(true);
    setShowConfirmBulk(false);

    try {
      let successCount = 0;
      for (const file of filesNeedingOrganization) {
        try {
          const customTarget = customFolderSelections[file.id];
          const bestTarget = findBestTargetFolder(file);
          const targetFolderId = customTarget || bestTarget.folderId;

          if (targetFolderId) {
            const oldParent = file.parents && file.parents.length > 0 ? file.parents[0] : null;
            // Only move if target is different from current parent
            if (oldParent !== targetFolderId) {
              await moveFileOrFolderToDestination(accessToken, file.id, targetFolderId, oldParent);
              successCount++;
            }
          }
        } catch (itemErr) {
          console.warn(`Could not move file ${file.name}:`, itemErr);
        }
      }

      showToast(`${successCount} arquivos organizados e movidos para suas respectivas pastas corretas com sucesso!`);
      await onRefreshData();
    } catch (err: any) {
      console.error('Error in bulk move:', err);
      showToast('Erro ao organizar arquivos: ' + err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Clean / remove all tags from a specific file
  const handleClearTagsFromFile = async (file: DriveFile) => {
    if (!accessToken) return;
    setIsProcessing(true);
    try {
      await updateFileTagsAndCategory(accessToken, file.id, file.category || '', []);
      showToast(`Etiquetas removidas do arquivo "${file.name}".`);
      await onRefreshData();
    } catch (err: any) {
      showToast('Erro ao remover etiquetas: ' + err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Bulk clean / remove all tags from files that have tags
  const handleExecuteBulkClearTags = async () => {
    if (filesWithTags.length === 0 || !accessToken) return;

    setIsProcessing(true);
    setShowConfirmClearTags(false);
    try {
      let count = 0;
      for (const file of filesWithTags) {
        try {
          await updateFileTagsAndCategory(accessToken, file.id, file.category || '', []);
          count++;
        } catch (e) {
          console.warn(`Failed clearing tags for ${file.name}:`, e);
        }
      }
      showToast(`${count} arquivos limpos! Todas as etiquetas indesejadas foram removidas.`);
      await onRefreshData();
    } catch (err: any) {
      showToast('Erro ao limpar etiquetas: ' + err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-5xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header - Vinho Claro brand identity */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-amber-50/60 dark:bg-amber-950/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-600 text-white shadow-md shadow-amber-900/20">
              <FolderCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-slate-900 dark:text-white text-base">
                  Organizador & Backup para Pastas Corretas
                </h2>
                <span className="text-[11px] bg-amber-600/15 text-amber-800 dark:text-amber-200 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                  Organização Oficial
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Move os documentos diretamente para suas pastas devidas no Google Drive sem poluir com etiquetas
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 gap-4">
          <button
            onClick={() => setActiveTab('move')}
            className={`py-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'move'
                ? 'border-amber-600 text-amber-800 dark:text-amber-200'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <FolderSync className="w-4 h-4" />
            <span>Mover para as Pastas Corretas ({filesNeedingOrganization.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('clean_tags')}
            className={`py-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'clean_tags'
                ? 'border-amber-600 text-amber-800 dark:text-amber-200'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
            title="Remover etiquetas desnecessárias que foram colocadas nos arquivos"
          >
            <Trash2 className="w-4 h-4" />
            <span>Limpar Etiquetas Indesejadas ({filesWithTags.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'move' ? (
            <>
              {/* Status & Bulk Action Card */}
              <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${filesNeedingOrganization.length > 0 ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-emerald-500/20 text-emerald-500'}`}>
                    {filesNeedingOrganization.length > 0 ? <FolderSync className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                      {filesNeedingOrganization.length > 0
                        ? `${filesNeedingOrganization.length} arquivos aguardando direcionamento para suas pastas corretas`
                        : 'Tudo em ordem! Todos os arquivos já estão alocados em suas respectivas pastas'}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {filesNeedingOrganization.length > 0
                        ? 'O sistema analisou os nomes dos arquivos e cruzou com os clientes, processos e matérias das pastas do escritório.'
                        : 'O drive BARRETO E CAMPOS está com todas as peças e documentos devidamente arquivados.'}
                    </p>
                  </div>
                </div>

                {filesNeedingOrganization.length > 0 && (
                  <button
                    onClick={() => setShowConfirmBulk(true)}
                    disabled={isProcessing}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors whitespace-nowrap self-start sm:self-auto disabled:opacity-50 cursor-pointer"
                  >
                    <FolderCheck className="w-4 h-4" />
                    <span>Mover Todos para Pastas Corretas ({filesNeedingOrganization.length})</span>
                  </button>
                )}
              </div>

              {/* Search input if files list is large */}
              {filesNeedingOrganization.length > 4 && (
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Filtrar arquivos por nome..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                  />
                </div>
              )}

              {/* List of files needing correct folder assignment */}
              {displayedFiles.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <span>Arquivo & Local Atual</span>
                    <span>Destino Correto no Drive</span>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-850">
                    {displayedFiles.map((file) => {
                      const bestTarget = findBestTargetFolder(file);
                      const selectedTargetId = customFolderSelections[file.id] || bestTarget.folderId;
                      const selectedTargetName = flatFolders.find(f => f.id === selectedTargetId)?.name || bestTarget.folderName;

                      const currentParentId = file.parents?.[0];
                      const currentParentName = currentParentId ? folderMap.get(currentParentId) || 'Pasta Raiz' : 'Pasta Raiz';

                      return (
                        <div
                          key={file.id}
                          className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                        >
                          {/* File metadata & current location */}
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 shrink-0 mt-0.5">
                              <FileText className="w-4 h-4" />
                            </div>

                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 dark:text-slate-100 truncate" title={file.name}>
                                {file.name}
                              </div>

                              <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                <span>{getMimeTypeLabel(file.mimeType)}</span>
                                <span>•</span>
                                <span>{formatFileSize(file.size)}</span>
                                <span>•</span>
                                <span>Modificado: {formatDate(file.modifiedTime)}</span>
                              </div>

                              <div className="flex items-center gap-2 mt-1.5 text-[11px]">
                                <span className="text-slate-400">Local Atual:</span>
                                <span className="inline-flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                  <Folder className="w-3 h-3 text-slate-400" />
                                  {currentParentName}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Target folder selection & move action */}
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold mb-1 flex items-center gap-1">
                                <ArrowRight className="w-3 h-3 text-amber-600" />
                                <span>Pasta Correta:</span>
                                <span className="text-[10px] font-normal text-slate-400">({bestTarget.reason})</span>
                              </span>

                              <select
                                value={selectedTargetId}
                                onChange={(e) =>
                                  setCustomFolderSelections((prev) => ({ ...prev, [file.id]: e.target.value }))
                                }
                                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-800 dark:text-slate-100 max-w-[240px] focus:ring-1 focus:ring-amber-500 font-medium"
                              >
                                {bestTarget.folderId && (
                                  <option value={bestTarget.folderId}>
                                    ⭐ {bestTarget.folderName} (Sugerida)
                                  </option>
                                )}

                                <optgroup label="Todas as Pastas do Escritório">
                                  {flatFolders
                                    .filter(f => f.id !== bestTarget.folderId)
                                    .map((f) => (
                                      <option key={f.id} value={f.id}>
                                        {f.name}
                                      </option>
                                    ))}
                                </optgroup>
                              </select>
                            </div>

                            <div className="flex items-center gap-1.5 self-end sm:self-center">
                              <button
                                onClick={() => onPreviewFile(file)}
                                className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                title="Visualizar documento"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => setSingleMoveTarget({
                                  file,
                                  targetFolderId: selectedTargetId,
                                  targetFolderName: selectedTargetName,
                                })}
                                disabled={isProcessing}
                                className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors cursor-pointer shadow-xs"
                                title={`Mover diretamente para a pasta "${selectedTargetName}"`}
                              >
                                <FolderCheck className="w-3.5 h-3.5" />
                                <span>Mover p/ Pasta</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center space-y-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                    Nenhum documento fora de lugar
                  </h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Todos os arquivos do escritório estão em suas pastas corretas. Novos arquivos soltos aparecerão automaticamente aqui para direcionamento.
                  </p>
                </div>
              )}
            </>
          ) : (
            /* TAB 2: CLEAN MESSY TAGS */
            <div className="space-y-4">
              <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-600 text-white">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                      Limpeza de Etiquetas Bagunçadas ({filesWithTags.length} arquivos com etiquetas)
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Remove etiquetas indesejadas (como "Aguardando Revisão" ou tags genéricas) restaurando os documentos para um estado limpo.
                    </p>
                  </div>
                </div>

                {filesWithTags.length > 0 && (
                  <button
                    onClick={() => setShowConfirmClearTags(true)}
                    disabled={isProcessing}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors whitespace-nowrap self-start sm:self-auto disabled:opacity-50 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Remover Todas as Etiquetas ({filesWithTags.length})</span>
                  </button>
                )}
              </div>

              {filesWithTags.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-850">
                  {filesWithTags.map((file) => (
                    <div
                      key={file.id}
                      className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={file.name}>
                          {file.name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className="text-[10px] text-slate-400">Etiquetas atuais:</span>
                          {file.tags?.map((t, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[10px] border border-slate-200 dark:border-slate-700"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => handleClearTagsFromFile(file)}
                        disabled={isProcessing}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 dark:bg-slate-800 dark:hover:bg-red-950/40 dark:text-slate-300 dark:hover:text-red-300 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                        title="Limpar etiquetas deste arquivo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Limpar</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center space-y-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                    Nenhuma etiqueta bagunçando seus arquivos
                  </h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Seus arquivos estão limpos e sem poluição de etiquetas desnecessárias.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Preserva a estrutura organizada de pastas do escritório BARRETO E CAMPOS</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Bulk Move */}
      <ConfirmationModal
        isOpen={showConfirmBulk}
        title="Confirmar Movimentação para Pastas Corretas"
        message={`Deseja mover todos os ${filesNeedingOrganization.length} arquivos diretamente para suas respectivas pastas corretas no Google Drive?\n\nEles serão organizados nas pastas devidas sem a criação de etiquetas indesejadas.`}
        confirmLabel={`Mover ${filesNeedingOrganization.length} Arquivos`}
        cancelLabel="Cancelar"
        isDestructive={false}
        onConfirm={handleExecuteBulkMove}
        onCancel={() => setShowConfirmBulk(false)}
      />

      {/* Confirmation Modal for Single Move */}
      <ConfirmationModal
        isOpen={!!singleMoveTarget}
        title="Mover Arquivo para Pasta Correta"
        message={`Deseja mover o arquivo "${singleMoveTarget?.file.name}" diretamente para a pasta "${singleMoveTarget?.targetFolderName}"?`}
        confirmLabel="Confirmar e Mover"
        cancelLabel="Cancelar"
        isDestructive={false}
        onConfirm={handleExecuteSingleMove}
        onCancel={() => setSingleMoveTarget(null)}
      />

      {/* Confirmation Modal for Bulk Clear Tags */}
      <ConfirmationModal
        isOpen={showConfirmClearTags}
        title="Remover Etiquetas Indesejadas"
        message={`Deseja remover todas as etiquetas de ${filesWithTags.length} arquivos?\n\nOs arquivos permanecerão intactos em suas pastas, apenas as etiquetas que estavam bagunçando serão limpas.`}
        confirmLabel="Limpar Todas as Etiquetas"
        cancelLabel="Cancelar"
        isDestructive={true}
        onConfirm={handleExecuteBulkClearTags}
        onCancel={() => setShowConfirmClearTags(false)}
      />
    </div>
  );
};
