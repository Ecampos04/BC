import { CustomCategory, CustomTag } from '../types/drive';

const DEFAULT_CATEGORIES: CustomCategory[] = [
  { id: 'cat_processos', name: 'Processos Judiciais', color: '#dc2626', icon: 'Scale' },
  { id: 'cat_contratos', name: 'Contratos & Minutas', color: '#2563eb', icon: 'FileText' },
  { id: 'cat_societario', name: 'Societário & Atas', color: '#7c3aed', icon: 'Building2' },
  { id: 'cat_tributario', name: 'Tributário & Fiscal', color: '#a82b52', icon: 'Receipt' },
  { id: 'cat_trabalhista', name: 'Trabalhista & RH', color: '#059669', icon: 'Users' },
  { id: 'cat_financeiro', name: 'Financeiro & Custas', color: '#0d9488', icon: 'DollarSign' },
  { id: 'cat_administrativo', name: 'Administrativo & Escritório', color: '#4b5563', icon: 'Briefcase' },
  { id: 'cat_clientes', name: 'Clientes & Cadastros', color: '#db2777', icon: 'UserCheck' },
];

const DEFAULT_TAGS: CustomTag[] = [
  { id: 'tag_urgente', name: 'Urgente', color: '#ef4444' },
  { id: 'tag_prazo_fatal', name: 'Prazo Fatal', color: '#b91c1c' },
  { id: 'tag_revisar', name: 'Aguardando Revisão', color: '#f59e0b' },
  { id: 'tag_assinado', name: 'Assinado / Protocolado', color: '#10b981' },
  { id: 'tag_audiencia', name: 'Audiência', color: '#8b5cf6' },
  { id: 'tag_modelo', name: 'Modelo Padrão', color: '#6366f1' },
  { id: 'tag_confidencial', name: 'Confidencial', color: '#374151' },
  { id: 'tag_pago', name: 'Custas Pagas', color: '#14b8a6' },
];

const STORAGE_KEYS = {
  CATEGORIES: 'barreto_campos_categories_v1',
  TAGS: 'barreto_campos_tags_v1',
  FILE_METADATA: 'barreto_campos_file_metadata_v1',
};

export interface FileMetadataStore {
  [fileId: string]: {
    category?: string;
    tags?: string[];
    updatedAt: string;
  };
}

export const getStoredCategories = (): CustomCategory[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (!raw) return DEFAULT_CATEGORIES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_CATEGORIES;
  } catch {
    return DEFAULT_CATEGORIES;
  }
};

export const saveCategories = (categories: CustomCategory[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  } catch (err) {
    console.error('Error saving categories:', err);
  }
};

export const getStoredTags = (): CustomTag[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TAGS);
    if (!raw) return DEFAULT_TAGS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_TAGS;
  } catch {
    return DEFAULT_TAGS;
  }
};

export const saveTags = (tags: CustomTag[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify(tags));
  } catch (err) {
    console.error('Error saving tags:', err);
  }
};

export const getStoredFileMetadata = (): FileMetadataStore => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FILE_METADATA);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

export const saveFileMetadata = (
  fileId: string,
  category?: string,
  tags?: string[]
): void => {
  try {
    const store = getStoredFileMetadata();
    store[fileId] = {
      category: category ?? store[fileId]?.category ?? '',
      tags: tags ?? store[fileId]?.tags ?? [],
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.FILE_METADATA, JSON.stringify(store));
  } catch (err) {
    console.error('Error saving file metadata:', err);
  }
};
