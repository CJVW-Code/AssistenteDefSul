import express from 'express';
import { processJob } from '../controllers/jobController.js';
import { Receiver } from "@upstash/qstash";
import logger from '../utils/logger.js';

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

    // The 'req.body' MUST be the raw, unparsed buffer.
    const isValid = await qstashReceiver.verify({
      signature,
      body: req.body,
    });

    if (!isValid) {
      logger.warn("Invalid QStash signature received.");
      return res.status(401).send("Invalid signature");
    }

    // If valid, parse the body as JSON and continue
    req.body = JSON.parse(req.body.toString('utf-8'));
    next();
  } catch (error) {
    logger.error("Error during QStash signature verification:", error);
    res.status(500).send("Error processing request.");
  }
};

// The route QStash will call
// It's important that the express.raw() middleware is used on server.js for this route
router.post('/process', qstashVerifyMiddleware, processJob);

export default router;