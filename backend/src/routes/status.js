// Arquivo: backend/src/routes/status.js

import express from "express";
import { consultarStatus } from "../controllers/statusController.js";

const router = express.Router();

// Define a rota GET que chama a função do controller
router.get("/", consultarStatus);

export default router;
