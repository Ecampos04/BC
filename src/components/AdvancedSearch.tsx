import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  FileText, 
  Folder, 
  Calendar, 
  SlidersHorizontal, 
  X, 
  Tag as TagIcon, 
  Layers, 
  Sparkles,
  FileSpreadsheet,
  Presentation,
  Image as ImageIcon,
  Files
} from 'lucide-react';
import { FilterState, CustomCategory, CustomTag } from '../types/drive';

interface AdvancedSearchProps {
  filter: FilterState;
  onFilterChange: (updates: Partial<FilterState>) => void;
  onResetFilters: () => void;
  categories: CustomCategory[];
  tags: CustomTag[];
  selectedFolderName?: string;
  onClearSelectedFolder: () => void;
}

export const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  filter,
  onFilterChange,
  onResetFilters,
  categories,
  tags,
  selectedFolderName,
  onClearSelectedFolder,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const mimeOptions = [
    { id: 'all', label: 'Todos', icon: Files },
    { id: 'folders', label: 'Pastas', icon: Folder },
    { id: 'documents', label: 'Documentos', icon: FileText },
    { id: 'pdfs', label: 'PDFs', icon: FileText },
    { id: 'spreadsheets', label: 'Planilhas', icon: FileSpreadsheet },
    { id: 'presentations', label: 'Apresentações', icon: Presentation },
    { id: 'images', label: 'Imagens', icon: ImageIcon },
  ];

  const dateOptions = [
    { id: 'all', label: 'Qualquer data' },
    { id: 'today', label: 'Hoje' },
    { id: '7days', label: 'Últimos 7 dias' },
    { id: '30days', label: 'Últimos 30 dias' },
    { id: 'year', label: 'Este ano' },
    { id: 'custom', label: 'Período personalizado...' },
  ];

  const activeFiltersCount = [
    filter.mimeGroup !== 'all',
    filter.modifiedRange !== 'all',
    filter.searchContent,
    !!filter.selectedCategory,
    filter.selectedTags.length > 0,
    !!filter.folderId,
  ].filter(Boolean).length;

  const toggleTag = (tagName: string) => {
    const exists = filter.selectedTags.includes(tagName);
    const updated = exists
      ? filter.selectedTags.filter((t) => t !== tagName)
      : [...filter.selectedTags, tagName];
    onFilterChange({ selectedTags: updated });
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs p-4 mb-4">
      {/* Top Search Input & Quick Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por nome de arquivo, cliente, número do processo ou termos..."
            value={filter.query}
            onChange={(e) => onFilterChange({ query: e.target.value })}
            className="w-full pl-10 pr-9 py-2 text-sm bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
          />
          {filter.query && (
            <button
              onClick={() => onFilterChange({ query: '' })}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              title="Limpar texto"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Toggle Advanced Filters Button */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors ${
            showAdvanced || activeFiltersCount > 0
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Filtros Avançados</span>
          {activeFiltersCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-amber-600 text-white text-[10px] font-bold flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </button>

        {activeFiltersCount > 0 && (
          <button
            onClick={onResetFilters}
            className="flex items-center justify-center gap-1 px-3 py-2 text-xs text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
            title="Limpar todos os filtros"
          >
            <X className="w-3.5 h-3.5" />
            <span>Limpar</span>
          </button>
        )}
      </div>

      {/* Active Folder Filter Bar if a folder is selected */}
      {selectedFolderName && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-slate-400 flex items-center gap-1">
            <Folder className="w-3.5 h-3.5 text-amber-600" />
            Filtrando apenas dentro da pasta:
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded-full font-medium border border-amber-200 dark:border-amber-800">
            {selectedFolderName}
            <button
              onClick={onClearSelectedFolder}
              className="text-amber-600 hover:text-amber-900 dark:hover:text-white"
              title="Remover filtro de pasta"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        </div>
      )}

      {/* Advanced Filter Expansion Panel */}
      {showAdvanced && (
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4 animate-in fade-in duration-150">
          {/* File Types Row */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Tipo de Arquivo
            </label>
            <div className="flex flex-wrap gap-1.5">
              {mimeOptions.map((opt) => {
                const Icon = opt.icon;
                const active = filter.mimeGroup === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => onFilterChange({ mimeGroup: opt.id as any })}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      active
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Modification Date */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Data de Modificação
              </label>
              <select
                value={filter.modifiedRange}
                onChange={(e) => onFilterChange({ modifiedRange: e.target.value as any })}
                className="w-full text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500/30"
              >
                {dateOptions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>

              {filter.modifiedRange === 'custom' && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1">
                    <span className="text-[10px] text-slate-400 block mb-1">De:</span>
                    <input
                      type="date"
                      value={filter.customDateStart || ''}
                      onChange={(e) => onFilterChange({ customDateStart: e.target.value })}
                      className="w-full text-xs p-1.5 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] text-slate-400 block mb-1">Até:</span>
                    <input
                      type="date"
                      value={filter.customDateEnd || ''}
                      onChange={(e) => onFilterChange({ customDateEnd: e.target.value })}
                      className="w-full text-xs p-1.5 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Content Search Toggle */}
            <div className="flex flex-col justify-start">
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Busca Abrangente
              </label>
              <label className="flex items-center gap-2.5 p-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <input
                  type="checkbox"
                  checked={filter.searchContent}
                  onChange={(e) => onFilterChange({ searchContent: e.target.checked })}
                  className="rounded-sm border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <div>
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200 block">
                    Pesquisar no conteúdo dos arquivos
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Localiza termos dentro de PDFs, Docs, planilhas e relatórios
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Categories Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              Filtrar por Categoria do Escritório
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => onFilterChange({ selectedCategory: undefined })}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  !filter.selectedCategory
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                Todas as Categorias
              </button>
              {categories.map((cat) => {
                const isSelected = filter.selectedCategory === cat.name;
                return (
                  <button
                    key={cat.id}
                    onClick={() => onFilterChange({ selectedCategory: isSelected ? undefined : cat.name })}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${
                      isSelected
                        ? 'border-transparent text-white'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                    style={{
                      backgroundColor: isSelected ? cat.color : undefined,
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: isSelected ? '#ffffff' : cat.color }}
                    />
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Tags Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <TagIcon className="w-3.5 h-3.5 text-slate-400" />
              Filtrar por Etiquetas Personalizadas
            </label>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => {
                const isSelected = filter.selectedTags.includes(tag.name);
                return (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.name)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                      isSelected
                        ? 'text-white border-transparent shadow-xs scale-105'
                        : 'text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100'
                    }`}
                    style={{
                      backgroundColor: isSelected ? tag.color : undefined,
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: isSelected ? '#ffffff' : tag.color }}
                    />
                    <span>{tag.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
