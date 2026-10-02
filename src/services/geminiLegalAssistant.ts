import { DriveFile } from '../types/drive';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
  actionType?: 'summarize_clauses' | 'extract_deadlines' | 'extract_petition_data' | 'suggest_next_steps' | 'chat';
}

export type LegalActionType = 
  | 'summarize_clauses' 
  | 'extract_deadlines' 
  | 'extract_petition_data' 
  | 'suggest_next_steps' 
  | 'chat';

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

export const fetchDocumentContentFromDrive = async (
  accessToken: string,
  file: DriveFile
): Promise<{ textContent?: string; base64Content?: string }> => {
  try {
    const isGoogleDoc = file.mimeType === 'application/vnd.google-apps.document';
    const isGoogleSheet = file.mimeType === 'application/vnd.google-apps.spreadsheet';
    const isPdf = file.mimeType === 'application/pdf';
    const isImage = file.mimeType.startsWith('image/');
    const isText = file.mimeType.startsWith('text/') || 
                   file.mimeType.includes('json') || 
                   file.mimeType.includes('xml') || 
                   file.mimeType.includes('csv');

    const numericSize = file.size ? parseInt(file.size, 10) : 0;
    if (isGoogleDoc) {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/plain`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (res.ok) {
        const text = await res.text();
        return { textContent: text };
      }
    } else if (isGoogleSheet) {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/csv`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (res.ok) {
        const csv = await res.text();
        return { textContent: csv };
      }
    } else if (isText) {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&supportsAllDrives=true`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (res.ok) {
        const text = await res.text();
        return { textContent: text };
      }
    } else if ((isPdf || isImage) && (!numericSize || numericSize < 12 * 1024 * 1024)) {
      // Up to ~12MB can be passed as base64 inline
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&supportsAllDrives=true`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        const base64 = arrayBufferToBase64(buffer);
        return { base64Content: base64 };
      }
    }
  } catch (err) {
    console.warn('Could not fetch full document content directly from Drive:', err);
  }

  return {};
};

export const callGeminiLegalAssistant = async ({
  accessToken,
  file,
  messages,
  actionType = 'chat',
}: {
  accessToken: string;
  file: DriveFile;
  messages: { role: 'user' | 'model'; content: string }[];
  actionType?: LegalActionType;
}): Promise<string> => {
  // Try retrieving document content or base64
  const { textContent, base64Content } = await fetchDocumentContentFromDrive(accessToken, file);

  const payload = {
    documentName: file.name,
    mimeType: file.mimeType,
    category: file.category,
    tags: file.tags,
    textContent,
    base64Content,
    messages,
    actionType,
  };

  const response = await fetch('/api/legal-assistant', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Erro na comunicação com o assistente (${response.status})`);
  }

  const data = await response.json();
  return data.text;
};
