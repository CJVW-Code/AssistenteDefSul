import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import statusRoutes from "./src/routes/status.js";
import casosRoutes from "./src/routes/casos.js";
import defensoresRoutes from "./src/routes/defensores.js";
import debugRoutes from "./src/routes/debug.js";
import jobsRoutes from "./src/routes/jobs.js";
import logger from "./src/utils/logger.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8001;

app.use(cors());

// --- A SOLUÇÃO DEFINITIVA ---
// Configuramos o JSON parser globalmente, mas com um "gancho" (verify)
// para salvar o corpo bruto SOMENTE quando a rota for de jobs.
app.use(express.json({
  verify: (req, res, buf) => {
    // Se a rota for do QStash, salvamos o buffer bruto numa variável personalizada
    if (req.originalUrl.includes("/api/jobs")) {
      req.rawBody = buf.toString(); 
    }
  }
}));

app.use(express.urlencoded({ extended: true }));

// Rotas
app.use("/api/jobs", jobsRoutes); // Agora esta rota já receberá o req.rawBody preenchido
app.use("/api/defensores", defensoresRoutes);
app.use("/api/casos", casosRoutes);
app.use("/api/status", statusRoutes);
app.use("/api/debug", debugRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Def. Sul Bahia API is running" });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});