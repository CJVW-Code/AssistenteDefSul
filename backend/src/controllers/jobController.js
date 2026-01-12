import logger from '../utils/logger.js';
import { processarCasoEmBackground } from './casosController.js';
import { supabase } from '../config/supabase.js';

export const processJob = async (req, res) => {
  try {
    logger.info('📩 Job recebido do QStash:', {
      body: req.body,
      headers: req.headers,
    });

    // Validação básica do payload
    if (!req.body || !req.body.protocolo) {
      logger.warn('⚠️ Payload inválido: protocolo ausente');
      return res.status(400).json({
        error: 'Protocolo ausente no payload',
        success: false
      });
    }

    const { protocolo } = req.body;

    // Verificar se o caso existe no banco de dados
    const { data: caso, error: fetchError } = await supabase
      .from("casos")
      .select("*")
      .eq("protocolo", protocolo)
      .single();

    if (fetchError || !caso) {
      logger.warn(`⚠️ Caso não encontrado: ${protocolo}`);
      return res.status(404).json({
        error: 'Caso não encontrado',
        protocolo,
        success: false
      });
    }

    // Verificar status atual do caso
    if (caso.status === 'processado') {
      logger.info(`✅ Caso já processado: ${protocolo}`);
      return res.status(200).json({
        message: 'Caso já processado',
        protocolo,
        status: caso.status,
        success: true
      });
    }

    if (caso.status === 'processando') {
      logger.info(`⏳ Caso já em processamento: ${protocolo}`);
      return res.status(200).json({
        message: 'Caso já em processamento',
        protocolo,
        status: caso.status,
        success: true
      });
    }

    // Atualizar status para processando
    await supabase
      .from("casos")
      .update({
        status: "processando",
        processing_started_at: new Date()
      })
      .eq("protocolo", protocolo);

    logger.info(`🔄 Iniciando processamento do caso ${protocolo} via QStash`);

    // Chamar a função de processamento existente
    await processarCasoEmBackground(
      protocolo,
      caso.dados_formulario,
      caso.urls_documentos || [],
      caso.url_audio,
      caso.url_peticao
    );

    logger.info(`✅ Processamento concluído para o caso ${protocolo}`);

    res.status(200).json({
      message: 'Job processado com sucesso',
      protocolo,
      success: true
    });

  } catch (error) {
    logger.error(`❌ Erro ao processar job QStash: ${error.message}`, {
      stack: error.stack,
      body: req.body
    });

    // Tentar atualizar o status para erro se o caso existir
    if (req.body?.protocolo) {
      try {
        await supabase
          .from("casos")
          .update({
            status: "erro",
            erro_processamento: error.message
          })
          .eq("protocolo", req.body.protocolo);
      } catch (updateError) {
        logger.error(`❌ Falha ao atualizar status de erro: ${updateError.message}`);
      }
    }

    res.status(500).json({
      error: 'Erro ao processar job',
      details: error.message,
      success: false
    });
  }
};
