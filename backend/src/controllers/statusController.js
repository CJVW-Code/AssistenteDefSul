import { supabase } from "../config/supabase.js";
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

  const cpfLimpo = String(cpf).replace(/\D/g, "");

  logger.debug(`Consultando status para CPF: ${cpfLimpo}`);

  try {
    // 2. Busca no Supabase TODOS os casos com o CPF informado
    // REMOVIDO: .single() -> Agora aceitamos múltiplos resultados (array)
    const { data: casos, error } = await supabase
      .from("casos")
      .select(
        "id, status, chave_acesso_hash, nome_assistido, numero_processo, numero_solar, url_capa_processual, url_documento_gerado, agendamento_data, agendamento_link, agendamento_status, descricao_pendencia",
      )
      .eq("cpf_assistido", cpfLimpo);

    // Se der erro ou array vazio (nenhum caso encontrado)
    if (error || !casos || casos.length === 0) {
      logger.warn(
        `Consulta falhou: CPF ${cpfLimpo} não encontrado ou erro no banco.`,
      );
      return res
        .status(404)
        .json({ error: "CPF ou chave de acesso inválidos." });
    }

    // 3. LÓGICA DE MULTI-CASOS: Itera sobre os casos para encontrar qual chave abre qual porta
    let casoEncontrado = null;

    for (const caso of casos) {
      const valida = verifyKey(chave, caso.chave_acesso_hash);
      if (valida) {
        casoEncontrado = caso;
        break; // Achamos o caso correto, paramos de procurar
      }
    }

    // Se rodou todos os casos do CPF e nenhuma chave bateu
    if (!casoEncontrado) {
      logger.warn(
        `Consulta falhou: Chave inválida para todos os casos do CPF ${cpfLimpo}.`,
      );
      return res
        .status(401)
        .json({ error: "CPF ou chave de acesso inválidos." });
    }

    logger.info(
      `Status consultado com sucesso para CPF ${cpfLimpo}. Status: ${casoEncontrado.status}`,
    );

    // Mapeamento de status internos para os 4 status públicos solicitados
    const statusPublicoMap = {
      recebido: "enviado",
      processando: "em triagem",
      processado: "em triagem",
      em_analise: "em triagem",
      aguardando_docs: "documentos pendente",
      documentos_entregues: "documentos entregues",
      reuniao_agendada: "reuniao agendada",
      reuniao_online_agendada: "reuniao online",
      reuniao_presencial_agendada: "reuniao presencial",
      reagendamento_solicitado: "em analise",
      encaminhado_solar: "encaminhamento solar",
      finalizado: "encaminhamento solar",
      erro: "enviado",
    };

    const statusDescricaoMap = {
      recebido: "O caso foi submetido e está na fila para processamento.",
      processando: "Estamos processando seus documentos.",
      processado: "Processamento concluído. Aguardando análise.",
      em_analise: "Estamos analisando suas informações. Por favor, aguarde.",
      aguardando_docs:
        "Precisamos de documentos complementares. Verifique abaixo.",
      documentos_entregues: "Documentos recebidos. Aguarde nova análise.",
      reuniao_agendada:
        "Seu atendimento presencial foi agendado. Compareça na data prevista.",
      reuniao_online_agendada:
        "Seu atendimento online foi agendado. Acesse o link na data e hora marcadas.",
      reuniao_presencial_agendada:
        "Seu atendimento presencial foi agendado. Confira o local e data abaixo.",
      reagendamento_solicitado:
        "Recebemos sua solicitação de reagendamento. Aguarde, entraremos em contato em breve.",
      encaminhado_solar: "Caso finalizado e encaminhado para a Defensoria.",
      finalizado: "Caso concluído.",
      erro: "Ocorreu um erro no processamento.",
    };

    // Formatação da data para exibição (sem segundos)
    let agendamentoFormatado = null;
    if (casoEncontrado.agendamento_data) {
      const dataObj = new Date(casoEncontrado.agendamento_data);
      agendamentoFormatado = dataObj.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    // 4. Se tudo estiver correto, retorna o status do caso ENCONTRADO
    res.status(200).json({
      id: casoEncontrado.id,
      status: statusPublicoMap[casoEncontrado.status] || "enviado",
      descricao:
        statusDescricaoMap[casoEncontrado.status] ||
        "Estamos analisando suas informações. Por favor, aguarde.",
      nome_assistido: casoEncontrado.nome_assistido,
      numero_processo: casoEncontrado.numero_processo,
      numero_solar: casoEncontrado.numero_solar,
      url_capa_processual: casoEncontrado.url_capa_processual,
      url_documento_gerado: casoEncontrado.url_documento_gerado,
      agendamento_data: casoEncontrado.agendamento_data,
      agendamento_data_formatada: agendamentoFormatado,
      agendamento_link: casoEncontrado.agendamento_link,
      agendamento_status: casoEncontrado.agendamento_status,
      descricao_pendencia: casoEncontrado.descricao_pendencia,
    });
  } catch (err) {
    logger.error(`Erro crítico ao consultar status: ${err.message}`, {
      stack: err.stack,
    });
    res.status(500).json({ error: "Ocorreu um erro interno no servidor." });
  }
};
