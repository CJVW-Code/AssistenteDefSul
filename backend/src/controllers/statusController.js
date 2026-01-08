// Arquivo: backend/src/controllers/statusController.js

import { supabase } from "../config/supabase.js";
// Vamos precisar da função que verifica a chave hash
import { verifyKey } from "../services/securityService.js";

export const consultarStatus = async (req, res) => {
  // 1. Pega o CPF e a chave da URL (query parameters)
  const { cpf, chave } = req.query;
  console.log("\n--- DEBUG: CONSULTA DE STATUS ---");
  console.log("CPF Recebido:", cpf);
  console.log("Chave Recebida (Texto Puro):", chave);
  if (!cpf || !chave) {
    return res
      .status(400)
      .json({ error: "CPF e chave de acesso são obrigatórios para consulta." });
  }

  const cpfLimpo = cpf.replace(/\D/g, "");

  try {
    // 2. Busca no Supabase pelo caso com o CPF informado
    const { data: caso, error } = await supabase
      .from("casos")
      .select(
        "status, chave_acesso_hash, nome_assistido, numero_processo, numero_solar, url_capa_processual, url_documento_gerado"
      )
      .eq("cpf_assistido", cpfLimpo)
      .single(); // .single() garante que apenas um resultado seja retornado

    // Se o caso não for encontrado, retorna um erro genérico
    if (error || !caso) {
      return res
        .status(404)
        .json({ error: "CPF ou chave de acesso inválidos." });
    }

    // 3. Verifica se a chave de acesso fornecida é válida
    // Compara a chave em texto puro (chave) com a versão hash salva no banco
    const isChaveValida = verifyKey(chave, caso.chave_acesso_hash);

    if (!isChaveValida) {
      return res
        .status(401)
        .json({ error: "CPF ou chave de acesso inválidos." });
    }

    // 4. Se tudo estiver correto, retorna o status do caso
    res.status(200).json({
      status: caso.status,
      nome_assistido: caso.nome_assistido,
      numero_processo: caso.numero_processo,
      numero_solar: caso.numero_solar,
      url_capa_processual: caso.url_capa_processual,
      url_documento_gerado: caso.url_documento_gerado,
    });
  } catch (err) {
    console.error("Erro ao consultar status:", err);
    res.status(500).json({ error: "Ocorreu um erro interno no servidor." });
  }
};
