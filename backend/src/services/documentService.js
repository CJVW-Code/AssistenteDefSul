// Arquivo: backend/src/services/documentService.js

import Tesseract from "tesseract.js";

export const extractTextFromImage = async (imagePath) => {
  try {
    console.log(`Iniciando OCR para a imagem: ${imagePath}`);

    const {
      data: { text },
    } = await Tesseract.recognize(
      imagePath,
      "por", // Define o idioma como Português
      {
        // O logger é útil para ver o progresso do OCR no terminal
        logger: (m) =>
          console.log(m.status, `${(m.progress * 100).toFixed(2)}%`),
      }
    );

    console.log("OCR concluído com sucesso.");
    return text;
  } catch (error) {
    console.error("Ocorreu um erro durante o OCR:", error);
    throw new Error("Falha ao extrair texto do documento de imagem.");
  }
};
