import express from "express";
import {
  criarNovoCaso,
  listarCasos,
  obterDetalhesCaso,
  finalizarCasoSolar,
  reverterFinalizacao, // Adicionado
  regenerarDosFatos,
  buscarPorCpf,
  resetarChaveAcesso,
  atualizarStatusCaso,
  deletarCaso,
  agendarReuniao,
  gerarTermoDeclaracao,
  regerarMinuta,
  receberDocumentosComplementares,
  reprocessarCaso,
  renomearDocumento,
  solicitarReagendamento,
  alternarArquivamento,
  salvarFeedback,
} from "../controllers/casosController.js";
import { authMiddleware } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js"; // Usa sua configuração personalizada
const router = express.Router();

// Configuração para upload de múltiplos arquivos (Criação)
const uploadCriacao = upload.fields([
  { name: "audio", maxCount: 1 },
  { name: "documentos", maxCount: 20 },
]);

// Rotas Públicas
router.post("/novo", uploadCriacao, criarNovoCaso);
router.get("/buscar-cpf", buscarPorCpf);
router.post(
  "/:id/upload-complementar",
  upload.fields([{ name: "documentos" }]),
  receberDocumentosComplementares,
);
router.post("/:id/reagendar", solicitarReagendamento);

// Rotas Protegidas
router.get("/", authMiddleware, listarCasos);
router.get("/:id", authMiddleware, obterDetalhesCaso);
router.post("/:id/gerar-fatos", authMiddleware, regenerarDosFatos);
router.post("/:id/gerar-termo", authMiddleware, gerarTermoDeclaracao);
router.post(
  "/:id/finalizar",
  authMiddleware,
  upload.single("capa"),
  finalizarCasoSolar,
);
router.post("/:id/reverter-finalizacao", authMiddleware, reverterFinalizacao);
router.post("/:id/resetar-chave", authMiddleware, resetarChaveAcesso);
router.patch("/:id/status", authMiddleware, atualizarStatusCaso);
router.delete("/:id", authMiddleware, deletarCaso);
router.patch("/:id/feedback", authMiddleware, salvarFeedback);
router.patch("/:id/agendar", authMiddleware, agendarReuniao);
router.post("/:id/regerar-minuta", authMiddleware, regerarMinuta);
router.post("/:id/reprocessar", authMiddleware, reprocessarCaso);
router.patch("/:id/documento/renomear", authMiddleware, renomearDocumento);
router.patch("/:id/arquivar", authMiddleware, alternarArquivamento);
export default router;
