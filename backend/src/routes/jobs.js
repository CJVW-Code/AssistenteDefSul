import express from "express";
import { processJob } from "../controllers/jobController.js";
import { Receiver } from "@upstash/qstash";
import logger from "../utils/logger.js";

const router = express.Router();

// Initialize QStash Receiver for signature verification
const qstashReceiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
});

// Middleware to verify QStash signature
const qstashVerifyMiddleware = async (req, res, next) => {
  try {
    const signature = req.headers["upstash-signature"];
    if (!signature) {
      logger.warn("QStash signature missing.");
      return res.status(401).send("`Upstash-Signature` header is missing");
    }

    // --- CAPTURA MANUAL DO CORPO (CORREÇÃO) ---
    // 1. Lê os chunks (pedaços) da requisição para montar o buffer original
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBodyBuffer = Buffer.concat(chunks);
    const rawBodyString = rawBodyBuffer.toString(); // Corpo exato como string

    // ✅ CRUCIAL: Usar a string que acabamos de capturar, NÃO o req.body
    // Se usasse req.body aqui, daria erro porque o stream já foi consumido acima.

    // Verify the signature with the exact raw body string
    const isValid = await qstashReceiver.verify({
      signature,
      body: rawBodyString, // ✅ Usando a captura manual correta
    });

    if (!isValid) {
      logger.warn("Invalid QStash signature received.");
      return res.status(401).send("Invalid signature");
    }

    // ✅ Converter manualmente para JSON para o Controller usar depois
    if (rawBodyString) {
      try {
        req.body = JSON.parse(rawBodyString);
      } catch (parseError) {
        logger.error("Error parsing request body:", parseError);
        return res.status(400).send("Invalid JSON body");
      }
    } else {
      req.body = {};
    }

    next();
  } catch (error) {
    logger.error("Error during QStash signature verification:", error);
    res.status(500).send("Error processing request.");
  }
};

router.post("/process", qstashVerifyMiddleware, processJob);

export default router;
