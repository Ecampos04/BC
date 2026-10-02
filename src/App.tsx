/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { User } from 'firebase/auth';
import { 
  initAuth, 
  googleSignIn, 
  logout, 
  getAccessToken 
} from './services/auth';
import { 
  DriveFile, 
  FolderNode, 
  FilterState, 
  CustomCategory, 
  CustomTag 
} from './types/drive';
import { 
  locateBarretoCamposDrive, 
  createBarretoCamposRootFolder,
  fetchAllFolders, 
  searchDriveFiles, 
  updateFileTagsAndCategory, 
  createFolderInDrive, 
  DriveContext,
  TARGET_FOLDER_NAME
} from './services/driveApi';
import { 
  getStoredCategories, 
  saveCategories, 
  getStoredTags, 
  saveTags 
} from './services/tagStorage';
import { Header } from './components/Header';
import { LoginScreen } from './components/LoginScreen';
import { DriveFolderNotFound } from './components/DriveFolderNotFound';
import { FolderTree } from './components/FolderTree';
import { AdvancedSearch } from './components/AdvancedSearch';
import { FileList } from './components/FileList';
import { FilePreviewModal } from './components/FilePreviewModal';
import { TagFileModal } from './components/TagFileModal';
import { TagManagerModal } from './components/TagManagerModal';
import { CreateFolderModal } from './components/CreateFolderModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { PendingInitialsManager } from './components/PendingInitialsManager';
import { DriveAnalyticsModal } from './components/DriveAnalyticsModal';
import { SmartBackupModal } from './components/SmartBackupModal';
import { applySuggestedFolderMetadata } from './services/folderTagging';
import { AlertCircle, CheckCircle, ChevronRight, Folder, FolderTree as TreeIcon, HardDrive, FolderSync, ShieldCheck, ShieldAlert } from 'lucide-react';

const INITIAL_FILTER: FilterState = {
  query: '',
  folderId: null,
  folderName: undefined,
  mimeGroup: 'all',
  modifiedRange: 'all',
  searchContent: false,
  selectedCategory: undefined,
  selectedTags: [],
  sortBy: 'modifiedTime',
  sortOrder: 'desc',
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState<boolean>(true);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Drive state
  const [driveContext, setDriveContext] = useState<DriveContext | null>(null);
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingFolders, setIsLoadingFolders] = useState<boolean>(false);

  // Filters & Custom Tags
  const [filter, setFilter] = useState<FilterState>(INITIAL_FILTER);
  const [categories, setCategories] = useState<CustomCategory[]>(getStoredCategories);
  const [tags, setTags] = useState<CustomTag[]>(getStoredTags);

  // Modals state
  const [previewFile, setPreviewFile] = useState<DriveFile | null>(null);
  const [taggingFile, setTaggingFile] = useState<DriveFile | null>(null);
  const [isTagManagerOpen, setIsTagManagerOpen] = useState<boolean>(false);
  const [isPendingInitialsOpen, setIsPendingInitialsOpen] = useState<boolean>(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState<boolean>(false);
  const [isSmartBackupOpen, setIsSmartBackupOpen] = useState<boolean>(false);
  const [createFolderParent, setCreateFolderParent] = useState<{ id: string | null; name: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const orphanFilesCount = useMemo(() => {
    return files.filter(f => !f.isFolder && !f.category && (!f.tags || f.tags.length === 0)).length;
  }, [files]);

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  // 1. Initialize Auth on Mount
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setNeedsAuth(false);
      },
      () => {
        setUser(null);
        setToken(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  // 2. Load Barreto e Campos Drive and Folders once authenticated
  const loadDriveData = useCallback(async (accessToken: string) => {
    setIsLoading(true);
    setIsLoadingFolders(true);
    try {
      // Find "BARRETO E CAMPOS" Shared Drive or root folder
      const context = await locateBarretoCamposDrive(accessToken);
      setDriveContext(context);

      if (!context.isFolderFound || !context.rootFolderId) {
        // Stop here: folder not found yet, show dedicated setup view
        setFolders([]);
        setFiles([]);
        setIsLoading(false);
        setIsLoadingFolders(false);
        return;
      }

      // Load folder hierarchy restricted strictly to BARRETO E CAMPOS
      const { tree, allFolderIds } = await fetchAllFolders(accessToken, context);
      await applySuggestedFolderMetadata(tree, accessToken);
      context.descendantFolderIds = allFolderIds;
      setDriveContext({ ...context });
      setFolders([...tree]);

      // Load files strictly within BARRETO E CAMPOS
      const driveFiles = await searchDriveFiles(accessToken, context, filter);
      setFiles(driveFiles);
    } catch (err: any) {
      console.error('Error loading drive data:', err);
      showToast(err.message || 'Erro ao carregar arquivos do Drive', 'error');
    } finally {
      setIsLoading(false);
      setIsLoadingFolders(false);
    }
  }, [filter]);

  const handleCreateRootFolder = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const createdContext = await createBarretoCamposRootFolder(token);
      setDriveContext(createdContext);
      showToast(`Pasta "${TARGET_FOLDER_NAME}" criada com sucesso no Drive com as subpastas iniciais!`);
      await loadDriveData(token);
    } catch (err: any) {
      console.error('Error creating root folder:', err);
      showToast('Falha ao criar pasta: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadDriveData(token);
    }
  }, [token]);

  // 3. Search and filter files when filters change
  const executeSearch = useCallback(async (currentFilter: FilterState) => {
    if (!token || !driveContext) return;
    setIsLoading(true);
    try {
      const results = await searchDriveFiles(token, driveContext, currentFilter);
      setFiles(results);
    } catch (err: any) {
      console.error('Search error:', err);
      showToast('Erro ao realizar busca no Drive', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [token, driveContext]);

  // Debounced search on query change
  useEffect(() => {
    if (!token || !driveContext) return;

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      executeSearch(filter);
    }, 350);

    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, [
    filter.query, 
    filter.folderId, 
    filter.mimeGroup, 
    filter.modifiedRange, 
    filter.customDateStart, 
    filter.customDateEnd, 
    filter.searchContent, 
    filter.selectedCategory, 
    filter.selectedTags, 
    filter.sortBy, 
    filter.sortOrder
  ]);

  // Handlers
  const handleSignIn = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        setNeedsAuth(false);
        showToast('Conectado com sucesso ao Google Drive!');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setAuthError('Não foi possível conectar. Verifique as permissões de acesso ao Google Drive.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setNeedsAuth(true);
    setFiles([]);
    setFolders([]);
    setDriveContext(null);
  };

  const handleSelectFolder = (folderId: string | null, folderName?: string) => {
    setFilter((prev) => ({
      ...prev,
      folderId,
      folderName: folderId ? folderName : undefined,
    }));
  };

  const handleFilterUpdate = (updates: Partial<FilterState>) => {
    setFilter((prev) => ({ ...prev, ...updates }));
  };

  const handleResetFilters = () => {
    setFilter((prev) => ({
      ...INITIAL_FILTER,
      folderId: prev.folderId,
      folderName: prev.folderName,
    }));
  };

  const handleSortChange = (sortBy: 'name' | 'modifiedTime' | 'size') => {
    setFilter((prev) => ({
      ...prev,
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'desc' ? 'asc' : 'desc',
    }));
  };

  // Tag & Category updates
  const handleSaveFileTags = async (fileId: string, category: string, fileTags: string[]) => {
    if (!token) return;
    try {
      await updateFileTagsAndCategory(token, fileId, category, fileTags);

      // Optimistic update in list
      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, category, tags: fileTags } : f))
      );

      // Update in preview modal if open
      if (previewFile && previewFile.id === fileId) {
        setPreviewFile((prev) => (prev ? { ...prev, category, tags: fileTags } : null));
      }

      showToast('Etiquetas e categoria salvas com sucesso!');
    } catch (err) {
      showToast('Erro ao salvar etiquetas.', 'error');
    }
  };

  const handleUpdateCategories = (updatedCategories: CustomCategory[]) => {
    setCategories(updatedCategories);
    saveCategories(updatedCategories);
    showToast('Categorias do escritório atualizadas.');
  };

  const handleUpdateTags = (updatedTags: CustomTag[]) => {
    setTags(updatedTags);
    saveTags(updatedTags);
    showToast('Etiquetas personalizadas atualizadas.');
  };

  const handleCreateNewTag = (tagName: string, tagColor: string) => {
    const newTag: CustomTag = {
      id: `tag_${Date.now()}`,
      name: tagName,
      color: tagColor,
    };
    const updated = [...tags, newTag];
    setTags(updated);
    saveTags(updated);
  };

  // Folder creation with safety
  const handleConfirmCreateFolder = async (folderName: string) => {
    if (!token || !driveContext) return;
    try {
      const parentId = createFolderParent?.id;
      const newFolder = await createFolderInDrive(token, driveContext, folderName, parentId);

      showToast(`Pasta "${folderName}" criada com sucesso no Drive!`);

      // Refresh folder tree
      const { tree, allFolderIds } = await fetchAllFolders(token, driveContext);
      setDriveContext(prev => prev ? { ...prev, descendantFolderIds: allFolderIds } : prev);
      setFolders(tree);

      // Refresh current file view
      executeSearch(filter);
    } catch (err: any) {
      console.error('Error creating folder:', err);
      showToast('Falha ao criar pasta no Drive: ' + err.message, 'error');
    }
  };

  if (needsAuth || !user) {
    return (
      <LoginScreen
        onSignIn={handleSignIn}
        isLoggingIn={isLoggingIn}
        errorMessage={authError}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col text-slate-800 dark:text-slate-100 font-sans">
      {/* Top Bar Header */}
      <Header
        user={user}
        driveContext={driveContext}
        isLoading={isLoading}
        onRefresh={() => token && loadDriveData(token)}
        onOpenTagManager={() => setIsTagManagerOpen(true)}
        onOpenPendingInitials={() => setIsPendingInitialsOpen(true)}
        onOpenAnalytics={() => setIsAnalyticsOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Workspace Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 w-full flex-1 flex flex-col">
        {driveContext && !driveContext.isFolderFound ? (
          <DriveFolderNotFound
            onCheckAgain={() => token && loadDriveData(token)}
            onCreateRootFolder={handleCreateRootFolder}
            isChecking={isLoading}
          />
        ) : (
          <>
            {/* Drive Info Banner */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700/80 rounded-xl px-4 py-3 text-white mb-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="font-serif font-bold text-sm sm:text-base tracking-wide text-white">
                      PASTA EXCLUSIVA: {driveContext?.driveName || 'BARRETO E CAMPOS'}
                    </h1>
                    <span className="text-[10px] bg-amber-500 text-slate-950 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Escritório
                    </span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-medium px-2 py-0.5 rounded-full border border-emerald-500/30 hidden sm:inline-block">
                      🔒 Escopo 100% Restrito
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    {filter.folderName ? (
                      <span className="flex items-center gap-1">
                        <span>Subpasta ativa:</span>
                        <strong className="text-amber-300 font-semibold">{filter.folderName}</strong>
                      </span>
                    ) : (
                      'Operando exclusivamente dentro da pasta BARRETO E CAMPOS. Nenhum outro arquivo do Google Drive é exibido.'
                    )}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                {/* Backup & Organização em Pastas Corretas */}
                <button
                  onClick={() => setIsSmartBackupOpen(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 ${
                    orphanFilesCount > 0
                      ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 animate-pulse'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  }`}
                  title="Organizar e mover arquivos diretamente para as pastas corretas do escritório"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Organizar em Pastas {orphanFilesCount > 0 ? `(${orphanFilesCount})` : ''}</span>
                </button>

                <button
                  onClick={() => setIsPendingInitialsOpen(true)}
                  className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-lg text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5"
                  title="Identificar e transferir pastas de iniciais para as devidas áreas"
                >
                  <FolderSync className="w-3.5 h-3.5" />
                  <span>Iniciais Pós-Protocolo</span>
                </button>

                {filter.folderId && (
                  <button
                    onClick={() => handleSelectFolder(null)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-xs font-medium text-slate-200 transition-colors"
                  >
                    Voltar à Raiz
                  </button>
                )}
                <button
                  onClick={() => setCreateFolderParent({ id: filter.folderId || null, name: filter.folderName || (driveContext?.driveName || 'BARRETO E CAMPOS') })}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  + Nova Subpasta
                </button>
              </div>
            </div>

            {/* Search Engine & Filters */}
            <AdvancedSearch
              filter={filter}
              onFilterChange={handleFilterUpdate}
              onResetFilters={handleResetFilters}
              categories={categories}
              tags={tags}
              selectedFolderName={filter.folderName}
              onClearSelectedFolder={() => handleSelectFolder(null)}
            />

            {/* 2-Column Responsive Layout: Left Folder Tree Locator & Right Files Explorer */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 items-start">
              {/* Left Column: Interactive Folder Tree (Localizador de Pastas) */}
              <div className="lg:col-span-4 xl:col-span-3">
                <FolderTree
                  folders={folders}
                  selectedFolderId={filter.folderId || null}
                  onSelectFolder={handleSelectFolder}
                  onCreateFolderClick={(id, name) => setCreateFolderParent({ id, name })}
                  onEditFolderTags={(id, name, cat, tg) => setTaggingFile({ id, name, mimeType: 'application/vnd.google-apps.folder', isFolder: true, category: cat, tags: tg })}
                  driveName={driveContext?.driveName || 'BARRETO E CAMPOS'}
                />
              </div>

              {/* Right Column: Files & Folders Browser with Quick Preview & Actions */}
              <div className="lg:col-span-8 xl:col-span-9 flex flex-col h-full">
                <FileList
                  files={files}
                  isLoading={isLoading}
                  onSelectFolder={(id, name) => handleSelectFolder(id, name)}
                  onPreviewFile={(file) => setPreviewFile(file)}
                  onEditTags={(file) => setTaggingFile(file)}
                  categories={categories}
                  currentFolderName={filter.folderName}
                  sortBy={filter.sortBy}
                  sortOrder={filter.sortOrder}
                  onSortChange={handleSortChange}
                />
              </div>
            </div>
          </>
        )}
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-xs font-medium text-white border ${
              toastMessage.type === 'error'
                ? 'bg-red-600 border-red-500'
                : 'bg-slate-900 border-slate-700'
            }`}
          >
            {toastMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-200" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Modals */}
      {/* 1. File Quick Preview Modal */}
      <FilePreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
        onEditTags={(file) => {
          setTaggingFile(file);
        }}
        categories={categories}
        accessToken={token || ''}
      />

      {/* 2. File Tagging & Categorization Modal */}
      <TagFileModal
        isOpen={!!taggingFile}
        file={taggingFile}
        categories={categories}
        availableTags={tags}
        onSave={handleSaveFileTags}
        onClose={() => setTaggingFile(null)}
        onCreateNewTag={handleCreateNewTag}
      />

      {/* 3. Office Categories & Tags Manager Modal */}
      <TagManagerModal
        isOpen={isTagManagerOpen}
        onClose={() => setIsTagManagerOpen(false)}
        categories={categories}
        tags={tags}
        onUpdateCategories={handleUpdateCategories}
        onUpdateTags={handleUpdateTags}
      />

      {/* 4. Create Folder Dialog (with Workspace safety confirmation) */}
      <CreateFolderModal
        isOpen={!!createFolderParent}
        parentFolderName={createFolderParent?.name || 'BARRETO E CAMPOS'}
        onClose={() => setCreateFolderParent(null)}
        onConfirmCreate={handleConfirmCreateFolder}
      />

      {/* 5. Iniciais Pendentes & Transferência Pós-Protocolo Module */}
      <PendingInitialsManager
        isOpen={isPendingInitialsOpen}
        onClose={() => setIsPendingInitialsOpen(false)}
        driveContext={driveContext}
        allFolders={folders}
        accessToken={token || ''}
        onRefreshData={() => (token ? loadDriveData(token) : Promise.resolve())}
        showToast={showToast}
      />

      {/* 6. Drive Data Analytics Modal (Recharts) */}
      <DriveAnalyticsModal
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        files={files}
        folders={folders}
        categories={categories}
        tags={tags}
        driveName={driveContext?.driveName || 'BARRETO E CAMPOS'}
      />

      {/* 7. Smart Backup & Orphan Files Audit Modal */}
      <SmartBackupModal
        isOpen={isSmartBackupOpen}
        onClose={() => setIsSmartBackupOpen(false)}
        files={files}
        allFolders={folders}
        driveContext={driveContext}
        categories={categories}
        accessToken={token || ''}
        onRefreshData={() => (token ? loadDriveData(token) : Promise.resolve())}
        showToast={showToast}
        onPreviewFile={(f) => setPreviewFile(f)}
      />
    </div>
  );
}
