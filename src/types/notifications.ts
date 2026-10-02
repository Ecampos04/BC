export type NotificationType = 
  | 'file_added' 
  | 'backup_completed' 
  | 'backup_alert' 
  | 'initial_transferred' 
  | 'system';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  fileId?: string;
  fileName?: string;
  folderId?: string;
  folderName?: string;
}
