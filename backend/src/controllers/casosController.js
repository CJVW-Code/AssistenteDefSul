import { supabase } from "../config/supabase.js";
import mammoth from "mammoth";
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
  generateDosFatos,
  normalizePromptData,
} from "../services/geminiService.js";
import { getVaraByTipoAcao } from "../config/varasMapping.js";

// Tempo de expiração (em segundos) para URLs assinadas do Supabase
// Pode ser configurado pela env var SIGNED_URL_EXPIRES; padrão 24h (86400s)
const signedExpires = Number.parseInt(
  process.env.SIGNED_URL_EXPIRES || "86400",
  10
);

const storageBuckets = {
  documentos: process.env.SUPABASE_DOCUMENTOS_BUCKET || "documentos",
  peticoes: process.env.SUPABASE_PETICOES_BUCKET || "peticoes",
  audios: process.env.SUPABASE_AUDIOS_BUCKET || "audios",
};

const calcularValorCausa = (valorMensal) => {
  if (!valorMensal) return "0,00";
  // Remove formatação brasileira para cálculo (ex: "1.200,50" -> 1200.50)
  const valorNumerico = parseFloat(
    valorMensal.replace(/\./g, "").replace(",", ".")
  );
  if (isNaN(valorNumerico)) return "0,00";

  const total = valorNumerico * 12;

  return total.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const extractObjectPath = (storedValue) => {
  if (!storedValue) return null;
  if (!storedValue.startsWith("http")) {
    return storedValue.replace(/^\/+/, "");
  }

  try {
    const signedUrl = new URL(storedValue);
    const decodedPath = decodeURIComponent(signedUrl.pathname);
    const match = decodedPath.match(/\/object\/(?:sign|public)\/[^/]+\/(.+)/);
    return match?.[1] || null;
  } catch (err) {
    console.warn("Não foi possível interpretar URL armazenada:", err?.message);
    return null;
  }
};

const buildSignedUrl = async (bucket, storedValue) => {
  const objectPath = extractObjectPath(storedValue);
  if (!objectPath) return null;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(objectPath, signedExpires);

  if (error) {
    console.error(`Falha ao gerar signed URL para ${objectPath}:`, error);
    return null;
  }

  return data?.signedUrl || null;
};

const attachSignedUrls = async (caso) => {
  if (!caso) return caso;
  const enriched = { ...caso };

  const [docGerado, audio, peticao] = await Promise.all([
    buildSignedUrl(storageBuckets.peticoes, caso.url_documento_gerado),
    buildSignedUrl(storageBuckets.audios, caso.url_audio),
    buildSignedUrl(storageBuckets.peticoes, caso.url_peticao),
  ]);

  enriched.url_documento_gerado = docGerado;
  enriched.url_audio = audio;
  enriched.url_peticao = peticao;

  if (Array.isArray(caso.urls_documentos) && caso.urls_documentos.length) {
    const signedDocs = await Promise.all(
      caso.urls_documentos.map((value) =>
        buildSignedUrl(storageBuckets.documentos, value)
      )
    );
    enriched.urls_documentos = signedDocs.filter(Boolean);
  } else {
    enriched.urls_documentos = [];
  }

  return enriched;
};

const ensureText = (value, fallback = "[PREENCHER]") => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text.length ? text : fallback;
};

const formatDateBr = (value) => {
  if (!value) return value;
  const parts = value.split("-");
  if (parts.length !== 3) return value;
  const [year, month, day] = parts;
  if (!year || year.length !== 4) return value;
  return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
};

const formatCurrencyBr = (value) => {
  if (value === null || value === undefined || value === "") return value;
  const number = Number(value);
  if (Number.isNaN(number)) return value;
  return number
    .toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    .replace(/\u00A0/g, " ");
};

const buildDocxTemplatePayload = (
  normalizedData,
  dosFatosTexto,
  baseData = {}
) => {
  const requerente = normalizedData.requerente || {};
  const requerido = normalizedData.requerido || {};
  const varaPreferida =
    baseData.vara_competente ||
    normalizedData.vara ||
    baseData.vara_originaria ||
    baseData.vara;
  const cidadeAssinatura =
    baseData.cidade_assinatura || normalizedData.cidadeDataAssinatura;
  
  // CORREÇÃO: Usar valor padrão para evitar erro no cálculo
  const valorCausaCalculado =
    baseData.valor_causa || calcularValorCausa(baseData.valor_pensao || "0,00");

  // CORREÇÃO: Definindo a variável correta aqui
  const percentualProvisorio =
    baseData.percentual_ou_valor_fixado ||
    baseData.percentual_definitivo_salario_min;
  
  const percentualExtras = baseData.percentual_definitivo_extras || "0";
  const diaPagamentoBase =
    baseData.dia_pagamento_fixado || baseData.dia_pagamento_requerido;
  const assistidoNome = baseData.nome_assistido || requerente.nome;
  const assistidoCpf = baseData.cpf_assistido || requerente.cpf;
  const dadosBancarios = baseData.dados_bancarios_deposito;
  const executadoEndereco =
    baseData.endereco_requerido || requerido.endereco || "";

  // Datas em formato brasileiro (dd/mm/aaaa), quando possivel
  const dataNascimentoAssistidoBr = formatDateBr(
    baseData.assistido_data_nascimento || requerente.dataNascimento
  );

  return {
    ...baseData,
    vara: ensureText(varaPreferida),
    comarca: ensureText(normalizedData.comarca),
    triagemNumero: ensureText(normalizedData.triagemNumero),
    processoOrigemNumero: ensureText(baseData.numero_processo_originario),
    processoTituloNumero: ensureText(baseData.processo_titulo_numero),
    requerente_nome: ensureText(assistidoNome),
    requerente_incapaz_sim_nao: ensureText(
      baseData.assistido_eh_incapaz || "nao"
    ),
    requerente_dataNascimento: ensureText(dataNascimentoAssistidoBr),
    requerente_data_nascimento: ensureText(dataNascimentoAssistidoBr),
    requerente_cpf: ensureText(assistidoCpf),
    requerente_nacionalidade: ensureText(baseData.assistido_nacionalidade),
    requerente_estado_civil: ensureText(baseData.assistido_estado_civil),
    requerente_ocupacao: ensureText(baseData.assistido_ocupacao),
    requerente_email: ensureText(baseData.email_assistido),
    requerente_telefone: ensureText(baseData.telefone_assistido),
    requerente_endereco_residencial: ensureText(baseData.endereco_assistido),
    requerente_representante: ensureText(requerente.representante),
    representante_nome: ensureText(baseData.representante_nome),
    representante_nacionalidade: ensureText(
      baseData.representante_nacionalidade
    ),
    representante_estado_civil: ensureText(baseData.representante_estado_civil),
    representante_ocupacao: ensureText(baseData.representante_ocupacao),
    representante_cpf: ensureText(baseData.representante_cpf),
    representante_rg: ensureText(
      baseData.representante_rg_numero
        ? `${baseData.representante_rg_numero} ${baseData.representante_rg_orgao}`
        : ""
    ),
    representante_endereco_residencial: ensureText(
      baseData.representante_endereco_residencial
    ),
    representante_endereco_profissional: ensureText(
      baseData.representante_endereco_profissional
    ),
    representante_email: ensureText(baseData.representante_email),
    representante_telefone: ensureText(baseData.representante_telefone),
    exequente_nome: ensureText(assistidoNome),
    exequente_incapaz_sim_nao: ensureText(
      baseData.assistido_eh_incapaz || "nao"
    ),
    exequente_data_nascimento: ensureText(dataNascimentoAssistidoBr),
    exequente_cpf: ensureText(assistidoCpf),
    exequente_representante: ensureText(requerente.representante),
    executado_nome: ensureText(baseData.nome_requerido || requerido.nome),
    executado_cpf: ensureText(baseData.cpf_requerido || requerido.cpf),
    requerido_nome: ensureText(baseData.nome_requerido || requerido.nome),
    requerido_cpf: ensureText(baseData.cpf_requerido || requerido.cpf),
    executado_nacionalidade: ensureText(baseData.requerido_nacionalidade),
    executado_estado_civil: ensureText(baseData.requerido_estado_civil),
    executado_ocupacao: ensureText(baseData.requerido_ocupacao),
    executado_endereco_residencial: ensureText(executadoEndereco),
    requerido_endereco_residencial: ensureText(executadoEndereco),
    executado_endereco_profissional: ensureText(
      baseData.requerido_endereco_profissional
    ),
    executado_email: ensureText(baseData.requerido_email),
    executado_telefone: ensureText(baseData.requerido_telefone),
    
    // CORREÇÃO: Usando a variável correta (percentualProvisorio)
    valorPercentualSalMin: ensureText(percentualProvisorio),
    percentual_salario_minimo: ensureText(percentualProvisorio),
    
    valor_pensao: ensureText(baseData.valor_pensao),
    percentual_definitivo_salario_min: ensureText(
      baseData.percentual_definitivo_salario_min
    ),
    percentual_definitivo_extras: ensureText(
      baseData.percentual_definitivo_extras
    ),
    dia_pagamento: ensureText(diaPagamentoBase),
    periodo_meses_ano: ensureText(baseData.periodo_debito_execucao),
    valor_total_execucao: ensureText(baseData.valor_total_debito_execucao),
    valor_total_extenso: ensureText(baseData.valor_total_extenso),
    valor_debito: ensureText(baseData.valor_total_debito_execucao),
    valor_debito_extenso: ensureText(baseData.valor_debito_extenso),
    dados_bancarios_exequente: ensureText(dadosBancarios),
    dados_bancarios_requerente: ensureText(dadosBancarios),
    empregador_nome: ensureText(baseData.empregador_requerido_nome),
    empregador_endereco_profissional: ensureText(
      baseData.empregador_requerido_endereco
    ),
    empregador_email: ensureText(baseData.empregador_email),
    cidadeDataAssinatura: ensureText(cidadeAssinatura),
    cidade_data_assinatura: ensureText(cidadeAssinatura),
    defensoraNome: ensureText(normalizedData.defensoraNome),
    dos_fatos:
      ensureText(dosFatosTexto, "[DESCREVER OS FATOS]") ||
      "[DESCREVER OS FATOS]",
  };
};

// --- FUNÇÃO DE CRIAÇÃO  ---
export const criarNovoCaso = async (req, res) => {
  try {
    const dados_formulario = req.body;
    // Desestruturação dos dados recebidos
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
      descricao_guarda,
      situacao_financeira_genitora,
      assistido_eh_incapaz,
      assistido_nacionalidade,
      assistido_estado_civil,
      assistido_ocupacao,
      assistido_data_nascimento,
      representante_nome,
      representante_nacionalidade,
      representante_estado_civil,
      representante_ocupacao,
      representante_cpf,
      representante_endereco_residencial,
      representante_endereco_profissional,
      representante_email,
      representante_telefone,
      representante_rg_numero,
      representante_rg_orgao,
      requerido_nacionalidade,
      requerido_estado_civil,
      requerido_ocupacao,
      requerido_endereco_profissional,
      requerido_email,
      requerido_telefone,
      processo_titulo_numero,
      cidade_assinatura,
      valor_total_extenso,
      valor_debito_extenso,
      percentual_definitivo_salario_min,
      percentual_definitivo_extras,
      // FIXAÇÃO/OFERTA
      valor_pensao,
      dia_pagamento_requerido,
      dados_bancarios_deposito,
      requerido_tem_emprego_formal,
      empregador_requerido_nome,
      empregador_requerido_endereco,
      empregador_email,
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
    } = dados_formulario;

    const formattedAssistidoNascimento = formatDateBr(
      assistido_data_nascimento
    );
    const formattedDataInicioRelacao = formatDateBr(data_inicio_relacao);
    const formattedDataSeparacao = formatDateBr(data_separacao);
    const formattedDiaPagamentoRequerido = formatDateBr(
      dia_pagamento_requerido
    );
    const formattedDiaPagamentoFixado = formatDateBr(dia_pagamento_fixado);
    const formattedValorPensao = formatCurrencyBr(
      dados_formulario.valor_mensal_pensao
    );
    const formattedValorTotalDebitoExecucao = formatCurrencyBr(
      valor_total_debito_execucao
    );

    const documentosInformadosArray = JSON.parse(
      documentos_informados || "[]"
    );
    const { protocolo, chaveAcesso } = generateCredentials(tipoAcao);
    const chaveAcessoHash = hashKeyWithSalt(chaveAcesso);

    const varaMapeada = getVaraByTipoAcao(tipoAcao);
    const varaAutomatica =
      varaMapeada && !varaMapeada.includes("NÃO ESPECIFICADA")
        ? varaMapeada
        : null;

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
        // Lógica de áudio (se houver)
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

    console.log("Gerando seção 'Dos Fatos' com IA...");
    const acaoEspecifica =
      (tipoAcao || "").split(" - ")[1]?.trim() || (tipoAcao || "").trim();

    // Objeto consolidado com os dados para a petição
    const caseDataForPetition = {
      protocolo,
      nome_assistido: nome,
      cpf_assistido: cpf,
      telefone_assistido: telefone,
      tipo_acao: tipoAcao,
      acao_especifica: acaoEspecifica,
      relato_texto: relato,
      documentos_informados: documentosInformadosArray,
      resumo_ia,
      vara: varaAutomatica || vara_originaria,
      endereco_assistido,
      email_assistido,
      dados_adicionais_requerente,
      assistido_eh_incapaz,
      assistido_nacionalidade,
      assistido_estado_civil,
      assistido_ocupacao,
      assistido_data_nascimento: formattedAssistidoNascimento,
      representante_nome,
      representante_nacionalidade,
      representante_estado_civil,
      representante_ocupacao,
      representante_cpf,
      representante_endereco_residencial,
      representante_endereco_profissional,
      representante_email,
      representante_telefone,
      representante_rg_numero,
      representante_rg_orgao,
      nome_requerido,
      cpf_requerido,
      endereco_requerido,
      dados_adicionais_requerido,
      requerido_nacionalidade,
      requerido_estado_civil,
      requerido_ocupacao,
      requerido_endereco_profissional,
      requerido_email,
      requerido_telefone,
      filhos_info,
      data_inicio_relacao: formattedDataInicioRelacao,
      data_separacao: formattedDataSeparacao,
      bens_partilha,
      descricao_guarda,
      situacao_financeira_genitora,
      processo_titulo_numero,
      cidade_assinatura,
      cidadeDataAssinatura: cidade_assinatura,
      valor_total_extenso,
      valor_debito_extenso,
      percentual_definitivo_salario_min,
      percentual_definitivo_extras,
      valor_pensao: formattedValorPensao,
      dia_pagamento_requerido: formattedDiaPagamentoRequerido,
      dados_bancarios_deposito,
      requerido_tem_emprego_formal,
      empregador_requerido_nome,
      empregador_requerido_endereco,
      empregador_email,
      numero_processo_originario,
      vara_originaria,
      percentual_ou_valor_fixado,
      dia_pagamento_fixado: formattedDiaPagamentoFixado,
      periodo_debito_execucao,
      valor_total_debito_execucao: formattedValorTotalDebitoExecucao,
      regime_bens,
      retorno_nome_solteira,
      alimentos_para_ex_conjuge,
    };

    const dosFatosTexto = await generateDosFatos(caseDataForPetition);
    const peticao_inicial_rascunho = `DOS FATOS\n\n${dosFatosTexto || ""}`;
    console.log("Seção 'Dos Fatos' gerada.");

    // --- CORREÇÃO: CRIAÇÃO DO docxData ANTES DE USAR ---
    const docxData = buildDocxTemplatePayload(
      {},
      dosFatosTexto,
      caseDataForPetition
    );

    console.log("Gerando documento .docx...");
    let peticao_completa_texto = null;

    try {
      const docxBuffer = await generateDocx(docxData); // Agora docxData existe!
      const docxPath = `${protocolo}/peticao_inicial_${protocolo}.docx`;

      const { value: extractedText } = await mammoth.extractRawText({
        buffer: docxBuffer,
      });
      peticao_completa_texto = extractedText;

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
        url_documento_gerado = docxPath;
      }
    } catch (e) {
      console.error("Erro ao gerar/upload do DOCX:", e);
    }

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
        url_audio = filePath;
      }
      if (req.files.documentos) {
        for (const docFile of req.files.documentos) {
          const filePath = `${protocolo}/${docFile.filename}`;
          const fileData = await fs.readFile(docFile.path);
          if (docFile.originalname.toLowerCase().includes("peticao")) {
            await supabase.storage
              .from("peticoes")
              .upload(filePath, fileData, { contentType: docFile.mimetype });
            url_peticao = filePath;
          } else {
            await supabase.storage
              .from("documentos")
              .upload(filePath, fileData, { contentType: docFile.mimetype });
            urls_documentos.push(filePath);
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
      peticao_inicial_rascunho,
      dados_formulario, // Campo JSONB
      peticao_completa_texto, // Campo TEXT
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
    const casosComLinks = await Promise.all(
      (data || []).map((caso) => attachSignedUrls(caso))
    );
    res.status(200).json(casosComLinks);
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
    const casoComLinks = await attachSignedUrls(caso);
    res.status(200).json(casoComLinks);
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