// Arquivo: backend/src/controllers/defensoresController.js

import { supabase } from "../config/supabase.js";
import { hashPassword, verifyPassword } from "../services/securityService.js";
import { generateToken } from "../config/jwt.js";

// --- FUNÇÃO DE CADASTRO ---
export const registrarDefensor = async (req, res) => {
  const { nome, email, senha } = req.body;

  // 1. Validação do email
  if (!email || !email.endsWith("@defensoria.ba.def.br")) {
    return res.status(400).json({
      error:
        "Cadastro permitido apenas para emails com domínio @defensoria.ba.def.br",
    });
  }

  try {
    // 2. Criptografa a senha
    const senha_hash = await hashPassword(senha);

    // 3. Insere o novo defensor no banco de dados
    const { data, error } = await supabase
      .from("defensores")
      .insert({ nome, email, senha_hash })
      .select()
      .single();

    if (error) {
      // Trata o caso de email já existente
      if (error.code === "23505") {
        return res
          .status(409)
          .json({ error: "Este email já está cadastrado." });
      }
      throw error;
    }

    res.status(201).json({
      message: "Defensor cadastrado com sucesso!",
      defensor: { id: data.id, nome: data.nome, email: data.email },
    });
  } catch (err) {
    console.error("Erro ao registrar defensor:", err);
    res.status(500).json({ error: "Falha ao registrar defensor." });
  }
};

// --- FUNÇÃO DE LOGIN ---
export const loginDefensor = async (req, res) => {
  const { email, senha } = req.body;

  try {
    // 1. Busca o defensor pelo email
    const { data: defensor, error } = await supabase
      .from("defensores")
      .select("id, nome, email, senha_hash")
      .eq("email", email)
      .single();

    if (error || !defensor) {
      return res.status(401).json({ error: "Email ou senha inválidos." });
    }

    // 2. Compara a senha fornecida com a senha criptografada no banco
    const senhaValida = await verifyPassword(senha, defensor.senha_hash);

    if (!senhaValida) {
      return res.status(401).json({ error: "Email ou senha inválidos." });
    }

    // 3. Gera o Token JWT com os dados do defensor
    const payload = {
      id: defensor.id,
      nome: defensor.nome,
      email: defensor.email,
    };
    const token = generateToken(payload);

    res.status(200).json({ token });
  } catch (err) {
    console.error("Erro no login:", err);
    res.status(500).json({ error: "Falha ao fazer login." });
  }
};
