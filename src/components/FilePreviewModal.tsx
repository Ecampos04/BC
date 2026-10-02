import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ExternalLink, 
  FileText, 
  Tag as TagIcon, 
  Layers, 
  Copy, 
  Check, 
  Maximize2, 
  Minimize2,
  ZoomIn, 
  ZoomOut,
  Image as ImageIcon,
  FileSpreadsheet,
  Presentation,
  BookOpen,
  PanelRightClose,
  PanelRightOpen,
  Sun,
  Moon,
  Coffee,
  ScrollText,
  AlignCenter,
  Maximize,
  Info,
  Scale
} from 'lucide-react';
import { DriveFile, CustomCategory } from '../types/drive';
import { formatDate, formatFileSize, getMimeTypeLabel } from '../utils/formatters';

interface FilePreviewModalProps {
  file: DriveFile | null;
  onClose: () => void;
  onEditTags: (file: DriveFile) => void;
  categories: CustomCategory[];
  accessToken: string;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  file,
  onClose,
  onEditTags,
  categories,
  accessToken,
}) => {
  const [copied, setCopied] = useState(false);
  const [imgZoom, setImgZoom] = useState(1);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [readingWidth, setReadingWidth] = useState<'comfortable' | 'full'>('comfortable');
  const [readingTheme, setReadingTheme] = useState<'neutral' | 'sepia' | 'dark'>('neutral');
  const [showSidebarDrawer, setShowSidebarDrawer] = useState(false);
  const [showShortcutToast, setShowShortcutToast] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const modalContainerRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut listener for Focus Mode (F) and Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input, textarea or contentEditable
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        setIsFocusMode((prev) => {
          const next = !prev;
          if (next) {
            setShowShortcutToast(true);
            setTimeout(() => setShowShortcutToast(false), 2500);
          }
          return next;
        });
      } else if (e.key === 'Escape') {
        if (showSidebarDrawer) {
          e.preventDefault();
          setShowSidebarDrawer(false);
        } else if (isFocusMode) {
          e.preventDefault();
          setIsFocusMode(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSidebarDrawer, isFocusMode]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleBrowserFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (modalContainerRef.current) {
          await modalContainerRef.current.requestFullscreen();
        } else {
          await document.documentElement.requestFullscreen();
        }
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Fallback if browser blocks fullscreen
      setIsFocusMode(true);
    }
  };

  if (!file) return null;

  const isImage = file.mimeType.startsWith('image/');
  const isPdf = file.mimeType === 'application/pdf';
  const isGoogleDoc = file.mimeType === 'application/vnd.google-apps.document';
  const isGoogleSheet = file.mimeType === 'application/vnd.google-apps.spreadsheet';
  const isGoogleSlide = file.mimeType === 'application/vnd.google-apps.presentation';
  const isOfficeDoc = 
    file.mimeType.includes('word') || 
    file.mimeType.includes('officedocument') || 
    file.mimeType.includes('excel') || 
    file.mimeType.includes('powerpoint');

  // Preview URL generator for Google Drive
  const previewUrl = `https://drive.google.com/file/d/${file.id}/preview`;
  const highResThumbnail = file.thumbnailLink ? file.thumbnailLink.replace(/=s\d+/, '=s1600') : null;

  const handleCopyLink = () => {
    if (file.webViewLink) {
      navigator.clipboard.writeText(file.webViewLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const fileCategory = categories.find((c) => c.name === file.category);

  // Background style based on readingTheme in focus mode
  const getThemeBackground = () => {
    if (!isFocusMode) {
      return 'bg-slate-100 dark:bg-slate-950';
    }
    switch (readingTheme) {
      case 'sepia':
        return 'bg-[#fbf7ee] dark:bg-[#1f1b16] text-[#433422]';
      case 'dark':
        return 'bg-slate-950 text-slate-100';
      case 'neutral':
      default:
        return 'bg-slate-100 dark:bg-slate-900';
    }
  };

  const isPetitionOrDoc = isPdf || isGoogleDoc || isOfficeDoc;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs ${isFocusMode ? 'p-0 sm:p-2' : 'p-2 sm:p-4'} overflow-hidden transition-all duration-200`}>
      <div 
        ref={modalContainerRef}
        className={`bg-white dark:bg-slate-900 shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-300 ease-out ${
          isFocusMode 
            ? isFullscreen
              ? 'w-screen h-screen rounded-none border-none'
              : 'w-full max-w-[99vw] h-[98vh] rounded-xl sm:rounded-2xl' 
            : 'w-full max-w-5xl h-[90vh] rounded-2xl'
        }`}
      >
        {/* Top Header */}
        <div className={`flex items-center justify-between px-4 sm:px-6 py-2.5 sm:py-3 border-b border-slate-200 dark:border-slate-800 transition-colors duration-200 ${
          isFocusMode
            ? readingTheme === 'sepia' 
              ? 'bg-[#f4efe4] dark:bg-[#1a1713] border-[#e6decf] dark:border-[#302a22]'
              : readingTheme === 'dark'
                ? 'bg-slate-900 border-slate-800 text-white'
                : 'bg-white dark:bg-slate-900'
            : 'bg-slate-50 dark:bg-slate-850'
        }`}>
          {/* Left Title & Status */}
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2 rounded-lg shrink-0 transition-colors ${
              isFocusMode 
                ? 'bg-amber-500 text-white shadow-xs' 
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
            }`}>
              {isFocusMode ? (
                <BookOpen className="w-5 h-5 animate-in zoom-in-75 duration-200" />
              ) : isImage ? (
                <ImageIcon className="w-5 h-5" />
              ) : isGoogleSheet ? (
                <FileSpreadsheet className="w-5 h-5" />
              ) : isGoogleSlide ? (
                <Presentation className="w-5 h-5" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md md:max-w-xl" title={file.name}>
                  {file.name}
                </h2>
                {isFocusMode && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/80 shrink-0">
                    <Scale className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    Leitura Focada de Petição
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {getMimeTypeLabel(file.mimeType)}
                </span>
                <span>•</span>
                <span>{formatFileSize(file.size)}</span>
                <span className="hidden md:inline">•</span>
                <span className="hidden md:inline">Modificado: {formatDate(file.modifiedTime)}</span>
                {file.category && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <span 
                      className="hidden sm:inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium text-white"
                      style={{ backgroundColor: fileCategory?.color || '#a82b52' }}
                    >
                      {file.category}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Action Icons & Focus Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* FOCUS MODE CONTROLS (Displayed when in Focus Mode) */}
            {isFocusMode ? (
              <div className="flex items-center gap-1 sm:gap-2">
                {/* Reading Width Toggle */}
                <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => setReadingWidth('comfortable')}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                      readingWidth === 'comfortable'
                        ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                    title="Coluna de Leitura Confortável (padrão petição A4)"
                  >
                    <AlignCenter className="w-3.5 h-3.5" />
                    <span>A4 Confortável</span>
                  </button>
                  <button
                    onClick={() => setReadingWidth('full')}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                      readingWidth === 'full'
                        ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                    title="Largura Total (100% da tela)"
                  >
                    <Maximize className="w-3.5 h-3.5" />
                    <span>Expandida</span>
                  </button>
                </div>

                {/* Reading Theme Selector */}
                <div className="hidden md:flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => setReadingTheme('neutral')}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      readingTheme === 'neutral'
                        ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                    title="Tema Neutro / Padrão"
                  >
                    Neutro
                  </button>
                  <button
                    onClick={() => setReadingTheme('sepia')}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                      readingTheme === 'sepia'
                        ? 'bg-[#f4efe4] text-[#784f1b] font-bold shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-amber-600'
                    }`}
                    title="Tema Sépia (conforto visual para leituras longas)"
                  >
                    <Coffee className="w-3.5 h-3.5" />
                    <span>Sépia</span>
                  </button>
                  <button
                    onClick={() => setReadingTheme('dark')}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                      readingTheme === 'dark'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                    title="Tema Noturno / Alto Contraste"
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>Escuro</span>
                  </button>
                </div>

                {/* Drawer toggle for metadata in focus mode */}
                <button
                  onClick={() => setShowSidebarDrawer((prev) => !prev)}
                  className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 transition-colors ${
                    showSidebarDrawer
                      ? 'bg-amber-100 dark:bg-amber-950 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title="Ver/Ocultar painel de detalhes e etiquetas da petição"
                >
                  {showSidebarDrawer ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
                  <span className="hidden lg:inline">{showSidebarDrawer ? 'Ocultar Detalhes' : 'Detalhes'}</span>
                </button>

                {/* Fullscreen browser toggle */}
                <button
                  onClick={toggleBrowserFullscreen}
                  className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  title={isFullscreen ? 'Sair da Tela Cheia do Navegador' : 'Tela Cheia do Navegador'}
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>

                {/* EXIT FOCUS MODE BUTTON */}
                <button
                  onClick={() => {
                    setIsFocusMode(false);
                    setShowSidebarDrawer(false);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors shadow-xs"
                  title="Sair do Modo de Leitura Focada (restaurar painéis normais) [Atalho: ESC ou F]"
                >
                  <Minimize2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Sair do Foco</span>
                  <span className="hidden sm:inline text-[10px] px-1 py-0.2 bg-slate-300 dark:bg-slate-700 rounded font-mono text-slate-600 dark:text-slate-300">
                    ESC
                  </span>
                </button>
              </div>
            ) : (
              /* STANDARD MODE: ENTER FOCUS MODE BUTTON */
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => {
                    setIsFocusMode(true);
                    setShowShortcutToast(true);
                    setTimeout(() => setShowShortcutToast(false), 2500);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs hover:shadow-md transition-all group"
                  title="Ativar Modo de Leitura Focada: oculta painéis laterais e expande a petição para máxima legibilidade [Atalho: F]"
                >
                  <BookOpen className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>Leitura Focada</span>
                  <span className="hidden sm:inline text-[10px] px-1 py-0.2 bg-amber-700/60 rounded font-mono text-amber-100">
                    F
                  </span>
                </button>
              </div>
            )}

            {/* Quick Actions: Copy Link & Open in Drive */}
            <button
              onClick={handleCopyLink}
              className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors text-xs flex items-center gap-1"
              title="Copiar Link do Arquivo"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              <span className="hidden sm:inline">{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>

            {file.webViewLink && (
              <a
                href={file.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-medium transition-colors shadow-xs"
                title="Abrir diretamente no Google Drive para editar ou comentar"
              >
                <span>Drive</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors ml-0.5"
              title="Fechar Visualização (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Temporary keyboard hint toast */}
        {showShortcutToast && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-60 bg-slate-900/90 text-white text-xs px-4 py-2 rounded-full shadow-lg backdrop-blur-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200 border border-slate-700">
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span>Modo de Leitura Focada ativado! Menus laterais ocultados para facilitar a revisão.</span>
            <span className="text-slate-400 text-[11px]">(Pressione F ou ESC para sair)</span>
          </div>
        )}

        {/* Content Preview & Inspection Area */}
        <div className={`flex-1 relative flex flex-col md:flex-row min-h-0 ${getThemeBackground()} transition-colors duration-200 overflow-hidden`}>
          {/* Main Viewer Canvas */}
          <div className={`flex-1 relative flex flex-col items-center justify-center overflow-hidden transition-all duration-300 ${
            isFocusMode
              ? readingWidth === 'comfortable'
                ? 'p-2 sm:p-4 md:p-6'
                : 'p-1 sm:p-2'
              : 'p-2 sm:p-4'
          }`}>
            {isImage ? (
              <div className="relative w-full h-full flex flex-col items-center justify-center overflow-auto p-2">
                <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-black/70 backdrop-blur-xs text-white p-1 rounded-lg shadow-lg">
                  <button
                    onClick={() => setImgZoom((z) => Math.max(0.5, z - 0.25))}
                    className="p-1 hover:bg-white/20 rounded"
                    title="Diminuir Zoom"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-xs px-1 font-mono">{Math.round(imgZoom * 100)}%</span>
                  <button
                    onClick={() => setImgZoom((z) => Math.min(3, z + 0.25))}
                    className="p-1 hover:bg-white/20 rounded"
                    title="Aumentar Zoom"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setImgZoom(1)}
                    className="p-1 hover:bg-white/20 rounded text-[10px]"
                    title="Resetar Zoom"
                  >
                    100%
                  </button>
                </div>
                <img
                  src={highResThumbnail || file.thumbnailLink || previewUrl}
                  alt={file.name}
                  style={{ transform: `scale(${imgZoom})` }}
                  className={`max-h-full max-w-full object-contain transition-transform duration-100 rounded-lg shadow-xl ${
                    isFocusMode && readingWidth === 'comfortable' ? 'max-w-4xl' : ''
                  }`}
                />
              </div>
            ) : isPdf || isGoogleDoc || isGoogleSheet || isGoogleSlide || isOfficeDoc ? (
              /* Optimized Document Container for Petitions */
              <div className={`w-full h-full flex flex-col transition-all duration-300 ${
                isFocusMode && readingWidth === 'comfortable'
                  ? 'max-w-5xl mx-auto shadow-2xl rounded-xl overflow-hidden border border-slate-300/80 dark:border-slate-800'
                  : 'rounded-lg overflow-hidden shadow-inner'
              } bg-white dark:bg-slate-900`}>
                <iframe
                  src={previewUrl}
                  title={`Visualização de ${file.name}`}
                  className="w-full h-full border-0 bg-white"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                />
              </div>
            ) : (
              /* Fallback file card if file format is binary or external */
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 max-w-md text-center shadow-lg">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8" />
                </div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-base mb-1">
                  {file.name}
                </h3>
                <p className="text-xs text-slate-500 mb-6">
                  {getMimeTypeLabel(file.mimeType)} • {formatFileSize(file.size)}
                </p>
                <div className="space-y-2">
                  {file.webViewLink && (
                    <a
                      href={file.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                    >
                      <span>Abrir no Google Drive</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  <p className="text-[11px] text-slate-400">
                    O formato deste documento requer abertura direta no visualizador do Google Drive ou aplicativo nativo.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* STANDARD SIDEBAR (Visible ONLY when Focus Mode is OFF) */}
          {!isFocusMode && (
            <aside className="w-full md:w-80 bg-white dark:bg-slate-900 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between overflow-y-auto shrink-0 animate-in fade-in duration-200">
              <div className="space-y-5">
                {/* Organization & Categorization Section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-amber-500" />
                      Organização no Escritório
                    </span>
                    <button
                      onClick={() => onEditTags(file)}
                      className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-medium"
                    >
                      Editar
                    </button>
                  </div>

                  {/* Category Display */}
                  <div className="mb-3">
                    <span className="text-[11px] text-slate-400 block mb-1">Categoria:</span>
                    {file.category ? (
                      <div
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-white shadow-xs"
                        style={{ backgroundColor: fileCategory?.color || '#a82b52' }}
                      >
                        <span>{file.category}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Sem categoria definida</span>
                    )}
                  </div>

                  {/* Tags Display */}
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">Etiquetas Personalizadas:</span>
                    {file.tags && file.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {file.tags.map((t, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Nenhuma etiqueta atribuída</span>
                    )}
                  </div>
                </div>

                {/* Technical Metadata */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3 text-xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Informações do Arquivo
                  </span>

                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-400">Tipo:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200 text-right truncate max-w-[170px]" title={file.mimeType}>
                      {getMimeTypeLabel(file.mimeType)}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-400">Tamanho:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {formatFileSize(file.size)}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-400">Modificado:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {formatDate(file.modifiedTime)}
                    </span>
                  </div>

                  {file.createdTime && (
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                      <span className="text-slate-400">Criado:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {formatDate(file.createdTime)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">ID Drive:</span>
                    <span className="font-mono text-[10px] text-slate-500 truncate max-w-[170px]" title={file.id}>
                      {file.id}
                    </span>
                  </div>
                </div>

                {/* Quick focus prompt in sidebar */}
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/50">
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-semibold text-amber-900 dark:text-amber-200">Dica de Revisão</span>
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300/90 leading-relaxed">
                    Ative a <strong>Leitura Focada</strong> para ocultar este menu e revisar peças processuais longas com tela cheia e contraste ajustado.
                  </p>
                  <button
                    onClick={() => setIsFocusMode(true)}
                    className="mt-2 w-full py-1.5 px-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors text-center"
                  >
                    Ativar Leitura Focada (F)
                  </button>
                </div>
              </div>

              {/* Bottom Button */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => onEditTags(file)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors"
                >
                  <TagIcon className="w-3.5 h-3.5 text-amber-500" />
                  <span>Modificar Etiquetas e Categoria</span>
                </button>
              </div>
            </aside>
          )}

          {/* FOCUS MODE SIDEBAR DRAWER (Slides over when explicitly requested in Focus Mode) */}
          {isFocusMode && showSidebarDrawer && (
            <div className="absolute inset-y-0 right-0 z-40 w-full sm:w-88 bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-250">
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-amber-500" />
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      Detalhes da Petição
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowSidebarDrawer(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                    title="Fechar painel de detalhes"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Organization & Categorization Section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-amber-500" />
                      Organização no Escritório
                    </span>
                    <button
                      onClick={() => onEditTags(file)}
                      className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-medium"
                    >
                      Editar
                    </button>
                  </div>

                  {/* Category Display */}
                  <div className="mb-3">
                    <span className="text-[11px] text-slate-400 block mb-1">Categoria:</span>
                    {file.category ? (
                      <div
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-white shadow-xs"
                        style={{ backgroundColor: fileCategory?.color || '#a82b52' }}
                      >
                        <span>{file.category}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Sem categoria definida</span>
                    )}
                  </div>

                  {/* Tags Display */}
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">Etiquetas Personalizadas:</span>
                    {file.tags && file.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {file.tags.map((t, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Nenhuma etiqueta atribuída</span>
                    )}
                  </div>
                </div>

                {/* Technical Metadata */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3 text-xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Informações do Arquivo
                  </span>

                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-400">Tipo:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200 text-right truncate max-w-[170px]" title={file.mimeType}>
                      {getMimeTypeLabel(file.mimeType)}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-400">Tamanho:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {formatFileSize(file.size)}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-400">Modificado:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {formatDate(file.modifiedTime)}
                    </span>
                  </div>

                  {file.createdTime && (
                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                      <span className="text-slate-400">Criado:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {formatDate(file.createdTime)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">ID Drive:</span>
                    <span className="font-mono text-[10px] text-slate-500 truncate max-w-[170px]" title={file.id}>
                      {file.id}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Actions inside drawer */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <button
                  onClick={() => onEditTags(file)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
                >
                  <TagIcon className="w-3.5 h-3.5" />
                  <span>Modificar Etiquetas e Categoria</span>
                </button>
                <button
                  onClick={() => setShowSidebarDrawer(false)}
                  className="w-full py-1.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition-colors"
                >
                  Voltar à Leitura Focada
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
