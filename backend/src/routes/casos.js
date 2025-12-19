import express from "express";
import { upload } from "../middleware/upload.js";
import {
  criarNovoCaso,
  listarCasos,
  obterDetalhesCaso,
  atualizarStatusCaso,
  regenerarDosFatos,
  finalizarCasoSolar,
  buscarPorCpf,
  resetarChaveAcesso,
} from "../controllers/casosController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();
// Rota para criar um novo caso (pública)
router.post(
  "/novo",
  upload.fields([
    { name: "audio", maxCount: 1 },
    { name: "peticao", maxCount: 1 },
    { name: "documentos", maxCount: 10 },
  ]),
  criarNovoCaso
);
// Define que esta rota pode receber um arquivo de áudio e até 10 de documentos

router.patch("/:id/status", authMiddleware, atualizarStatusCaso);
router.get("/", authMiddleware, listarCasos);
router.get("/:id", authMiddleware, obterDetalhesCaso);
router.post("/:id/gerar-fatos", authMiddleware, regenerarDosFatos);
router.post("/:id/finalizar", upload.single("capa"), finalizarCasoSolar);
// Rota de busca da recepção
router.get("/buscar-cpf", buscarPorCpf);
// Rota de reset de chave (Protegida)
router.post("/:id/resetar-chave", resetarChaveAcesso);
export default router;
