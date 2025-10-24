// Arquivo: backend/src/services/documentGenerationService.js
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

export const generateDocx = async (data) => {
  // Resolve o caminho do template relativo a este arquivo (backend/src/services)
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const templatePath = path.resolve(
    __dirname,
    "..",
    "..",
    "templates",
    "template.docx"
  );
  const templateContent = await fs.readFile(templatePath, "binary");

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
