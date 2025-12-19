import { supabase } from "../config/supabase.js";
import { hashPassword, verifyPassword } from "../services/securityService.js";
import { generateToken } from "../config/jwt.js";

// --- FUNÇÃO DE CADASTRO (Atualizada com Cargo) ---
export const registrarDefensor = async (req, res) => {
  try {
    // 1. Recebemos o 'cargo' (se não vier, assume 'operador')
    const { nome, email, senha, cargo = "operador" } = req.body;

    // 2. Mantemos sua regra de negócio original (Domínio da Defensoria)
    if (!email || !email.endsWith("@defensoria.ba.def.br")) {
      return res.status(400).json({
        error:
          "Cadastro permitido apenas para emails com domínio @defensoria.ba.def.br",
      });
    }

    // 3. Validamos se o cargo é válido (Segurança extra)
    const cargosValidos = ["admin", "operador", "recepcao"];
    if (!cargosValidos.includes(cargo)) {
      return res
        .status(400)
        .json({ error: "Cargo inválido. Use: admin, operador ou recepcao." });
    }

    const senha_hash = await hashPassword(senha);

    // 4. Inserimos no banco INCLUINDO o cargo
    const { data, error } = await supabase
      .from("defensores")
      .insert({
        nome,
        email,
        senha_hash,
        cargo, // <--- Campo novo
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return res
          .status(409)
          .json({ error: "Este email já está cadastrado." });
      }
      throw error;
    }

    res.status(201).json({
      message: "Usuário cadastrado com sucesso!",
      defensor: {
        id: data.id,
        nome: data.nome,
        email: data.email,
        cargo: data.cargo, // Devolvemos o cargo
      },
    });
  } catch (err) {
    console.error("Erro ao registrar defensor:", err);
    res.status(500).json({ error: "Falha ao registrar defensor." });
  }
};

// --- FUNÇÃO DE LOGIN (Atualizada com Cargo no Token) ---
export const loginDefensor = async (req, res) => {
  const { email, senha } = req.body;

  try {
    // 1. Buscamos o 'cargo' no SELECT
    const { data: defensor, error } = await supabase
      .from("defensores")
      .select("id, nome, email, senha_hash, cargo") // <--- IMPORTANTE: Trazer o cargo
      .eq("email", email)
      .single();

    if (error || !defensor) {
      return res.status(401).json({ error: "Email ou senha inválidos." });
    }

    const senhaValida = await verifyPassword(senha, defensor.senha_hash);

    if (!senhaValida) {
      return res.status(401).json({ error: "Email ou senha inválidos." });
    }

    // 2. Colocamos o cargo dentro do Token JWT (Payload)
    // Isso permite verificar permissão no backend sem ir no banco toda hora
    const payload = {
      id: defensor.id,
      nome: defensor.nome,
      email: defensor.email,
      cargo: defensor.cargo, // <--- O cargo viaja no token agora
    };

    const token = generateToken(payload);

    // 3. Devolvemos o objeto defensor completo para o Frontend salvar no state/localStorage
    res.status(200).json({
      token,
      defensor: {
        id: defensor.id,
        nome: defensor.nome,
        email: defensor.email,
        cargo: defensor.cargo,
      },
    });
  } catch (err) {
    console.error("Erro no login:", err);
    res.status(500).json({ error: "Falha ao fazer login." });
  }
};
