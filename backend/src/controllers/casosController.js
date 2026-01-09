import { supabase } from "../config/supabase.js";
import crypto from "crypto";
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
import { hashPassword } from "../services/securityService.js";
import { verifyPassword } from "../services/securityService.js";

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

const salarioMinimoAtual = Number.parseFloat(
  process.env.SALARIO_MINIMO_ATUAL || "1412"
);

const parseCurrencyToNumber = (value) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const normalized = String(value)
    .trim()
    .replace(/[^\d.,-]/g, "");
  if (!normalized) return 0;
  const hasComma = normalized.includes(",");
  const parsedString = hasComma
    ? normalized.replace(/\./g, "").replace(",", ".")
    : normalized;
  const result = Number(parsedString);
  return Number.isNaN(result) ? 0 : result;
};

const calcularValorCausa = (valorMensal) => {
  const valorNumerico = parseCurrencyToNumber(valorMensal);
  if (!valorNumerico) return 0;
  return valorNumerico * 12;
};

const numeroParaExtenso = (valor) => {
  const unidades = [
    "zero",
    "um",
    "dois",
    "três",
    "quatro",
    "cinco",
    "seis",
    "sete",
    "oito",
    "nove",
  ];
  const especiais = [
    "dez",
    "onze",
    "doze",
    "treze",
    "quatorze",
    "quinze",
    "dezesseis",
    "dezessete",
    "dezoito",
    "dezenove",
  ];
  const dezenas = [
    "",
    "dez",
    "vinte",
    "trinta",
    "quarenta",
    "cinquenta",
    "sessenta",
    "setenta",
    "oitenta",
    "noventa",
  ];
  const centenas = [
    "",
    "cento",
    "duzentos",
    "trezentos",
    "quatrocentos",
    "quinhentos",
    "seiscentos",
    "setecentos",
    "oitocentos",
    "novecentos",
  ];
  const qualificadores = [
    { singular: "", plural: "" },
    { singular: "mil", plural: "mil" },
    { singular: "milhão", plural: "milhões" },
    { singular: "bilhão", plural: "bilhões" },
  ];

  const inteiro = Math.floor(Math.abs(valor));
  const centavos = Math.round((Math.abs(valor) - inteiro) * 100);

  if (inteiro === 0 && centavos === 0) {
    return "zero real";
  }

  const numeroParaTextoAte999 = (numero) => {
    if (numero === 0) return "";
    if (numero === 100) return "cem";
    const c = Math.floor(numero / 100);
    const d = Math.floor((numero % 100) / 10);
    const u = numero % 10;
    const partes = [];
    if (c) {
      partes.push(centenas[c]);
    }
    if (d === 1) {
      partes.push(especiais[u]);
    } else {
      if (d) partes.push(dezenas[d]);
      if (u) partes.push(unidades[u]);
    }
    return partes.join(" e ");
  };

  const grupos = [];
  let numeroRestante = inteiro;
  while (numeroRestante > 0) {
    grupos.push(numeroRestante % 1000);
    numeroRestante = Math.floor(numeroRestante / 1000);
  }

  const partesInteiras = grupos
    .map((grupo, index) => {
      if (!grupo) return null;
      const texto = numeroParaTextoAte999(grupo);
      if (!texto) return null;
      const qualificador = qualificadores[index];
      const ehSingular = grupo === 1 && index > 0;
      const sufixo =
        index === 0
          ? ""
          : ` ${ehSingular ? qualificador.singular : qualificador.plural}`;
      return `${texto}${sufixo}`;
    })
    .filter(Boolean)
    .reverse();

  const inteiroExtenso = partesInteiras.join(" e ") || "zero";
  const rotuloInteiro = inteiro === 1 ? "real" : "reais";

  let resultado = `${inteiroExtenso} ${rotuloInteiro}`;
  if (centavos > 0) {
    const centavosExtenso = numeroParaTextoAte999(centavos) || "zero";
    const rotuloCentavos = centavos === 1 ? "centavo" : "centavos";
    resultado += ` e ${centavosExtenso} ${rotuloCentavos}`;
  }
  return resultado;
};

const calcularPercentualSalarioMinimo = (valorMensalPensao) => {
  if (!valorMensalPensao) return "";
  const valorNumerico = Number(valorMensalPensao);
  if (
    !salarioMinimoAtual ||
    Number.isNaN(valorNumerico) ||
    valorNumerico <= 0
  ) {
    return "";
  }
  const percentual = (valorNumerico / salarioMinimoAtual) * 100;
  const percentualLimpo = Number(percentual.toFixed(2));
  if (Number.isNaN(percentualLimpo)) {
    return "";
  }
  if (Number.isInteger(percentualLimpo)) {
    return String(percentualLimpo);
  }
  return percentualLimpo.toFixed(2).replace(".", ",");
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
    // Diferencia erro de arquivo inexistente (comum em uploads falhos antigos) de outros erros
    if (error.message && error.message.includes("Object not found")) {
      console.warn(`[Storage] Arquivo ausente (Link órfão no Banco): ${objectPath}`);
    } else {
      console.warn(`[Storage] Erro ao gerar URL para ${objectPath}:`, error);
    }
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

const sanitizeInlineText = (value) => {
  if (value === null || value === undefined) return value;
  const text = String(value);
  return text
    .replace(/\s*\n+\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
};

const ensureInlineValue = (value) => {
  const ensured = ensureText(value);
  if (!ensured || ensured === "[PREENCHER]") return ensured;
  return ensured.startsWith("[") ? ensured : ` ${ensured}`;
};

const sanitizeCaseDataInlineFields = (data = {}) => {
  const sanitized = { ...data };
  const inlineFields = [
    "dados_adicionais_requerente",
    "representante_nacionalidade",
    "representante_estado_civil",
  ];
  inlineFields.forEach((field) => {
    if (sanitized[field] !== undefined && sanitized[field] !== null) {
      sanitized[field] = sanitizeInlineText(sanitized[field]);
    }
  });
  return sanitized;
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

const buildFallbackDosFatos = (caseData = {}) => {
  const safe = (value) =>
    typeof value === "string" ? value.trim() : value ?? "";

  const paragraphs = [];
  const assistidoNome =
    safe(caseData.nome_assistido) ||
    safe(caseData.requerente_nome) ||
    safe(caseData.nome) ||
    "";
  const representanteNome = safe(caseData.representante_nome);
  const requeridoNome =
    safe(caseData.nome_requerido) ||
    safe(caseData.requerido_nome) ||
    safe(caseData.requerido) ||
    "";

  if (assistidoNome || representanteNome) {
    const sujeito =
      caseData.assistido_eh_incapaz === "sim" && representanteNome
        ? `${representanteNome}, na qualidade de representante legal de ${
            assistidoNome || "seu dependente"
          }`
        : assistidoNome || representanteNome;
    const complemento = requeridoNome
      ? `relata que ${requeridoNome} não contribui de forma regular para o custeio das despesas básicas`
      : "relata a ausência de contribuição regular da outra parte para o custeio das despesas básicas";
    paragraphs.push(
      `${sujeito} ${complemento}, razão pela qual busca a tutela jurisdicional para garantir a subsistência da criança.`
    );
  }

  if (safe(caseData.descricao_guarda)) {
    paragraphs.push(
      `A guarda fática atualmente é descrita da seguinte forma: ${safe(
        caseData.descricao_guarda
      )}.`
    );
  }

  const situacaoAssistido = [
    caseData.situacao_financeira_genitora,
    caseData.dados_adicionais_requerente,
  ]
    .map(safe)
    .filter(Boolean)
    .join(" ");
  if (situacaoAssistido) {
    paragraphs.push(
      `Sobre a realidade econômica de quem assume as despesas, informa-se que ${situacaoAssistido}.`
    );
  }

  if (safe(caseData.dados_adicionais_requerido)) {
    paragraphs.push(
      `Quanto ao requerido, destacam-se os seguintes elementos: ${safe(
        caseData.dados_adicionais_requerido
      )}.`
    );
  }

  const valorPretendido =
    safe(caseData.valor_pensao) ||
    safe(formatCurrencyBr(caseData.valor_mensal_pensao));
  const diaPagamento =
    safe(caseData.dia_pagamento_requerido) ||
    safe(caseData.dia_pagamento_fixado);
  if (valorPretendido || diaPagamento) {
    paragraphs.push(
      `Diante desse contexto, requer-se a fixação de alimentos no valor de ${
        valorPretendido || "[valor a ser definido]"
      }` +
        (diaPagamento
          ? `, com vencimento no dia ${diaPagamento} de cada mês.`
          : ".")
    );
  }

  if (safe(caseData.relato_texto)) {
    paragraphs.push(`Relato do assistido: ${safe(caseData.relato_texto)}.`);
  }

  const documentosInformados = Array.isArray(caseData.documentos_informados)
    ? caseData.documentos_informados.map((doc) => safe(doc)).filter(Boolean)
    : [];
  if (documentosInformados.length) {
    const resumoDocs = documentosInformados.slice(0, 3).join("; ");
    paragraphs.push(
      `Os fatos narrados encontram respaldo nos documentos informados no formulário, tais como ${resumoDocs}${
        documentosInformados.length > 3 ? ", entre outros" : ""
      }.`
    );
  } else {
    paragraphs.push(
      "A narrativa será complementada com a documentação que acompanha o formulário e eventuais provas a serem juntadas posteriormente."
    );
  }

  return paragraphs.filter(Boolean).join("\n\n");
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

  const valorCausaNumero = calcularValorCausa(
    baseData.valor_mensal_pensao || baseData.valor_pensao || 0
  );
  const valorCausaCalculado = formatCurrencyBr(valorCausaNumero);
  const valorCausaExtenso = numeroParaExtenso(valorCausaNumero);

  const percentualDefinitivoBase =
    baseData.percentual_definitivo_salario_min ||
    baseData.percentual_salario_minimo ||
    baseData.percentual_ou_valor_fixado ||
    "";
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

  const payload = {
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
    representante_nacionalidade: ensureInlineValue(
      baseData.representante_nacionalidade
    ),
    representante_estado_civil: ensureInlineValue(
      baseData.representante_estado_civil
    ),
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

    valor_pensao: ensureText(baseData.valor_pensao),
    percentual_definitivo_salario_min: ensureText(percentualDefinitivoBase),
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
    valor_causa: ensureText(valorCausaCalculado),
    valor_causa_extenso: ensureText(valorCausaExtenso),
    dados_adicionais_requerente: ensureText(
      sanitizeInlineText(baseData.dados_adicionais_requerente)
    ),
    percentual_despesas_extras: ensureText(
      baseData.percentual_despesas_extras ||
        baseData.percentual_definitivo_extras ||
        percentualExtras
    ),
    dos_fatos:
      ensureText(dosFatosTexto, "[DESCREVER OS FATOS]") ||
      "[DESCREVER OS FATOS]",
  };

  payload.REQUERENTE_NOME = payload.requerente_nome;
  payload.REPRESENTANTE_NOME = payload.representante_nome;
  payload.REQUERIDO_NOME = payload.requerido_nome;

  return payload;
};

// Função de processamento em background
async function processarCasoEmBackground(
  protocolo,
  dados_formulario,
  urls_documentos,
  url_audio,
  url_peticao
) {
  try {
    // Atualizar status para "processando"
    await supabase.from("casos").update({
      status: "processando",
      processando_iniciado: new Date()
    }).eq("protocolo", protocolo);

    // Buscar o caso do banco
    const { data: caso, error: fetchError } = await supabase
      .from("casos")
      .select("*")
      .eq("protocolo", protocolo)
      .single();

    if (fetchError || !caso) {
      throw new Error("Caso não encontrado");
    }

    // Extrair texto de documentos (OCR)
    let textoCompleto = caso.relato_texto || "";
    for (const docPath of urls_documentos) {
      if (docPath.match(/\.(jpg|jpeg|png)$/i)) {
        try {
          const buffer = await fs.readFile(`./uploads/${docPath}`);
          const textoDaImagem = await extractTextFromImage(buffer);
          textoCompleto += `\n\n--- TEXTO EXTRAÍDO: ${docPath} ---\n${textoDaImagem}`;
        } catch (ocrError) {
          console.warn("Falha no OCR:", ocrError.message);
        }
      }
    }

    // Processar IA (com timeout e fallback)
    let resumo_ia = null;
    let dosFatosTexto = "";

    try {
      resumo_ia = await analyzeCase(textoCompleto);
    } catch (analyzeError) {
      console.warn("Falha ao gerar resumo IA:", analyzeError.message);
    }

    // Preparar dados para Dos Fatos
    const formattedAssistidoNascimento = formatDateBr(
      dados_formulario.assistido_data_nascimento
    );
    const formattedDataInicioRelacao = formatDateBr(dados_formulario.data_inicio_relacao);
    const formattedDataSeparacao = formatDateBr(dados_formulario.data_separacao);
    const formattedDiaPagamentoRequerido = formatDateBr(
      dados_formulario.dia_pagamento_requerido
    );
    const formattedDiaPagamentoFixado = formatDateBr(dados_formulario.dia_pagamento_fixado);
    const formattedValorPensao = formatCurrencyBr(dados_formulario.valor_mensal_pensao);
    const percentualSalarioMinimoCalculado = calcularPercentualSalarioMinimo(dados_formulario.valor_mensal_pensao);

    const documentosInformadosArray = JSON.parse(dados_formulario.documentos_informados || "[]");
    const varaMapeada = getVaraByTipoAcao(dados_formulario.tipoAcao);
    const varaAutomatica = varaMapeada && !varaMapeada.includes("NÃO ESPECIFICADA") ? varaMapeada : null;

    const caseDataForPetitionRaw = {
      protocolo,
      nome_assistido: dados_formulario.nome,
      cpf_assistido: dados_formulario.cpf,
      telefone_assistido: dados_formulario.telefone,
      tipo_acao: dados_formulario.tipoAcao,
      acao_especifica: (dados_formulario.tipoAcao || "").split(" - ")[1]?.trim() || (dados_formulario.tipoAcao || "").trim(),
      relato_texto: textoCompleto,
      documentos_informados: documentosInformadosArray,
      resumo_ia,
      vara: varaAutomatica || dados_formulario.vara_originaria,
      endereco_assistido: dados_formulario.endereco_assistido,
      email_assistido: dados_formulario.email_assistido,
      dados_adicionais_requerente: dados_formulario.dados_adicionais_requerente,
      assistido_eh_incapaz: dados_formulario.assistido_eh_incapaz,
      assistido_nacionalidade: dados_formulario.assistido_nacionalidade,
      assistido_estado_civil: dados_formulario.assistido_estado_civil,
      assistido_ocupacao: dados_formulario.assistido_ocupacao,
      assistido_data_nascimento: formattedAssistidoNascimento,
      representante_nome: dados_formulario.representante_nome,
      representante_nacionalidade: dados_formulario.representante_nacionalidade,
      representante_estado_civil: dados_formulario.representante_estado_civil,
      representante_ocupacao: dados_formulario.representante_ocupacao,
      representante_cpf: dados_formulario.representante_cpf,
      representante_endereco_residencial: dados_formulario.representante_endereco_residencial,
      representante_endereco_profissional: dados_formulario.representante_endereco_profissional,
      representante_email: dados_formulario.representante_email,
      representante_telefone: dados_formulario.representante_telefone,
      representante_rg_numero: dados_formulario.representante_rg_numero,
      representante_rg_orgao: dados_formulario.representante_rg_orgao,
      nome_requerido: dados_formulario.nome_requerido,
      cpf_requerido: dados_formulario.cpf_requerido,
      endereco_requerido: dados_formulario.endereco_requerido,
      dados_adicionais_requerido: dados_formulario.dados_adicionais_requerido,
      requerido_nacionalidade: dados_formulario.requerido_nacionalidade,
      requerido_estado_civil: dados_formulario.requerido_estado_civil,
      requerido_ocupacao: dados_formulario.requerido_ocupacao,
      requerido_endereco_profissional: dados_formulario.requerido_endereco_profissional,
      requerido_email: dados_formulario.requerido_email,
      requerido_telefone: dados_formulario.requerido_telefone,
      filhos_info: dados_formulario.filhos_info,
      data_inicio_relacao: formattedDataInicioRelacao,
      data_separacao: formattedDataSeparacao,
      bens_partilha: dados_formulario.bens_partilha,
      descricao_guarda: dados_formulario.descricao_guarda,
      situacao_financeira_genitora: dados_formulario.situacao_financeira_genitora,
      processo_titulo_numero: dados_formulario.processo_titulo_numero,
      cidade_assinatura: dados_formulario.cidade_assinatura,
      cidadeDataAssinatura: dados_formulario.cidade_assinatura,
      valor_total_extenso: dados_formulario.valor_total_extenso,
      valor_debito_extenso: dados_formulario.valor_debito_extenso,
      percentual_definitivo_salario_min: dados_formulario.percentual_definitivo_salario_min,
      percentual_definitivo_extras: dados_formulario.percentual_definitivo_extras,
      valor_pensao: formattedValorPensao,
      valor_mensal_pensao: dados_formulario.valor_mensal_pensao,
      percentual_salario_minimo: percentualSalarioMinimoCalculado,
      dia_pagamento_requerido: formattedDiaPagamentoRequerido,
      dados_bancarios_deposito: dados_formulario.dados_bancarios_deposito,
      requerido_tem_emprego_formal: dados_formulario.requerido_tem_emprego_formal,
      empregador_requerido_nome: dados_formulario.empregador_requerido_nome,
      empregador_requerido_endereco: dados_formulario.empregador_requerido_endereco,
      empregador_email: dados_formulario.empregador_email,
      numero_processo_originario: dados_formulario.numero_processo_originario,
      vara_originaria: dados_formulario.vara_originaria,
      percentual_ou_valor_fixado: dados_formulario.percentual_ou_valor_fixado,
      dia_pagamento_fixado: formattedDiaPagamentoFixado,
      periodo_debito_execucao: dados_formulario.periodo_debito_execucao,
      valor_total_debito_execucao: formattedValorTotalDebitoExecucao,
      regime_bens: dados_formulario.regime_bens,
      retorno_nome_solteira: dados_formulario.retorno_nome_solteira,
      alimentos_para_ex_conjuge: dados_formulario.alimentos_para_ex_conjuge,
    };

    const caseDataForPetition = sanitizeCaseDataInlineFields(caseDataForPetitionRaw);

    try {
      dosFatosTexto = await generateDosFatos(caseDataForPetition);
    } catch (dosFatosError) {
      console.warn("Falha ao gerar Dos Fatos IA:", dosFatosError.message);
      dosFatosTexto = buildFallbackDosFatos(caseDataForPetition);
    }

    // Gerar DOCX
    let url_documento_gerado = null;
    try {
      const docxData = buildDocxTemplatePayload({}, dosFatosTexto, caseDataForPetition);
      const docxBuffer = await generateDocx(docxData);
      const docxPath = `${protocolo}/peticao_inicial_${protocolo}.docx`;

      const { error: uploadDocxErr } = await supabase.storage
        .from("peticoes")
        .upload(docxPath, docxBuffer, {
          contentType:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          upsert: true,
        });

      if (!uploadDocxErr) {
        url_documento_gerado = docxPath;
      }
    } catch (docxError) {
      console.error("Erro ao gerar DOCX:", docxError);
    }

    // Atualizar caso com resultados
    await supabase.from("casos").update({
      status: "processado",
      resumo_ia,
      url_documento_gerado,
      peticao_inicial_rascunho: `DOS FATOS\n\n${dosFatosTexto || ""}`,
      processado_em: new Date()
    }).eq("protocolo", protocolo);

    console.log(`✅ Caso ${protocolo} processado em background`);

  } catch (error) {
    console.error(`❌ Erro no background para ${protocolo}:`, error);
    await supabase.from("casos").update({
      status: "erro",
      erro_processamento: error.message
    }).eq("protocolo", protocolo);
  }
}

// --- FUNÇÃO DE CRIAÇÃO  ---
export const criarNovoCaso = async (req, res) => {
  try {
    const dados_formulario = req.body;
    const avisos = [];
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
    const { valor_mensal_pensao } = dados_formulario;

    const formattedAssistidoNascimento = formatDateBr(
      assistido_data_nascimento
    );
    const formattedDataInicioRelacao = formatDateBr(data_inicio_relacao);
    const formattedDataSeparacao = formatDateBr(data_separacao);
    const formattedDiaPagamentoRequerido = formatDateBr(
      dia_pagamento_requerido
    );
    const formattedDiaPagamentoFixado = formatDateBr(dia_pagamento_fixado);
    const formattedValorPensao = formatCurrencyBr(valor_mensal_pensao);
    const formattedValorTotalDebitoExecucao = formatCurrencyBr(
      valor_total_debito_execucao
    );
    const percentualSalarioMinimoCalculado =
      calcularPercentualSalarioMinimo(valor_mensal_pensao);

    const documentosInformadosArray = JSON.parse(documentos_informados || "[]");
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

    // Upload de arquivos PRIMEIRO (se houver)
    let url_audio = null;
    let urls_documentos = [];
    if (req.files) {
      if (req.files.audio) {
        const audioFile = req.files.audio[0];
        const filePath = `${protocolo}/${audioFile.filename}`;
        const { error: audioErr } = await supabase.storage
          .from("audios")
          .upload(filePath, await fs.readFile(audioFile.path), {
            contentType: audioFile.mimetype,
          });

        if (audioErr) {
          console.error("Erro ao fazer upload do áudio:", audioErr);
          avisos.push("Não foi possível salvar o áudio no armazenamento.");
        } else {
          url_audio = filePath;
        }
      }
      if (req.files.documentos) {
        for (const docFile of req.files.documentos) {
          const filePath = `${protocolo}/${docFile.filename}`;
          const fileData = await fs.readFile(docFile.path);
          if (docFile.originalname.toLowerCase().includes("peticao")) {
            const { error: petErr } = await supabase.storage
              .from("peticoes")
              .upload(filePath, fileData, { contentType: docFile.mimetype });

            if (petErr) {
              console.error("Erro ao fazer upload da petição:", petErr);
              avisos.push(`Erro ao salvar petição: ${docFile.originalname}`);
            } else {
              url_peticao = filePath;
            }
          } else {
            const { error: docErr } = await supabase.storage
              .from("documentos")
              .upload(filePath, fileData, { contentType: docFile.mimetype });

            if (docErr) {
              console.error("Erro ao fazer upload do documento:", docErr);
              avisos.push(`Erro ao salvar documento: ${docFile.originalname}`);
            } else {
              urls_documentos.push(filePath);
            }
          }
        }
      }
    }

    // Salvar dados básicos imediatamente no banco
    console.log('Salvando dados básicos no banco (resposta rápida)...');
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
      documentos_informados: documentosInformadosArray,
      dados_formulario: dados_formulario, // Salvar todos os dados recebidos
      status: "recebido", // Status inicial
      criado_em: new Date()
    });

    if (dbError) {
      console.error("!!! ERRO DO SUPABASE AO INSERIR !!!", dbError);
      throw dbError;
    }
    console.log("✅ Dados básicos salvos. Respondendo ao usuário...");

    // Resposta IMMEDIATA para o usuário
    const responsePayload = { protocolo, chaveAcesso };
    if (avisos.length) {
      responsePayload.avisos = avisos;
    }
    res.status(201).json({
      ...responsePayload,
      message: "Caso registrado com sucesso! Protocolo gerado.",
      status: "recebido"
    });

    // Processamento assíncrono SIMPLES (sem worker complexo)
    console.log("Iniciando processamento em background...");
    setImmediate(async () => {
      try {
        await processarCasoEmBackground(
          protocolo,
          dados_formulario,
          urls_documentos,
          url_audio,
          url_peticao
        );
      } catch (error) {
        console.error("Erro no processamento em background:", error);
        // Atualizar status de erro
        await supabase.from("casos").update({
          status: "erro",
          erro_processamento: error.message
        }).eq("protocolo", protocolo);
      }
    });

    // Limpeza dos arquivos temporários
    if (req.files) {
      for (const key in req.files) {
        for (const file of req.files[key]) {
          await fs.unlink(file.path);
        }
      }
    }

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

// Resto do arquivo (regenerarDosFatos, listarCasos, etc.) permanece igual
// ... (código existente)    if (req.files) {
