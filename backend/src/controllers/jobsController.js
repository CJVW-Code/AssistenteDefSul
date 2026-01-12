import { Receiver } from "@upstash/qstash";
import { processarCasoEmBackground } from "./casosController.js";
import logger from "../utils/logger.js";

// Inicializa o Receiver do QStash para verificar as assinaturas
const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
});

export const processJob = async (req, res) => {
  try {
    // 1. Verifica a assinatura da requisição
    // O body é passado como string bruta para a verificação
    const isValid = await receiver
      .verify({
        signature: req.headers["upstash-signature"],
        body: JSON.stringify(req.body), // Use JSON.stringify se o body for JSON
      })
      .catch((err) => {
        logger.error("QStash - Erro na verificação da assinatura:", err);
        return false;
      });

    if (!isValid) {
      logger.warn("QStash - Recebida requisição com assinatura inválida.");
      return res.status(401).send("Assinatura inválida");
    }

    logger.info("QStash - Assinatura verificada com sucesso.");

    // 2. Extrai o protocolo do corpo da requisição
    const { protocolo } = req.body;

    if (!protocolo) {
      logger.error("QStash - 'protocolo' não encontrado no corpo da tarefa.");
      return res.status(400).send("'protocolo' é obrigatório");
    }

    logger.info(`QStash - Iniciando processamento para o protocolo: ${protocolo}`);

    // 3. Chama a lógica de processamento principal (a mesma de antes)
    await processarCasoEmBackground(protocolo);

    // 4. Retorna sucesso
    res.status(200).send(`Processamento do caso ${protocolo} concluído com sucesso.`);
    
  } catch (error) {
    logger.error(`QStash - Erro crítico ao processar o job para o protocolo ${req.body.protocolo}:`, {
      message: error.message,
      stack: error.stack,
    });
    // Informa ao QStash que houve um erro e a tarefa deve ser tentada novamente (se configurado)
    res.status(500).send("Erro interno ao processar a tarefa.");
  }
};
