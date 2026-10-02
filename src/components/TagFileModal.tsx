import React, { useState } from 'react';
import { X, Tag as TagIcon, Layers, Plus, Check } from 'lucide-react';
import { DriveFile, CustomCategory, CustomTag } from '../types/drive';

interface TagFileModalProps {
  isOpen: boolean;
  file: DriveFile | null;
  categories: CustomCategory[];
  availableTags: CustomTag[];
  onSave: (fileId: string, category: string, tags: string[]) => Promise<void>;
  onClose: () => void;
  onCreateNewTag: (name: string, color: string) => void;
}

export const TagFileModal: React.FC<TagFileModalProps> = ({
  isOpen,
  file,
  categories,
  availableTags,
  onSave,
  onClose,
  onCreateNewTag,
}) => {
  if (!isOpen || !file) return null;

  const [selectedCategory, setSelectedCategory] = useState<string>(file.category || '');
  const [selectedTags, setSelectedTags] = useState<string[]>(file.tags || []);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#2563eb');
  const [isSaving, setIsSaving] = useState(false);

  const toggleTag = (tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName]
    );
  };

  const handleAddNewTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    const name = newTagName.trim();
    onCreateNewTag(name, newTagColor);
    if (!selectedTags.includes(name)) {
      setSelectedTags((prev) => [...prev, name]);
    }
    setNewTagName('');
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      await onSave(file.id, selectedCategory, selectedTags);
      onClose();
    } catch (err) {
      console.error('Error saving tags:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <TagIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base">
                Categorizar & Etiquetar
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[280px]">
                {file.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Category Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-500" />
              Selecione a Categoria Principal
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedCategory('')}
                className={`p-2 rounded-lg text-xs font-medium border text-left flex items-center justify-between transition-colors ${
                  !selectedCategory
                    ? 'border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-200'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span>Nenhuma</span>
                {!selectedCategory && <Check className="w-3.5 h-3.5 text-amber-600" />}
              </button>

              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.name;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`p-2 rounded-lg text-xs font-medium border text-left flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-200 font-semibold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="truncate">{cat.name}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tags Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <TagIcon className="w-4 h-4 text-amber-500" />
              Etiquetas Personalizadas (Múltiplas)
            </label>
            <div className="flex flex-wrap gap-1.5 min-h-[50px] p-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg">
              {availableTags.map((tag) => {
                const isSelected = selectedTags.includes(tag.name);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.name)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                      isSelected
                        ? 'text-white border-transparent shadow-xs scale-105'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
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
                    {isSelected && <Check className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>

            {/* Quick Add Tag Form */}
            <form onSubmit={handleAddNewTag} className="flex items-center gap-2 mt-3">
              <input
                type="text"
                placeholder="Criar nova etiqueta rápida..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="flex-1 text-xs p-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              />
              <input
                type="color"
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700 p-0.5 bg-white"
                title="Escolher cor da etiqueta"
              />
              <button
                type="submit"
                disabled={!newTagName.trim()}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg text-xs font-medium disabled:opacity-50 transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar</span>
              </button>
            </form>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-xs disabled:opacity-50"
          >
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    </div>
  );
};
