import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '25mb' }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const LEGAL_SYSTEM_INSTRUCTION = `Você é o "Gemini Assistente Legal", a inteligência jurídica do escritório Barreto & Campos Advogados.
Sua missão é assessorar os advogados do escritório na análise técnica de documentos jurídicos, tais como petições iniciais, contratos, contestações, recursos, sentenças, atos societários e documentos fiscais.

Ao responder:
1. Seja técnico, preciso, objetivo e alinhado à legislação e jurisprudência brasileira (CPC/2015, CLT, Código Civil, etc.).
2. Estruture as respostas com clareza em Markdown, utilizando tópicos, títulos em negrito e listas destacadas.
3. Se o usuário pedir um resumo de cláusulas, aponte objeto, obrigações centrais, penalidades/multas, garantias e foro.
4. Se o usuário pedir prazos, informe a natureza do prazo (dias úteis vs. corridos), o termo inicial provável, riscos de preclusão e recomendações de contingência.
5. Se for uma petição inicial ou recurso, extraia com precisão: Partes, Comarca/Juízo, Valor da Causa, Pedidos e Tutelas Provisórias (Liminares).
6. SEMPRE sugira "Próximos Passos Estratégicos" (diligências práticas que o advogado deve realizar imediatamente).`;

// POST /api/legal-assistant
app.post('/api/legal-assistant', async (req: Request, res: Response) => {
  try {
    const { 
      documentName, 
      mimeType, 
      category, 
      tags, 
      textContent, 
      base64Content, 
      messages, 
      actionType 
    } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Mensagem não informada.' });
    }

    const latestUserMessage = messages[messages.length - 1].content;

    // Build context description
    let contextHeader = `=== DOCUMENTO EM ANÁLISE ===\n`;
    contextHeader += `Nome do Arquivo: ${documentName || 'Documento sem título'}\n`;
    contextHeader += `Tipo MIME: ${mimeType || 'Desconhecido'}\n`;
    if (category) contextHeader += `Categoria no Escritório: ${category}\n`;
    if (tags && tags.length > 0) contextHeader += `Etiquetas: ${tags.join(', ')}\n`;

    let specificActionDirective = '';
    if (actionType === 'summarize_clauses') {
      specificActionDirective = `\n[DIRETIVA DE RESUMO DE CLÁUSULAS]: Faça uma síntese estruturada das principais cláusulas deste documento (Objeto, Direitos e Deveres, Preço/Pagamento, Penalidades/Multas, Rescisão, Foro e Vigência). Em seguida, indique 3 recomendações ou pontos de atenção contratuais.`;
    } else if (actionType === 'extract_deadlines') {
      specificActionDirective = `\n[DIRETIVA DE PRAZOS PROCESSUAIS & FATAIS]: Identifique todos os prazos legais, datas críticas, prazos de cumprimento ou manifestação mencionados direta ou indiretamente no documento. Esclareça a contagem (CPC/CLT) e sinalize prazos urgentes ou peremptórios. Sugira a inclusão na agenda do escritório.`;
    } else if (actionType === 'extract_petition_data') {
      specificActionDirective = `\n[DIRETIVA DE EXTRAÇÃO DE DADOS DA PETIÇÃO]: Extraia de forma esquemática:\n1. Autor/Requerente\n2. Réu/Requerido\n3. Foro, Comarca e Vara Competente\n4. Valor da Causa\n5. Pedido Liminar / Tutela Provisória (se houver)\n6. Relação Sintética dos Pedidos Definitivos\n7. Causa de Pedir Central.`;
    } else if (actionType === 'suggest_next_steps') {
      specificActionDirective = `\n[DIRETIVA DE PRÓXIMOS PASSOS E ESTRATÉGIA]: Com base no documento em questão, formule um plano de ação prático e estratégico para a equipe jurídica do Barreto & Campos (quais peças protocolar, quais documentos solicitar ao cliente, diligências perante a vara e prazos recomendados).`;
    }

    const contents: any[] = [];

    // Include chat history if multi-turn
    for (let i = 0; i < messages.length - 1; i++) {
      const msg = messages[i];
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      });
    }

    // Build the latest turn
    const currentParts: any[] = [];

    // If PDF or Image data was passed as base64, send inline data part
    if (base64Content && (mimeType === 'application/pdf' || mimeType?.startsWith('image/'))) {
      currentParts.push({
        inlineData: {
          mimeType: mimeType === 'application/pdf' ? 'application/pdf' : mimeType,
          data: base64Content,
        },
      });
    }

    // Prepare text prompt part
    let combinedPrompt = `${contextHeader}\n`;
    if (textContent && textContent.trim()) {
      // Limit text snippet if extremely large to prevent payload overflow
      const maxChars = 80000;
      const truncated = textContent.length > maxChars 
        ? textContent.substring(0, maxChars) + '\n\n[...conteúdo adicional suprimido pelo limite de caracteres...]' 
        : textContent;
      combinedPrompt += `\nCONTEÚDO TEXTUAL EXTRAÍDO DO DOCUMENTO:\n"""\n${truncated}\n"""\n`;
    }

    combinedPrompt += `${specificActionDirective}\n\nSOLICITAÇÃO DO ADVOGADO:\n${latestUserMessage}`;
    currentParts.push({ text: combinedPrompt });

    contents.push({
      role: 'user',
      parts: currentParts,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction: LEGAL_SYSTEM_INSTRUCTION,
        temperature: 0.2, // Low temperature for high factual accuracy in legal context
      },
    });

    const responseText = response.text || 'Não foi possível gerar uma resposta para este documento no momento.';

    return res.json({
      text: responseText,
      model: 'gemini-3.8-flash',
    });
  } catch (error: any) {
    console.error('Error in /api/legal-assistant:', error);
    return res.status(500).json({
      error: error.message || 'Erro ao processar análise jurídica com Gemini.',
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Gemini Legal Assistant server running on port ${port}`);
  });
}

startServer();
