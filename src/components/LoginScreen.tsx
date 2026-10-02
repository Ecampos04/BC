import React from 'react';
import { Shield, FolderTree, Search, Tag, Eye, CheckCircle2 } from 'lucide-react';

interface LoginScreenProps {
  onSignIn: () => void;
  isLoggingIn: boolean;
  errorMessage?: string | null;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onSignIn,
  isLoggingIn,
  errorMessage,
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 flex flex-col justify-between text-white selection:bg-amber-500 selection:text-white">
      {/* Top Brand Bar */}
      <header className="px-6 py-6 max-w-7xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20 text-white font-bold text-lg tracking-wider">
            BC
          </div>
          <div>
            <span className="font-serif font-bold text-xl tracking-tight text-white block">
              BARRETO & CAMPOS
            </span>
            <span className="text-[11px] uppercase tracking-wider text-amber-400 font-semibold">
              Advocacia & Consultoria Jurídica
            </span>
          </div>
        </div>
      </header>

      {/* Hero & Login Box */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 w-full flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium mb-6">
          <Shield className="w-3.5 h-3.5" />
          <span>Acesso Seguro ao Google Drive Oficial do Escritório</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-serif font-bold tracking-tight text-white mb-4">
          Localizador de Pastas & Organizador de Arquivos
        </h1>
        <p className="text-base sm:text-lg text-slate-300 max-w-2xl font-light mb-8">
          Localize qualquer pasta com agilidade, faça pesquisas avançadas e organize documentos do drive{' '}
          <strong className="text-amber-400 font-semibold">BARRETO E CAMPOS</strong> por categorias jurídicas e etiquetas personalizadas.
        </p>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full text-left mb-10">
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 backdrop-blur-xs">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 w-fit mb-3">
              <FolderTree className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white text-sm mb-1">Localizador de Pastas</h3>
            <p className="text-xs text-slate-400">
              Árvore de diretórios hierárquica e busca instantânea de pastas sem perder tempo.
            </p>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 backdrop-blur-xs">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 w-fit mb-3">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white text-sm mb-1">Buscador Eficiente</h3>
            <p className="text-xs text-slate-400">
              Filtre por nome, data, tipo e termos dentro do conteúdo de PDFs e peças jurídicas.
            </p>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 backdrop-blur-xs">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 w-fit mb-3">
              <Tag className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white text-sm mb-1">Etiquetas & Categorias</h3>
            <p className="text-xs text-slate-400">
              Classifique arquivos por áreas do direito, status do processo e tags personalizadas.
            </p>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 backdrop-blur-xs">
            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400 w-fit mb-3">
              <Eye className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white text-sm mb-1">Visualização Rápida</h3>
            <p className="text-xs text-slate-400">
              Inspecione documentos e imagens instantaneamente sem precisar baixar arquivos.
            </p>
          </div>
        </div>

        {/* Error message if any */}
        {errorMessage && (
          <div className="bg-red-500/15 border border-red-500/30 text-red-300 text-xs px-4 py-3 rounded-xl max-w-md w-full mb-6">
            {errorMessage}
          </div>
        )}

        {/* Official Google Sign-in Button */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={onSignIn}
            disabled={isLoggingIn}
            className="flex items-center gap-3 px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-800 font-semibold rounded-xl text-sm shadow-xl hover:shadow-2xl transition-all cursor-pointer disabled:opacity-50"
          >
            <svg
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 48 48"
              className="w-5 h-5"
            >
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
              <path fill="none" d="M0 0h48v48H0z" />
            </svg>
            <span>{isLoggingIn ? 'Conectando ao Google Drive...' : 'Conectar com Google Drive'}</span>
          </button>
          <span className="text-xs text-slate-400">
            Acesso com permissão do usuário à conta autorizada do escritório
          </span>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-slate-800 text-center text-xs text-slate-500">
        BARRETO & CAMPOS ADVOCACIA • Sistema Integrado de Gestão de Arquivos e Pastas do Drive
      </footer>
    </div>
  );
};
