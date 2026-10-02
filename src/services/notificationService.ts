import { AppNotification, NotificationType } from '../types/notifications';
import { DriveFile } from '../types/drive';

const STORAGE_KEY = 'barreto_campos_notifications_v1';
const KNOWN_FILE_IDS_KEY = 'barreto_campos_known_file_ids_v1';

export const getStoredNotifications = (): AppNotification[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load notifications:', e);
    return [];
  }
};

export const saveNotifications = (notifications: AppNotification[]) => {
  try {
    // Keep last 50 notifications to prevent unbounded growth
    const trimmed = notifications.slice(0, 50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error('Failed to save notifications:', e);
  }
};

export const createNotification = (
  type: NotificationType,
  title: string,
  message: string,
  meta?: {
    fileId?: string;
    fileName?: string;
    folderId?: string;
    folderName?: string;
  }
): AppNotification => {
  return {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type,
    title,
    message,
    timestamp: Date.now(),
    read: false,
    ...meta,
  };
};

export const getStoredKnownFileIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(KNOWN_FILE_IDS_KEY);
    if (!raw) return new Set<string>();
    return new Set<string>(JSON.parse(raw));
  } catch {
    return new Set<string>();
  }
};

export const saveKnownFileIds = (ids: Set<string> | string[]) => {
  try {
    const arr = Array.isArray(ids) ? ids : Array.from(ids);
    // Keep max 1000 IDs
    localStorage.setItem(KNOWN_FILE_IDS_KEY, JSON.stringify(arr.slice(-1000)));
  } catch (e) {
    console.error('Failed to save known file IDs:', e);
  }
};

export const detectNewFiles = (
  currentFiles: DriveFile[],
  knownFileIds: Set<string>
): { newFiles: DriveFile[]; updatedKnownIds: Set<string> } => {
  const updatedKnownIds = new Set(knownFileIds);
  const newFiles: DriveFile[] = [];

  // If this is the very first initialization (knownFileIds is empty), populate without spamming
  if (knownFileIds.size === 0) {
    currentFiles.forEach(f => updatedKnownIds.add(f.id));
    saveKnownFileIds(updatedKnownIds);
    return { newFiles: [], updatedKnownIds };
  }

  for (const file of currentFiles) {
    if (!knownFileIds.has(file.id)) {
      newFiles.push(file);
      updatedKnownIds.add(file.id);
    }
  }

  if (newFiles.length > 0) {
    saveKnownFileIds(updatedKnownIds);
  }

  return { newFiles, updatedKnownIds };
};
