import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const analyzeCase = async (fullText) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `Você é um assistente jurídico especializado. Analise o seguinte caso e forneça um resumo objetivo para um defensor público, destacando:

1. Problema Central
2. Partes Envolvidas
3. Pedido Principal do Cidadão
4. Urgência do Caso
5. Área do Direito

Caso: ${fullText}

Forneça o resumo em formato de tópicos claros e objetivos.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Erro na análise com Gemini:", error);
    throw new Error("Falha ao analisar caso com IA");
  }
};
