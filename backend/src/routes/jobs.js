import express from 'express';
import { processJob } from '../controllers/jobController.js';
import { verifySignature } from "@upstash/qstash/dist/nextjs";

const router = express.Router();

// Middleware to verify QStash signature
const qstashVerifyMiddleware = (req, res, next) => {
  // express.raw() middleware should be used before this to get the raw body
  const signature = req.headers["upstash-signature"];
  if (!signature) {
    return res.status(401).send("`Upstash-Signature` header is missing");
  }

  // `req.body` should be the raw body buffer
  verifySignature(req.body, signature)
    .then(isValid => {
      if (isValid) {
        // Body needs to be parsed as JSON after verification
        req.body = JSON.parse(req.body.toString('utf-8'));
        next();
      } else {
        res.status(401).send("Invalid signature");
      }
    })
    .catch(err => {
        console.error("Error verifying QStash signature:", err);
        res.status(500).send("Error verifying signature");
    });
};


// The route QStash will call
// It's important to use the middleware here
router.post('/process', qstashVerifyMiddleware, processJob);

export default router;
