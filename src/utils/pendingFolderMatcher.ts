import { FolderNode } from '../types/drive';

export interface ParsedCaseFolder {
  folderId: string;
  originalName: string;
  clientName: string;
  caseTopic: string;
  details?: string;
  matchedTargetFolder?: FolderNode | null;
  suggestedNewFolderName?: string;
  matchScore: number;
}

const normalize = (str: string) => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

export const parseCaseFolderName = (
  folderId: string,
  folderName: string,
  allFolders: FolderNode[]
): ParsedCaseFolder => {
  let clientName = '';
  let caseTopic = folderName;
  let details = '';

  // Patterns like "Ruan - Atraso de Voo (Drone)" or "Ruan: Atraso de Voo"
  if (folderName.includes(' - ')) {
    const parts = folderName.split(' - ');
    clientName = parts[0].trim();
    caseTopic = parts.slice(1).join(' - ').trim();
  } else if (folderName.includes(': ')) {
    const parts = folderName.split(': ');
    clientName = parts[0].trim();
    caseTopic = parts.slice(1).join(': ').trim();
  }

  // Extract parentheses notes like "(Drone)"
  const parenMatch = caseTopic.match(/\((.*?)\)/);
  if (parenMatch) {
    details = parenMatch[1].trim();
    caseTopic = caseTopic.replace(/\(.*?\)/, '').trim();
  }

  const cleanTopic = caseTopic.trim() || folderName;
  const normalizedTopic = normalize(cleanTopic);

  // Search existing folders for best match
  let bestMatch: FolderNode | null = null;
  let highestScore = 0;

  // Flatten all folders
  const flatList: FolderNode[] = [];
  const traverse = (nodes: FolderNode[]) => {
    for (const n of nodes) {
      flatList.push(n);
      if (n.children && n.children.length > 0) traverse(n.children);
    }
  };
  traverse(allFolders);

  for (const f of flatList) {
    // Avoid matching "Iniciais Pendentes" itself
    const fNorm = normalize(f.name);
    if (fNorm.includes('inicial') && fNorm.includes('pendente')) continue;

    let score = 0;
    if (fNorm === normalizedTopic) {
      score = 100;
    } else if (fNorm.includes(normalizedTopic) || normalizedTopic.includes(fNorm)) {
      score = 80;
    } else {
      // Word overlap score
      const topicWords = normalizedTopic.split(/\s+/).filter(w => w.length > 3);
      const folderWords = fNorm.split(/\s+/).filter(w => w.length > 3);
      const common = topicWords.filter(w => folderWords.some(fw => fw.includes(w) || w.includes(fw)));
      if (common.length > 0) {
        score = (common.length / Math.max(topicWords.length, 1)) * 70;
      }
    }

    if (score > highestScore && score >= 40) {
      highestScore = score;
      bestMatch = f;
    }
  }

  return {
    folderId,
    originalName: folderName,
    clientName: clientName || folderName,
    caseTopic: cleanTopic,
    details,
    matchedTargetFolder: bestMatch,
    suggestedNewFolderName: cleanTopic,
    matchScore: highestScore,
  };
};
