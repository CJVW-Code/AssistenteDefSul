// Arquivo: backend/src/controllers/statusController.js

import { supabase } from "../config/supabase.js";
// Vamos precisar da função que verifica a chave hash
import { verifyKey } from "../services/securityService.js";
import logger from "../utils/logger.js";

export const consultarStatus = async (req, res) => {
  // 1. Pega o CPF e a chave da URL (query parameters)
  const { cpf, chave } = req.query;

  if (!cpf || !chave) {
    logger.warn(`Tentativa de consulta de status sem credenciais completas.`);
    return res
      .status(400)
      .json({ error: "CPF e chave de acesso são obrigatórios para consulta." });
  }

  const cpfLimpo = cpf.replace(/\D/g, "");

  logger.debug(`Consultando status para CPF: ${cpfLimpo}`);

  try {
    // 2. Busca no Supabase pelos casos com o CPF informado (pode haver mais de um)
    const { data: casos, error } = await supabase
      .from("casos")
      .select(
        "status, chave_acesso_hash, nome_assistido, numero_processo, numero_solar, url_capa_processual, url_documento_gerado"
      )
      .eq("cpf_assistido", cpfLimpo);

    // Se o caso não for encontrado, retorna um erro genérico
    if (error || !casos || casos.length === 0) {
      logger.warn(
        `Consulta falhou: CPF ${cpfLimpo} não encontrado ou erro no banco.`
      );
      return res
        .status(404)
        .json({ error: "CPF ou chave de acesso inválidos." });
    }

    // 3. Procura na lista de casos qual deles possui a chave válida
    const caso = casos.find((c) => verifyKey(chave, c.chave_acesso_hash));

    if (!caso) {
      logger.warn(`Consulta falhou: Chave inválida para CPF ${cpfLimpo}.`);
      return res
        .status(401)
        .json({ error: "CPF ou chave de acesso inválidos." });
    }

    logger.info(
      `Status consultado com sucesso para CPF ${cpfLimpo}. Status: ${caso.status}`
    );
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
    logger.error(`Erro crítico ao consultar status: ${err.message}`, {
      stack: err.stack,
    });
    res.status(500).json({ error: "Ocorreu um erro interno no servidor." });
  }
};
