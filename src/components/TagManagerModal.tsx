import React, { useState } from 'react';
import { X, Plus, Trash2, Tag, Layers, Palette } from 'lucide-react';
import { CustomCategory, CustomTag } from '../types/drive';

interface TagManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CustomCategory[];
  tags: CustomTag[];
  onUpdateCategories: (categories: CustomCategory[]) => void;
  onUpdateTags: (tags: CustomTag[]) => void;
}

export const TagManagerModal: React.FC<TagManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  tags,
  onUpdateCategories,
  onUpdateTags,
}) => {
  const [activeTab, setActiveTab] = useState<'categories' | 'tags'>('categories');
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#2563eb');
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#ef4444');

  if (!isOpen) return null;

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const newCat: CustomCategory = {
      id: `cat_${Date.now()}`,
      name: newCatName.trim(),
      color: newCatColor,
    };
    onUpdateCategories([...categories, newCat]);
    setNewCatName('');
  };

  const handleDeleteCategory = (id: string) => {
    onUpdateCategories(categories.filter((c) => c.id !== id));
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    const newTag: CustomTag = {
      id: `tag_${Date.now()}`,
      name: newTagName.trim(),
      color: newTagColor,
    };
    onUpdateTags([...tags, newTag]);
    setNewTagName('');
  };

  const handleDeleteTag = (id: string) => {
    onUpdateTags(tags.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-slate-900 dark:text-white text-base">
              Gerenciar Categorias & Etiquetas do Escritório
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'categories'
                ? 'border-amber-600 text-amber-600 bg-white dark:bg-slate-850'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Categorias ({categories.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('tags')}
            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'tags'
                ? 'border-amber-600 text-amber-600 bg-white dark:bg-slate-850'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Etiquetas Personalizadas ({tags.length})</span>
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {activeTab === 'categories' ? (
            <div className="space-y-4">
              {/* Add form */}
              <form onSubmit={handleAddCategory} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nome da nova categoria (ex: Cível, Família, M&A)..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="flex-1 text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
                <input
                  type="color"
                  value={newCatColor}
                  onChange={(e) => setNewCatColor(e.target.value)}
                  className="w-9 h-9 rounded-lg cursor-pointer border border-slate-200 p-0.5"
                  title="Cor da categoria"
                />
                <button
                  type="submit"
                  disabled={!newCatName.trim()}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar</span>
                </button>
              </form>

              {/* Categories list */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-3 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3.5 h-3.5 rounded-full shadow-xs"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                        {cat.name}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                      title="Excluir Categoria"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Add form */}
              <form onSubmit={handleAddTag} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nome da etiqueta (ex: Diligência, Em Execução)..."
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="flex-1 text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
                <input
                  type="color"
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  className="w-9 h-9 rounded-lg cursor-pointer border border-slate-200 p-0.5"
                  title="Cor da etiqueta"
                />
                <button
                  type="submit"
                  disabled={!newTagName.trim()}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar</span>
                </button>
              </form>

              {/* Tags list */}
              <div className="flex flex-wrap gap-2 p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-850">
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-white shadow-xs"
                    style={{ backgroundColor: tag.color }}
                  >
                    <span>{tag.name}</span>
                    <button
                      onClick={() => handleDeleteTag(tag.id)}
                      className="hover:opacity-75 p-0.5 transition-opacity"
                      title="Remover"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end px-6 py-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
