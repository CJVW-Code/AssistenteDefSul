// Arquivo: backend/src/services/geminiService.js

import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

// Inicializa o cliente da IA com sua chave de API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const DEFAULT_COMARCA =
  process.env.DEFENSORIA_DEFAULT_COMARCA || "Teixeira de Freitas/BA";
const DEFAULT_VARA =
  process.env.DEFENSORIA_DEFAULT_VARA ||
  "1ª Vara de Família, Órfãos, Sucessões e Interditos";
const DEFAULT_DEFENSORA =
  process.env.DEFENSORIA_DEFAULT_DEFENSORA ||
  "DEFENSOR(A) PÚBLICO(A) DO ESTADO DA BAHIA";
const DEFAULT_ENDERECO_DPE =
  process.env.DEFENSORIA_DEFAULT_ENDERECO_DPE ||
  "[ENDEREÇO DA DEFENSORIA PÚBLICA]";
const DEFAULT_TELEFONE_DPE =
  process.env.DEFENSORIA_DEFAULT_TELEFONE_DPE || "[TELEFONE DA DPE]";
const DEFAULT_CIDADE_ASSINATURA =
  process.env.DEFENSORIA_DEFAULT_CIDADE_ASSINATURA || DEFAULT_COMARCA;
const DEFAULT_TRIAGEM = "[TRIAGEM SIGAD/SOLAR]";
const DEFAULT_PROCESSO = "[NÚMERO DO PROCESSO/DEPENDÊNCIA]";
const PLACEHOLDER_FIELD = "[DADO PENDENTE]";

export const normalizePromptData = (raw = {}) => {
  const requerente =
    raw.requerente || raw.exequente || raw.assistido || raw.cliente || {
      nome:
        raw.nome_assistido ||
        raw.requerente_nome ||
        raw.nome_requerente ||
        raw.exequente_nome,
      cpf:
        raw.cpf_assistido ||
        raw.requerente_cpf ||
        raw.cpf_requerente ||
        raw.exequente_cpf,
      dataNascimento:
        raw.requerente_data_nascimento ||
        raw.data_nascimento_assistido ||
        raw.data_nascimento_requerente,
      representante:
        raw.representante_requerente || raw.representante || undefined,
    };

  const requerido =
    raw.requerido || raw.executado || {
      nome:
        raw.nome_requerido ||
        raw.requerido_nome ||
        raw.executado_nome ||
        raw.nome_executado,
      cpf:
        raw.cpf_requerido ||
        raw.requerido_cpf ||
        raw.executado_cpf ||
        raw.cpf_executado,
    };

  const dadosBancarios =
    raw.dadosBancarios ||
    parseBankData(raw.dados_bancarios_deposito || raw.dados_bancarios || "");

  return {
    comarca: raw.comarca || DEFAULT_COMARCA,
    vara: raw.vara || raw.vara_originaria || DEFAULT_VARA,
    triagemNumero:
      raw.triagemNumero ||
      raw.triagem_numero ||
      raw.protocolo ||
      DEFAULT_TRIAGEM,
    processoDependencia:
      raw.processoDependencia ||
      raw.numero_processo_originario ||
      DEFAULT_PROCESSO,
    requerente,
    requerido,
    exequente: raw.exequente || requerente,
    executado: raw.executado || requerido,
    dadosBancarios,
    valorPercentualSalMin:
      raw.valorPercentualSalMin ?? raw.percentual_sm_requerido,
    valorPercentualExtrasSaudeEducVestu:
      raw.valorPercentualExtrasSaudeEducVestu ?? raw.percentual_despesas_extra,
    diaPagamentoMensal: raw.diaPagamentoMensal ?? raw.dia_pagamento_requerido,
    periodoDevedor: raw.periodoDevedor || raw.periodo_debito_execucao,
    valorTotalDebito:
      raw.valorTotalDebito || raw.valor_total_debito_execucao,
    cidadeDataAssinatura:
      raw.cidadeDataAssinatura ||
      raw.cidade_assinatura ||
      DEFAULT_CIDADE_ASSINATURA,
    defensoraNome:
      raw.defensoraNome || raw.defensora_nome || DEFAULT_DEFENSORA,
    enderecoDPE: raw.enderecoDPE || raw.endereco_dpe || DEFAULT_ENDERECO_DPE,
    telefoneDPE: raw.telefoneDPE || raw.telefone_dpe || DEFAULT_TELEFONE_DPE,
    relato:
      raw.relato_texto ||
      raw.relato ||
      raw.relatoBruto ||
      raw.relato_adicional ||
      "",
    acao_especifica:
      raw.acao_especifica || raw.tipo_acao || raw.tipoAcao || "",
    tipo_acao: raw.tipo_acao || raw.tipoAcao || "",
  };
};

const parseBankData = (raw) => {
  if (!raw || typeof raw !== "string") return {};
  const text = raw.trim();
  if (!text) return {};

  const match = (pattern) => {
    const result = text.match(pattern);
    return result ? result[1].trim() : undefined;
  };

  return {
    raw: text,
    pix: match(/pix[:\-]?\s*([^\n|]+)/i),
    banco: match(/banco[:\-]?\s*([^\n|]+)/i),
    agencia: match(/ag[êe]ncia[:\-]?\s*([\w\-]+)/i),
    conta: match(/conta[:\-]?\s*([\w\-]+)/i),
  };
};

const formatPaymentDestination = (dadosBancarios) => {
  if (!dadosBancarios) return "[Informar dados bancários]";
  const parts = [];
  if (dadosBancarios.pix) {
    parts.push(`Chave PIX: ${dadosBancarios.pix}`);
  }
  const contaParts = [];
  if (dadosBancarios.banco) contaParts.push(`Banco: ${dadosBancarios.banco}`);
  if (dadosBancarios.agencia)
    contaParts.push(`Agência: ${dadosBancarios.agencia}`);
  if (dadosBancarios.conta) contaParts.push(`Conta: ${dadosBancarios.conta}`);
  if (contaParts.length) parts.push(contaParts.join(", "));
  if (!parts.length && dadosBancarios.raw) parts.push(dadosBancarios.raw);
  return parts.length ? parts.join(" | ") : "[Informar dados bancários]";
};

const valueOrPlaceholder = (value, fallback = PLACEHOLDER_FIELD) => {
  if (value === undefined || value === null) return fallback;
  const trimmed = `${value}`.trim();
  return trimmed ? trimmed : fallback;
};

const percentOrPlaceholder = (value, fallback = "[PERCENTUAL]") => {
  const normalized = valueOrPlaceholder(value, fallback);
  if (normalized === fallback) return fallback;
  return normalized.endsWith("%") ? normalized : `${normalized}%`;
};

const cleanText = (value, fallback = "") => {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  return text.length ? text : fallback;
};

export const analyzeCase = async (fullText) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "A chave da API do Gemini não foi configurada no arquivo .env"
    );
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Você é um assistente jurídico sênior e objetivo. Sua tarefa é analisar o texto de um caso enviado a uma Defensoria Pública e criar um resumo claro e conciso para o defensor.

    O resumo deve ser em formato de tópicos, destacando exclusivamente os seguintes pontos:
    1. Problema Central
    2. Partes Envolvidas
    3. Pedido Principal
    4. Urgência (Sim/Não e por quê)
    5. Área do Direito

    Texto do Caso para Análise:
    ---
    ${fullText}
    ---

    Apenas retorne os tópicos. Não adicione saudações ou frases introdutórias.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Ocorreu um erro durante a análise com o Gemini:", error);
    throw new Error("Falha ao gerar o resumo do caso com a IA.");
  }
};

export const generateDosFatos = async (caseData = {}) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "A chave da API do Gemini não foi configurada no arquivo .env"
    );
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const normalized = normalizePromptData(caseData);
    const relatoBase =
      cleanText(
        caseData.relato_texto ||
          caseData.relato ||
          normalized.relato,
        "Relato detalhado não informado."
      ) || "Relato detalhado não informado.";

    const formatDocumentList = (docs = []) => {
      // Esta função foi movida para cá na refatoração anterior.
      if (!Array.isArray(docs) || !docs.length) {
        return "Nenhum documento ou prova informado.";
      }
      const filtered = docs
        .map((doc) => cleanText(doc))
        .filter((doc) => Boolean(doc));
      if (!filtered.length) return "Nenhum documento ou prova informado.";
      return filtered.map((doc, index) => `${index + 1}. ${doc}`).join("\n");
    };
    const documentosList = formatDocumentList(caseData.documentos_informados);    
    const filhosInfo = cleanText(
      caseData.filhos_info,
      "Informações sobre filhos não foram apresentadas."
    );
    const situacaoAssistido = cleanText(
      caseData.dados_adicionais_requerente,
      "Sem detalhes adicionais sobre o assistido."
    );
    const situacaoRequerido = cleanText(
      caseData.dados_adicionais_requerido,
      "Sem detalhes adicionais sobre o requerido."
    );
    const percentualPretendido = cleanText(
      caseData.percentual_sm_requerido ||
        normalized.valorPercentualSalMin,
      "Percentual não informado"
    );
    const percentualExtras = cleanText(
      caseData.percentual_despesas_extra,
      "Percentual de despesas adicionais não informado"
    );
    const prompt = `**Persona:**
Você é um assistente jurídico especialista em Direito de Família da Defensoria Pública da Bahia. Sua tarefa é redigir a seção "DOS FATOS" de uma petição de alimentos.

**Tarefa Principal:**
Com base exclusivamente nos dados fornecidos abaixo, escreva um texto claro, conciso e juridicamente sólido para a seção "DOS FATOS".

Regras obrigatórias:
1. **Não invente informações.** Utilize apenas os dados fornecidos.
2. **Estilo:** Adote um tom formal, técnico e objetivo.
3. **Estrutura:** Inicie com um parágrafo de síntese. Depois, narre os fatos em ordem cronológica.
4. **Foco:** Destaque apenas fatos relevantes para o pedido de alimentos (filiação, necessidades do alimentando, possibilidades do alimentante, falta de auxílio).
5. **Terminologia:** Não use "menor" ou "incapaz". Use "criança" ou "adolescente".
6. **Tamanho:** Produza um texto conciso, entre 3 e 5 parágrafos.
7. **Provas:** Ao final, se houver documentos, mencione de forma sutil que a narrativa é corroborada pela documentação anexa.

--- DADOS DO CASO (Fonte Exclusiva) ---
- Assistido: ${cleanText(
      normalized.requerente?.nome,
      "Nome do assistido não informado"
    )} (${cleanText(
      normalized.requerente?.cpf,
      "CPF não informado"
    )}), nascimento: ${cleanText(
      normalized.requerente?.dataNascimento,
      "sem data informada"
    )}.
- Requerido: ${cleanText(
      normalized.requerido?.nome,
      "Nome do requerido não informado"
    )}, CPF ${cleanText(normalized.requerido?.cpf, "não informado")}.
- Situação econômica do assistido: ${situacaoAssistido}
- Situação econômica do requerido: ${situacaoRequerido}
- Percentual pretendido sobre o salário mínimo: ${percentualPretendido}%
- Percentual para despesas extras (saúde, educação, vestuário): ${percentualExtras}%
- Informações sobre filhos/dependentes: ${filhosInfo}
- Relato fornecido pelo assistido:
\"\"\"${relatoBase}\"\"\"
- Provas/documentos mencionados:
${documentosList}

--- FIM DOS DADOS ---
Agora, gere apenas o texto da seção "DOS FATOS", sem o título "DOS FATOS" e sem qualquer comentário adicional.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const texto = response.text() || "";
    return sanitizeLegalAbbreviations(texto.trim());
  } catch (error) {
    console.error(
      "Erro ao gerar a seção 'Dos Fatos' com o Gemini:",
      error
    );
    throw new Error("Falha ao gerar a seção 'Dos Fatos' com a IA.");
  }
};

function sanitizeLegalAbbreviations(text) {
  return text.replace(/\b(art)\/\s*/gi, "$1. ");
}
