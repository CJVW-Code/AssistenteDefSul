// Arquivo: backend/src/services/geminiService.js

import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

// Inicializa o cliente da IA com sua chave de API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const analyzeCase = async (fullText) => {
  // Garante que a chave da API foi configurada
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "A chave da API do Gemini não foi configurada no arquivo .env"
    );
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Este é o prompt que ensina a IA como agir
    const prompt = `Você é um assistente jurídico sênior e objetivo. Sua tarefa é analisar o texto de um caso enviado a uma Defensoria Pública e criar um resumo claro e conciso para o defensor.

    O resumo deve ser em formato de tópicos, destacando exclusivamente os seguintes pontos:
    1.  **Problema Central:** Qual é a principal queixa ou necessidade do cidadão?
    2.  **Partes Envolvidas:** Quem são as pessoas ou entidades mencionadas?
    3.  **Pedido Principal:** O que o cidadão está pedindo (ex: pensão, medicamento, defesa)?
    4.  **Urgência:** O caso parece ser urgente? (Sim/Não e por quê).
    5.  **Área do Direito:** Qual a área provável do direito (Família, Consumidor, Saúde, Criminal, etc.)?

    Texto do Caso para Análise:
    ---
    ${fullText}
    ---
    
    Apenas retorne os tópicos. Não adicione saudações ou frases introdutórias.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Ocorreu um erro durante a análise com o Gemini:", error);
    throw new Error("Falha ao gerar o resumo do caso com a IA.");
  }
};
