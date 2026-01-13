import express from "express";
import {
  criarNovoCaso,
  listarCasos,
  obterDetalhesCaso,
  finalizarCasoSolar,
  reverterFinalizacao, // Adicionado
  regenerarDosFatos,
  gerarTermoDeclaracao,
  buscarPorCpf,
  resetarChaveAcesso,
  atualizarStatusCaso,
  deletarCaso,
  agendarReuniao,
} from "../controllers/casosController.js";
import { authMiddleware } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js"; // Usa sua configuração personalizada
import { salvarFeedback } from "../controllers/casosController.js";
const router = express.Router();

// Configuração para upload de múltiplos arquivos (Criação)
const uploadCriacao = upload.fields([
  { name: "audio", maxCount: 1 },
  { name: "documentos", maxCount: 20 },
]);

// Rotas Públicas
router.post("/novo", uploadCriacao, criarNovoCaso);
router.get("/buscar-cpf", buscarPorCpf);

// Rotas Protegidas
router.get("/", authMiddleware, listarCasos);
router.get("/:id", authMiddleware, obterDetalhesCaso);
router.post("/:id/gerar-fatos", authMiddleware, regenerarDosFatos);
router.post("/:id/gerar-termo", authMiddleware, gerarTermoDeclaracao);
router.post(
  "/:id/finalizar",
  authMiddleware,
  upload.single("capa"),
  finalizarCasoSolar
);
router.post("/:id/reverter-finalizacao", authMiddleware, reverterFinalizacao); // Adicionado
router.post("/:id/resetar-chave", authMiddleware, resetarChaveAcesso);
router.patch("/:id/status", authMiddleware, atualizarStatusCaso);
router.delete("/:id", authMiddleware, deletarCaso);
router.patch("/:id/feedback", authMiddleware, salvarFeedback);
router.patch("/:id/agendar", authMiddleware, agendarReuniao);
export default router;
