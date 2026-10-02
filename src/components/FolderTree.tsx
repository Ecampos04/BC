import React, { useState, useMemo } from 'react';
import { 
  Folder, 
  FolderOpen, 
  ChevronRight, 
  ChevronDown, 
  Search, 
  Plus, 
  FolderTree as TreeIcon, 
  Check, 
  FolderPlus,
  Compass,
  ArrowRight,
  Tag
} from 'lucide-react';
import { FolderNode } from '../types/drive';

interface FolderTreeProps {
  folders: FolderNode[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null, folderName?: string) => void;
  onCreateFolderClick: (parentFolderId: string | null, parentFolderName: string) => void;
  onEditFolderTags?: (folderId: string, folderName: string, category?: string, tags?: string[]) => void;
  driveName: string;
}

export const FolderTree: React.FC<FolderTreeProps> = ({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolderClick,
  onEditFolderTags,
  driveName,
}) => {
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set());
  const [filterQuery, setFilterQuery] = useState('');

  const toggleExpand = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    const traverse = (nodes: FolderNode[]) => {
      for (const n of nodes) {
        allIds.add(n.id);
        if (n.children && n.children.length > 0) {
          traverse(n.children);
        }
      }
    };
    traverse(folders);
    setExpandedFolderIds(allIds);
  };

  const collapseAll = () => {
    setExpandedFolderIds(new Set());
  };

  // Flatten for quick filter if user searches in folder tree
  const filteredFlatList = useMemo(() => {
    if (!filterQuery.trim()) return null;
    const q = filterQuery.toLowerCase().trim();
    const result: FolderNode[] = [];

    const traverse = (nodes: FolderNode[]) => {
      for (const n of nodes) {
        if (n.name.toLowerCase().includes(q) || n.path.toLowerCase().includes(q)) {
          result.push(n);
        }
        if (n.children && n.children.length > 0) {
          traverse(n.children);
        }
      }
    };
    traverse(folders);
    return result;
  }, [folders, filterQuery]);

  const countTotalFolders = useMemo(() => {
    let count = 0;
    const traverse = (nodes: FolderNode[]) => {
      count += nodes.length;
      nodes.forEach((n) => {
        if (n.children && n.children.length > 0) traverse(n.children);
      });
    };
    traverse(folders);
    return count;
  }, [folders]);

  const renderTreeNode = (node: FolderNode, depth: number = 0) => {
    const isExpanded = expandedFolderIds.has(node.id);
    const isSelected = selectedFolderId === node.id;
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} className="select-none">
        <div
          onClick={() => onSelectFolder(node.id, node.name)}
          className={`group flex items-center justify-between py-1.5 px-2 rounded-lg text-xs cursor-pointer transition-all ${
            isSelected
              ? 'bg-amber-500/15 text-amber-900 dark:text-amber-300 font-semibold border border-amber-500/30'
              : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
          style={{ paddingLeft: `${Math.max(8, depth * 14 + 8)}px` }}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => toggleExpand(node.id, e)}
                className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-600 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                )}
              </button>
            ) : (
              <span className="w-3.5 h-3.5 inline-block opacity-0" />
            )}

            {isExpanded || isSelected ? (
              <FolderOpen className={`w-4 h-4 shrink-0 ${isSelected ? 'text-amber-600' : 'text-amber-500'}`} />
            ) : (
              <Folder className={`w-4 h-4 shrink-0 ${isSelected ? 'text-amber-600' : 'text-slate-400 group-hover:text-amber-500'}`} />
            )}

            <span className="truncate" title={node.path || node.name}>
              {node.name}
            </span>

            {node.category && (
              <span className="shrink-0 px-1.5 py-0.2 rounded text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700 max-w-[80px] truncate hidden sm:inline-block">
                {node.category}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {node.tags && node.tags.length > 0 && (
              <span className="text-[9px] text-amber-700 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-1 rounded font-semibold">
                #{node.tags[0]}
              </span>
            )}
            {hasChildren && (
              <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
                {node.children.length}
              </span>
            )}
            {onEditFolderTags && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditFolderTags(node.id, node.name, node.category, node.tags);
                }}
                title={`Etiquetar pasta "${node.name}"`}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-amber-600 rounded transition-colors"
              >
                <Tag className="w-3 h-3" />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCreateFolderClick(node.id, node.name);
              }}
              title={`Criar subpasta dentro de "${node.name}"`}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-amber-600 rounded transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-0.5 mt-0.5">
            {node.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden flex flex-col h-[700px]">
      {/* Header & Quick stats */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TreeIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h2 className="font-semibold text-sm text-slate-900 dark:text-white">
              Localizador de Pastas
            </h2>
          </div>
          <span className="text-[11px] font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
            {countTotalFolders} pastas
          </span>
        </div>

        {/* Search input for instant folder finding */}
        <div className="relative mt-2">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Localizar pasta específica..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
          />
          {filterQuery && (
            <button
              onClick={() => setFilterQuery('')}
              className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 text-xs px-1"
            >
              ×
            </button>
          )}
        </div>

        {/* Tree controls */}
        {!filterQuery && (
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-500">
            <div className="flex items-center gap-2">
              <button
                onClick={expandAll}
                className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
              >
                Expandir tudo
              </button>
              <span>•</span>
              <button
                onClick={collapseAll}
                className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
              >
                Recolher
              </button>
            </div>
            <button
              onClick={() => onCreateFolderClick(null, driveName)}
              className="flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:text-amber-700 font-medium"
              title="Criar nova pasta raiz"
            >
              <FolderPlus className="w-3 h-3" />
              <span>Nova Pasta</span>
            </button>
          </div>
        )}
      </div>

      {/* Folder listing */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {/* Option: BARRETO E CAMPOS Root */}
        <div
          onClick={() => onSelectFolder(null, driveName)}
          className={`flex items-center justify-between py-2 px-2.5 rounded-lg text-xs cursor-pointer transition-colors ${
            selectedFolderId === null
              ? 'bg-amber-600 text-white font-medium shadow-xs'
              : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Compass className={`w-4 h-4 shrink-0 ${selectedFolderId === null ? 'text-white' : 'text-amber-600'}`} />
            <span className="truncate font-semibold">
              📁 {driveName} (Raiz)
            </span>
          </div>
          {selectedFolderId === null && <Check className="w-3.5 h-3.5 shrink-0" />}
        </div>

        {/* Filtered view or tree view */}
        {filterQuery ? (
          <div className="pt-2">
            <div className="text-[11px] font-medium text-slate-400 px-2 mb-1.5 uppercase tracking-wider">
              Pastas encontradas ({filteredFlatList?.length || 0})
            </div>
            {filteredFlatList && filteredFlatList.length > 0 ? (
              filteredFlatList.map((node) => (
                <div
                  key={node.id}
                  onClick={() => onSelectFolder(node.id, node.name)}
                  className={`flex flex-col py-1.5 px-2.5 rounded-lg text-xs cursor-pointer mb-1 transition-colors ${
                    selectedFolderId === node.id
                      ? 'bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-500/30'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-medium">
                    <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="truncate">{node.name}</span>
                  </div>
                  {node.path && (
                    <div className="text-[10px] text-slate-400 truncate pl-5">
                      {node.path}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-slate-400">
                Nenhuma pasta encontrada com "{filterQuery}".
              </div>
            )}
          </div>
        ) : (
          <div className="pt-1">
            {folders.length === 0 ? (
              <div className="text-center py-10 px-4 text-xs text-slate-400">
                <Folder className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600 stroke-[1.5]" />
                <p>Nenhuma pasta carregada ainda.</p>
                <button
                  onClick={() => onCreateFolderClick(null, driveName)}
                  className="mt-3 px-3 py-1 bg-amber-600 text-white rounded text-[11px] hover:bg-amber-700 transition-colors"
                >
                  Criar Primeira Pasta
                </button>
              </div>
            ) : (
              folders.map((node) => renderTreeNode(node, 0))
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
