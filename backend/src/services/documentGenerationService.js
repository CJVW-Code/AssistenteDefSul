// Arquivo: backend/src/services/documentGenerationService.js
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const TEMPLATE_MAP = {
  fixacao: "fixacao_alimentos.docx",
  execucao_prisao: "execucao_prisao.docx",
  execucao_penhora: "execucao_penhora.docx",
  default: "template.docx",
};

const resolveTemplatePath = (baseDir, key) => {
  const file = TEMPLATE_MAP[key] || TEMPLATE_MAP.default;
  return path.resolve(baseDir, "..", "..", "templates", file);
};

const detectTemplateKey = (data = {}) => {
  const tipo = (
    data.acao_especifica ||
    data.tipo_acao ||
    data.tipoAcao ||
    ""
  ).toLowerCase();

  if (tipo.includes("fixa") || tipo.includes("oferta")) {
    return "fixacao";
  }
  if (tipo.includes("execu")) {
    if (tipo.includes("pris")) return "execucao_prisao";
    if (tipo.includes("penhor")) return "execucao_penhora";
  }
  return "default";
};

export const generateDocx = async (data) => {
  // Resolve o caminho do template relativo a este arquivo (backend/src/services)
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const templateKey = detectTemplateKey(data);
  const templatePath = resolveTemplatePath(__dirname, templateKey);
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
