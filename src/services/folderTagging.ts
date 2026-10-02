import { FolderNode, CustomCategory, CustomTag } from '../types/drive';
import { getStoredFileMetadata, saveFileMetadata } from './tagStorage';

interface FolderSuggestionRule {
  keywords: string[];
  category: string;
  tags: string[];
}

const DEFAULT_FOLDER_RULES: FolderSuggestionRule[] = [
  {
    keywords: ['processo', 'judicial', 'juridico', 'contencioso', 'acao', 'acoes'],
    category: 'Processos Judiciais',
    tags: ['Modelo Padrão'],
  },
  {
    keywords: ['inicial pendente', 'iniciais pendentes', 'triagem'],
    category: 'Processos Judiciais',
    tags: ['Urgente', 'Aguardando Revisão'],
  },
  {
    keywords: ['contrato', 'minuta', 'acordo', 'convenio'],
    category: 'Contratos & Minutas',
    tags: ['Modelo Padrão'],
  },
  {
    keywords: ['societario', 'm&a', 'ata', 'estatuto', 'junta comercial'],
    category: 'Societário & Atas',
    tags: ['Confidencial'],
  },
  {
    keywords: ['tributario', 'fiscal', 'imposto', 'receita', 'darf'],
    category: 'Tributário & Fiscal',
    tags: ['Confidencial'],
  },
  {
    keywords: ['trabalhista', 'rh', 'reclamatoria', 'rescisao'],
    category: 'Trabalhista & RH',
    tags: ['Confidencial'],
  },
  {
    keywords: ['cliente', 'clientes', 'cadastro', 'documentos clientes'],
    category: 'Clientes & Cadastros',
    tags: [],
  },
  {
    keywords: ['financeiro', 'custas', 'honorarios', 'contabil', 'caixa'],
    category: 'Financeiro & Custas',
    tags: ['Confidencial'],
  },
  {
    keywords: ['revisao necessaria', 'revisao', 'orfao', 'orfaos'],
    category: 'Administrativo & Escritório',
    tags: ['Aguardando Revisão'],
  },
  {
    keywords: ['atraso de voo', 'voo', 'aereo', 'consumidor'],
    category: 'Processos Judiciais',
    tags: ['Assinado / Protocolado'],
  },
];

export const suggestFolderCategoryAndTags = (
  folderName: string
): { category?: string; tags: string[] } => {
  const norm = folderName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  for (const rule of DEFAULT_FOLDER_RULES) {
    if (rule.keywords.some(kw => norm.includes(kw))) {
      return {
        category: rule.category,
        tags: [...rule.tags],
      };
    }
  }

  return { tags: [] };
};

export const applySuggestedFolderMetadata = async (
  folders: FolderNode[],
  accessToken: string
): Promise<void> => {
  const localMetadata = getStoredFileMetadata();

  const processNode = async (node: FolderNode) => {
    const existing = localMetadata[node.id];
    let changed = false;
    let category = existing?.category || node.category;
    let tags = existing?.tags || node.tags || [];

    if (!category || tags.length === 0) {
      const suggestion = suggestFolderCategoryAndTags(node.name);
      if (!category && suggestion.category) {
        category = suggestion.category;
        changed = true;
      }
      if (tags.length === 0 && suggestion.tags.length > 0) {
        tags = suggestion.tags;
        changed = true;
      }
    }

    node.category = category;
    node.tags = tags;

    if (changed) {
      saveFileMetadata(node.id, category, tags);

      // Patch Drive folder properties asynchronously
      try {
        await fetch(`https://www.googleapis.com/drive/v3/files/${node.id}?supportsAllDrives=true`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            properties: {
              office_category: category || '',
              office_tags: tags.join(','),
            },
          }),
        });
      } catch (err) {
        console.warn('Could not patch folder properties in Drive:', err);
      }
    }

    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        await processNode(child);
      }
    }
  };

  for (const root of folders) {
    await processNode(root);
  }
};
