import { supabase } from "../config/supabase.js";
import {
  generateCredentials,
  hashKeyWithSalt,
} from "../services/securityService.js";
import fs from "fs/promises";
import { transcribeAudio } from "../services/audioService.js";
import { extractTextFromImage } from "../services/documentService.js";
import { generateDocx } from "../services/documentGenerationService.js";
import {
  analyzeCase,
  generatePetitionText,
} from "../services/geminiService.js";
// Tempo de expiração (em segundos) para URLs assinadas do Supabase
// Pode ser configurado pela env var SIGNED_URL_EXPIRES; padrão 24h (86400s)
const signedExpires = Number.parseInt(process.env.SIGNED_URL_EXPIRES || "86400", 10);
// --- FUNÇÃO DE CRIAÇÃO (VERSÃO FINAL E COMPLETA) ---
export const criarNovoCaso = async (req, res) => {
  try {
    const {
      nome,
      cpf,
      telefone,
      tipoAcao,
      relato,
      documentos_informados,
      // novos campos
      endereco_assistido,
      email_assistido,
      dados_adicionais_requerente,
      nome_requerido,
      cpf_requerido,
      endereco_requerido,
      dados_adicionais_requerido,
      filhos_info,
      data_inicio_relacao,
      data_separacao,
      bens_partilha,
      // FIXAÇÃO/OFERTA
      percentual_sm_requerido,
      percentual_despesas_extra,
      dia_pagamento_requerido,
      dados_bancarios_deposito,
      requerido_tem_emprego_formal,
      empregador_requerido_nome,
      empregador_requerido_endereco,
      // EXECUÇÃO
      numero_processo_originario,
      vara_originaria,
      percentual_ou_valor_fixado,
      dia_pagamento_fixado,
      periodo_debito_execucao,
      valor_total_debito_execucao,
      // DIVÓRCIO
      regime_bens,
      retorno_nome_solteira,
      alimentos_para_ex_conjuge,
    } = req.body;
    const documentosInformadosArray = JSON.parse(documentos_informados || "[]");
    const { protocolo, chaveAcesso } = generateCredentials(tipoAcao);
    const chaveAcessoHash = hashKeyWithSalt(chaveAcesso);

    console.log("\n--- DEBUG: CRIAÇÃO DO CASO ---");
    console.log("Chave de Acesso (Texto Puro):", chaveAcesso);
    console.log("Hash que será salvo no Banco:", chaveAcessoHash);
    console.log("---------------------------------\n");

    let textoCompleto = relato || "";
    let resumo_ia = "";
    let url_documento_gerado = null;
    let url_audio = null;
    let url_peticao = null;
    let urls_documentos = [];

    // --- ETAPA 1: PROCESSAMENTO ---
    if (req.files) {
      if (req.files.audio) {
        // Bloco de transcrição de áudio
        /*
        console.log("Iniciando transcrição de áudio...");
        const textoDoAudio = await transcribeAudio(req.files.audio[0].path);
        textoCompleto += `\n\n--- TRANSCRIÇÃO DO ÁUDIO ---\n${textoDoAudio}`;
        console.log("Transcrição concluída.");
        */
      }
      if (req.files.documentos) {
        for (const docFile of req.files.documentos) {
          if (["image/jpeg", "image/png"].includes(docFile.mimetype)) {
            const textoDaImagem = await extractTextFromImage(docFile.path);
            textoCompleto += `\n\n--- TEXTO EXTRAÍDO DE: ${docFile.originalname} ---\n${textoDaImagem}`;
          }
        }
      }
    }

    console.log("Gerando resumo com IA...");
    resumo_ia = await analyzeCase(textoCompleto);
    console.log("Resumo gerado.");
    console.log("Gerando rascunho da petição inicial...");
    const acaoEspecifica =
      (tipoAcao || "").split(" - ")[1]?.trim() || (tipoAcao || "").trim();
    const caseDataForPetition = {
      nome_assistido: nome,
      cpf_assistido: cpf,
      telefone_assistido: telefone,
      tipo_acao: tipoAcao, // Pode precisar dividir entre área e ação específica
      acao_especifica: acaoEspecifica,
      relato_texto: relato,
      documentos_informados: documentosInformadosArray,
      resumo_ia: resumo_ia,
      // Campos adicionais para o prompt detalhado
      endereco_assistido: endereco_assistido,
      email_assistido: email_assistido,
      dados_adicionais_requerente: dados_adicionais_requerente,
      nome_requerido: nome_requerido,
      cpf_requerido: cpf_requerido,
      endereco_requerido: endereco_requerido,
      dados_adicionais_requerido: dados_adicionais_requerido,
      filhos_info: filhos_info,
      data_inicio_relacao: data_inicio_relacao,
      data_separacao: data_separacao,
      bens_partilha: bens_partilha,
      // Fixação/Oferta
      percentual_sm_requerido,
      percentual_despesas_extra,
      dia_pagamento_requerido,
      dados_bancarios_deposito,
      requerido_tem_emprego_formal,
      empregador_requerido_nome,
      empregador_requerido_endereco,
      // Execução
      numero_processo_originario,
      vara_originaria,
      percentual_ou_valor_fixado,
      dia_pagamento_fixado,
      periodo_debito_execucao,
      valor_total_debito_execucao,
      // Divórcio
      regime_bens,
      retorno_nome_solteira,
      alimentos_para_ex_conjuge,
    };
    const peticao_inicial_rascunho = await generatePetitionText(
      caseDataForPetition
    );
    console.log("Rascunho da petição gerado.");
    // --- FIM DA CHAMADA ---

    // ... (O código de geração do .docx continua aqui, se você ainda o quiser) ...
    console.log("Gerando documento .docx..."); // Linha existente

    // ... (O código de upload dos arquivos originais continua aqui) ...
    // --- GERAÇÃO E UPLOAD DO DOCX GERADO ---
    try {
      // Monta os dados para o template .docx (ajuste conforme placeholders do template)
      const docxData = {
        protocolo,
        nome_assistido: nome,
        cpf_assistido: cpf,
        telefone_assistido: telefone,
        tipo_acao: tipoAcao,
        relato_texto: relato,
        resumo_ia,
        endereco_assistido,
        email_assistido,
        dados_adicionais_requerente,
        nome_requerido,
        cpf_requerido,
        endereco_requerido,
        dados_adicionais_requerido,
        filhos_info,
        data_inicio_relacao,
        data_separacao,
        bens_partilha,
        // Se o template tiver um placeholder para o texto da petição
        peticao_texto: peticao_inicial_rascunho,
      };

      const docxBuffer = await generateDocx(docxData);
      const docxPath = `${protocolo}/peticao_inicial_${protocolo}.docx`;

      const { error: uploadDocxErr } = await supabase.storage
        .from("peticoes")
        .upload(docxPath, docxBuffer, {
          contentType:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          upsert: true,
        });
      if (uploadDocxErr) {
        console.error("Falha ao fazer upload do DOCX gerado:", uploadDocxErr);
      } else {
        const { data: signedDoc, error: signDocErr } = await supabase.storage
          .from("peticoes")
          .createSignedUrl(docxPath, signedExpires);
        if (signDocErr) {
          console.error("Falha ao criar URL assinada do DOCX:", signDocErr);
        } else {
          url_documento_gerado = signedDoc?.signedUrl || null;
        }
      }
    } catch (e) {
      console.error("Erro ao gerar/upload do DOCX:", e);
    }

    // --- ETAPA 2: UPLOAD DOS ARQUIVOS ORIGINAIS ---
    console.log("Iniciando upload dos arquivos originais...");
    if (req.files) {
      if (req.files.audio) {
        const audioFile = req.files.audio[0];
        const filePath = `${protocolo}/${audioFile.filename}`;
        await supabase.storage
          .from("audios")
          .upload(filePath, await fs.readFile(audioFile.path), {
            contentType: audioFile.mimetype,
          });
        {
          const { data: signed, error: signErr } = await supabase.storage
            .from("audios")
            .createSignedUrl(filePath, signedExpires);
          if (signErr) {
            console.error("Falha ao gerar signed URL do áudio:", signErr);
          }
          url_audio = signed?.signedUrl || null;
        }
      }
      if (req.files.documentos) {
        for (const docFile of req.files.documentos) {
          const filePath = `${protocolo}/${docFile.filename}`;
          const fileData = await fs.readFile(docFile.path);
          if (docFile.originalname.toLowerCase().includes("peticao")) {
            await supabase.storage
              .from("peticoes")
              .upload(filePath, fileData, { contentType: docFile.mimetype });
            {
              const { data: signed, error: signErr } = await supabase.storage
                .from("peticoes")
                .createSignedUrl(filePath, signedExpires);
              if (signErr) {
                console.error("Falha ao gerar signed URL da petição:", signErr);
              }
              url_peticao = signed?.signedUrl || null;
            }
          } else {
            await supabase.storage
              .from("documentos")
              .upload(filePath, fileData, { contentType: docFile.mimetype });
            {
              const { data: signed, error: signErr } = await supabase.storage
                .from("documentos")
                .createSignedUrl(filePath, signedExpires);
              if (signErr) {
                console.error(
                  "Falha ao gerar signed URL de documento:",
                  signErr
                );
              }
              if (signed?.signedUrl) urls_documentos.push(signed.signedUrl);
            }
          }
        }
      }
    }
    console.log("Upload dos arquivos originais concluído.");

    // --- ETAPA 3: SALVAR TUDO NO BANCO DE DADOS ---
    console.log('Inserindo dados na tabela "casos"...');
    const { error: dbError } = await supabase.from("casos").insert({
      protocolo,
      chave_acesso_hash: chaveAcessoHash,
      nome_assistido: nome,
      cpf_assistido: cpf,
      telefone_assistido: telefone,
      tipo_acao: tipoAcao,
      relato_texto: relato,
      url_audio,
      url_peticao,
      urls_documentos,
      resumo_ia,
      url_documento_gerado,
      documentos_informados: documentosInformadosArray,
      peticao_inicial_rascunho: peticao_inicial_rascunho,
    });

    if (dbError) {
      console.error("!!! ERRO DO SUPABASE AO INSERIR !!!", dbError);
      throw dbError;
    }
    console.log("SUCESSO: Dados inseridos no banco.");

    // --- ETAPA 4: LIMPEZA E RESPOSTA ---
    if (req.files) {
      for (const key in req.files) {
        for (const file of req.files[key]) {
          await fs.unlink(file.path);
        }
      }
    }
    res.status(201).json({ protocolo, chaveAcesso });
  } catch (error) {
    console.error("Erro final ao criar novo caso:", error);
    if (req.files) {
      for (const key in req.files) {
        for (const file of req.files[key]) {
          try {
            await fs.unlink(file.path);
          } catch (e) {}
        }
      }
    }
    res.status(500).json({ error: "Falha ao processar a solicitação." });
  }
};

// --- FUNÇÃO PARA LISTAR TODOS OS CASOS ---
export const listarCasos = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("casos")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    console.error("Erro ao listar casos:", err);
    res.status(500).json({ error: "Falha ao buscar casos." });
  }
};

// --- FUNÇÃO PARA OBTER DETALHES DE UM CASO ---
export const obterDetalhesCaso = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: caso, error } = await supabase
      .from("casos")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    if (!caso) return res.status(404).json({ error: "Caso não encontrado." });
    res.status(200).json(caso);
  } catch (err) {
    console.error("Erro ao obter detalhes do caso:", err);
    res.status(500).json({ error: "Falha ao buscar detalhes do caso." });
  }
};
export const atualizarStatusCaso = async (req, res) => {
  try {
    const { id } = req.params; // Pega o ID do caso da URL
    const { status } = req.body; // Pega o novo status do corpo da requisição

    // Validação simples para garantir que o status é um dos valores esperados
    const statusPermitidos = [
      "recebido",
      "em_analise",
      "aguardando_docs",
      "finalizado",
    ];
    if (!status || !statusPermitidos.includes(status)) {
      return res.status(400).json({ error: "Status inválido." });
    }

    // Atualiza o caso no Supabase onde o 'id' corresponde
    const { data, error } = await supabase
      .from("casos")
      .update({ status: status })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Caso não encontrado." });

    res.status(200).json(data); // Retorna o caso atualizado
  } catch (err) {
    console.error("Erro ao atualizar status do caso:", err);
    res.status(500).json({ error: "Falha ao atualizar status." });
  }
};
