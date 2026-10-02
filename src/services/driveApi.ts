import { DriveFile, SharedDrive, FolderNode } from '../types/drive';
import { getStoredFileMetadata, saveFileMetadata } from './tagStorage';

const BASE_URL = 'https://www.googleapis.com/drive/v3';

export const TARGET_FOLDER_NAME = 'BARRETO E CAMPOS';

export interface DriveContext {
  driveId?: string | null; // If shared drive
  rootFolderId: string | null; // ID of BARRETO E CAMPOS folder or drive
  driveName: string;
  isSharedDrive: boolean;
  isFolderFound: boolean;
  descendantFolderIds: string[]; // All folder IDs inside BARRETO E CAMPOS
}

const handleResponse = async (res: Response) => {
  if (!res.ok) {
    let errorDetails = '';
    try {
      const errorJson = await res.json();
      errorDetails = errorJson.error?.message || JSON.stringify(errorJson);
    } catch {
      errorDetails = await res.text();
    }
    throw new Error(`Google Drive API Error (${res.status}): ${errorDetails}`);
  }
  return res.json();
};

export const fetchSharedDrives = async (accessToken: string): Promise<SharedDrive[]> => {
  try {
    const url = `${BASE_URL}/drives?pageSize=100`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      console.warn('Could not list shared drives directly:', res.status);
      return [];
    }
    const data = await res.json();
    return data.drives || [];
  } catch (err) {
    console.warn('Error fetching shared drives:', err);
    return [];
  }
};

export const locateBarretoCamposDrive = async (accessToken: string): Promise<DriveContext> => {
  // 1. Check Shared Drives for "BARRETO E CAMPOS"
  const sharedDrives = await fetchSharedDrives(accessToken);
  const matchedSharedDrive = sharedDrives.find(d => {
    const normalized = d.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return normalized.includes('barretoecampos') || normalized.includes('barretocampos');
  });

  if (matchedSharedDrive) {
    return {
      driveId: matchedSharedDrive.id,
      rootFolderId: matchedSharedDrive.id,
      driveName: matchedSharedDrive.name,
      isSharedDrive: true,
      isFolderFound: true,
      descendantFolderIds: [matchedSharedDrive.id],
    };
  }

  // 2. Search strictly for a folder named "BARRETO E CAMPOS"
  try {
    const queries = [
      "mimeType = 'application/vnd.google-apps.folder' and trashed = false and name = 'BARRETO E CAMPOS'",
      "mimeType = 'application/vnd.google-apps.folder' and trashed = false and (name contains 'BARRETO E CAMPOS' or name contains 'Barreto e Campos' or name contains 'BARRETO & CAMPOS' or name contains 'Barreto & Campos')",
    ];

    for (const q of queries) {
      const url = `${BASE_URL}/files?q=${encodeURIComponent(q)}&supportsAllDrives=true&includeItemsFromAllDrives=true&fields=files(id,name,parents,webViewLink)&pageSize=10`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        const files = data.files || [];
        if (files.length > 0) {
          const exact = files.find((f: any) => {
            const n = f.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            return n.includes('barretoecampos') || n.includes('barretocampos');
          }) || files[0];

          return {
            driveId: null,
            rootFolderId: exact.id,
            driveName: exact.name,
            isSharedDrive: false,
            isFolderFound: true,
            descendantFolderIds: [exact.id],
          };
        }
      }
    }
  } catch (err) {
    console.warn('Error querying Barreto e Campos folder:', err);
  }

  // 3. Not found yet: Do NOT fallback to general Drive root!
  return {
    driveId: null,
    rootFolderId: null,
    driveName: TARGET_FOLDER_NAME,
    isSharedDrive: false,
    isFolderFound: false,
    descendantFolderIds: [],
  };
};

export const createBarretoCamposRootFolder = async (
  accessToken: string
): Promise<DriveContext> => {
  const body = {
    name: TARGET_FOLDER_NAME,
    mimeType: 'application/vnd.google-apps.folder',
  };

  const url = `${BASE_URL}/files?supportsAllDrives=true`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await handleResponse(res);
  const rootId = data.id;

  // Create standard law office subfolders automatically inside BARRETO E CAMPOS
  const defaultSubfolders = [
    '01 - Processos Judiciais',
    '02 - Contratos & Minutas',
    '03 - Societário & M&A',
    '04 - Tributário & Fiscal',
    '05 - Trabalhista & RH',
    '06 - Clientes & Documentos',
    '07 - Financeiro & Administrativo',
  ];

  for (const subName of defaultSubfolders) {
    try {
      await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: subName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [rootId],
        }),
      });
    } catch (e) {
      console.warn('Error creating starter subfolder:', e);
    }
  }

  return {
    driveId: null,
    rootFolderId: rootId,
    driveName: TARGET_FOLDER_NAME,
    isSharedDrive: false,
    isFolderFound: true,
    descendantFolderIds: [rootId],
  };
};

export const fetchAllFolders = async (
  accessToken: string,
  context: DriveContext
): Promise<{ tree: FolderNode[]; allFolderIds: string[] }> => {
  if (!context.rootFolderId) {
    return { tree: [], allFolderIds: [] };
  }

  const rootId = context.rootFolderId;
  const foldersMap = new Map<string, FolderNode>();
  let pageToken: string | undefined;

  let corporaParam = '';
  if (context.isSharedDrive && context.driveId) {
    corporaParam = `&driveId=${context.driveId}&corpora=drive`;
  }

  try {
    do {
      const q = encodeURIComponent("mimeType = 'application/vnd.google-apps.folder' and trashed = false");
      let url = `${BASE_URL}/files?q=${q}&supportsAllDrives=true&includeItemsFromAllDrives=true&pageSize=250&fields=nextPageToken,files(id,name,parents,modifiedTime,properties)${corporaParam}`;
      if (pageToken) {
        url += `&pageToken=${encodeURIComponent(pageToken)}`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await handleResponse(res);

      const localMetadata = getStoredFileMetadata();
      const files = data.files || [];
      for (const f of files) {
        const local = localMetadata[f.id];
        const category = f.properties?.office_category || local?.category || '';
        const tagsRaw = f.properties?.office_tags || (local?.tags ? local.tags.join(',') : '');
        const tags = tagsRaw ? tagsRaw.split(',').map((t: string) => t.trim()).filter(Boolean) : [];

        foldersMap.set(f.id, {
          id: f.id,
          name: f.name,
          parentId: f.parents && f.parents.length > 0 ? f.parents[0] : null,
          children: [],
          path: f.name,
          category,
          tags,
        });
      }

      pageToken = data.nextPageToken;
    } while (pageToken && foldersMap.size < 600);
  } catch (err) {
    console.error('Error fetching folders:', err);
  }

  // Filter ONLY folders that are descendants of BARRETO E CAMPOS root
  const isDescendantOfRoot = (nodeId: string): boolean => {
    if (nodeId === rootId) return true;
    let current = foldersMap.get(nodeId);
    let iterations = 0;
    while (current && current.parentId && iterations < 30) {
      if (current.parentId === rootId) return true;
      current = foldersMap.get(current.parentId);
      iterations++;
    }
    return false;
  };

  const validFolderIds = new Set<string>();
  validFolderIds.add(rootId);

  foldersMap.forEach((_, id) => {
    if (isDescendantOfRoot(id)) {
      validFolderIds.add(id);
    }
  });

  // Construct hierarchy restricted to BARRETO E CAMPOS
  const rootNodes: FolderNode[] = [];

  validFolderIds.forEach((id) => {
    if (id === rootId) return; // Top-level
    const node = foldersMap.get(id);
    if (!node) return;

    if (node.parentId === rootId) {
      node.path = `${context.driveName} / ${node.name}`;
      rootNodes.push(node);
    } else if (node.parentId && validFolderIds.has(node.parentId)) {
      const parent = foldersMap.get(node.parentId);
      if (parent) {
        node.path = `${parent.path} / ${node.name}`;
        parent.children.push(node);
        parent.subfolderCount = (parent.subfolderCount || 0) + 1;
      }
    }
  });

  return {
    tree: rootNodes,
    allFolderIds: Array.from(validFolderIds),
  };
};

export interface SearchOptions {
  query?: string;
  folderId?: string | null;
  mimeGroup?: string;
  modifiedRange?: string;
  customDateStart?: string;
  customDateEnd?: string;
  searchContent?: boolean;
  selectedCategory?: string;
  selectedTags?: string[];
  sortBy?: 'name' | 'modifiedTime' | 'size';
  sortOrder?: 'asc' | 'desc';
}

export const searchDriveFiles = async (
  accessToken: string,
  context: DriveContext,
  options: SearchOptions
): Promise<DriveFile[]> => {
  if (!context.rootFolderId) {
    return [];
  }

  const rootId = context.rootFolderId;
  const targetFolderId = options.folderId || rootId;
  const isTargetingSpecificFolder = Boolean(options.folderId);

  const queryParts: string[] = ['trashed = false'];

  // STRICT SCOPING: If user is viewing a folder or root without global text search, limit strictly to direct children
  if (isTargetingSpecificFolder || (!options.query?.trim() && !options.selectedCategory && (!options.selectedTags || options.selectedTags.length === 0))) {
    queryParts.push(`'${targetFolderId}' in parents`);
  }

  // Text search
  if (options.query && options.query.trim()) {
    const cleaned = options.query.trim().replace(/'/g, "\\'");
    if (options.searchContent) {
      queryParts.push(`(name contains '${cleaned}' or fullText contains '${cleaned}')`);
    } else {
      queryParts.push(`name contains '${cleaned}'`);
    }
  }

  // Mime types
  if (options.mimeGroup && options.mimeGroup !== 'all') {
    switch (options.mimeGroup) {
      case 'folders':
        queryParts.push("mimeType = 'application/vnd.google-apps.folder'");
        break;
      case 'documents':
        queryParts.push(
          "(mimeType = 'application/vnd.google-apps.document' or mimeType contains 'word' or mimeType contains 'text/plain' or mimeType = 'application/rtf')"
        );
        break;
      case 'spreadsheets':
        queryParts.push(
          "(mimeType = 'application/vnd.google-apps.spreadsheet' or mimeType contains 'excel' or mimeType contains 'spreadsheet' or mimeType = 'text/csv')"
        );
        break;
      case 'presentations':
        queryParts.push(
          "(mimeType = 'application/vnd.google-apps.presentation' or mimeType contains 'presentation' or mimeType contains 'powerpoint')"
        );
        break;
      case 'pdfs':
        queryParts.push("mimeType = 'application/pdf'");
        break;
      case 'images':
        queryParts.push("mimeType contains 'image/'");
        break;
      case 'others':
        queryParts.push(
          "mimeType != 'application/vnd.google-apps.folder' and mimeType != 'application/vnd.google-apps.document' and mimeType != 'application/pdf' and mimeType != 'application/vnd.google-apps.spreadsheet'"
        );
        break;
    }
  }

  // Date filters
  const now = new Date();
  if (options.modifiedRange === 'today') {
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    queryParts.push(`modifiedTime >= '${startOfDay}'`);
  } else if (options.modifiedRange === '7days') {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    queryParts.push(`modifiedTime >= '${sevenDaysAgo}'`);
  } else if (options.modifiedRange === '30days') {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    queryParts.push(`modifiedTime >= '${thirtyDaysAgo}'`);
  } else if (options.modifiedRange === 'year') {
    const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();
    queryParts.push(`modifiedTime >= '${startOfYear}'`);
  } else if (options.modifiedRange === 'custom') {
    if (options.customDateStart) {
      queryParts.push(`modifiedTime >= '${new Date(options.customDateStart).toISOString()}'`);
    }
    if (options.customDateEnd) {
      const end = new Date(options.customDateEnd);
      end.setHours(23, 59, 59, 999);
      queryParts.push(`modifiedTime <= '${end.toISOString()}'`);
    }
  }

  let corporaParam = '';
  if (context.isSharedDrive && context.driveId) {
    corporaParam = `&driveId=${context.driveId}&corpora=drive`;
  }

  // Sorting
  let orderBy = 'folder,modifiedTime desc';
  if (options.sortBy === 'name') {
    orderBy = `folder,name ${options.sortOrder || 'asc'}`;
  } else if (options.sortBy === 'modifiedTime') {
    orderBy = `folder,modifiedTime ${options.sortOrder || 'desc'}`;
  } else if (options.sortBy === 'size') {
    orderBy = `folder,quotaBytesUsed ${options.sortOrder || 'desc'}`;
  }

  const q = encodeURIComponent(queryParts.join(' and '));
  const fields = encodeURIComponent(
    'files(id,name,mimeType,modifiedTime,createdTime,size,iconLink,webViewLink,thumbnailLink,parents,properties,appProperties)'
  );

  const url = `${BASE_URL}/files?q=${q}&orderBy=${encodeURIComponent(orderBy)}&supportsAllDrives=true&includeItemsFromAllDrives=true&pageSize=100&fields=${fields}${corporaParam}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await handleResponse(res);

  const localMetadata = getStoredFileMetadata();
  const validScopeIds = new Set(context.descendantFolderIds || [rootId]);

  const rawFiles: any[] = data.files || [];

  // Filter ONLY items whose parents belong to the BARRETO E CAMPOS hierarchy
  const scopedFiles = rawFiles.filter((f) => {
    // If we are on a dedicated shared drive for BARRETO E CAMPOS, all files belong to it
    if (context.isSharedDrive) return true;

    // Direct match with active folder
    if (options.folderId) {
      return f.parents && f.parents.includes(options.folderId);
    }

    // Otherwise must belong to any folder within the BARRETO E CAMPOS hierarchy
    if (!f.parents || f.parents.length === 0) return false;
    return f.parents.some((pId: string) => validScopeIds.has(pId));
  });

  const files: DriveFile[] = scopedFiles.map((f: any) => {
    const isFolder = f.mimeType === 'application/vnd.google-apps.folder';
    const local = localMetadata[f.id];

    const category = f.properties?.office_category || local?.category || '';
    const tagsRaw = f.properties?.office_tags || (local?.tags ? local.tags.join(',') : '');
    const tags = tagsRaw ? tagsRaw.split(',').map((t: string) => t.trim()).filter(Boolean) : [];

    return {
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      modifiedTime: f.modifiedTime,
      createdTime: f.createdTime,
      size: f.size,
      iconLink: f.iconLink,
      webViewLink: f.webViewLink,
      thumbnailLink: f.thumbnailLink,
      parents: f.parents,
      properties: f.properties,
      appProperties: f.appProperties,
      isFolder,
      category,
      tags,
    };
  });

  // Client-side filtering for custom categories and tags
  let filtered = files;
  if (options.selectedCategory) {
    filtered = filtered.filter(f => f.category === options.selectedCategory);
  }
  if (options.selectedTags && options.selectedTags.length > 0) {
    filtered = filtered.filter(f => 
      options.selectedTags!.some(tag => f.tags?.includes(tag))
    );
  }

  return filtered;
};

export const updateFileTagsAndCategory = async (
  accessToken: string,
  fileId: string,
  category: string,
  tags: string[]
): Promise<void> => {
  saveFileMetadata(fileId, category, tags);

  try {
    const url = `${BASE_URL}/files/${fileId}?supportsAllDrives=true`;
    const res = await fetch(url, {
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
    if (!res.ok) {
      console.warn('Could not patch Drive properties, saved in local cache.');
    }
  } catch (err) {
    console.warn('Drive properties patch failed, local storage preserved:', err);
  }
};

export const createFolderInDrive = async (
  accessToken: string,
  context: DriveContext,
  folderName: string,
  parentId?: string | null
): Promise<DriveFile> => {
  const targetParent = parentId || context.rootFolderId;

  const body: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };

  if (targetParent) {
    body.parents = [targetParent];
  }

  const url = `${BASE_URL}/files?supportsAllDrives=true`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await handleResponse(res);
  return {
    id: data.id,
    name: data.name,
    mimeType: data.mimeType,
    isFolder: true,
  };
};

export const moveDriveFolderOrFile = async (
  accessToken: string,
  fileId: string,
  currentParentId: string,
  newParentId: string
): Promise<void> => {
  const url = `${BASE_URL}/files/${fileId}?addParents=${encodeURIComponent(newParentId)}&removeParents=${encodeURIComponent(currentParentId)}&supportsAllDrives=true`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  await handleResponse(res);
};

export const moveFileOrFolderToDestination = async (
  accessToken: string,
  fileId: string,
  newParentId: string,
  oldParentId?: string | null
): Promise<void> => {
  let removeParam = '';
  if (oldParentId) {
    removeParam = `&removeParents=${encodeURIComponent(oldParentId)}`;
  } else {
    try {
      const getRes = await fetch(`${BASE_URL}/files/${fileId}?supportsAllDrives=true&fields=parents`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (getRes.ok) {
        const fileData = await getRes.json();
        if (fileData.parents && fileData.parents.length > 0) {
          removeParam = `&removeParents=${encodeURIComponent(fileData.parents.join(','))}`;
        }
      }
    } catch (e) {
      console.warn('Could not read parents for removal:', e);
    }
  }

  const url = `${BASE_URL}/files/${fileId}?addParents=${encodeURIComponent(newParentId)}${removeParam}&supportsAllDrives=true`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  await handleResponse(res);
};
