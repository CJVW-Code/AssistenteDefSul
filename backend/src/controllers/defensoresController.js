import { supabase } from "../config/supabase.js";
import { hashPassword, verifyPassword } from "../services/securityService.js";
import { generateToken } from "../config/jwt.js";

// --- FUNÇÃO DE CADASTRO (Atualizada com Cargo) ---
export const registrarDefensor = async (req, res) => {
  try {
    // --- SEGURANÇA: VERIFICAÇÃO DE ADMIN ---
    // Garante que apenas usuários com cargo 'admin' possam criar novos usuários.
    // O objeto 'req.user' é populado pelo authMiddleware.
    if (!req.user || req.user.cargo !== "admin") {
      return res
        .status(403)
        .json({
          error:
            "Acesso negado. Apenas administradores podem cadastrar novos membros.",
        });
    }
    // ---------------------------------------

    // 1. Recebemos o 'cargo' (se não vier, assume 'operador')
    const { nome, email, senha, cargo = "operador" } = req.body;

    // 3. Validamos se o cargo é válido (Segurança extra)
    const cargosValidos = ["admin", "defensor", "estagiario", "recepcao"];
    if (!cargosValidos.includes(cargo)) {
      return res
        .status(400)
        .json({
          error:
            "Cargo inválido. Use: admin, defensor, estagiario ou recepcao.",
        });
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

// --- LISTAR EQUIPE (Apenas Admin) ---
export const listarDefensores = async (req, res) => {
  try {
    // Segurança: Apenas admin pode ver a lista completa
    if (!req.user || req.user.cargo !== "admin") {
      return res.status(403).json({ error: "Acesso negado." });
    }

    const { data, error } = await supabase
      .from("defensores")
      .select("id, nome, email, cargo, created_at")
      .order("nome", { ascending: true });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("Erro ao listar equipe:", err);
    res.status(500).json({ error: "Erro ao buscar membros da equipe." });
  }
};

// --- ATUALIZAR MEMBRO (Apenas Admin) ---
export const atualizarDefensor = async (req, res) => {
  try {
    if (!req.user || req.user.cargo !== "admin") {
      return res.status(403).json({ error: "Acesso negado." });
    }

    const { id } = req.params;
    const { nome, email, cargo } = req.body;

    const cargosValidos = ["admin", "defensor", "estagiario", "recepcao"];
    if (cargo && !cargosValidos.includes(cargo)) {
      return res.status(400).json({ error: "Cargo inválido." });
    }

    const { data, error } = await supabase
      .from("defensores")
      .update({ nome, email, cargo })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("Erro ao atualizar membro:", err);
    res.status(500).json({ error: "Erro ao atualizar dados." });
  }
};

// --- DELETAR MEMBRO (Apenas Admin) ---
export const deletarDefensor = async (req, res) => {
  try {
    if (!req.user || req.user.cargo !== "admin") {
      return res.status(403).json({ error: "Acesso negado." });
    }

    const { id } = req.params;

    // Evitar que o admin se delete
    if (id === req.user.id) {
      return res
        .status(400)
        .json({ error: "Você não pode excluir sua própria conta." });
    }

    const { error } = await supabase.from("defensores").delete().eq("id", id);

    if (error) throw error;

    res.json({ message: "Membro removido com sucesso." });
  } catch (err) {
    console.error("Erro ao deletar membro:", err);
    res.status(500).json({ error: "Erro ao excluir usuário." });
  }
};

// --- RESETAR SENHA (Apenas Admin) ---
export const resetarSenhaDefensor = async (req, res) => {
  try {
    if (!req.user || req.user.cargo !== "admin") {
      return res.status(403).json({ error: "Acesso negado." });
    }

    const { id } = req.params;
    const { novaSenha } = req.body;

    if (!novaSenha || novaSenha.length < 6) {
      return res
        .status(400)
        .json({ error: "A nova senha deve ter pelo menos 6 caracteres." });
    }

    const senha_hash = await hashPassword(novaSenha);

    const { error } = await supabase
      .from("defensores")
      .update({ senha_hash })
      .eq("id", id);

    if (error) throw error;

    res.json({ message: "Senha alterada com sucesso." });
  } catch (err) {
    console.error("Erro ao resetar senha:", err);
    res.status(500).json({ error: "Erro ao alterar senha." });
  }
};
