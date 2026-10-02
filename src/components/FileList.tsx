import React, { useState } from 'react';
import { 
  Folder, 
  FileText, 
  ExternalLink, 
  Eye, 
  Tag as TagIcon, 
  LayoutGrid, 
  List as ListIcon, 
  ArrowUpDown, 
  Calendar, 
  HardDrive,
  FileSpreadsheet,
  Presentation,
  Image as ImageIcon,
  ChevronRight,
  MoreVertical,
  Files
} from 'lucide-react';
import { DriveFile, CustomCategory } from '../types/drive';
import { formatDate, formatFileSize, getMimeTypeLabel } from '../utils/formatters';

interface FileListProps {
  files: DriveFile[];
  isLoading: boolean;
  onSelectFolder: (folderId: string, folderName: string) => void;
  onPreviewFile: (file: DriveFile) => void;
  onEditTags: (file: DriveFile) => void;
  categories: CustomCategory[];
  currentFolderName?: string;
  sortBy: 'name' | 'modifiedTime' | 'size';
  sortOrder: 'asc' | 'desc';
  onSortChange: (sortBy: 'name' | 'modifiedTime' | 'size') => void;
}

export const FileList: React.FC<FileListProps> = ({
  files,
  isLoading,
  onSelectFolder,
  onPreviewFile,
  onEditTags,
  categories,
  currentFolderName,
  sortBy,
  sortOrder,
  onSortChange,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  const getFileIcon = (mimeType: string, isFolder: boolean) => {
    if (isFolder) return <Folder className="w-5 h-5 text-amber-500 fill-amber-500/20 shrink-0" />;
    if (mimeType.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-emerald-500 shrink-0" />;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <FileSpreadsheet className="w-5 h-5 text-green-600 shrink-0" />;
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return <Presentation className="w-5 h-5 text-orange-500 shrink-0" />;
    if (mimeType === 'application/pdf') return <FileText className="w-5 h-5 text-red-500 shrink-0" />;
    return <FileText className="w-5 h-5 text-blue-500 shrink-0" />;
  };

  const folders = files.filter((f) => f.isFolder);
  const regularFiles = files.filter((f) => !f.isFolder);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden flex flex-col flex-1 min-h-[500px]">
      {/* List Toolbar */}
      <div className="flex flex-wrap items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850 gap-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {files.length} {files.length === 1 ? 'item' : 'itens'} encontrados
          </span>
          <span className="text-slate-400">•</span>
          <span className="text-slate-500">
            {folders.length} pastas, {regularFiles.length} arquivos
          </span>
        </div>

        {/* View mode toggle & sorting */}
        <div className="flex items-center gap-2">
          {/* Sorting Buttons */}
          <div className="hidden sm:flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => onSortChange('name')}
              className={`px-2 py-1 rounded-md transition-colors ${
                sortBy === 'name' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Nome {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => onSortChange('modifiedTime')}
              className={`px-2 py-1 rounded-md transition-colors ${
                sortBy === 'modifiedTime' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Data {sortBy === 'modifiedTime' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => onSortChange('size')}
              className={`px-2 py-1 rounded-md transition-colors ${
                sortBy === 'size' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Tamanho {sortBy === 'size' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
          </div>

          {/* Grid/Table Switcher */}
          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'table' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
              title="Exibição em Tabela"
            >
              <ListIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'grid' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
              title="Exibição em Grade de Cards"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
            <span className="text-xs font-medium">Buscando pastas e arquivos no Drive Barreto e Campos...</span>
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 px-4 text-center">
            <Files className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3 stroke-[1.2]" />
            <h3 className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
              Nenhum arquivo ou pasta encontrado
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              Tente ajustar os termos da pesquisa, remover filtros ou selecionar outra pasta no localizador lateral.
            </p>
          </div>
        ) : viewMode === 'table' ? (
          /* Table View */
          <div className="min-w-full overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 font-medium">
                  <th className="py-2.5 px-4">Nome</th>
                  <th className="py-2.5 px-3">Categoria</th>
                  <th className="py-2.5 px-3">Etiquetas</th>
                  <th className="py-2.5 px-3">Tamanho</th>
                  <th className="py-2.5 px-3">Modificado</th>
                  <th className="py-2.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {files.map((file) => {
                  const catObj = categories.find((c) => c.name === file.category);

                  return (
                    <tr
                      key={file.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group"
                    >
                      {/* Name & Icon */}
                      <td className="py-3 px-4 max-w-xs md:max-w-md">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {getFileIcon(file.mimeType, file.isFolder)}
                          <div className="min-w-0">
                            {file.isFolder ? (
                              <button
                                type="button"
                                onClick={() => onSelectFolder(file.id, file.name)}
                                className="font-semibold text-slate-800 dark:text-slate-100 hover:text-amber-600 dark:hover:text-amber-400 truncate text-left block text-xs"
                              >
                                {file.name}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onPreviewFile(file)}
                                className="font-medium text-slate-800 dark:text-slate-100 hover:text-amber-600 dark:hover:text-amber-400 truncate text-left block text-xs"
                              >
                                {file.name}
                              </button>
                            )}
                            <span className="text-[10px] text-slate-400 block truncate">
                              {getMimeTypeLabel(file.mimeType)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {file.category ? (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold text-white shadow-2xs"
                            style={{ backgroundColor: catObj?.color || '#a82b52' }}
                          >
                            {file.category}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Tags */}
                      <td className="py-3 px-3">
                        {file.tags && file.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {file.tags.map((t, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Size */}
                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                        {file.isFolder ? '—' : formatFileSize(file.size)}
                      </td>

                      {/* Modified */}
                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                        {formatDate(file.modifiedTime)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {!file.isFolder && (
                            <button
                              onClick={() => onPreviewFile(file)}
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                              title="Visualização Rápida e Leitura Focada"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => onEditTags(file)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                            title="Editar Categoria & Etiquetas"
                          >
                            <TagIcon className="w-4 h-4" />
                          </button>

                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                              title="Abrir no Google Drive Oficial"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Grid Cards View */
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {files.map((file) => {
              const catObj = categories.find((c) => c.name === file.category);

              return (
                <div
                  key={file.id}
                  className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Top Row: Icon & Actions */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                        {getFileIcon(file.mimeType, file.isFolder)}
                      </div>

                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        {!file.isFolder && (
                          <button
                            onClick={() => onPreviewFile(file)}
                            className="p-1 text-slate-400 hover:text-amber-600 rounded transition-colors"
                            title="Visualização Rápida"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => onEditTags(file)}
                          className="p-1 text-slate-400 hover:text-amber-600 rounded transition-colors"
                          title="Etiquetas"
                        >
                          <TagIcon className="w-3.5 h-3.5" />
                        </button>
                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-slate-400 hover:text-amber-600 rounded transition-colors"
                            title="Abrir no Drive"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* File / Folder Name */}
                    {file.isFolder ? (
                      <button
                        onClick={() => onSelectFolder(file.id, file.name)}
                        className="font-semibold text-slate-800 dark:text-slate-100 hover:text-amber-600 text-xs text-left line-clamp-2 mb-1"
                        title={file.name}
                      >
                        {file.name}
                      </button>
                    ) : (
                      <button
                        onClick={() => onPreviewFile(file)}
                        className="font-medium text-slate-800 dark:text-slate-100 hover:text-amber-600 text-xs text-left line-clamp-2 mb-1"
                        title={file.name}
                      >
                        {file.name}
                      </button>
                    )}

                    <div className="text-[10px] text-slate-400 mb-2">
                      {getMimeTypeLabel(file.mimeType)} {!file.isFolder && `• ${formatFileSize(file.size)}`}
                    </div>
                  </div>

                  {/* Category & Tags Footer */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                    {file.category && (
                      <div>
                        <span
                          className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold text-white"
                          style={{ backgroundColor: catObj?.color || '#a82b52' }}
                        >
                          {file.category}
                        </span>
                      </div>
                    )}

                    {file.tags && file.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {file.tags.map((t, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="text-[10px] text-slate-400">
                      {formatDate(file.modifiedTime)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
