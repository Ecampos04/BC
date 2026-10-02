import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  X, 
  Sparkles, 
  RotateCcw, 
  Copy, 
  Check, 
  FileText, 
  Folder, 
  Maximize2, 
  Minimize2, 
  ChevronDown,
  Scale,
  Calendar,
  Layers,
  FileCode,
  Loader2
} from 'lucide-react';
import { DriveFile, FolderNode } from '../types/drive';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  attachedFile?: string;
  attachedFolder?: string;
}

interface GeminiLegalChatbotProps {
  files: DriveFile[];
  folders: FolderNode[];
  currentFolderId: string | null;
  currentFolderName?: string;
  selectedFile?: DriveFile | null;
  driveName: string;
}

const QUICK_PROMPTS = [
  {
    icon: <Scale className="w-3.5 h-3.5 text-amber-500" />,
    label: 'Resumir Peça Processual',
    prompt: 'Analise e resuma esta peça jurídica, destacando partes, valor da causa, pedidos e fundamentação legal:',
  },
  {
    icon: <Calendar className="w-3.5 h-3.5 text-blue-500" />,
    label: 'Calcular Prazo Processual',
    prompt: 'Como deve ser realizada a contagem deste prazo processual de acordo com o CPC/CLT (considerando apenas dias úteis)?',
  },
  {
    icon: <Layers className="w-3.5 h-3.5 text-purple-500" />,
    label: 'Onde Arquivar no Drive?',
    prompt: 'Considerando a estrutura de pastas do escritório Barreto e Campos, em qual diretório e com quais etiquetas devo arquivar este documento?',
  },
  {
    icon: <FileCode className="w-3.5 h-3.5 text-emerald-500" />,
    label: 'Minuta de Manifestação',
    prompt: 'Elabore uma minuta concisa e técnica de manifestação jurídica requerendo a juntada de comprovante e prosseguimento do feito.',
  },
];

export const GeminiLegalChatbot: React.FC<GeminiLegalChatbotProps> = ({
  files,
  folders,
  currentFolderId,
  currentFolderName,
  selectedFile,
  driveName,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'gemini-3.5-flash' | 'gemini-3.1-flash-lite'>('gemini-3.5-flash');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_welcome',
      role: 'assistant',
      content: `Olá! Sou o **Assistente Jurídico Barreto & Campos**, alimentado pelo **Gemini**.

Estou conectado ao acervo do escritório e posso auxiliá-lo com:
- **Análise e Resumo** de petições, certidões e contratos
- **Contagem e Regras de Prazos** processuais (CPC e CLT)
- **Localização e Classificação** de documentos no Drive
- **Redação de Minutas**, termos e manifestações forenses

Como posso colaborar com suas demandas hoje?`,
      timestamp: Date.now(),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `msg_welcome_${Date.now()}`,
        role: 'assistant',
        content: `Nova sessão iniciada. Como posso ajudar com os documentos do escritório **${driveName}**?`,
        timestamp: Date.now(),
      },
    ]);
  };

  const buildContextInfo = (): string => {
    let ctx = `Drive do Escritório: ${driveName}\n`;
    if (currentFolderName) {
      ctx += `Pasta Atual Aberta no Localizador: ${currentFolderName}\n`;
    }
    if (selectedFile) {
      ctx += `Documento em Foco: ${selectedFile.name} (Tipo: ${selectedFile.mimeType}, Categoria: ${selectedFile.category || 'Nenhuma'}, Etiquetas: ${(selectedFile.tags || []).join(', ') || 'Nenhuma'})\n`;
    }

    // Include some folder names for awareness
    const topFolders = folders.slice(0, 15).map(f => f.name).join(', ');
    ctx += `Principais Pastas do Acervo: ${topFolders}\n`;

    return ctx;
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
      attachedFile: selectedFile?.name,
      attachedFolder: currentFolderName,
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    try {
      const contextInfo = buildContextInfo();

      // Format payload for multi-turn chat
      const payloadMessages = newHistory.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: payloadMessages,
          contextInfo,
          model: selectedModel,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro HTTP ${res.status}`);
      }

      const data = await res.json();
      const assistantMessage: ChatMessage = {
        id: `msg_bot_${Date.now()}`,
        role: 'assistant',
        content: data.text,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('Chatbot error:', err);
      const errorMessage: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        role: 'assistant',
        content: `Desculpe, ocorreu um erro ao consultar o Gemini: ${err.message || 'Erro de comunicação'}. Por favor, tente novamente.`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Helper to format basic markdown-like elements (bold, lists, code)
  const renderMessageContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      // Bold tags **text**
      const formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

      if (line.startsWith('### ')) {
        return (
          <h4 key={idx} className="font-semibold text-xs mt-2 mb-1 text-amber-500" dangerouslySetInnerHTML={{ __html: formattedLine.replace('### ', '') }} />
        );
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return (
          <li key={idx} className="ml-4 list-disc text-xs my-0.5" dangerouslySetInnerHTML={{ __html: formattedLine.replace(/^[-*]\s+/, '') }} />
        );
      }
      if (line.trim() === '') {
        return <div key={idx} className="h-1.5" />;
      }
      return (
        <p key={idx} className="text-xs my-0.5 leading-relaxed" dangerouslySetInnerHTML={{ __html: formattedLine }} />
      );
    });
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-5 right-5 z-40 flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 hover:from-amber-500 hover:to-amber-700 text-white rounded-full shadow-2xl transition-all hover:scale-105 border border-amber-400/40 group cursor-pointer ${
          isOpen ? 'ring-4 ring-amber-500/30' : ''
        }`}
        title="Abrir Assistente Jurídico Gemini"
        aria-label="Abrir Assistente Jurídico Gemini"
      >
        <div className="relative">
          <Bot className="w-5 h-5 text-white" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-amber-800 animate-pulse" />
        </div>
        <span className="text-xs font-semibold tracking-wide hidden sm:inline">
          Assistente Jurídico AI
        </span>
        <Sparkles className="w-3.5 h-3.5 text-amber-300 group-hover:rotate-12 transition-transform" />
      </button>

      {/* Chat Window Panel */}
      {isOpen && (
        <div
          className={`fixed z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 animate-in fade-in slide-in-from-bottom-5 ${
            isExpanded
              ? 'inset-4 sm:inset-10'
              : 'bottom-20 right-4 sm:right-6 w-[94vw] sm:w-[480px] h-[580px] max-h-[85vh]'
          }`}
        >
          {/* Header */}
          <div className="px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-xs text-white">
                    Assistente Jurídico Barreto & Campos
                  </h3>
                  <span className="text-[9px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.2 rounded border border-amber-500/30">
                    Gemini 3.5
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Inteligência artificial jurídica contextualizada ao Drive
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Model Switcher */}
              <div className="hidden sm:flex items-center bg-slate-800 rounded-lg p-0.5 text-[10px] mr-1 border border-slate-700">
                <button
                  onClick={() => setSelectedModel('gemini-3.5-flash')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    selectedModel === 'gemini-3.5-flash'
                      ? 'bg-amber-600 text-white font-medium shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Gemini 3.5 Flash: Alto desempenho geral e precisão jurídica"
                >
                  3.5 Flash
                </button>
                <button
                  onClick={() => setSelectedModel('gemini-3.1-flash-lite')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    selectedModel === 'gemini-3.1-flash-lite'
                      ? 'bg-amber-600 text-white font-medium shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Gemini 3.1 Flash Lite: Velocidade ultra-rápida"
                >
                  Lite
                </button>
              </div>

              <button
                onClick={handleClearHistory}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
                title="Limpar conversa"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors hidden sm:inline-block"
                title={isExpanded ? 'Restaurar tamanho' : 'Maximizar'}
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
                title="Fechar assistente"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Context Badge (Current Folder / File attached) */}
          {(currentFolderName || selectedFile) && (
            <div className="px-4 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-[10px] text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2">
              <span className="truncate flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                <span className="font-semibold">Contexto:</span>
                {currentFolderName && (
                  <span className="truncate">📁 {currentFolderName}</span>
                )}
                {selectedFile && (
                  <span className="truncate font-semibold">📄 {selectedFile.name}</span>
                )}
              </span>
            </div>
          )}

          {/* Messages Scrollable Thread */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-amber-600/20 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`group relative max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-xs text-xs ${
                    msg.role === 'user'
                      ? 'bg-amber-600 text-white rounded-br-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 rounded-bl-xs'
                  }`}
                >
                  {/* Context chips if user attached something */}
                  {msg.attachedFile && (
                    <div className="mb-1.5 pb-1 border-b border-white/20 text-[10px] flex items-center gap-1 opacity-90">
                      <FileText className="w-3 h-3" />
                      <span className="truncate">Documento: {msg.attachedFile}</span>
                    </div>
                  )}

                  {/* Body Content */}
                  <div>{renderMessageContent(msg.content)}</div>

                  {/* Message Footer / Copy button */}
                  <div className="flex items-center justify-end gap-1 mt-1.5 pt-1 border-t border-black/5 dark:border-white/5 text-[9px] opacity-70">
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {msg.role === 'assistant' && (
                      <button
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                        className="ml-1.5 p-0.5 hover:text-amber-500 rounded transition-colors"
                        title="Copiar resposta"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-7 h-7 rounded-lg bg-amber-600/20 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700/80 rounded-2xl rounded-bl-xs px-3.5 py-2.5 shadow-xs text-xs flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                  <span>Analisando solicitação jurídica com Gemini...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Carousel */}
          {messages.length <= 2 && (
            <div className="px-3 py-2 bg-slate-100/70 dark:bg-slate-850/70 border-t border-slate-200 dark:border-slate-800 flex gap-1.5 overflow-x-auto">
              {QUICK_PROMPTS.map((qp, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(qp.prompt)}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap shadow-2xs transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {qp.icon}
                  <span>{qp.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Chat Input Bar */}
          <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-end gap-2 bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl p-2 focus-within:ring-2 focus-within:ring-amber-500/40 focus-within:border-amber-500 transition-all">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pergunte ao assistente jurídico (Shift+Enter para nova linha)..."
                rows={2}
                disabled={isLoading}
                className="flex-1 bg-transparent resize-none text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 outline-none leading-relaxed"
              />

              <button
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || isLoading}
                className="p-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors shrink-0 shadow-xs cursor-pointer"
                title="Enviar mensagem"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-between text-[9px] text-slate-400 mt-1.5 px-1">
              <span>Modelo ativo: {selectedModel}</span>
              <span>Barreto & Campos Advogados Associados</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
