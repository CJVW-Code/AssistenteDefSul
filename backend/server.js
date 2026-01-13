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

// Middlewares
app.use(cors());

// Middleware de Logging de Requisições HTTP
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.http(
      `${req.method} ${req.originalUrl} [${res.statusCode}] - ${duration}ms`
    );
  });
  next();
});

// A rota do QStash precisa do corpo bruto (raw body) para validar a assinatura.
// Este middleware deve ser configurado ANTES do parser de JSON global.
app.use("/api/jobs", express.raw({ type: "application/json" }), jobsRoutes);

// Para as outras rotas, usamos o parser de JSON.
// Este middleware irá processar o corpo de todas as rotas que não foram capturadas antes.
app.use(express.json());

// Rotas da API
app.use("/api/defensores", defensoresRoutes);
app.use("/api/casos", casosRoutes);
app.use("/api/status", statusRoutes);
app.use("/api/debug", debugRoutes);

// Rota de "saúde" do sistema
app.get("/", (req, res) => {
  res.json({ status: "OK", message: "Def. Sul Bahia API is running" });
});

app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Def. Sul Bahia API is running" });
});

// Tratamento de erros
app.use((err, req, res, next) => {
  logger.error(`Erro não tratado: ${err.message}`, { stack: err.stack });
  res.status(500).json({ error: "Algo deu errado no servidor!" });
});

// Inicia o servidor
app.listen(PORT, "0.0.0.0", () => {
  logger.info(`🚀 Servidor rodando na porta ${PORT}`);
});
