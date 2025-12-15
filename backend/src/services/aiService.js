import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

// Inicialização dos Clientes
const geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * SERVIÇO 1: VISÃO (OCR) - Exclusivo Gemini 2.5 Flash
 * Motivo: É nativamente multimodal e lê documentos melhor que soluções open source simples.
 */
export const visionOCR = async (bufferImagem, mimeType, promptContexto = "") => {
  try {
    const model = geminiClient.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const prompt = `ATENÇÃO: Extração de Dados de Documento Oficial.
    ${promptContexto}
    Retorne APENAS os dados solicitados, preferencialmente em JSON limpo.`;

    const imagePart = {
      inlineData: {
        data: bufferImagem.toString("base64"),
        mimeType: mimeType,
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("❌ Erro no OCR (Gemini):", error);
    throw new Error("Falha ao ler o documento visualmente.");
  }
};

/**
 * SERVIÇO 2: REDAÇÃO JURÍDICA - Híbrido (Groq Llama 3 -> Fallback Gemini)
 * Motivo: Llama 3.3 70B é muito rápido e formal. Gemini entra se o Groq cair.
 */
export const generateLegalText = async (systemPrompt, userPrompt, temperature = 0.3) => {
  
  // TENTATIVA 1: Groq (Llama 3.3) - Prioridade: Velocidade
  try {
    const completion = await groqClient.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: temperature,
      max_tokens: 4096,
    });

    return completion.choices[0]?.message?.content || "";
    
  } catch (groqError) {
    console.warn("⚠️ Groq instável ou Rate Limit atingido. Alternando para Gemini...", groqError.message);

    // TENTATIVA 2: Gemini 2.5 Flash (Fallback: Segurança)
    try {
      const model = geminiClient.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      // Gemini não tem 'system prompt' separado igual OpenAI/Groq, concatenamos.
      const fullPrompt = `${systemPrompt}\n\n--- INSTRUÇÃO DO USUÁRIO ---\n${userPrompt}`;
      
      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      return response.text();
      
    } catch (geminiError) {
      console.error("❌ Erro Crítico: Ambas as IAs falharam.", geminiError);
      throw new Error("Serviço de Inteligência Artificial indisponível no momento.");
    }
  }
};