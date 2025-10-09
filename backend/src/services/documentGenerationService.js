// Arquivo: backend/src/services/documentGenerationService.js
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import fs from "fs/promises";
import path from "path";

export const generateDocx = async (data) => {
  // Carrega o template.docx da pasta 'templates'
  const templateContent = await fs.readFile(
    path.resolve("templates", "template.docx"),
    "binary"
  );

  const zip = new PizZip(templateContent);

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  // Substitui os placeholders {nome}, {cpf}, etc., pelos dados do caso
  doc.render(data);

  // Gera o documento final como um buffer
  const buf = doc.getZip().generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });

  return buf;
};
