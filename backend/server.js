import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import statusRoutes from "./src/routes/status.js";
import casosRoutes from "./src/routes/casos.js";
import defensoresRoutes from "./src/routes/defensores.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8001;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rota Defensores
app.use("/api/defensores", defensoresRoutes);

// Rota principal de casos
app.use("/api/casos", casosRoutes);

// Rota para consultar status
app.use("/api/status", statusRoutes);

// Rota de "saúde" do sistema
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Def. Sul Bahia API is running" });
});

// Tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Algo deu errado no servidor!" });
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
