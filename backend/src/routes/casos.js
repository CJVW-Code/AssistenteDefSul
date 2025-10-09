import express from "express";
import { upload } from "../middleware/upload.js";
import {
  criarNovoCaso,
  listarCasos,
  obterDetalhesCaso,
  atualizarStatusCaso,
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
router.post(
  "/novo",
  upload.fields([
    { name: "audio", maxCount: 2 },
    { name: "documentos", maxCount: 10 },
  ]),
  criarNovoCaso
);
router.patch("/:id/status", authMiddleware, atualizarStatusCaso);
router.get("/", authMiddleware, listarCasos);
router.get("/:id", authMiddleware, obterDetalhesCaso);
export default router;
