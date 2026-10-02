import React from 'react';
import { User } from 'firebase/auth';
import { 
  FolderTree, 
  Tag, 
  RotateCw, 
  LogOut, 
  Building, 
  ShieldCheck, 
  CheckCircle2,
  HardDrive,
  BarChart2
} from 'lucide-react';
import { DriveContext } from '../services/driveApi';
import { AppNotification } from '../types/notifications';
import { NotificationCenter } from './NotificationCenter';

interface HeaderProps {
  user: User | null;
  driveContext: DriveContext | null;
  isLoading: boolean;
  onRefresh: () => void;
  onOpenTagManager: () => void;
  onOpenPendingInitials: () => void;
  onOpenAnalytics: () => void;
  onLogout: () => void;
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAllNotifications: () => void;
  onOpenFilePreview?: (fileId: string) => void;
  onOpenSmartBackup?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  driveContext,
  isLoading,
  onRefresh,
  onOpenTagManager,
  onOpenPendingInitials,
  onOpenAnalytics,
  onLogout,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAllNotifications,
  onOpenFilePreview,
  onOpenSmartBackup,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white shadow-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Office Identity */}
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20 text-white font-bold text-lg tracking-wider">
              BC
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-lg tracking-tight text-white">
                  BARRETO & CAMPOS
                </span>
                <span className="text-xs uppercase tracking-wider bg-amber-500/20 text-amber-300 font-semibold px-2 py-0.5 rounded-full border border-amber-500/30">
                  Advocacia & Consultoria
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans flex items-center gap-1.5">
                <span>Gestão Documental & Localizador de Pastas</span>
              </p>
            </div>
          </div>

          {/* Drive Status Badge & Quick Controls */}
          <div className="flex items-center gap-3">
            {/* Exclusive Drive Folder Scope Badge */}
            <div className="hidden md:flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-lg text-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-300 font-medium">Pasta Exclusiva:</span>
              <span className="font-bold text-amber-300 tracking-wide">
                {driveContext?.driveName || 'BARRETO E CAMPOS'}
              </span>
              <span className="flex h-2 w-2 relative ml-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>

            {/* Iniciais Pendentes Workflow Button */}
            <button
              onClick={onOpenPendingInitials}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-lg text-xs font-semibold transition-all shadow-sm shadow-amber-900/30"
              title="Identificar e transferir pastas de Iniciais Pendentes pós-protocolo"
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span>Iniciais Pendentes (Pós-Protocolo)</span>
            </button>

            {/* Manage Tags Button */}
            <button
              onClick={onOpenTagManager}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-medium transition-colors shadow-xs"
              title="Gerenciar Categorias e Etiquetas"
            >
              <Tag className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Etiquetas & Categorias</span>
            </button>

            {/* Subtle Analytics Button */}
            <button
              onClick={onOpenAnalytics}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-normal transition-colors"
              title="Visualizar distribuição de arquivos por categorias e etiquetas"
            >
              <BarChart2 className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden md:inline text-[11px]">Métricas</span>
            </button>

            {/* Notification Center */}
            <NotificationCenter
              notifications={notifications}
              onMarkAsRead={onMarkAsRead}
              onMarkAllAsRead={onMarkAllAsRead}
              onClearAll={onClearAllNotifications}
              onOpenFilePreview={onOpenFilePreview}
              onOpenSmartBackup={onOpenSmartBackup}
              onOpenPendingInitials={onOpenPendingInitials}
            />

            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className={`p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              title="Atualizar Pastas e Arquivos"
            >
              <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            </button>

            {/* User Profile */}
            {user && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Usuário'}
                    className="w-8 h-8 rounded-full border border-amber-500/50"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-300 border border-slate-600">
                    {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </div>
                )}
                <div className="hidden lg:block text-left text-xs">
                  <div className="font-medium text-slate-200 truncate max-w-[130px]">
                    {user.displayName || 'Advogado'}
                  </div>
                  <div className="text-slate-400 text-[10px] truncate max-w-[130px]">
                    {user.email}
                  </div>
                </div>

                <button
                  onClick={onLogout}
                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800/80 rounded-md transition-colors ml-1"
                  title="Desconectar do Drive"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
