import { Router } from "express";
import { processJob } from "../controllers/jobsController.js";

const router = Router();

// Rota que o QStash vai chamar
router.post("/process", processJob);

export default router;
