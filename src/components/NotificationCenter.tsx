import React, { useState, useRef, useEffect } from 'react';
import { 
  Bell, 
  Check, 
  Trash2, 
  FilePlus2, 
  ShieldCheck, 
  AlertTriangle, 
  FolderSync, 
  ExternalLink, 
  X,
  CheckCheck
} from 'lucide-react';
import { AppNotification } from '../types/notifications';

interface NotificationCenterProps {
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onOpenFilePreview?: (fileId: string) => void;
  onOpenSmartBackup?: () => void;
  onOpenPendingInitials?: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onOpenFilePreview,
  onOpenSmartBackup,
  onOpenPendingInitials,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 45) return 'Agora mesmo';
    if (diffMin < 60) return `há ${diffMin} min`;
    if (diffHours < 24) return `há ${diffHours} h`;
    if (diffDays === 1) return 'Ontem';
    return `há ${diffDays} dias`;
  };

  const getNotificationIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'file_added':
        return <FilePlus2 className="w-4 h-4 text-amber-500" />;
      case 'backup_completed':
        return <ShieldCheck className="w-4 h-4 text-emerald-500" />;
      case 'backup_alert':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'initial_transferred':
        return <FolderSync className="w-4 h-4 text-purple-500" />;
      default:
        return <Bell className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
        title="Notificações do Escritório"
        aria-label="Abrir central de notificações"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-slate-950 shadow-xs animate-bounce">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                Notificações
              </span>
              {unreadCount > 0 && (
                <span className="bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {unreadCount} nova{unreadCount === 1 ? '' : 's'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={onMarkAllAsRead}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-750 rounded text-xs transition-colors"
                  title="Marcar todas como lidas"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={onClearAll}
                  className="p-1 text-slate-400 hover:text-red-500 hover:bg-slate-200 dark:hover:bg-slate-750 rounded text-xs transition-colors"
                  title="Limpar todas as notificações"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-750 rounded text-xs transition-colors ml-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.length === 0 ? (
              <div className="py-10 text-center px-4">
                <Bell className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Nenhuma notificação por enquanto
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Novos arquivos e tarefas do Backup Inteligente aparecerão aqui.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => !item.read && onMarkAsRead(item.id)}
                  className={`p-3.5 text-xs transition-colors flex items-start gap-3 cursor-pointer ${
                    item.read 
                      ? 'bg-transparent hover:bg-slate-50 dark:hover:bg-slate-850' 
                      : 'bg-amber-500/5 hover:bg-amber-500/10'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0 mt-0.5">
                    {getNotificationIcon(item.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`font-semibold truncate ${item.read ? 'text-slate-700 dark:text-slate-300' : 'text-slate-900 dark:text-white'}`}>
                        {item.title}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {formatRelativeTime(item.timestamp)}
                      </span>
                    </div>

                    <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                      {item.message}
                    </p>

                    {/* Quick action triggers inside notification */}
                    <div className="mt-2 flex items-center gap-2">
                      {item.fileId && onOpenFilePreview && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkAsRead(item.id);
                            setIsOpen(false);
                            onOpenFilePreview(item.fileId!);
                          }}
                          className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Visualizar Arquivo</span>
                        </button>
                      )}

                      {item.type === 'backup_completed' && onOpenSmartBackup && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkAsRead(item.id);
                            setIsOpen(false);
                            onOpenSmartBackup();
                          }}
                          className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                        >
                          <ShieldCheck className="w-3 h-3" />
                          <span>Ver Pasta de Revisão</span>
                        </button>
                      )}

                      {item.type === 'backup_alert' && onOpenSmartBackup && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkAsRead(item.id);
                            setIsOpen(false);
                            onOpenSmartBackup();
                          }}
                          className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          <span>Abrir Backup Inteligente</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {!item.read && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer note */}
          <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/60 text-center">
            <span className="text-[10px] text-slate-400">
              Monitorando em tempo real: BARRETO E CAMPOS
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
