// Arquivo: backend/src/routes/defensores.js
import express from "express";
import {
  registrarDefensor,
  loginDefensor,
} from "../controllers/defensoresController.js";

const router = express.Router();

router.post("/register", registrarDefensor);
router.post("/login", loginDefensor);

export default router;
