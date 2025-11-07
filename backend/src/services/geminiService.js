// Arquivo: backend/src/services/geminiService.js

import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

// Inicializa o cliente da IA com sua chave de API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const analyzeCase = async (fullText) => {
  // Garante que a chave da API foi configurada
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "A chave da API do Gemini não foi configurada no arquivo .env"
    );
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Você é um assistente jurídico sênior e objetivo. Sua tarefa é analisar o texto de um caso enviado a uma Defensoria Pública e criar um resumo claro e conciso para o defensor.

    O resumo deve ser em formato de tópicos, destacando exclusivamente os seguintes pontos:
    1.  Problema Central
    2.  Partes Envolvidas
    3.  Pedido Principal
    4.  Urgência (Sim/Não e por quê)
    5.  Área do Direito

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

export const generatePetitionText = async (caseData) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "A chave da API do Gemini não foi configurada no arquivo .env"
    );
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const action = getActionFromTipoAcao(caseData);
    let prompt = "";

    switch (action.type) {
      case "fixacao":
      case "oferta":
        prompt = buildPromptFixacao(caseData);
        break;
      case "execucao_prisao":
        prompt = buildPromptExecucao(caseData, "prisao");
        break;
      case "execucao_penhora":
        prompt = buildPromptExecucao(caseData, "penhora");
        break;
      case "execucao":
        prompt = buildPromptExecucao(caseData, "generico");
        break;
      default:
        prompt = buildPromptGenericoFamilia(caseData);
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const raw = response.text() || "";
    const sanitized = sanitizeLegalAbbreviations(raw);
    return sanitized;
  } catch (error) {
    console.error(
      "Ocorreu um erro durante a geração da petição com o Gemini:",
      error
    );
    throw new Error("Falha ao gerar o rascunho da petição inicial com a IA.");
  }
};

function getActionFromTipoAcao(caseData) {
  const tipo = (caseData.acao_especifica || caseData.tipo_acao || "").toLowerCase();
  if (tipo.includes("fixa")) return { type: "fixacao" };
  if (tipo.includes("oferta")) return { type: "oferta" };
  if (tipo.includes("execu")) {
    if (tipo.includes("pris")) return { type: "execucao_prisao" };
    if (tipo.includes("penhor")) return { type: "execucao_penhora" };
    return { type: "execucao" };
  }
  return { type: "generico" };
}

function sanitizeLegalAbbreviations(text) {
  return text.replace(/\b(art)\/\s*/gi, "$1. ");
}

function buildPromptFixacao(d) {
  return `
Você é um assistente jurídico especializado em Direito de Família (DPE/BA – Teixeira de Freitas).
Sua tarefa é redigir a petição inicial de Fixação (ou Oferta) de Alimentos, pronta para revisão, com linguagem formal, objetiva e alinhada às práticas da Defensoria.

Instruções:
- Siga estritamente os dados fornecidos entre --- DADOS ---.
- Na seção "DOS FATOS", reescreva o relato em linguagem jurídica formal e cronológica, sem inventar informações, integrando nomes, datas e contexto.
- Inclua pedidos compatíveis (fixação do valor/percentual, despesas extraordinárias, data de pagamento, gratuidade, citação, MP se incapaz, desconto em folha se houver emprego formal).
- Se houver {requerido_tem_emprego_formal} = "sim", incluir pedido de desconto em folha e qualificar empregador.
- Texto final em formato puro.

Estrutura sugerida:
1) Endereçamento (Vara de Família de Teixeira de Freitas – BA)
2) Qualificação das partes
3) Dos Fatos (reformular relato)
4) Do Direito (fundamentação sucinta)
5) Dos Alimentos (valor/percentual; despesas extras; data de pagamento; dados bancários)
6) Dos Pedidos
7) Valor da Causa
8) Fechamento

--- DADOS ---
Requerente: ${d.nome_assistido || "[pendente]"}; CPF: ${d.cpf_assistido || "[pendente]"}; Endereço: ${d.endereco_assistido || "[pendente]"}; Contato: ${d.telefone_assistido || "[pendente]"}; Email: ${d.email_assistido || "[pendente]"}
Requerido: ${d.nome_requerido || "[pendente]"}; CPF: ${d.cpf_requerido || "[pendente]"}; Endereço: ${d.endereco_requerido || "[pendente]"}
Filhos: ${d.filhos_info || "[pendente]"}
Relação: início ${d.data_inicio_relacao || "[pendente]"}, separação ${d.data_separacao || "[pendente]"}
Relato (bruto): ${d.relato_texto || "[pendente]"}

Proposta de Alimentos: ${d.percentual_sm_requerido || "[pendente]"}
Despesas Extras: ${d.percentual_despesas_extra || "[pendente]"}
Data de Pagamento: ${d.dia_pagamento_requerido || "[pendente]"}
Dados Bancários p/ Depósito: ${d.dados_bancarios_deposito || "[pendente]"}

Emprego Formal do Requerido: ${d.requerido_tem_emprego_formal || "[pendente]"}
Empregador: ${d.empregador_requerido_nome || "[pendente]"}, ${d.empregador_requerido_endereco || ""}

Documentos informados: ${(d.documentos_informados || []).join("; ") || "[nenhum]"}
Resumo IA: ${d.resumo_ia || "[n/d]"}
--- FIM DOS DADOS ---

Gere a petição inicial completa conforme a estrutura e instruções.
  `.trim();
}

function buildPromptExecucao(d, rito) {
  const ritoLabel = rito === "prisao" ? "Prisão" : rito === "penhora" ? "Penhora" : "Execução";
  return `
Você é um assistente jurídico (DPE/BA – Teixeira de Freitas).
Redija a petição de Execução de Alimentos – Rito ${ritoLabel}, com linguagem formal e objetiva.

Instruções:
- Siga apenas os dados entre --- DADOS ---.
- "DOS FATOS": contextualize a origem (processo, vara, valor/percentual fixado, dia de pagamento) e descreva o débito (período e valor total).
- Inclua pedidos compatíveis ao rito:
  - Prisão: intimação para pagar em 3 dias (últimas 3 parcelas e vincendas), sob pena de prisão civil.
  - Penhora: penhora/online, Sisbajud, Infojud, Renajud, exibição de bens, protesto, etc.
- Sempre incluir gratuidade, citação, intimação do MP (se incapaz), custas FADEP.
- Use os dados bancários para indicar forma de pagamento.
- Texto final em formato puro.

--- DADOS ---
Requerente: ${d.nome_assistido || "[pendente]"}; CPF: ${d.cpf_assistido || "[pendente]"}; Endereço: ${d.endereco_assistido || "[pendente]"}; Contato: ${d.telefone_assistido || "[pendente]"}
Requerido: ${d.nome_requerido || "[pendente]"}; CPF: ${d.cpf_requerido || "[pendente]"}; Endereço: ${d.endereco_requerido || "[pendente]"}

Processo Originário: ${d.numero_processo_originario || "[pendente]"}
Vara Originária: ${d.vara_originaria || "[pendente]"}
Valor/Percentual Fixado: ${d.percentual_ou_valor_fixado || "[pendente]"}
Dia de Pagamento (fixado): ${d.dia_pagamento_fixado || "[pendente]"}
Período em Atraso: ${d.periodo_debito_execucao || "[pendente]"}
Valor Total do Débito: ${d.valor_total_debito_execucao || "[pendente]"}
Dados Bancários p/ Depósito: ${d.dados_bancarios_deposito || "[pendente]"}

Relato (bruto): ${d.relato_texto || "[n/d]"}
--- FIM DOS DADOS ---

Estrutura sugerida: Endereçamento; Qualificação; Dos Fatos; Do Direito; Dos Pedidos (conforme rito); Valor da Causa; Fechamento.
Gere a petição completa.
  `.trim();
}

function buildPromptGenericoFamilia(d) {
  return `
Você é um assistente jurídico de Família (DPE/BA – Teixeira de Freitas).
Redija a petição inicial completa conforme dados abaixo, com “DOS FATOS” reescrito em linguagem jurídica formal. Não invente informações.

--- DADOS ---
Tipo de Ação: ${d.tipo_acao || d.acao_especifica || "[pendente]"}
Requerente: ${d.nome_assistido || "[pendente]"}; CPF: ${d.cpf_assistido || "[pendente]"}; Endereço: ${d.endereco_assistido || "[pendente]"}; Email: ${d.email_assistido || "[pendente]"}
Requerido: ${d.nome_requerido || "[pendente]"}; CPF: ${d.cpf_requerido || "[pendente]"}; Endereço: ${d.endereco_requerido || "[pendente]"}
Filhos: ${d.filhos_info || "[pendente]"}
Relação: início ${d.data_inicio_relacao || "[pendente]"}, separação ${d.data_separacao || "[pendente]"}
Bens: ${d.bens_partilha || "[pendente]"}
Relato (bruto): ${d.relato_texto || "[pendente]"}
--- FIM DOS DADOS ---

Estrutura: Endereçamento; Qualificação; Dos Fatos; Do Direito; Dos Pedidos; Valor da Causa; Fechamento.
Gere a petição completa.
  `.trim();
}

