export const formatFileSize = (bytes?: string | number): string => {
  if (!bytes) return '—';
  const num = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
  if (isNaN(num) || num <= 0) return '—';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let size = num;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

export const formatDate = (dateString?: string): string => {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
};

export const getMimeTypeLabel = (mimeType: string): string => {
  if (mimeType === 'application/vnd.google-apps.folder') return 'Pasta';
  if (mimeType === 'application/vnd.google-apps.document') return 'Documento Google';
  if (mimeType === 'application/vnd.google-apps.spreadsheet') return 'Planilha Google';
  if (mimeType === 'application/vnd.google-apps.presentation') return 'Apresentação Google';
  if (mimeType === 'application/pdf') return 'Documento PDF';
  if (mimeType.includes('word') || mimeType.includes('officedocument.wordprocessingml')) return 'Documento Word';
  if (mimeType.includes('excel') || mimeType.includes('officedocument.spreadsheetml')) return 'Planilha Excel';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'Apresentação PowerPoint';
  if (mimeType.startsWith('image/')) return 'Imagem';
  if (mimeType.startsWith('video/')) return 'Vídeo';
  if (mimeType.startsWith('audio/')) return 'Áudio';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar') || mimeType.includes('compressed')) return 'Arquivo Compactado';
  return 'Arquivo';
};
