import { generateLegalText } from "./aiService.js";
import dotenv from "dotenv";

dotenv.config();

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
        raw.representante_requerente || raw.representante || raw.representante_nome || undefined,
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
      ocupacao: raw.requerido_ocupacao || raw.ocupacao_requerido,
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
    valorMensalPensao:
      raw.valorMensalPensao ?? raw.valor_mensal_pensao,
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

const valueOrPlaceholder = (value, fallback = PLACEHOLDER_FIELD) => {
  if (value === undefined || value === null) return fallback;
  const trimmed = `${value}`.trim();
  return trimmed ? trimmed : fallback;
};

const cleanText = (value, fallback = "") => {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  return text.length ? text : fallback;
};

function sanitizeLegalAbbreviations(text) {
  return text.replace(/\b(art)\/\s*/gi, "$1. ");
}

/**
 * Analisa o caso para gerar um resumo executivo para o Painel do Defensor.
 * Usa o orquestrador para garantir alta disponibilidade.
 */
export const analyzeCase = async (fullText) => {
  const systemPrompt = `Você é um assistente jurídico sênior e objetivo da Defensoria Pública.
  Sua tarefa é analisar o relato de um caso e criar um resumo executivo claro para o defensor.
  Não adicione saudações, frases introdutórias ou conclusões genéricas.`;

  const userPrompt = `Analise o texto abaixo e retorne APENAS os seguintes tópicos:
  1. Problema Central
  2. Partes Envolvidas
  3. Pedido Principal
  4. Urgência (Sim/Não e por quê)
  5. Área do Direito

  --- TEXTO DO CASO ---
  ${fullText}`;

  try {
    return await generateLegalText(systemPrompt, userPrompt, 0.3);
  } catch (error) {
    console.error("Erro na análise do caso:", error);
    throw new Error("Falha ao gerar o resumo do caso.");
  }
};

/**
 * Gera a seção "DOS FATOS" da petição, usando estrutura rígida e formal.
 * Usa a arquitetura híbrida (Groq/Gemini).
 */
export const generateDosFatos = async (caseData = {}) => {
  try {
    const normalized = normalizePromptData(caseData);
    const relatoBase = cleanText(normalized.relato, "Relato detalhado não informado.");

    const formatDocumentList = (docs = []) => {
      if (!Array.isArray(docs) || !docs.length) return "Nenhum documento ou prova informado.";
      const filtered = docs.map((doc) => cleanText(doc)).filter((doc) => Boolean(doc));
      return filtered.length ? filtered.map((doc, index) => `${index + 1}. ${doc}`).join("\n") : "Nenhum documento ou prova informado.";
    };

    const documentosList = formatDocumentList(caseData.documentos_informados);
    
    // Mapeia descricao_guarda para filhosInfo se filhosInfo estiver vazio
    const filhosInfo = cleanText(
      caseData.filhos_info || caseData.filhosInfo || caseData.descricao_guarda,
      "Informações sobre filhos não foram apresentadas."
    );

    // Enriquece a situação do assistido
    let situacaoAssistido = cleanText(caseData.dados_adicionais_requerente, "");
    if (caseData.situacao_financeira_genitora) {
      situacaoAssistido += `\nSituação Financeira: ${caseData.situacao_financeira_genitora}`;
    }
    if (!situacaoAssistido) situacaoAssistido = "Sem detalhes adicionais sobre o assistido.";

    // Enriquece a situação do requerido
    let situacaoRequerido = cleanText(caseData.dados_adicionais_requerido, "");
    if (caseData.requerido_tem_emprego_formal) {
      situacaoRequerido += `\nPossui emprego formal? ${caseData.requerido_tem_emprego_formal}.`;
    }
    if (caseData.empregador_requerido_nome) {
      situacaoRequerido += ` Empregador: ${caseData.empregador_requerido_nome}.`;
    }
    if (normalized.requerido.ocupacao) {
      situacaoRequerido += ` Ocupação: ${normalized.requerido.ocupacao}.`;
    }
    if (!situacaoRequerido) situacaoRequerido = "Sem detalhes adicionais sobre o requerido.";

    const valorPensao = cleanText(normalized.valorMensalPensao, "Valor não informado");
    
    // Dados extras
    const bensPartilha = cleanText(caseData.bens_partilha);
    const outrosPedidos = [];
    if (bensPartilha) outrosPedidos.push(`Bens a partilhar: ${bensPartilha}`);
    if (caseData.alimentos_para_ex_conjuge) outrosPedidos.push(`Alimentos para ex-cônjuge: ${caseData.alimentos_para_ex_conjuge}`);
    const contextoExtra = outrosPedidos.length ? `\nOutros Pedidos/Detalhes: ${outrosPedidos.join("; ")}` : "";

    // --- PROMPTS ESTRUTURADOS PARA O ORQUESTRADOR ---

    const systemPrompt = `Você é um Defensor Público experiente na Bahia.
Seu estilo de escrita é extremamente formal, culto e padronizado (juridiquês clássico).
Você DEVE utilizar os conectivos: "Insta salientar", "Ocorre que, no caso em tela", "Como é sabido", "aduzir".
Não use listas ou tópicos na resposta final. Escreva apenas parágrafos coesos.`;

    const userPrompt = `Redija APENAS o conteúdo textual da seção "DOS FATOS" de uma ${normalized.tipo_acao || "petição inicial"} seguindo rigorosamente este modelo lógico:
    
ATENÇÃO: NÃO inclua o título "DOS FATOS", "DOS FATOS E FUNDAMENTOS" ou qualquer outro cabeçalho no início da resposta. Comece diretamente pelo primeiro parágrafo do texto.

1. **Vínculo e Guarda:** "O autor é filho do requerido, conforme é possível aduzir..." (Mencione guarda de fato e documentos).
2. **Necessidade:** "Ocorre que, no caso em tela, os recursos financeiros da genitora..." (Liste necessidades e situação financeira).
3. **Dever Jurídico:** "Como é sabido, o dispêndio com a criação..." (Reforce obrigação mútua e capacidade do pai).
4. **Conflito:** "Insta salientar que a genitora..." (Cite tentativas frustradas de acordo e necessidade do Judiciário).

DADOS DO CASO:
- Assistido: ${cleanText(normalized.requerente?.nome)} (CPF: ${cleanText(normalized.requerente?.cpf)})
- Requerido: ${cleanText(normalized.requerido?.nome)} (CPF: ${cleanText(normalized.requerido?.cpf)})
- Filhos/Guarda: ${filhosInfo}
- Situação Mãe: ${situacaoAssistido}
- Situação Pai: ${situacaoRequerido}
- Valor Pedido: R$ ${valorPensao}
- Relato Informal: """${relatoBase}"""
- Documentos: ${documentosList}
${contextoExtra}

Adapte o texto se o relato informal contradizer o modelo padrão (ex: pai já paga algo), mas mantenha o tom formal.`;

    // Chamada Híbrida (Tenta Groq, falha para Gemini)
    const textoGerado = await generateLegalText(systemPrompt, userPrompt, 0.3);
    
    return sanitizeLegalAbbreviations(textoGerado.trim());

  } catch (error) {
    console.error("Erro ao gerar a seção 'Dos Fatos':", error);
    throw new Error("Falha ao gerar a seção 'Dos Fatos' com a IA.");
  }
};