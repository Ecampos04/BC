import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  Copy, 
  Check, 
  RefreshCw, 
  FileText, 
  Clock, 
  Scale, 
  Compass, 
  AlertCircle,
  ChevronRight,
  Maximize2,
  Minimize2,
  X
} from 'lucide-react';
import { DriveFile } from '../types/drive';
import { 
  callGeminiLegalAssistant, 
  ChatMessage, 
  LegalActionType 
} from '../services/geminiLegalAssistant';

interface GeminiLegalAssistantSidebarProps {
  file: DriveFile;
  accessToken: string;
  onClose?: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const GeminiLegalAssistantSidebar: React.FC<GeminiLegalAssistantSidebarProps> = ({
  file,
  accessToken,
  onClose,
  isExpanded = false,
  onToggleExpand,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Initialize initial welcome message per file
  useEffect(() => {
    const welcomeMsg: ChatMessage = {
      id: 'welcome-' + file.id,
      role: 'model',
      content: `Olá! Sou o **Gemini Assistente Legal** do Barreto & Campos.\n\nEstou com o documento **"${file.name}"** carregado para análise.\n\nSelecione uma das ações rápidas abaixo ou digite sua dúvida jurídica sobre esta peça:`,
      timestamp: new Date(),
    };
    setMessages([welcomeMsg]);
  }, [file.id, file.name]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (text: string, actionType: LegalActionType = 'chat') => {
    if (!text.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
      actionType,
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInputValue('');
    setIsLoading(true);

    if (actionType === 'summarize_clauses') setLoadingAction('Resumindo cláusulas e obrigações...');
    else if (actionType === 'extract_deadlines') setLoadingAction('Mapeando prazos processuais e urgências...');
    else if (actionType === 'extract_petition_data') setLoadingAction('Extraindo dados críticos da petição...');
    else if (actionType === 'suggest_next_steps') setLoadingAction('Estruturando próximos passos estratégicos...');
    else setLoadingAction('Analisando documento...');

    try {
      const apiMessages = nextMessages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const replyText = await callGeminiLegalAssistant({
        accessToken,
        file,
        messages: apiMessages,
        actionType,
      });

      const modelReply: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: replyText,
        timestamp: new Date(),
        actionType,
      };

      setMessages(prev => [...prev, modelReply]);
    } catch (err: any) {
      console.error('Error in Gemini Assistant:', err);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: `⚠️ Não foi possível concluir a análise: ${err.message || 'Erro de conexão com o modelo'}.\n\nPor favor, tente novamente ou formule uma pergunta mais específica.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Format basic markdown styling for bold, headers and bullet points
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      // Header ## or ###
      if (line.startsWith('### ')) {
        return <h4 key={idx} className="font-bold text-slate-900 dark:text-slate-100 text-xs mt-2 mb-1">{line.replace('### ', '')}</h4>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={idx} className="font-bold text-amber-600 dark:text-amber-400 text-sm mt-3 mb-1 border-b border-amber-500/20 pb-0.5">{line.replace('## ', '')}</h3>;
      }
      if (line.startsWith('# ')) {
        return <h2 key={idx} className="font-bold text-slate-900 dark:text-white text-base mt-2 mb-1">{line.replace('# ', '')}</h2>;
      }
      // Bullet point
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const itemText = line.trim().substring(2);
        return (
          <li key={idx} className="text-xs text-slate-700 dark:text-slate-300 ml-4 list-disc my-0.5 leading-relaxed">
            {renderInlineMarkdown(itemText)}
          </li>
        );
      }
      // Numbered list
      if (/^\d+\.\s/.test(line.trim())) {
        return (
          <div key={idx} className="text-xs text-slate-700 dark:text-slate-300 ml-2 my-0.5 leading-relaxed">
            {renderInlineMarkdown(line.trim())}
          </div>
        );
      }
      // Empty line
      if (!line.trim()) {
        return <div key={idx} className="h-1.5" />;
      }
      // Standard paragraph
      return (
        <p key={idx} className="text-xs text-slate-700 dark:text-slate-300 my-1 leading-relaxed">
          {renderInlineMarkdown(line)}
        </p>
      );
    });
  };

  const renderInlineMarkdown = (text: string) => {
    // Basic regex for **bold**
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-slate-900 dark:text-slate-100">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* Sidebar Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-600 text-white shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                Gemini Assistente Legal
              </h3>
              <span className="text-[9px] bg-amber-500/15 text-amber-700 dark:text-amber-300 px-1.5 py-0.2 rounded-full font-semibold border border-amber-500/30">
                IA Jurídica
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate max-w-[200px]" title={file.name}>
              {file.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={isExpanded ? 'Reduzir barra lateral' : 'Expandir barra lateral'}
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Fechar assistente"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Action Chips */}
      <div className="p-2.5 bg-slate-100/70 dark:bg-slate-850/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-1.5 shrink-0">
        <button
          onClick={() => handleSendMessage('Faça um resumo detalhado das cláusulas e obrigações deste documento.', 'summarize_clauses')}
          disabled={isLoading}
          className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-amber-500/10 hover:border-amber-500/40 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-medium transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
        >
          <FileText className="w-3 h-3 text-amber-500" />
          <span>Resumir Cláusulas</span>
        </button>

        <button
          onClick={() => handleSendMessage('Mapeie todos os prazos processuais e datas críticas com base neste documento.', 'extract_deadlines')}
          disabled={isLoading}
          className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-amber-500/10 hover:border-amber-500/40 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-medium transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
        >
          <Clock className="w-3 h-3 text-blue-500" />
          <span>Prazos & Urgências</span>
        </button>

        <button
          onClick={() => handleSendMessage('Extraia os dados críticos desta petição: Partes, Juízo, Valor da Causa e Pedidos.', 'extract_petition_data')}
          disabled={isLoading}
          className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-amber-500/10 hover:border-amber-500/40 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-medium transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
        >
          <Scale className="w-3 h-3 text-purple-500" />
          <span>Dados da Petição</span>
        </button>

        <button
          onClick={() => handleSendMessage('Sugira os próximos passos estratégicos e processuais a serem tomados pelo escritório.', 'suggest_next_steps')}
          disabled={isLoading}
          className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-amber-500/10 hover:border-amber-500/40 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-medium transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
        >
          <Compass className="w-3 h-3 text-emerald-500" />
          <span>Sugerir Próximos Passos</span>
        </button>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5 text-xs">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-in fade-in duration-150`}
            >
              <div className="flex items-center gap-1.5 mb-1 px-1">
                {isUser ? (
                  <>
                    <span className="text-[10px] text-slate-400 font-medium">Você (Advogado)</span>
                    <User className="w-3 h-3 text-slate-400" />
                  </>
                ) : (
                  <>
                    <Bot className="w-3 h-3 text-amber-500" />
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">Gemini Legal</span>
                  </>
                )}
              </div>

              <div
                className={`p-3 rounded-2xl max-w-[95%] relative group shadow-2xs ${
                  isUser
                    ? 'bg-amber-600 text-white rounded-tr-xs'
                    : 'bg-white dark:bg-slate-850 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-tl-xs'
                }`}
              >
                {isUser ? (
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <div>
                    {renderFormattedContent(msg.content)}

                    {/* Footer Copy & Follow-up Actions for Model Answers */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                      <button
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                        className="text-[10px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1 transition-colors"
                        title="Copiar análise"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span className="text-emerald-500">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>

                      {msg.actionType !== 'suggest_next_steps' && (
                        <button
                          onClick={() => handleSendMessage('Com base nessa análise, quais os próximos passos estratégicos sugeridos?', 'suggest_next_steps')}
                          className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5 font-medium"
                        >
                          <span>Sugerir próximos passos</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 p-3 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-300 w-fit animate-pulse shadow-xs">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
            <span>{loadingAction || 'O Gemini está processando o documento...'}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputValue);
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Pergunte sobre cláusulas, prazos ou estratégias..."
            disabled={isLoading}
            className="w-full pl-3 pr-10 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-amber-500 transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="absolute right-1.5 p-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-lg transition-colors cursor-pointer"
            title="Enviar mensagem"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
        <p className="text-[10px] text-slate-400 text-center mt-1.5">
          Gemini 3.8 Flash • IA Especializada em Análise Processual & Contratual
        </p>
      </div>
    </div>
  );
};
