// Arquivo: backend/src/services/queueService.js
import { supabase } from "../config/supabase.js";
import { processarCasoEmBackground } from "../controllers/casosController.js";
import logger from "../utils/logger.js";

let isProcessing = false;
const MAX_RETRIES = 3;

export const iniciarFilaProcessamento = () => {
  console.log("🚀 Fila de processamento iniciada (Polling a cada 5s)...");
  logger.info("🚀 Fila de processamento iniciada (Polling a cada 5s)...");

  setInterval(async () => {
    // Se já estiver processando um item, espera terminar antes de pegar o próximo
    if (isProcessing) return;

    try {
      isProcessing = true;

      // 1. Busca o caso mais antigo que ainda está 'pendente'
      const { data: caso, error } = await supabase
        .from("casos")
        .select("protocolo")
        .eq("status", "pendente")
        .is("processed_at", null)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 é "nenhum resultado encontrado", o que é normal
        console.error(`Erro ao buscar fila: ${error.message}`);
        logger.error(`Erro ao buscar fila: ${error.message}`);
      }

      if (caso) {
        // 2. Verificar contagem de retries para evitar loops infinitos
        const { data: casoComRetries, error: retryError } = await supabase
          .from("casos")
          .select("protocolo, retry_count")
          .eq("protocolo", caso.protocolo)
          .single();

        if (retryError) {
          console.error(
            `Erro ao buscar contagem de retries: ${retryError.message}`
          );
          logger.error(
            `Erro ao buscar contagem de retries: ${retryError.message}`
          );
          isProcessing = false;
          return;
        }

        // Verificar se atingiu máximo de tentativas
        const currentRetries = casoComRetries.retry_count || 0;
        if (currentRetries >= MAX_RETRIES) {
          console.warn(
            `Caso ${caso.protocolo} atingiu máximo de ${MAX_RETRIES} tentativas. Marcando como erro permanente.`
          );
          logger.warn(
            `Caso ${caso.protocolo} atingiu máximo de ${MAX_RETRIES} tentativas. Marcando como erro permanente.`
          );

          const { error: updateError } = await supabase
            .from("casos")
            .update({
              status: "erro_permanente",
              erro_processamento:
                "Máximo de tentativas de processamento atingido",
              processed_at: new Date(),
            })
            .eq("protocolo", caso.protocolo);

          if (updateError) {
            console.error(
              `Erro ao atualizar status para erro_permanente: ${updateError.message}`
            );
          }

          isProcessing = false;
          return;
        }

        // Incrementar contagem de retries antes de processar
        const { error: incError } = await supabase
          .from("casos")
          .update({
            retry_count: currentRetries + 1,
            last_retry_at: new Date(),
          })
          .eq("protocolo", caso.protocolo);

        if (incError) {
          console.error(`Erro ao incrementar retries: ${incError.message}`);
        }

        console.log(
          `🔄 Fila: Processando caso ${caso.protocolo} (tentativa ${
            currentRetries + 1
          }/${MAX_RETRIES})...`
        );
        logger.info(
          `🔄 Fila: Processando caso ${caso.protocolo} (tentativa ${
            currentRetries + 1
          }/${MAX_RETRIES})...`
        );

        // Chama a função que agora lê tudo do banco
        await processarCasoEmBackground(caso.protocolo);
      }
    } catch (err) {
      console.error(`Erro crítico na fila: ${err.message}`);
      logger.error(`Erro crítico na fila: ${err.message}`);
    } finally {
      isProcessing = false;
    }
  }, 5000); // Verifica a cada 5 segundos
};
