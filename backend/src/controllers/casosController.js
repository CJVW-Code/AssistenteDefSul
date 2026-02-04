﻿﻿﻿﻿﻿﻿import { supabase } from "../config/supabase.js";
import path from "path";
import {
  generateCredentials,
  hashKeyWithSalt,
  verifyKey,
} from "../services/securityService.js";
import fs from "fs/promises";
import { extractTextFromImage } from "../services/documentService.js";
import { visionOCR } from "../services/aiService.js";
import {
  generateDocx,
  generateTermoDeclaracao,
} from "../services/documentGenerationService.js";
import { analyzeCase, generateDosFatos } from "../services/geminiService.js";
import { getVaraByTipoAcao } from "../config/varasMapping.js";
import logger from "../utils/logger.js";
import { Client } from "@upstash/qstash";

// Tempo de expiração (em segundos) para URLs assinadas do Supabase
const signedExpires = Number.parseInt(
  process.env.SIGNED_URL_EXPIRES || "2592000",
  10,
);

const storageBuckets = {
  documentos: process.env.SUPABASE_DOCUMENTOS_BUCKET || "documentos",
  peticoes: process.env.SUPABASE_PETICOES_BUCKET || "peticoes",
  audios: process.env.SUPABASE_AUDIOS_BUCKET || "audios",
};

const salarioMinimoAtual = Number.parseFloat(
  process.env.SALARIO_MINIMO_ATUAL || "1621",
);

// --- UTILS DE FORMATAÇÃO E PARSE ---
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

  if (inteiro === 0 && centavos === 0) return "zero real";

  const numeroParaTextoAte999 = (numero) => {
    if (numero === 0) return "";
    if (numero === 100) return "cem";
    const c = Math.floor(numero / 100);
    const d = Math.floor((numero % 100) / 10);
    const u = numero % 10;
    const partes = [];
    if (c) partes.push(centenas[c]);
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
  const valorNumerico = parseCurrencyToNumber(valorMensalPensao);
  logger.info(
    `[Cálculo Percentual] Valor Pensão: ${valorMensalPensao} -> Numérico: ${valorNumerico} | Salário Mínimo: ${salarioMinimoAtual}`,
  );
  if (
    !salarioMinimoAtual ||
    Number.isNaN(valorNumerico) ||
    valorNumerico <= 0
  ) {
    return "";
  }
  const percentual = (valorNumerico / salarioMinimoAtual) * 100;
  logger.info(`[Cálculo Percentual] Resultado: ${percentual}%`);
  const percentualLimpo = Number(percentual.toFixed(2));
  if (Number.isNaN(percentualLimpo)) return "";
  if (Number.isInteger(percentualLimpo)) return String(percentualLimpo);
  return percentualLimpo.toFixed(2).replace(".", ",");
};

const extractObjectPath = (storedValue) => {
  if (!storedValue) return null;
  if (!storedValue.startsWith("http")) return storedValue.replace(/^\/+/, "");
  try {
    const signedUrl = new URL(storedValue);
    const decodedPath = decodeURIComponent(signedUrl.pathname);
    const match = decodedPath.match(/\/object\/(?:sign|public)\/[^/]+\/(.+)/);
    return match?.[1] || null;
  } catch (err) {
    logger.warn(`Não foi possível interpretar URL armazenada: ${err?.message}`);
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
    if (error.message && error.message.includes("Object not found")) {
      logger.warn(
        `[Storage] Arquivo ausente (Link órfão no Banco): ${objectPath}`,
      );
    } else {
      logger.error(`[Storage] Erro ao gerar URL para ${objectPath}:`, {
        error,
      });
    }
    return null;
  }
  return data?.signedUrl || null;
};

const attachSignedUrls = async (caso) => {
  if (!caso) return caso;
  const enriched = { ...caso };
  const [docGerado, audio, peticao, termoDeclaracao] = await Promise.all([
    buildSignedUrl(storageBuckets.peticoes, caso.url_documento_gerado),
    buildSignedUrl(storageBuckets.audios, caso.url_audio),
    buildSignedUrl(storageBuckets.peticoes, caso.url_peticao),
    buildSignedUrl(storageBuckets.peticoes, caso.url_termo_declaracao),
  ]);
  enriched.url_documento_gerado = docGerado;
  enriched.url_audio = audio;
  enriched.url_peticao = peticao;
  enriched.url_termo_declaracao = termoDeclaracao;
  if (Array.isArray(caso.urls_documentos) && caso.urls_documentos.length) {
    const signedDocs = await Promise.all(
      caso.urls_documentos.map((value) =>
        buildSignedUrl(storageBuckets.documentos, value),
      ),
    );
    enriched.urls_documentos = signedDocs.filter(Boolean);
  } else {
    enriched.urls_documentos = [];
  }
  return enriched;
};

const ensureText = (value, fallback = "") => {
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
  return ensured;
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
    typeof value === "string" ? value.trim() : (value ?? "");
  const paragraphs = [];
  
  // --- LÓGICA MULTI-FILHOS ---
  let outrosFilhos = [];
  try {
      if (caseData.outros_filhos_detalhes) {
          outrosFilhos = typeof caseData.outros_filhos_detalhes === 'string' 
            ? JSON.parse(caseData.outros_filhos_detalhes) 
            : caseData.outros_filhos_detalhes;
      }
  } catch(e) {}

  const assistidoPrincipal =
    safe(caseData.nome_assistido) ||
    safe(caseData.requerente_nome) ||
    safe(caseData.nome) ||
    "";
  const nomesAssistidos = [assistidoPrincipal];
  if (Array.isArray(outrosFilhos)) {
      outrosFilhos.forEach(f => { if(f.nome) nomesAssistidos.push(safe(f.nome)); });
  }
  const assistidoNome = nomesAssistidos.filter(Boolean).join(", ");
  const isPlural = nomesAssistidos.filter(Boolean).length > 1;

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
      `${sujeito} ${complemento}, razão pela qual busca a tutela jurisdicional para garantir a subsistência da${isPlural ? 's crianças' : ' criança'}.`,
    );
  }
  if (safe(caseData.descricao_guarda)) {
    paragraphs.push(
      `A guarda fática atualmente é descrita da seguinte forma: ${safe(
        caseData.descricao_guarda,
      )}.`,
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
      `Sobre a realidade econômica de quem assume as despesas, informa-se que ${situacaoAssistido}.`,
    );
  }
  if (safe(caseData.dados_adicionais_requerido)) {
    paragraphs.push(
      `Quanto ao requerido, destacam-se os seguintes elementos: ${safe(
        caseData.dados_adicionais_requerido,
      )}.`,
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
          : "."),
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
      }.`,
    );
  } else {
    paragraphs.push(
      "A narrativa será complementada com a documentação que acompanha o formulário e eventuais provas a serem juntadas posteriormente.",
    );
  }
  return paragraphs.filter(Boolean).join("\n\n");
};

const buildDocxTemplatePayload = (
  normalizedData,
  dosFatosTexto,
  baseData = {},
) => {
  const normalizeGenderTerm = (val) => {
    if (!val || typeof val !== "string") return val;
    const lower = val.toLowerCase().trim();
    if (lower.includes("brasileir")) return "brasileiro(a)";
    if (lower.includes("solteir")) return "solteiro(a)";
    if (lower.includes("casad")) return "casado(a)";
    if (lower.includes("divorciad")) return "divorciado(a)";
    if (lower.includes("viúv") || lower.includes("viuv")) return "viúvo(a)";
    if (lower.includes("união estável") || lower.includes("uniao estavel"))
      return "união estável";
    return val;
  };

  // --- LÓGICA INTELIGENTE PARA MÚLTIPLOS FILHOS E REPRESENTAÇÃO LEGAL V2.0 ---

  // 1. Função auxiliar para calcular idade a partir de data "DD/MM/YYYY"
  const calcularIdade = (dataNascString) => {
    if (!dataNascString) return null;
    let nascimento;
    if (dataNascString.includes("/")) {
      const [dia, mes, ano] = dataNascString.split("/");
      nascimento = new Date(`${ano}-${mes}-${dia}T00:00:00`);
    } else if (dataNascString.includes("-")) {
      nascimento = new Date(`${dataNascString}T00:00:00`);
    } else {
      return null;
    }

    if (isNaN(nascimento.getTime())) return null;

    const hoje = new Date();
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const m = hoje.getMonth() - nascimento.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }
    return idade;
  };

  // 2. Unifica todos os filhos (principal + outros) em uma única lista
  const rawDetails = baseData.outros_filhos_detalhes; // Corrigido: baseData já contém os campos do formulário diretamente
  let outrosFilhosRaw = [];
  try {
    outrosFilhosRaw = rawDetails
      ? typeof rawDetails === "string"
        ? JSON.parse(rawDetails)
        : rawDetails
      : [];
  } catch (e) {
    logger.warn("Erro ao fazer parse de outros_filhos_detalhes em buildDocxTemplatePayload", e.message);
    outrosFilhosRaw = [];
  }

  const filhoPrincipal = {
    nome: ensureText(
      baseData.nome ||
        baseData.nome_assistido ||
        normalizedData.requerente_nome,
    ),
    cpf: ensureText(
      baseData.cpf || baseData.cpf_assistido || normalizedData.requerente_cpf,
    ),
    nascimento: ensureText(
      formatDateBr(
        baseData.assistido_data_nascimento ||
          baseData.dataNascimentoAssistido ||
          baseData.dados_formulario?.assistido_data_nascimento,
      ),
    ),
    rg: ensureText(
      baseData.assistido_rg_numero
        ? `${baseData.assistido_rg_numero} ${baseData.assistido_rg_orgao}`
        : "",
    ),
    nacionalidade: ensureText(
      normalizeGenderTerm(baseData.assistido_nacionalidade || "brasileiro(a)"),
    ),
  };

  const irmaos = outrosFilhosRaw.map((f) => ({
    nome: ensureText(f.nome),
    cpf: ensureText(f.cpf),
    nascimento: ensureText(formatDateBr(f.dataNascimento)),
    rg: ensureText(f.rgNumero ? `${f.rgNumero} ${f.rgOrgao}` : ""),
    nacionalidade: ensureText(normalizeGenderTerm(f.nacionalidade)),
  }));

  // Filtra para garantir que não há entradas vazias
  const lista_filhos_raw = [filhoPrincipal, ...irmaos].filter(
    (f) => f.nome && f.nome !== "[PREENCHER]",
  );

  // 4. Lógica de Concordância (ECA + Código Civil + Pedido do Usuário)
  const idades = lista_filhos_raw
    .map((f) => calcularIdade(f.nascimento))
    .filter((age) => age !== null);
  const isPlural = lista_filhos_raw.length > 1;
  const temMenorDe16 = idades.some((idade) => idade < 16);
  const temEntre16e18 = idades.some((idade) => idade >= 16 && idade < 18);

  // 3. Formata a lista para o Word (Loop)
  const lista_filhos = lista_filhos_raw.map((f, index) => {
    const ehUltimo = index === lista_filhos_raw.length - 1;
    return {
      nome: (f.nome || "").toUpperCase(),
      qualificacao_incapacidade: "incapaz",
      nacionalidade: f.nacionalidade || "brasileiro(a)",
      nascimento: f.nascimento || "[PREENCHER]",
      cpf: f.cpf || "não inscrito(a)",
      rg: f.rg || "não informado(a)",
      separador: ehUltimo ? "" : "; ",
    };
  });

  // Rótulo para qualificação (filho/filhos)
  const rotulo_qualificacao = isPlural ? "filhos(as)" : "filho(a)";

  // Termo de representação/assistência
  let termo_representacao = "";
  if (isPlural) {
    if (temMenorDe16 && temEntre16e18) {
      termo_representacao = "neste ato representados e assistidos";
    } else if (temEntre16e18) {
      termo_representacao = "neste ato assistidos";
    } else {
      // Implícito que só tem menores de 16 ou a lista está vazia
      termo_representacao = "neste ato representados";
    }
  } else if (idades.length === 1) {
    // Singular
    termo_representacao =
      idades[0] < 16 ? "neste ato representado(a)" : "neste ato assistido(a)";
  }

  // --- FIM DA LÓGICA DE FILHOS ---

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
    baseData.valor_mensal_pensao || baseData.valor_pensao || 0,
  );
  const valorCausaCalculado = formatCurrencyBr(valorCausaNumero);
  const valorCausaExtenso = numeroParaExtenso(valorCausaNumero);
  const percentualDefinitivoBase =
    baseData.percentual_salario_minimo ||
    baseData.percentual_definitivo_salario_min ||
    baseData.percentual_ou_valor_fixado ||
    "";
  const percentualExtras = baseData.percentual_definitivo_extras || "0";
  const diaPagamentoBase =
    baseData.dia_pagamento_fixado || baseData.dia_pagamento_requerido;
  const assistidoNome =
    lista_filhos.length > 0
      ? lista_filhos.map((f) => f.nome).join(", ")
      : baseData.nome_assistido || requerente.nome;
  const assistidoCpf = baseData.cpf_assistido || requerente.cpf;
  const dadosBancarios = baseData.dados_bancarios_deposito;
  const executadoEndereco =
    baseData.endereco_requerido || requerido.endereco || "";
  // Usa o primeiro filho da lista para o campo de data de nascimento principal, se aplicável
  const dataNascimentoAssistidoBr =
    lista_filhos.length > 0
      ? lista_filhos[0].nascimento
      : formatDateBr(
          baseData.assistido_data_nascimento || requerente.dataNascimento,
        );

  const payload = {
    ...baseData,
    lista_filhos,
    rotulo_qualificacao,
    termo_representacao,

    vara: ensureText(varaPreferida),
    comarca: ensureText(normalizedData.comarca),
    triagemNumero: ensureText(normalizedData.triagemNumero),
    processoOrigemNumero: ensureText(baseData.numero_processo_originario),
    processoTituloNumero: ensureText(baseData.processo_titulo_numero),
    requerente_nome: ensureText(assistidoNome).toUpperCase(),
    requerente_incapaz_sim_nao: ensureText(
      baseData.assistido_eh_incapaz || "nao",
    ),
    requerente_dataNascimento: ensureText(dataNascimentoAssistidoBr),
    requerente_data_nascimento: ensureText(dataNascimentoAssistidoBr),
    requerente_cpf: ensureText(assistidoCpf),
    requerente_rg: ensureText(
      baseData.assistido_rg_numero
        ? `${baseData.assistido_rg_numero} ${baseData.assistido_rg_orgao}`
        : "",
    ),
    requerente_nacionalidade: ensureText(
      normalizeGenderTerm(baseData.assistido_nacionalidade || "brasileiro(a)"),
    ),
    requerente_estado_civil: ensureText(
      normalizeGenderTerm(baseData.assistido_estado_civil),
    ),
    requerente_ocupacao: ensureText(baseData.assistido_ocupacao),
    requerente_email: ensureText(baseData.email_assistido),
    requerente_telefone: ensureText(baseData.telefone_assistido),
    requerente_endereco_residencial: ensureText(
      baseData.endereco_assistido ||
        baseData.representante_endereco_residencial,
    ),
    requerente_representante: ensureText(requerente.representante),
    representante_nome: ensureText(baseData.representante_nome).toUpperCase(),
    representante_nacionalidade: ensureInlineValue(
      normalizeGenderTerm(baseData.representante_nacionalidade),
    ),
    representante_estado_civil: ensureInlineValue(
      normalizeGenderTerm(baseData.representante_estado_civil),
    ),
    representante_ocupacao: ensureText(baseData.representante_ocupacao),
    representante_cpf: ensureText(baseData.representante_cpf),
    representante_rg: ensureText(
      baseData.representante_rg_numero
        ? `${baseData.representante_rg_numero} ${baseData.representante_rg_orgao}`
        : "",
    ),
    representante_endereco_residencial: ensureText(
      baseData.representante_endereco_residencial,
    ),
    representante_endereco_profissional: ensureText(
      baseData.representante_endereco_profissional,
    ),
    representante_email: ensureText(baseData.representante_email),
    representante_telefone: ensureText(baseData.representante_telefone),
    exequente_nome: ensureText(assistidoNome),
    exequente_incapaz_sim_nao: ensureText(
      baseData.assistido_eh_incapaz || "nao",
    ),
    exequente_data_nascimento: ensureText(dataNascimentoAssistidoBr),
    exequente_cpf: ensureText(assistidoCpf),
    exequente_representante: ensureText(requerente.representante),
    executado_nome: ensureText(
      baseData.nome_requerido || requerido.nome,
    ).toUpperCase(),
    executado_cpf: ensureText(baseData.cpf_requerido || requerido.cpf),
    requerido_nome: ensureText(
      baseData.nome_requerido || requerido.nome,
    ).toUpperCase(),
    requerido_cpf: ensureText(baseData.cpf_requerido || requerido.cpf),
    executado_nacionalidade: ensureText(
      normalizeGenderTerm(baseData.requerido_nacionalidade),
    ),
    executado_estado_civil: ensureText(
      normalizeGenderTerm(baseData.requerido_estado_civil),
    ),
    executado_ocupacao: ensureText(baseData.requerido_ocupacao),
    executado_endereco_residencial: ensureText(executadoEndereco),
    requerido_endereco_residencial: ensureText(executadoEndereco),
    executado_endereco_profissional: ensureText(
      baseData.requerido_endereco_profissional,
    ),
    executado_email: ensureText(baseData.requerido_email),
    executado_telefone: ensureText(baseData.requerido_telefone),
    valor_pensao: ensureText(baseData.valor_pensao),
    valor_pensao_solicitado: ensureText(
      baseData.valor_pensao_solicitado || baseData.valor_pensao,
    ),
    valor_salario_minimo: ensureText(
      baseData.valor_salario_minimo || baseData.salario_minimo_formatado,
    ),
    percentual_definitivo_salario_min: ensureText(percentualDefinitivoBase),
    percentual_definitivo_extras: ensureText(
      baseData.percentual_definitivo_extras,
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
      baseData.empregador_requerido_endereco,
    ),
    empregador_email: ensureText(baseData.empregador_email),
    cidadeDataAssinatura: ensureText(cidadeAssinatura),
    cidade_data_assinatura: ensureText(cidadeAssinatura),
    defensoraNome: ensureText(normalizedData.defensoraNome),
    valor_causa: ensureText(valorCausaCalculado),
    valor_causa_extenso: ensureText(valorCausaExtenso),
    dados_adicionais_requerente: ensureText(
      sanitizeInlineText(baseData.dados_adicionais_requerente),
    ),
    percentual_despesas_extras: ensureText(
      baseData.percentual_despesas_extras ||
        baseData.percentual_definitivo_extras ||
        percentualExtras,
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

const gerarTextoCompletoPeticao = (payload) => {
  const {
    vara,
    comarca,
    requerente_nome,
    requerente_nacionalidade,
    requerente_estado_civil,
    requerente_ocupacao,
    requerente_cpf,
    requerente_rg,
    requerente_endereco_residencial,
    representante_nome,
    representante_nacionalidade,
    representante_estado_civil,
    representante_ocupacao,
    representante_cpf,
    representante_rg,
    representante_endereco_residencial,
    requerido_nome,
    requerido_nacionalidade,
    requerido_estado_civil,
    requerido_ocupacao,
    requerido_cpf,
    requerido_endereco_residencial,
    dos_fatos,
    tipo_acao,
    valor_causa,
  } = payload;

  let texto = `EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA ${vara?.toUpperCase() || "[VARA]"} DA COMARCA DE ${comarca?.toUpperCase() || "[COMARCA]"}\n\n`;

  texto += `REQUERENTE: ${requerente_nome?.toUpperCase() || "[NOME REQUERENTE]"}`;
  if (representante_nome) {
    texto += `, representado(a) por ${representante_nome?.toUpperCase() || "[NOME REPRESENTANTE]"}`;
  }
  texto += `\nREQUERIDO: ${requerido_nome?.toUpperCase() || "[NOME REQUERIDO]"}\n\n`;

  texto += `AÇÃO: ${tipo_acao?.toUpperCase() || "[TIPO DA AÇÃO]"}\n\n`;

  texto += `QUALIFICAÇÃO DAS PARTES:\n`;
  texto += `${requerente_nome}, ${requerente_nacionalidade || "[nacionalidade]"}, ${requerente_estado_civil || "[estado civil]"}, ${requerente_ocupacao || "[profissão]"}, inscrito(a) no CPF sob o nº ${requerente_cpf || "[CPF]"}, portador(a) do RG nº ${requerente_rg || "[RG]"}, residente e domiciliado(a) em ${requerente_endereco_residencial || "[endereço]"}.\n`;

  if (representante_nome) {
    texto += `REPRESENTANTE LEGAL: ${representante_nome}, ${representante_nacionalidade || "[nacionalidade]"}, ${representante_estado_civil || "[estado civil]"}, ${representante_ocupacao || "[profissão]"}, inscrito(a) no CPF sob o nº ${representante_cpf || "[CPF]"}, portador(a) do RG nº ${representante_rg || "[RG]"}, residente e domiciliado(a) em ${representante_endereco_residencial || "[endereço]"}.\n`;
  }

  texto += `\nEM FACE DE: ${requerido_nome}, ${requerido_nacionalidade || "[nacionalidade]"}, ${requerido_estado_civil || "[estado civil]"}, ${requerido_ocupacao || "[profissão]"}, inscrito(a) no CPF sob o nº ${requerido_cpf || "[CPF]"}, residente e domiciliado(a) em ${requerido_endereco_residencial || "[endereço]"}.\n\n`;

  texto += `DOS FATOS\n\n${dos_fatos || "[Descrever os fatos]"}\n\n`;

  texto += `DOS PEDIDOS\n\n`;
  texto += `Diante do exposto, requer:\n`;
  texto += `1. A concessão da gratuidade da justiça;\n`;
  texto += `2. A citação da parte requerida;\n`;
  texto += `3. A procedência total da ação.\n\n`;

  texto += `Dá-se à causa o valor de ${valor_causa || "R$ 0,00"}.\n\n`;
  texto += `Nestes termos,\n`;
  texto += `Pede Deferimento.\n\n`;
  texto += `${comarca || "[Cidade]"}, ${new Date().toLocaleDateString("pt-BR")}.`;

  return texto;
};

// --- WORKER EM BACKGROUND ---
export async function processarCasoEmBackground(
  protocolo,
  dados_formulario,
  urls_documentos,
  url_audio,
  url_peticao,
) {
  try {
    await supabase
      .from("casos")
      .update({ status: "processando", processing_started_at: new Date() })
      .eq("protocolo", protocolo);

    const { data: caso, error: fetchError } = await supabase
      .from("casos")
      .select("*")
      .eq("protocolo", protocolo)
      .single();
    if (fetchError || !caso) throw new Error("Caso não encontrado");

    // OCR
    let textoCompleto = caso.relato_texto || "";
    for (const docPath of urls_documentos) {
      // Processa imagens e PDFs
      if (docPath.match(/\.(jpg|jpeg|png|pdf)$/i)) {
        logger.info(`[OCR] Processando arquivo: ${docPath}`);
        try {
          // 1. Baixar o arquivo do Supabase Storage
          const { data: blob, error: downloadError } = await supabase.storage
            .from(storageBuckets.documentos)
            .download(docPath);

          if (downloadError) {
            throw new Error(
              `Erro no download do arquivo ${docPath}: ${downloadError.message}`,
            );
          }

          // 2. Converter o Blob para Buffer
          const buffer = Buffer.from(await blob.arrayBuffer());

          // 3. Extrair texto (IA com Fallback para Tesseract em imagens)
          let textoExtraido = "";
          const lowerPath = docPath.toLowerCase();
          // Define o tipo correto para a IA (PDF ou Imagem)
          let mimeType = lowerPath.endsWith(".pdf")
            ? "application/pdf"
            : lowerPath.endsWith(".png")
              ? "image/png"
              : "image/jpeg";

          try {
            textoExtraido = await visionOCR(
              buffer,
              mimeType,
              "Transcreva todo o texto deste documento fielmente.",
            );
            logger.info(`[OCR IA] Sucesso ao extrair texto de ${docPath}`);
          } catch (aiError) {
            logger.warn(
              `[OCR IA] Falha ao processar ${docPath}: ${aiError.message}`,
            );
            // Fallback: Tesseract (Apenas para imagens, pois Tesseract puro não lê PDF binário)
            if (mimeType !== "application/pdf") {
              logger.info(
                `[OCR Fallback] Tentando Tesseract local para ${docPath}...`,
              );
              textoExtraido = await extractTextFromImage(buffer);
              logger.info(`[OCR Fallback] Sucesso com Tesseract.`);
            } else {
              throw aiError; // Se for PDF e a IA falhar, repassa o erro
            }
          }

          if (textoExtraido) {
            // Log do texto extraído (Preview) para conferência
            logger.info(
              `[OCR CONTEÚDO] ${docPath} (Preview):\n${textoExtraido.substring(0, 500).replace(/\n/g, " ")}...`,
            );
            textoCompleto += `\n\n--- TEXTO EXTRAÍDO (${docPath}) ---\n${textoExtraido}`;
          }
        } catch (ocrError) {
          logger.warn(`Falha no OCR para ${docPath}: ${ocrError.message}`);
        }
      } else {
        logger.info(
          `[OCR] Pulando arquivo (formato não suportado): ${docPath}`,
        );
      }
    }

    // IA: Resumo e Dos Fatos
    let resumo_ia = null;
    let dosFatosTexto = "";
    try {
      resumo_ia = await analyzeCase(textoCompleto);
    } catch (analyzeError) {
      logger.warn(`Falha ao gerar resumo IA: ${analyzeError.message}`);
    }

    // Formatação de Dados
    // Garante que a data de nascimento não seja formatada se estiver vazia ou inválida
    const formattedAssistidoNascimento = dados_formulario.assistido_data_nascimento
      ? formatDateBr(dados_formulario.assistido_data_nascimento)
      : "";

    const formattedDataInicioRelacao = formatDateBr(
      dados_formulario.data_inicio_relacao,
    );
    const formattedDataSeparacao = formatDateBr(
      dados_formulario.data_separacao,
    );
    const formattedDiaPagamentoRequerido = formatDateBr(
      dados_formulario.dia_pagamento_requerido,
    );
    const formattedDiaPagamentoFixado = formatDateBr(
      dados_formulario.dia_pagamento_fixado,
    );
    const formattedValorPensao = formatCurrencyBr(
      dados_formulario.valor_mensal_pensao,
    );
    // [CORREÇÃO] Calculando o valor formatado que faltava
    const formattedValorTotalDebitoExecucao = formatCurrencyBr(
      dados_formulario.valor_total_debito_execucao,
    );
    const percentualSalarioMinimoCalculado = calcularPercentualSalarioMinimo(
      dados_formulario.valor_mensal_pensao,
    );

    let documentosInformadosArray = [];
    try {
      documentosInformadosArray = typeof dados_formulario.documentos_informados === 'string'
        ? JSON.parse(dados_formulario.documentos_informados || "[]")
        : (dados_formulario.documentos_informados || []);
    } catch (e) { documentosInformadosArray = []; }

    const varaMapeada = getVaraByTipoAcao(dados_formulario.tipoAcao);
    const varaAutomatica =
      varaMapeada && !varaMapeada.includes("NÃO ESPECIFICADA")
        ? varaMapeada
        : null;

    const caseDataForPetitionRaw = {
      protocolo,
      nome_assistido: dados_formulario.nome,
      cpf_assistido: dados_formulario.cpf,
      telefone_assistido: dados_formulario.telefone,
      tipo_acao: dados_formulario.tipoAcao,
      acao_especifica:
        (dados_formulario.tipoAcao || "").split(" - ")[1]?.trim() ||
        (dados_formulario.tipoAcao || "").trim(),
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
      assistido_rg_numero: dados_formulario.assistido_rg_numero,
      assistido_rg_orgao: dados_formulario.assistido_rg_orgao,
      representante_nome: dados_formulario.representante_nome,
      representante_nacionalidade: dados_formulario.representante_nacionalidade,
      representante_estado_civil: dados_formulario.representante_estado_civil,
      representante_ocupacao: dados_formulario.representante_ocupacao,
      representante_cpf: dados_formulario.representante_cpf,
      representante_endereco_residencial:
        dados_formulario.representante_endereco_residencial,
      representante_endereco_profissional:
        dados_formulario.representante_endereco_profissional,
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
      requerido_endereco_profissional:
        dados_formulario.requerido_endereco_profissional,
      requerido_email: dados_formulario.requerido_email,
      requerido_telefone: dados_formulario.requerido_telefone,
      filhos_info: dados_formulario.filhos_info,
      data_inicio_relacao: formattedDataInicioRelacao,
      data_separacao: formattedDataSeparacao,
      bens_partilha: dados_formulario.bens_partilha,
      descricao_guarda: dados_formulario.descricao_guarda,
      situacao_financeira_genitora:
        dados_formulario.situacao_financeira_genitora,
      processo_titulo_numero: dados_formulario.processo_titulo_numero,
      cidade_assinatura: dados_formulario.cidade_assinatura,
      cidadeDataAssinatura: dados_formulario.cidade_assinatura,
      valor_total_extenso: dados_formulario.valor_total_extenso,
      valor_debito_extenso: dados_formulario.valor_debito_extenso,
      percentual_definitivo_salario_min:
        dados_formulario.percentual_definitivo_salario_min,
      percentual_definitivo_extras:
        dados_formulario.percentual_definitivo_extras,
      valor_pensao: formattedValorPensao,
      valor_pensao_solicitado: formattedValorPensao,
      valor_mensal_pensao: dados_formulario.valor_mensal_pensao,
      percentual_salario_minimo: percentualSalarioMinimoCalculado,
      salario_minimo_atual: salarioMinimoAtual,
      salario_minimo_formatado: formatCurrencyBr(salarioMinimoAtual),
      valor_salario_minimo: formatCurrencyBr(salarioMinimoAtual),
      dia_pagamento_requerido: formattedDiaPagamentoRequerido,
      dados_bancarios_deposito: dados_formulario.dados_bancarios_deposito,
      requerido_tem_emprego_formal:
        dados_formulario.requerido_tem_emprego_formal,
      empregador_requerido_nome: dados_formulario.empregador_requerido_nome,
      empregador_requerido_endereco:
        dados_formulario.empregador_requerido_endereco,
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
      outros_filhos_detalhes: dados_formulario.outros_filhos_detalhes, // Adicionando o campo que faltava
    };

    const caseDataForPetition = sanitizeCaseDataInlineFields(
      caseDataForPetitionRaw,
    );

    try {
      dosFatosTexto = await generateDosFatos(caseDataForPetition);
    } catch (dosFatosError) {
      logger.warn(`Falha ao gerar Dos Fatos IA: ${dosFatosError.message}`);
      dosFatosTexto = buildFallbackDosFatos(caseDataForPetition);
    }

    // Gerar DOCX
    let url_documento_gerado = null;
    const normalizedData = {
      comarca:
        process.env.DEFENSORIA_DEFAULT_COMARCA || "Teixeira de Freitas/BA",
      defensoraNome:
        process.env.DEFENSORIA_DEFAULT_DEFENSORA ||
        "DEFENSOR(A) PÚBLICO(A) DO ESTADO DA BAHIA",
      triagemNumero: protocolo,
    };

    try {
      const docxData = buildDocxTemplatePayload(
        normalizedData,
        dosFatosTexto,
        caseDataForPetition,
      );
      const docxBuffer = await generateDocx(docxData);
      const docxPath = `${protocolo}/peticao_inicial_${protocolo}.docx`;
      const { error: uploadDocxErr } = await supabase.storage
        .from("peticoes")
        .upload(docxPath, docxBuffer, {
          contentType:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          upsert: true,
        });
      if (!uploadDocxErr) url_documento_gerado = docxPath;
    } catch (docxError) {
      logger.error(`Erro ao gerar DOCX: ${docxError.message}`, {
        stack: docxError.stack,
      });
    }

    // Gerar texto completo para backup/visualização
    const peticao_completa_texto = gerarTextoCompletoPeticao(
      buildDocxTemplatePayload(
        normalizedData,
        dosFatosTexto,
        caseDataForPetition,
      ),
    );

    // Finalizar processamento
    await supabase
      .from("casos")
      .update({
        status: "processado",
        resumo_ia,
        url_documento_gerado,
        peticao_inicial_rascunho: `DOS FATOS\n\n${dosFatosTexto || ""}`,
        peticao_completa_texto,
        processed_at: new Date(),
      })
      .eq("protocolo", protocolo);
    logger.info(`✅ Caso ${protocolo} processado com sucesso em background.`);
  } catch (error) {
    logger.error(`❌ Erro no background para ${protocolo}: ${error.message}`, {
      stack: error.stack,
    });
    await supabase
      .from("casos")
      .update({ status: "erro", erro_processamento: error.message })
      .eq("protocolo", protocolo);
  }
}

// --- CONTROLLER PRINCIPAL ---
export const criarNovoCaso = async (req, res) => {
  try {
    const dados_formulario = req.body;
    const avisos = [];
    // Desestruturação segura (mantida do seu código)
    const {
      nome,
      cpf,
      telefone,
      tipoAcao,
      relato,
      documentos_informados,
      documentos_nomes,
      // ... todos os outros campos mantidos ...
    } = dados_formulario;

    // --- CORREÇÃO CODERABBIT: Try-Catch para JSON.parse ---
    let documentosInformadosArray = [];
    if (typeof documentos_informados === 'object' && documentos_informados !== null) {
      documentosInformadosArray = documentos_informados;
    } else {
      try {
        documentosInformadosArray = JSON.parse(documentos_informados || "[]");
      } catch (e) {
        logger.warn(
          "Falha ao analisar JSON de documentos_informados:",
          e.message,
        );
        documentosInformadosArray = []; // Fallback seguro
      }
    }
    // -----------------------------------------------------
    const { protocolo, chaveAcesso } = generateCredentials(tipoAcao);
    const chaveAcessoHash = hashKeyWithSalt(chaveAcesso);

    logger.info(
      `Iniciando criação de caso. Protocolo: ${protocolo}, Tipo: ${tipoAcao}`,
    );

    // Upload de arquivos
    let url_audio = null;
    let urls_documentos = [];
    let url_peticao = null; // [CORREÇÃO] Inicializado para evitar ReferenceError

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
          logger.error("Erro upload áudio:", { error: audioErr });
          avisos.push("Falha ao salvar áudio.");
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
              logger.error(`Erro upload petição (${docFile.originalname}):`, {
                error: petErr,
              });
              avisos.push(`Erro ao salvar petição: ${docFile.originalname}`);
            } else {
              url_peticao = filePath; // Agora seguro
            }
          } else {
            const { error: docErr } = await supabase.storage
              .from("documentos")
              .upload(filePath, fileData, { contentType: docFile.mimetype });
            if (docErr) {
              logger.error(`Erro upload documento (${docFile.originalname}):`, {
                error: docErr,
              });
              avisos.push(`Erro ao salvar: ${docFile.originalname}`);
            } else {
              urls_documentos.push(filePath);
            }
          }
        }
      }
    }

    // Mescla os nomes dos documentos nos dados do formulário
    let documentNamesObj = {};
    if (typeof documentos_nomes === 'object' && documentos_nomes !== null) {
      documentNamesObj = documentos_nomes;
    } else {
      try {
        documentNamesObj = JSON.parse(documentos_nomes || "{}");
      } catch (e) {
        logger.warn("Falha ao analisar JSON de documentos_nomes:", e.message);
        documentNamesObj = {};
      }
    }

    const dadosFormularioFinal = {
      ...dados_formulario,
      document_names: documentNamesObj,
    };

    // Salvar no Banco (Resposta Rápida)
    logger.debug("Salvando dados básicos no Supabase...");
    const { error: dbError } = await supabase.from("casos").insert({
      protocolo,
      chave_acesso_hash: chaveAcessoHash,
      nome_assistido: nome,
      cpf_assistido: cpf,
      telefone_assistido: telefone,
      whatsapp_contato: dados_formulario.whatsapp_contato,
      tipo_acao: tipoAcao,
      relato_texto: relato,
      url_audio,
      url_peticao,
      urls_documentos,
      documentos_informados: documentosInformadosArray,
      dados_formulario: dadosFormularioFinal,
      status: "recebido",
      created_at: new Date(),
    });

    if (dbError) throw dbError;
    logger.info(`Caso ${protocolo} salvo. Iniciando processamento background.`);

    // Resposta Imediata
    const responsePayload = { protocolo, chaveAcesso };
    if (avisos.length) responsePayload.avisos = avisos;
    res.status(201).json({
      ...responsePayload,
      message: "Caso registrado! Processando...",
      status: "recebido",
    });

    // Configurar cliente QStash
    const qstashClient = new Client({
      token: process.env.QSTASH_TOKEN,
    });

    // Enviar para QStash em vez de setImmediate
    try {
      await qstashClient.publishJSON({
        url: `${process.env.API_BASE_URL}/api/jobs/process`,
        body: {
          protocolo,
          dados_formulario: dadosFormularioFinal, // Passa os dados do formulário já finalizados
          urls_documentos,
          url_audio,
          url_peticao,
        },
      });
      logger.info(`📤 Job enviado para QStash: ${protocolo}`);
    } catch (qstashError) {
      logger.error(`❌ Falha ao enviar para QStash: ${qstashError.message}`);
      // Fallback para processamento local se QStash falhar
      setImmediate(async () => {
        try {
          await processarCasoEmBackground(
            protocolo,
            dados_formulario,
            urls_documentos,
            url_audio,
            url_peticao,
          );
        } catch (error) {
          logger.error(`Erro fatal no worker fallback: ${error.message}`);
        }
      });
    }

    // Limpeza
    if (req.files) {
      for (const key in req.files) {
        for (const file of req.files[key]) {
          try {
            await fs.unlink(file.path);
          } catch (e) {}
        }
      }
    }
  } catch (error) {
    logger.error(`Erro na criação do caso: ${error.message}`, {
      stack: error.stack,
    });
    // Limpeza em caso de erro
    if (req.files) {
      for (const key in req.files) {
        for (const file of req.files[key]) {
          try {
            await fs.unlink(file.path);
          } catch (e) {}
        }
      }
    }
    // Só responde se ainda não tiver respondido
    if (!res.headersSent) {
      res.status(500).json({ error: "Falha ao processar solicitação." });
    }
  }
};

export const listarCasos = async (req, res) => {
  try {
    const { cpf, arquivado } = req.query;
    let query = supabase.from("casos").select("*");

    // Filtra por arquivado (padrão false se não especificado)
    const statusFiltro = arquivado === 'true';
    query = query.eq('arquivado', statusFiltro);

    // Se o CPF for fornecido na query, filtra por ele
    if (cpf) {
      query = query.or(
        `cpf_assistido.eq.${cpf},dados_formulario->>representante_cpf.eq.${cpf}`,
      );
    }

    // Ordena os resultados
    const { data, error } = await query.order("created_at", {
      ascending: false,
    });
    if (error) throw error;

    // Garante compatibilidade com o frontend (documentNames vs document_names)
    const normalizedData = data.map((caso) => {
      if (!caso.dados_formulario) caso.dados_formulario = {};
      if (!caso.dados_formulario.document_names)
        caso.dados_formulario.document_names = {};
      if (!caso.dados_formulario.documentNames) {
        caso.dados_formulario.documentNames =
          caso.dados_formulario.document_names;
      }
      return caso;
    });

    res.status(200).json(normalizedData);
  } catch (error) {
    logger.error(`Erro ao listar casos: ${error.message}`);
    res.status(500).json({ error: "Erro ao listar casos." });
  }
};

export const obterDetalhesCaso = async (req, res) => {
  const { id } = req.params;

  // Validação: Se o ID não for número nem UUID (ex: "arquivados"), retorna 400 e evita erro 500 no banco
  const isValidId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) || /^\d+$/.test(id);
  if (!isValidId) {
    return res.status(400).json({ error: "ID do caso inválido." });
  }

  try {
    let { data, error } = await supabase
      .from("casos")
      .select("*")
      .eq("id", id)
      .single();
    
    if (error) {
      // Tratamento específico para "Nenhum resultado encontrado" no Supabase
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: "Caso não encontrado." });
      }
      // Tratamento para ID inválido (ex: texto onde deveria ser número/uuid)
      if (error.code === '22P02') {
        return res.status(400).json({ error: "ID do caso inválido." });
      }
      throw error;
    }

    // Garante que dados_formulario e sua propriedade document_names sejam sempre objetos
    if (!data.dados_formulario) {
      data.dados_formulario = {};
    }
    if (!data.dados_formulario.document_names) {
      data.dados_formulario.document_names = {};
    }

    // Garante compatibilidade com o frontend que espera camelCase (documentNames)
    if (!data.dados_formulario.documentNames) {
      data.dados_formulario.documentNames =
        data.dados_formulario.document_names;
    }

    // Busca o histórico de agendamentos
    const { data: historico, error: histError } = await supabase
      .from("historico_agendamentos")
      .select("*")
      .eq("caso_id", id)
      .order("created_at", { ascending: false });

    if (!histError && historico) {
      data.historico_agendamentos = historico;
    }

    const casoComUrls = await attachSignedUrls(data);
    res.status(200).json(casoComUrls);
  } catch (error) {
    logger.error(`Erro ao obter detalhes do caso ${id}: ${error.message}`);
    res.status(500).json({ error: "Erro ao obter detalhes." });
  }
};

export const atualizarStatusCaso = async (req, res) => {
  const { id } = req.params;
  const { status, descricao_pendencia, numero_solar } = req.body;
  try {
    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (descricao_pendencia !== undefined) updateData.descricao_pendencia = descricao_pendencia;
    if (numero_solar !== undefined) updateData.numero_solar = numero_solar;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "Nenhum dado enviado para atualização." });
    }

    const { data, error = null } = await supabase
      .from("casos")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    logger.error(`Erro ao atualizar caso ${id}: ${error.message}`);
    
    if (error.code === '23505') {
      return res.status(409).json({ error: "Este número Solar já está vinculado a outro caso." });
    }
    if (error.code === '22P02') {
      return res.status(400).json({ error: "Formato inválido. O número Solar deve conter apenas números." });
    }
    
    res.status(500).json({ error: "Erro ao atualizar dados do caso." });
  }
};

export const salvarFeedback = async (req, res) => {
  const { id } = req.params;
  const { feedback } = req.body;
  try {
    // Primeiro faz o update
    const { error: updateError } = await supabase
      .from("casos")
      .update({ feedback })
      .eq("id", id);

    if (updateError) throw updateError;

    // Depois busca os dados atualizados para retornar
    const { data, error: fetchError } = await supabase
      .from("casos")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    res.status(200).json(data);
  } catch (error) {
    logger.error(`Erro ao salvar feedback ${id}: ${error.message}`);
    res.status(500).json({ error: "Erro ao salvar feedback." });
  }
};

export const regenerarDosFatos = async (req, res) => {
  const { id } = req.params;
  try {
    // Restrição: Apenas administradores podem regenerar os fatos
    if (!req.user || req.user.cargo !== "admin") {
      return res.status(403).json({
        error:
          "Acesso negado. Apenas administradores podem regenerar os fatos.",
      });
    }

    const { data: caso, error } = await supabase
      .from("casos")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !caso) throw new Error("Caso não encontrado");
    const dados = caso.dados_formulario || caso;
    if (!dados.relato_texto && caso.relato_texto)
      dados.relato_texto = caso.relato_texto;
    const dosFatosTexto = await generateDosFatos(dados);
    
    // CORREÇÃO: Retornar o objeto completo atualizado, não apenas o texto
    const { data: casoAtualizado, error: updateError } = await supabase
      .from("casos")
      .update({ peticao_inicial_rascunho: `DOS FATOS\n\n${dosFatosTexto}` })
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Reanexa URLs assinadas para que links de download/áudio não quebrem na tela
    const casoComUrls = await attachSignedUrls(casoAtualizado);
    res.status(200).json(casoComUrls);
  } catch (error) {
    res.status(500).json({ error: "Falha ao regenerar texto." });
  }
};

export const gerarTermoDeclaracao = async (req, res) => {
  const { id } = req.params;
  try {
    // Restrição: Apenas administradores podem gerar ou regerar o termo
    if (!req.user || req.user.cargo !== "admin") {
      return res.status(403).json({
        error:
          "Acesso negado. Apenas administradores podem realizar esta operação.",
      });
    }

    const { data: caso, error } = await supabase
      .from("casos")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !caso) throw new Error("Caso não encontrado");

    const dados = caso.dados_formulario || caso;

    // Build term declaration data payload
    const termoData = {
      ...dados,
      nome_assistido: (dados.nome || caso.nome_assistido || "").toUpperCase(),
      representante_nome: (dados.representante_nome || "").toUpperCase(),
      cpf_assistido: dados.cpf || caso.cpf_assistido,
      relato_texto: (caso.relato_texto || "").replace(/\n/g, "\r\n"),
      filhos_info: (
        dados.filhos_info ||
        dados.nome ||
        caso.nome_assistido ||
        ""
      ).toUpperCase(),
      data_atual: new Date().toLocaleDateString("pt-BR"),
      protocolo: caso.protocolo,
      tipo_acao: caso.tipo_acao,
      // Helpers para o template .docx
      eh_representacao: dados.assistido_eh_incapaz === "sim",
      endereco_assistido:
        dados.endereco_assistido || dados.representante_endereco_residencial,
      telefone_assistido: dados.telefone || caso.telefone_assistido,
      profissao:
        dados.assistido_ocupacao ||
        dados.representante_ocupacao ||
        "Não informada",
      estado_civil: dados.assistido_estado_civil || "Não informado",
    };

    // Generate the term declaration document
    const docxBuffer = await generateTermoDeclaracao(termoData);

    // Upload to Supabase storage
    const termoPath = `${caso.protocolo}/termo_declaracao_${caso.protocolo}.docx`;

    // Exclui o arquivo antigo se existir para garantir uma geração limpa (conforme solicitado)
    await supabase.storage.from("peticoes").remove([termoPath]);

    const { error: uploadError } = await supabase.storage
      .from("peticoes")
      .upload(termoPath, docxBuffer, {
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: true,
      });

    if (uploadError) {
      logger.error(
        `Erro ao fazer upload do termo de declaração: ${uploadError.message}`,
      );
      throw new Error("Falha ao salvar o termo de declaração");
    }

    // Update case record with term URL
    const { error: updateError } = await supabase
      .from("casos")
      .update({ url_termo_declaracao: termoPath })
      .eq("id", id);

    if (updateError) throw updateError;

    // Return the updated case with signed URL
    const casoAtualizado = await attachSignedUrls({
      ...caso,
      url_termo_declaracao: termoPath,
    });
    res.status(200).json(casoAtualizado);
  } catch (error) {
    logger.error(`Erro ao gerar termo de declaração: ${error.message}`);
    res.status(500).json({ error: "Falha ao gerar termo de declaração." });
  }
};

export const regerarMinuta = async (req, res) => {
  const { id } = req.params;
  try {
    // Restrição: Apenas administradores
    if (!req.user || req.user.cargo !== "admin") {
      return res.status(403).json({
        error: "Acesso negado. Apenas administradores podem regerar a minuta.",
      });
    }

    const { data: caso, error } = await supabase
      .from("casos")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !caso) throw new Error("Caso não encontrado");

    // 1. Prepara os dados baseados no estado atual do caso no banco
    const dosFatosTexto = (caso.peticao_inicial_rascunho || "").replace(
      "DOS FATOS\n\n",
      "",
    );

    const normalizedData = {
      comarca:
        process.env.DEFENSORIA_DEFAULT_COMARCA || "Teixeira de Freitas/BA",
      defensoraNome:
        process.env.DEFENSORIA_DEFAULT_DEFENSORA ||
        "DEFENSOR(A) PÚBLICO(A) DO ESTADO DA BAHIA",
      triagemNumero: caso.protocolo,
    };

    // 2. Prepara os dados do formulário com o percentual recalculado e salário mínimo correto
    const baseData = caso.dados_formulario || caso;
    const valorMensalPensao = baseData.valor_mensal_pensao;
    const percentualSalarioMinimoCalculado =
      calcularPercentualSalarioMinimo(valorMensalPensao);
    const valorPensaoFormatado = formatCurrencyBr(valorMensalPensao);

    // Adiciona o percentual calculado e o salário mínimo correto aos dados do formulário
    const dadosComPercentual = {
      ...baseData,
      percentual_salario_minimo: percentualSalarioMinimoCalculado,
      percentual_definitivo_salario_min: percentualSalarioMinimoCalculado,
      salario_minimo_atual: salarioMinimoAtual,
      salario_minimo_formatado: formatCurrencyBr(salarioMinimoAtual),
      valor_salario_minimo: formatCurrencyBr(salarioMinimoAtual),
      valor_pensao: valorPensaoFormatado,
      valor_pensao_solicitado: valorPensaoFormatado,
    };

    // 3. Gera o novo payload e o buffer do Word
    const payload = buildDocxTemplatePayload(
      normalizedData,
      dosFatosTexto,
      dadosComPercentual,
    );
    const docxBuffer = await generateDocx(payload);

    // 3. Define o caminho e faz o upload (substituindo o anterior)
    const docxPath = `${caso.protocolo}/peticao_inicial_${caso.protocolo}.docx`;

    const { error: uploadError } = await supabase.storage
      .from("peticoes")
      .upload(docxPath, docxBuffer, {
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // 4. Garante que a URL no banco está correta
    await supabase
      .from("casos")
      .update({ url_documento_gerado: docxPath })
      .eq("id", id);

    // 5. Retorna o caso atualizado com as novas URLs assinadas
    const casoAtualizado = await attachSignedUrls({
      ...caso,
      url_documento_gerado: docxPath,
    });

    res.status(200).json(casoAtualizado);
  } catch (error) {
    logger.error(`Erro ao regerar minuta: ${error.message}`);
    res.status(500).json({ error: "Falha ao regerar a minuta em Word." });
  }
};

export const buscarPorCpf = async (req, res) => {
  const cpf = req.params.cpf || req.query.cpf;
  try {
    const { data, error } = await supabase
      .from("casos")
      .select("*")
      .eq("cpf_assistido", cpf);
    if (error) throw error;

    // Garante compatibilidade com o frontend (documentNames vs document_names)
    const normalizedData = (data || []).map((caso) => {
      if (!caso.dados_formulario) caso.dados_formulario = {};
      if (!caso.dados_formulario.document_names)
        caso.dados_formulario.document_names = {};
      if (!caso.dados_formulario.documentNames) {
        caso.dados_formulario.documentNames =
          caso.dados_formulario.document_names;
      }
      return caso;
    });

    res.status(200).json(normalizedData);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar por CPF." });
  }
};

export const finalizarCasoSolar = async (req, res) => {
  const { id } = req.params;
  const { numero_solar, numero_processo } = req.body;
  let url_capa_processual = null;
  try {
    if (req.file) {
      const file = req.file;
      // Sanitize filename to prevent path traversal and other issues
      const safeOriginalName = path.basename(file.originalname);
      const filePath = `capas/${id}_${Date.now()}_${safeOriginalName}`;
      const { error: uploadError } = await supabase.storage
        .from(storageBuckets.documentos)
        .upload(filePath, await fs.readFile(file.path), {
          contentType: file.mimetype,
        });
      if (uploadError) throw uploadError;
      url_capa_processual = filePath;
      await fs.unlink(file.path);
    }
    const { error } = await supabase
      .from("casos")
      .update({
        status: "encaminhado_solar",
        numero_solar,
        numero_processo,
        url_capa_processual,
        finished_at: new Date(),
      })
      .eq("id", id);
    if (error) throw error;
    res.status(200).json({ message: "Caso finalizado com sucesso." });
  } catch (error) {
    res.status(500).json({ error: "Erro ao finalizar caso." });
  }
};

export const agendarReuniao = async (req, res) => {
  const { id } = req.params;
  const { agendamento_data, agendamento_link } = req.body;

  // Define o status como 'agendado' se houver dados, ou 'pendente' se estiverem vazios
  const status = agendamento_data && agendamento_link ? "agendado" : "pendente";

  try {
    const { data, error } = await supabase
      .from("casos")
      .update({
        agendamento_data,
        agendamento_link,
        agendamento_status: status,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    logger.error(`Erro ao agendar reunião para o caso ${id}: ${error.message}`);
    res.status(500).json({ error: "Erro ao agendar reunião." });
  }
};

export const reverterFinalizacao = async (req, res) => {
  if (!req.user || req.user.cargo !== "admin") {
    return res.status(403).json({
      error:
        "Acesso negado. Apenas administradores podem reverter a finalização.",
    });
  }

  const { id } = req.params;

  try {
    const { data: caso, error: fetchError } = await supabase
      .from("casos")
      .select("url_capa_processual, protocolo")
      .eq("id", id)
      .single();

    if (fetchError || !caso) {
      return res.status(404).json({ error: "Caso não encontrado." });
    }

    if (caso.url_capa_processual) {
      const filePath = extractObjectPath(caso.url_capa_processual);
      if (filePath) {
        logger.info(
          `Revertendo finalização: Excluindo capa processual '${filePath}' do caso ${id}`,
        );
        const { error: deleteError } = await supabase.storage
          .from(storageBuckets.documentos)
          .remove([filePath]);

        if (deleteError) {
          logger.warn(
            `Falha ao excluir capa do storage durante a reversão: ${deleteError.message}`,
          );
        }
      }
    }

    const { error: updateError } = await supabase
      .from("casos")
      .update({
        status: "processado",
        numero_solar: null,
        numero_processo: null,
        url_capa_processual: null,
        finished_at: null,
      })
      .eq("id", id);

    if (updateError) throw updateError;

    logger.info(
      `Finalização do caso ${caso.protocolo} (ID: ${id}) revertida por ${req.user.email}.`,
    );
    // Apenas retorna uma mensagem de sucesso, pois o frontend já recarrega os dados.
    res.status(200).json({ message: "Finalização revertida com sucesso." });
  } catch (error) {
    logger.error(
      `Erro ao reverter finalização do caso ${id}: ${error.message}`,
    );
    res.status(500).json({ error: "Erro ao reverter finalização do caso." });
  }
};

export const resetarChaveAcesso = async (req, res) => {
  const { id } = req.params;
  try {
    const { data: caso } = await supabase
      .from("casos")
      .select("tipo_acao")
      .eq("id", id)
      .single();
    if (!caso) throw new Error("Caso não encontrado");
    const { chaveAcesso } = generateCredentials(caso.tipo_acao);
    const chaveAcessoHash = hashKeyWithSalt(chaveAcesso);
    const { error } = await supabase
      .from("casos")
      .update({ chave_acesso_hash: chaveAcessoHash })
      .eq("id", id);
    if (error) throw error;
    res.status(200).json({ novaChave: chaveAcesso });
  } catch (error) {
    res.status(500).json({ error: "Erro ao resetar chave." });
  }
};
export const receberDocumentosComplementares = async (req, res) => {
  const { id } = req.params;
  // Tenta pegar do body (FormData) ou da query string (URL) para garantir
  const cpfRaw = req.body.cpf || req.query.cpf;
  const cpf = cpfRaw ? String(cpfRaw).replace(/\D/g, "") : null;
  const chave = req.body.chave || req.query.chave;
  const { nomes_arquivos } = req.body;

  try {
    logger.info(
      `[Upload Complementar] Iniciando. ID: ${id}, CPF recebido: ${!!cpf}, Chave recebida: ${!!chave}`,
    );

    let caso = null;

    // 1. Tenta buscar por ID ou Protocolo na URL
    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      );
    const isInt = /^\d+$/.test(id) && id !== "0";

    if (isUUID || isInt) {
      const { data } = await supabase
        .from("casos")
        .select("*")
        .eq("id", id)
        .single();
      caso = data;
    } else if (id !== "0") {
      const { data } = await supabase
        .from("casos")
        .select("*")
        .eq("protocolo", id)
        .single();
      caso = data;
    }

    // 2. Fallback: Se não achou pelo ID (ex: frontend enviou 0), tenta por CPF + Chave
    if (!caso) {
      if (cpf && chave) {
        // Busca todos os casos do CPF e verifica a chave em memória (pois o hash pode ser aleatório/bcrypt)
        const { data: casosCpf } = await supabase
          .from("casos")
          .select("*")
          .eq("cpf_assistido", cpf);

        if (casosCpf && casosCpf.length > 0) {
          caso = casosCpf.find((c) => verifyKey(chave, c.chave_acesso_hash));
        }
      } else {
        logger.warn(
          `[Upload Complementar] Falha: ID inválido (${id}) e credenciais não fornecidas no corpo da requisição.`,
        );
      }
    }

    if (!caso)
      throw new Error(
        "Caso não encontrado. Verifique se o CPF e a Chave estão corretos.",
      );

    const novosUrls = [];

    // 2. Processa os arquivos enviados
    if (req.files && req.files.documentos) {
      for (const docFile of req.files.documentos) {
        // Sanitiza nome
        const safeName = docFile.originalname
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        const filePath = `${caso.protocolo}/complementar_${Date.now()}_${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from(storageBuckets.documentos)
          .upload(filePath, await fs.readFile(docFile.path), {
            contentType: docFile.mimetype,
          });

        if (uploadError) {
          logger.error(`Erro upload complementar: ${uploadError.message}`);
        } else {
          novosUrls.push(filePath);
        }

        // Limpa arquivo temporário
        try {
          await fs.unlink(docFile.path);
        } catch (e) {}
      }
    }

    if (novosUrls.length === 0) {
      return res.status(400).json({ error: "Nenhum arquivo foi enviado." });
    }

    // 3. Atualiza metadados de nomes (dados_formulario.document_names)
    // --- CORREÇÃO CODERABBIT: Try-Catch para JSON.parse ---
    let nomesMap = {};
    if (typeof nomes_arquivos === 'object' && nomes_arquivos !== null) {
      nomesMap = nomes_arquivos;
    } else {
      try {
        nomesMap = JSON.parse(nomes_arquivos || "{}");
      } catch (e) {
        logger.warn(
          "[Upload Complementar] Falha ao analisar JSON de nomes_arquivos:",
          e.message,
        );
        nomesMap = {}; // Fallback seguro
      }
    }
    // -----------------------------------------------------
    const currentDadosFormulario = caso.dados_formulario || {}; // Garante que dados_formulario é um objeto
    const currentNames = currentDadosFormulario.document_names || {}; // Usa o objeto garantido

    const updatedNames = { ...currentNames, ...nomesMap };
    const updatedDadosFormulario = {
      ...currentDadosFormulario, // Espalha o objeto garantido
      document_names: updatedNames,
    };

    // 4. Prepara e atualiza o banco
    const updatePayload = {
      urls_documentos: [...(caso.urls_documentos || []), ...novosUrls],
      dados_formulario: updatedDadosFormulario,
      status: "documentos_entregues", // Define o status correto para notificar o defensor
      updated_at: new Date(),
    };

    logger.info(
      `[Upload Complementar] Atualizando caso ${caso.id}. Novo status: ${updatePayload.status}`,
    );

    const { error: updateError } = await supabase
      .from("casos")
      .update(updatePayload)
      .eq("id", caso.id);

    if (updateError) throw updateError;

    // [NOTIFICAÇÃO] Alerta o defensor sobre novos documentos
    await supabase.from("notificacoes").insert({
      caso_id: caso.id,
      mensagem: `Novos documentos entregues por ${caso.nome_assistido || "Assistido"}.`,
      tipo: 'upload'
    });

    res.status(200).json({ message: "Documentos enviados com sucesso!" });
  } catch (error) {
    logger.error(`Erro upload complementar: ${error.message}`);
    res
      .status(500)
      .json({ error: error.message || "Falha ao enviar documentos." });
  }
};

// --- DELETAR CASO (Apenas Admin) ---
export const deletarCaso = async (req, res) => {
  try {
    // Verificação de permissão de admin
    if (!req.user || req.user.cargo !== "admin") {
      return res.status(403).json({
        error: "Acesso negado. Apenas administradores podem excluir casos.",
      });
    }

    const { id } = req.params;

    // Primeiro, obtenha os dados do caso para verificar se existe
    const { data: caso, error: fetchError } = await supabase
      .from("casos")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !caso) {
      return res.status(404).json({ error: "Caso não encontrado." });
    }

    // --- REMOVER ARQUIVOS DO STORAGE ---
    const filesToDelete = {
      [storageBuckets.audios]: [],
      [storageBuckets.peticoes]: [],
      [storageBuckets.documentos]: [],
    };

    const addFile = (bucket, path) => {
      const cleanPath = extractObjectPath(path);
      if (cleanPath) filesToDelete[bucket].push(cleanPath);
    };

    addFile(storageBuckets.audios, caso.url_audio);
    addFile(storageBuckets.peticoes, caso.url_peticao);
    addFile(storageBuckets.peticoes, caso.url_documento_gerado);
    addFile(storageBuckets.peticoes, caso.url_termo_declaracao);
    addFile(storageBuckets.documentos, caso.url_capa_processual);

    if (Array.isArray(caso.urls_documentos)) {
      caso.urls_documentos.forEach((doc) =>
        addFile(storageBuckets.documentos, doc),
      );
    }

    await Promise.all(
      Object.entries(filesToDelete).map(async ([bucket, files]) => {
        if (files.length > 0) {
          logger.info(
            `🗑️ Excluindo ${files.length} arquivos do bucket '${bucket}' vinculados ao caso ${id}`,
          );
          await supabase.storage.from(bucket).remove(files);
        }
      }),
    );

    // Excluir o caso do banco de dados
    const { error: deleteError } = await supabase
      .from("casos")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw deleteError;
    }

    res.json({ message: "Caso excluído com sucesso." });
  } catch (err) {
    logger.error(`Erro ao deletar caso ${req.params.id}: ${err.message}`);
    res.status(500).json({ error: "Erro ao excluir caso." });
  }
};

// --- REPROCESSAR CASO (Manual) ---
export const reprocessarCaso = async (req, res) => {
  const { id } = req.params;
  try {
    // Busca os dados originais do caso
    const { data: caso, error } = await supabase
      .from("casos")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !caso) {
      return res.status(404).json({ error: "Caso não encontrado." });
    }

    // Responde imediatamente para a interface não travar
    res
      .status(200)
      .json({ message: "Reprocessamento iniciado em background." });

    // Dispara o worker novamente
    setImmediate(async () => {
      try {
        await processarCasoEmBackground(
          caso.protocolo,
          caso.dados_formulario,
          caso.urls_documentos || [],
          caso.url_audio,
          caso.url_peticao,
        );
      } catch (err) {
        logger.error(`Erro ao reprocessar caso ${id}: ${err.message}`);
      }
    });
  } catch (error) {
    logger.error(`Erro ao solicitar reprocessamento: ${error.message}`);
    if (!res.headersSent)
      res.status(500).json({ error: "Erro interno ao reprocessar." });
  }
};

export const renomearDocumento = async (req, res) => {
  const { id } = req.params;
  const { fileUrl, newName } = req.body;

  try {
    const { data: caso, error } = await supabase
      .from("casos")
      .select("dados_formulario")
      .eq("id", id)
      .single();

    if (error || !caso) throw new Error("Caso não encontrado");

    const dados = caso.dados_formulario || {};
    const docNames = dados.document_names || {};

    // Usa o nome do arquivo (extraído da URL) como chave para salvar o novo nome
    const fileName = fileUrl.split("/").pop().split("?")[0];
    docNames[decodeURIComponent(fileName)] = newName;

    dados.document_names = docNames;
    dados.documentNames = docNames; // Compatibilidade

    await supabase
      .from("casos")
      .update({ dados_formulario: dados })
      .eq("id", id);

    res.status(200).json({ message: "Documento renomeado com sucesso." });
  } catch (e) {
    res.status(500).json({ error: "Erro ao renomear documento." });
  }
};

export const solicitarReagendamento = async (req, res) => {
  const { id } = req.params;
  const { motivo, data_sugerida, cpf, chave } = req.body;

  try {
    // 1. Busca o caso para validar credenciais
    const { data: caso, error: fetchError } = await supabase
      .from("casos")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !caso) {
      return res.status(404).json({ error: "Caso não encontrado." });
    }

    // 2. Validação de Segurança (CPF e Chave)
    // Remove caracteres não numéricos do CPF para comparação
    const cpfLimpo = cpf.replace(/\D/g, "");
    if (caso.cpf_assistido !== cpfLimpo) {
      return res.status(403).json({ error: "CPF inválido para este caso." });
    }

    const chaveValida = verifyKey(chave, caso.chave_acesso_hash);
    if (!chaveValida) {
      return res.status(403).json({ error: "Chave de acesso inválida." });
    }

    // 3. Salvar histórico se houver agendamento anterior ativo
    if (caso.agendamento_data) {
      const tipoReuniao = caso.status.includes("presencial")
        ? "presencial"
        : "online";

      await supabase.from("historico_agendamentos").insert({
        caso_id: id,
        data_agendamento: caso.agendamento_data,
        link_ou_local: caso.agendamento_link,
        tipo: tipoReuniao,
        status: "reagendado",
      });
    }

    // 4. Atualiza o status e salva nas colunas específicas
    const { error: updateError } = await supabase
      .from("casos")
      .update({
        status: "reagendamento_solicitado",
        motivo_reagendamento: motivo,
        data_sugerida_reagendamento: data_sugerida,
        agendamento_data: null, // Libera a agenda
        agendamento_link: null,
        updated_at: new Date(),
      })
      .eq("id", id);

    if (updateError) throw updateError;

    // [NOTIFICAÇÃO] Alerta o defensor sobre solicitação de reagendamento
    await supabase.from("notificacoes").insert({
      caso_id: id,
      mensagem: `Solicitação de reagendamento para o caso ${caso.nome_assistido || "Assistido"}.`,
      tipo: 'reagendamento'
    });

    res.status(200).json({ message: "Solicitação enviada com sucesso." });
  } catch (error) {
    logger.error(`Erro ao solicitar reagendamento: ${error.message}`);
    res.status(500).json({ error: "Erro ao processar solicitação." });
  }
};

export const alternarArquivamento = async (req, res) => {
  const { id } = req.params;
  const { arquivado, motivo } = req.body; // espera true ou false

  // Validação: Motivo obrigatório ao arquivar
  if (arquivado === true && (!motivo || motivo.trim().length < 5)) {
    return res.status(400).json({ error: "Motivo de arquivamento é obrigatório (mín. 5 caracteres)." });
  }

  try {
    const updateData = { arquivado };
    if (arquivado) {
      updateData.motivo_arquivamento = motivo;
    } else {
      updateData.motivo_arquivamento = null; // Limpa o motivo ao restaurar
    }

    const { data, error } = await supabase
      .from('casos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao processar arquivamento' });
  }
};

// --- CONTROLLERS DE NOTIFICAÇÃO ---

export const listarNotificacoes = async (req, res) => {
  try {
    // Busca notificações recentes
    const { data, error } = await supabase
      .from("notificacoes")
      .select("*, casos(nome_assistido, protocolo)")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    logger.error(`Erro ao listar notificações: ${error.message}`);
    res.status(500).json({ error: "Erro ao buscar notificações." });
  }
};

export const marcarNotificacaoLida = async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from("notificacoes")
      .update({ lida: true })
      .eq("id", id);
    if (error) throw error;
    res.status(200).json({ message: "Lida" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao atualizar" });
  }
};
