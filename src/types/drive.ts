export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  createdTime?: string;
  size?: string;
  iconLink?: string;
  webViewLink?: string;
  thumbnailLink?: string;
  parents?: string[];
  properties?: Record<string, string>;
  appProperties?: Record<string, string>;
  isFolder: boolean;
  category?: string;
  tags?: string[];
}

export interface SharedDrive {
  id: string;
  name: string;
  kind?: string;
}

export interface FolderNode {
  id: string;
  name: string;
  parentId?: string | null;
  children: FolderNode[];
  fileCount?: number;
  subfolderCount?: number;
  path: string;
  category?: string;
  tags?: string[];
}

export interface CustomCategory {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

export interface CustomTag {
  id: string;
  name: string;
  color: string;
}

export interface FilterState {
  query: string;
  folderId?: string | null;
  folderName?: string;
  mimeGroup: 'all' | 'folders' | 'documents' | 'spreadsheets' | 'presentations' | 'pdfs' | 'images' | 'others';
  modifiedRange: 'all' | 'today' | '7days' | '30days' | 'year' | 'custom';
  customDateStart?: string;
  customDateEnd?: string;
  searchContent: boolean;
  selectedCategory?: string;
  selectedTags: string[];
  sortBy: 'name' | 'modifiedTime' | 'size';
  sortOrder: 'asc' | 'desc';
}
