import React, { useMemo, useState } from 'react';
import { 
  X, 
  BarChart3, 
  PieChart as PieChartIcon, 
  Tag as TagIcon, 
  Layers, 
  Files, 
  CheckCircle2, 
  Info,
  TrendingUp
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';
import { DriveFile, FolderNode, CustomCategory, CustomTag } from '../types/drive';

interface DriveAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: DriveFile[];
  folders?: FolderNode[];
  categories: CustomCategory[];
  tags: CustomTag[];
  driveName: string;
}

export const DriveAnalyticsModal: React.FC<DriveAnalyticsModalProps> = ({
  isOpen,
  onClose,
  files,
  folders = [],
  categories,
  tags,
  driveName,
}) => {
  const [activeTab, setActiveTab] = useState<'both' | 'categories' | 'tags'>('both');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'files' | 'folders'>('all');

  // Flatten all folders into an array
  const flatFolders = useMemo(() => {
    const list: { id: string; name: string; category?: string; tags?: string[] }[] = [];
    const traverse = (nodes: FolderNode[]) => {
      for (const n of nodes) {
        list.push({ id: n.id, name: n.name, category: n.category, tags: n.tags });
        if (n.children && n.children.length > 0) traverse(n.children);
      }
    };
    traverse(folders);
    return list;
  }, [folders]);

  // Combine items according to selected scope
  const targetItems = useMemo(() => {
    const regularFiles = files.filter(f => !f.isFolder).map(f => ({
      id: f.id,
      name: f.name,
      category: f.category,
      tags: f.tags,
      isFolder: false,
    }));

    const folderItems = flatFolders.map(f => ({
      id: f.id,
      name: f.name,
      category: f.category,
      tags: f.tags,
      isFolder: true,
    }));

    if (scopeFilter === 'files') return regularFiles;
    if (scopeFilter === 'folders') return folderItems;
    return [...regularFiles, ...folderItems];
  }, [files, flatFolders, scopeFilter]);

  // Aggregate Category Data
  const categoryChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    let uncategorizedCount = 0;

    targetItems.forEach(item => {
      if (item.category) {
        counts[item.category] = (counts[item.category] || 0) + 1;
      } else {
        uncategorizedCount++;
      }
    });

    const data: { name: string; count: number; color: string }[] = [];

    // Known categories with matching color
    categories.forEach(cat => {
      const c = counts[cat.name] || 0;
      if (c > 0) {
        data.push({
          name: cat.name,
          count: c,
          color: cat.color,
        });
      }
    });

    // Other categories that might have been assigned
    Object.keys(counts).forEach(catName => {
      if (!categories.some(c => c.name === catName)) {
        data.push({
          name: catName,
          count: counts[catName],
          color: '#64748b',
        });
      }
    });

    if (uncategorizedCount > 0) {
      data.push({
        name: 'Sem Categoria',
        count: uncategorizedCount,
        color: '#94a3b8',
      });
    }

    return data.sort((a, b) => b.count - a.count);
  }, [targetItems, categories]);

  // Aggregate Tag Data
  const tagChartData = useMemo(() => {
    const counts: Record<string, number> = {};

    targetItems.forEach(item => {
      if (item.tags && item.tags.length > 0) {
        item.tags.forEach(t => {
          counts[t] = (counts[t] || 0) + 1;
        });
      }
    });

    const data: { name: string; count: number; color: string }[] = [];

    // Map known tags with colors
    tags.forEach(tag => {
      const c = counts[tag.name] || 0;
      if (c > 0) {
        data.push({
          name: tag.name,
          count: c,
          color: tag.color,
        });
      }
    });

    // Custom or free tags not in default list
    Object.keys(counts).forEach(tagName => {
      if (!tags.some(t => t.name === tagName)) {
        data.push({
          name: tagName,
          count: counts[tagName],
          color: '#3b82f6',
        });
      }
    });

    return data.sort((a, b) => b.count - a.count);
  }, [targetItems, tags]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalCount = targetItems.length;
    const categorizedCount = targetItems.filter(f => Boolean(f.category)).length;
    const taggedCount = targetItems.filter(f => f.tags && f.tags.length > 0).length;
    const pctCategorized = totalCount > 0 ? Math.round((categorizedCount / totalCount) * 100) : 0;
    const topCategory = categoryChartData.length > 0 ? categoryChartData[0] : null;
    const topTag = tagChartData.length > 0 ? tagChartData[0] : null;

    return {
      totalCount,
      categorizedCount,
      taggedCount,
      pctCategorized,
      topCategory,
      topTag,
    };
  }, [targetItems, categoryChartData, tagChartData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
              <BarChart3 className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-slate-900 dark:text-white text-base">
                  Métricas & Distribuição de Documentos
                </h2>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                  {driveName}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Visualização de dados por categorias jurídicas e etiquetas do escritório
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Scope Selector: Arquivos vs Pastas */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 text-xs font-medium">
              <button
                onClick={() => setScopeFilter('all')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  scopeFilter === 'all' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Tudo
              </button>
              <button
                onClick={() => setScopeFilter('folders')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  scopeFilter === 'folders' ? 'bg-amber-600 text-white shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Pastas
              </button>
              <button
                onClick={() => setScopeFilter('files')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  scopeFilter === 'files' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Arquivos
              </button>
            </div>

            {/* View Selector Tabs */}
            <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 text-xs font-medium">
              <button
                onClick={() => setActiveTab('both')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  activeTab === 'both' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Geral
              </button>
              <button
                onClick={() => setActiveTab('categories')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  activeTab === 'categories' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Categorias
              </button>
              <button
                onClick={() => setActiveTab('tags')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  activeTab === 'tags' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Etiquetas
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                <Files className="w-3.5 h-3.5" />
                <span>Total Itens</span>
              </div>
              <div className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {metrics.totalCount}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                <Layers className="w-3.5 h-3.5 text-amber-500" />
                <span>Categorizados</span>
              </div>
              <div className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {metrics.pctCategorized}%
              </div>
              <span className="text-[10px] text-slate-400">
                {metrics.categorizedCount} de {metrics.totalCount}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                <TagIcon className="w-3.5 h-3.5 text-blue-500" />
                <span>Com Etiquetas</span>
              </div>
              <div className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {metrics.taggedCount}
              </div>
              <span className="text-[10px] text-slate-400">
                {tagChartData.length} etiquetas em uso
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                <span>Top Categoria</span>
              </div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate" title={metrics.topCategory?.name || '—'}>
                {metrics.topCategory?.name || '—'}
              </div>
              <span className="text-[10px] text-slate-400">
                {metrics.topCategory ? `${metrics.topCategory.count} docs` : 'Sem dados'}
              </span>
            </div>
          </div>

          {/* Charts Area */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Categories Distribution */}
            {(activeTab === 'both' || activeTab === 'categories') && (
              <div className={`bg-slate-50/50 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col ${activeTab === 'categories' ? 'lg:col-span-2' : ''}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4 text-amber-500" />
                    <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200">
                      Distribuição por Categorias
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {categoryChartData.length} categorias identificadas
                  </span>
                </div>

                {categoryChartData.length === 0 ? (
                  <div className="py-16 text-center text-xs text-slate-400">
                    Nenhum arquivo categorizado ainda.
                  </div>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryChartData}
                          dataKey="count"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          innerRadius={45}
                          paddingAngle={3}
                          label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                          labelLine={false}
                        >
                          {categoryChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: any) => [`${value} arquivos`, 'Quantidade']}
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            borderColor: '#334155',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '11px',
                          }}
                          itemStyle={{ color: '#e2e8f0' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Categories Legend List */}
                <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                  {categoryChartData.map((item, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="truncate max-w-[120px]">{item.name}:</span>
                      <strong className="font-semibold">{item.count}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Chart 2: Volume of Documents by Tag */}
            {(activeTab === 'both' || activeTab === 'tags') && (
              <div className={`bg-slate-50/50 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col ${activeTab === 'tags' ? 'lg:col-span-2' : ''}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TagIcon className="w-4 h-4 text-blue-500" />
                    <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200">
                      Volume de Documentos por Etiqueta
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {tagChartData.length} etiquetas com arquivos
                  </span>
                </div>

                {tagChartData.length === 0 ? (
                  <div className="py-16 text-center text-xs text-slate-400">
                    Nenhum documento possui etiquetas atribuídas ainda.
                  </div>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={tagChartData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10, fill: '#94a3b8' }}
                          interval={0}
                          angle={-20}
                          textAnchor="end"
                          height={40}
                        />
                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                        <Tooltip
                          formatter={(value: any) => [`${value} documentos`, 'Volume']}
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            borderColor: '#334155',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '11px',
                          }}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {tagChartData.map((entry, index) => (
                            <Cell key={`bar-cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Tags breakdown pills */}
                <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                  {tagChartData.map((item, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] text-white"
                      style={{ backgroundColor: item.color }}
                    >
                      <span>#{item.name}</span>
                      <span className="bg-black/20 px-1 rounded font-bold text-[9px]">{item.count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>Dados atualizados automaticamente com base nas pastas e arquivos sincronizados</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
