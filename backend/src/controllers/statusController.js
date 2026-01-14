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
    // 2. Busca no Supabase pelo caso com o CPF informado
    const { data: caso, error } = await supabase
      .from("casos")
      .select(
        "status, chave_acesso_hash, nome_assistido, numero_processo, numero_solar, url_capa_processual, url_documento_gerado, agendamento_data, agendamento_link, agendamento_status"
      )
      .eq("cpf_assistido", cpfLimpo)
      .single(); // .single() garante que apenas um resultado seja retornado

    // Se o caso não for encontrado, retorna um erro genérico
    if (error || !caso) {
      logger.warn(
        `Consulta falhou: CPF ${cpfLimpo} não encontrado ou erro no banco.`
      );
      return res
        .status(404)
        .json({ error: "CPF ou chave de acesso inválidos." });
    }

    // 3. Verifica se a chave de acesso fornecida é válida
    // Compara a chave em texto puro (chave) com a versão hash salva no banco
    const isChaveValida = verifyKey(chave, caso.chave_acesso_hash);

    if (!isChaveValida) {
      logger.warn(`Consulta falhou: Chave inválida para CPF ${cpfLimpo}.`);
      return res
        .status(401)
        .json({ error: "CPF ou chave de acesso inválidos." });
    }

    logger.info(
      `Status consultado com sucesso para CPF ${cpfLimpo}. Status: ${caso.status}`
    );

    // Mapeamento de status internos para os 4 status públicos solicitados
    const statusPublicoMap = {
      recebido: "enviado",
      processando: "em triagem",
      processado: "em triagem",
      em_analise: "em triagem",
      aguardando_docs: "documentos pendente",
      encaminhado_solar: "encaminhamento solar",
      finalizado: "encaminhamento solar",
      erro: "enviado",
    };

    // 4. Se tudo estiver correto, retorna o status do caso
    res.status(200).json({
      status: statusPublicoMap[caso.status] || "enviado",
      nome_assistido: caso.nome_assistido,
      numero_processo: caso.numero_processo,
      numero_solar: caso.numero_solar,
      url_capa_processual: caso.url_capa_processual,
      url_documento_gerado: caso.url_documento_gerado,
      agendamento_data: caso.agendamento_data,
      agendamento_link: caso.agendamento_link,
      agendamento_status: caso.agendamento_status,
    });
  } catch (err) {
    logger.error(`Erro crítico ao consultar status: ${err.message}`, {
      stack: err.stack,
    });
    res.status(500).json({ error: "Ocorreu um erro interno no servidor." });
  }
};
