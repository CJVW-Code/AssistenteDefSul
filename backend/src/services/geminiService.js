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

const normalizePromptData = (raw = {}) => {
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

export const generatePetitionText = async (caseData) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "A chave da API do Gemini não foi configurada no arquivo .env"
    );
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const normalized = normalizePromptData(caseData);
    const action = getActionFromTipoAcao(normalized);
    let prompt = "";

    switch (action.type) {
      case "fixacao":
      case "oferta":
        prompt = promptFixacaoAlimentos(normalized);
        break;
      case "execucao_prisao":
        prompt = promptExecucaoPrisao(normalized);
        break;
      case "execucao_penhora":
        prompt = promptExecucaoPenhora(normalized);
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
    return sanitizeLegalAbbreviations(raw);
  } catch (error) {
    console.error(
      "Ocorreu um erro durante a geração da petição com o Gemini:",
      error
    );
    throw new Error("Falha ao gerar o rascunho da petição inicial com a IA.");
  }
};

function getActionFromTipoAcao(data = {}) {
  const tipo =
    (data.acao_especifica || data.tipo_acao || data.tipoAcao || "").toLowerCase();
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

export function promptFixacaoAlimentos(rawData = {}) {
  const data = normalizePromptData(rawData);
  const pagamento = formatPaymentDestination(data.dadosBancarios);
  const percentualBase = percentOrPlaceholder(
    data.valorPercentualSalMin,
    "[PERCENTUAL]"
  );
  const percentualExtras = percentOrPlaceholder(
    data.valorPercentualExtrasSaudeEducVestu,
    "[PERCENTUAL]"
  );
  const diaPagamento = valueOrPlaceholder(
    data.diaPagamentoMensal,
    "[DIA DO PAGAMENTO]"
  );
  const nascimentoAssistido = valueOrPlaceholder(
    data.requerente.dataNascimento,
    "[DATA]"
  );
  const representante = valueOrPlaceholder(
    data.requerente.representante,
    "[NOME DO REPRESENTANTE]"
  );
  const relatoBruto = valueOrPlaceholder(
    data.relato,
    "[RELATO DO CASO PENDENTE]"
  );

  return `
Você é um assistente jurídico. Gere a PETIÇÃO INICIAL exatamente no formato a seguir, usando linguagem formal, com a mesma estrutura, títulos, ordem e redação do modelo. Substitua os colchetes por dados. Não invente fatos. Onde não houver dado, mantenha o campo entre [COLCHETES] para edição humana.

===== TEXTO-MODELO (REPRODUZIR FIELMENTE) =====

AO JUÍZO DA ${valueOrPlaceholder(
    data.vara,
    DEFAULT_VARA
  )} DA COMARCA DE ${valueOrPlaceholder(data.comarca, DEFAULT_COMARCA)}

TRIAGEM SIGAD/SOLAR Nº ${valueOrPlaceholder(
    data.triagemNumero,
    DEFAULT_TRIAGEM
  )}

[Número de distribuição/Dependência: ${valueOrPlaceholder(
    data.processoDependencia,
    DEFAULT_PROCESSO
  )}]

[${valueOrPlaceholder(
    data.requerente.nome,
    "[NOME DO REQUERENTE]"
  )}, incapaz, nascido(a) em ${nascimentoAssistido}, CPF ${valueOrPlaceholder(
    data.requerente.cpf,
    "[CPF]"
  )}], neste ato representado(a)(s) por [${representante}], vem, perante esse Juízo, assistido(a) pela DEFENSORIA PÚBLICA DO ESTADO DA BAHIA, por um dos seus membros que a esta subscreve, na forma do artigo 134 da Constituição Federal, da Lei Complementar Federal nº 80/94 e da Lei Complementar Estadual nº 26/06, ajuizar a presente

Ação de Fixação de Alimentos
Com Pedido de Alimentos Provisórios

em face de [${valueOrPlaceholder(
    data.requerido.nome,
    "[NOME DO REQUERIDO]"
  )}, CPF ${valueOrPlaceholder(
    data.requerido.cpf,
    "[CPF]"
  )}], pelos motivos de fato e de direito a seguir expostos:

I. DAS PRERROGATIVAS INSTITUCIONAIS
(Manter a redação e citações legais do modelo)

II. DA GRATUIDADE DE JUSTIÇA
(Manter a redação do modelo)

III. DOS FATOS
[INSTRUÇÃO PARA IA: Replique o texto-base abaixo como referência obrigatória, adaptando nomes, pronomes, datas e circunstâncias com base no Relato do Caso. A narrativa deve ser formal, lógica e cronológica, deixando claro filiação, guarda de fato, insuficiência de recursos maternos, corresponsabilidade parental e tentativas extrajudiciais.]

TEXTO-BASE:
"O autor é filho do requerido, conforme é possível aduzir do seu documento de identificação em anexo. Encontra-se a parte alimentanda sob a guarda de fato da genitora, sendo livre e desimpedido o direito de convivência exercido pelo pai.

Ocorre que, no caso em tela, os recursos financeiros da genitora vêm se mostrando insuficientes para arcar de forma satisfatória com as despesas básicas e comuns a qualquer criança ou adolescente, como alimentação, vestuário, moradia, saúde, lazer, educação, dentre outras.

Como é sabido, o dispêndio com a criação dos filhos não pode ser suportado apenas pela genitora, sendo obrigação de ambos os pais conceder assistência material. Assim, certo é que a parte autora (credora), face às circunstâncias do caso concreto, não pode deixar de exercer o direito a alimentos devidos pela parte requerida (devedora).

Insta salientar que a genitora da parte requerente solicitou por diversas vezes o auxílio financeiro do requerido, porém não obteve êxito, restando como alternativa recorrer ao Poder Judiciário com a pretensão de compelir a parte requerida a cumprir com a obrigação de prestar alimentos."

Relato do Caso: ${relatoBruto}

IV. DO DIREITO
(Manter a fundamentação do modelo: CRFB, ECA, CC, Lei 5.478/68, presunção de necessidade, binômio necessidade/possibilidade)

V. DOS PEDIDOS
(Manter exatamente a lista do modelo, adaptando valores)
- Arbitramento liminar de alimentos provisórios no valor de ${percentualBase} do salário mínimo vigente, além de ${percentualExtras} dos gastos extraordinários com saúde, educação e vestuário, até o dia ${diaPagamento} de cada mês, a ser creditado em:
${pagamento}
- DEMAIS PEDIDOS: copiar integralmente do modelo (INSS/CEF art. 529 CPC, eventual desconto em folha, citação, alimentos definitivos ≥ ${percentualBase}, custas/honorários FAJDPE/BA, intimação pessoal, provas).

Dá-se à causa o valor de R$ [00,00].

${valueOrPlaceholder(
    data.cidadeDataAssinatura,
    DEFAULT_CIDADE_ASSINATURA
  )}, datado e assinado eletronicamente.

${valueOrPlaceholder(data.defensoraNome, DEFAULT_DEFENSORA)}
Defensora Pública do Estado da Bahia

${valueOrPlaceholder(data.enderecoDPE, DEFAULT_ENDERECO_DPE)}
Tel.: ${valueOrPlaceholder(data.telefoneDPE, DEFAULT_TELEFONE_DPE)}

===== INSTRUÇÕES DE SAÍDA =====
- Sem comentários. Sem marcas “###”.
- Mantenha o português formal e a mesma formatação de títulos do modelo.
- Preserve todas as referências legais e trechos literais.
`.trim();
}

export function promptExecucaoPrisao(rawData = {}) {
  const data = normalizePromptData(rawData);
  const pagamento = formatPaymentDestination(data.dadosBancarios);
  const periodo = valueOrPlaceholder(
    data.periodoDevedor,
    "[PERÍODO DO DÉBITO]"
  );
  const valor = valueOrPlaceholder(
    data.valorTotalDebito,
    "[VALOR DO DÉBITO]"
  );
  const representante = valueOrPlaceholder(
    data.exequente.representante,
    "[NOME DO REPRESENTANTE]"
  );
  const relatoBruto = valueOrPlaceholder(
    data.relato,
    "[RELATO DO CASO PENDENTE]"
  );

  return `
Você é um assistente jurídico. Produza a petição de CUMPRIMENTO DE SENTENÇA (execução de alimentos – rito da prisão civil) com a MESMA redação, estrutura e ordem do modelo abaixo, substituindo somente campos variáveis. Se faltar dado, mantenha [COLCHETES].

===== TEXTO-MODELO (REPRODUZIR FIELMENTE) =====

AO JUÍZO DA ${valueOrPlaceholder(
    data.vara,
    DEFAULT_VARA
  )} DA COMARCA DE ${valueOrPlaceholder(data.comarca, DEFAULT_COMARCA)} - BAHIA

TRIAGEM SIGAD/SOLAR Nº ${valueOrPlaceholder(
    data.triagemNumero,
    DEFAULT_TRIAGEM
  )}

Distribuição por dependência ao processo nº ${valueOrPlaceholder(
    data.processoDependencia,
    DEFAULT_PROCESSO
  )}

[${valueOrPlaceholder(data.exequente.nome, "[NOME DO EXEQUENTE]")}${
    data.exequente.dataNascimento
      ? `, nascido(a) em ${valueOrPlaceholder(
          data.exequente.dataNascimento,
          "[DATA]"
        )}`
      : ""
  }, CPF ${valueOrPlaceholder(
    data.exequente.cpf,
    "[CPF]"
  )}], neste ato representado(a) por [${representante}], assistido(a) pela DEFENSORIA PÚBLICA DO ESTADO DA BAHIA, com fundamento no art. 528, §§ 1º a 7º, do CPC, requerer o

CUMPRIMENTO DE SENTENÇA
(execução de alimentos - rito da prisão civil)

em face de [${valueOrPlaceholder(
    data.executado.nome,
    "[NOME DO EXECUTADO]"
  )}, CPF ${valueOrPlaceholder(
    data.executado.cpf,
    "[CPF]"
  )}], pelos motivos a seguir:

I. DAS PRERROGATIVAS INSTITUCIONAIS
(Manter integralmente o texto do modelo)

II. DA GRATUIDADE DE JUSTIÇA
(Manter o texto do modelo)

III. DA SÍNTESE DOS FATOS
[INSTRUÇÃO PARA IA: Reescreva esta seção em linguagem jurídica formal, seguindo o texto-base do modelo e incorporando o Relato do Caso abaixo. Explicite o título executivo, a obrigação imposta, o inadimplemento referente a ${periodo}, o valor atualizado de ${valor} e qualquer tentativa prévia de composição.]

Relato do Caso: ${relatoBruto}

IV. DOS FUNDAMENTOS JURÍDICOS
(Manter literalidade do modelo: art. 528 caput e §§, regime fechado, Súmula 309/STJ, CF art. 5º, LXVII)

V. DOS PEDIDOS
(Manter lista igual ao modelo, adaptando valores)
- Citação pessoal do executado para, em 3 dias, pagar o débito de ${valor}, referente ao período ${periodo}, bem como as prestações vincendas; pagar por:
${pagamento}
- Protesto do pronunciamento judicial; inclusão em cadastros de inadimplentes (SPC/Serasa); demais meios executivos eficazes; ofícios INSS/CEF e, havendo vínculo, desconto em folha (art. 529 CPC); custas/honorários FAJDPE/BA; intimação pessoal; provas.

Dá-se à causa o valor de R$ [00,00].

${valueOrPlaceholder(
    data.cidadeDataAssinatura,
    DEFAULT_CIDADE_ASSINATURA
  )}, datado e assinado eletronicamente.

${valueOrPlaceholder(data.defensoraNome, DEFAULT_DEFENSORA)}
Defensora Pública do Estado da Bahia

${valueOrPlaceholder(data.enderecoDPE, DEFAULT_ENDERECO_DPE)}
Tel.: ${valueOrPlaceholder(data.telefoneDPE, DEFAULT_TELEFONE_DPE)}

===== INSTRUÇÕES DE SAÍDA =====
- Sem comentários. Sem bullets extras além dos do texto do modelo.
- Reproduza a formatação/títulos do modelo.
`.trim();
}

export function promptExecucaoPenhora(rawData = {}) {
  const data = normalizePromptData(rawData);
  const pagamento = formatPaymentDestination(data.dadosBancarios);
  const periodo = valueOrPlaceholder(
    data.periodoDevedor,
    "[PERÍODO DO DÉBITO]"
  );
  const valor = valueOrPlaceholder(
    data.valorTotalDebito,
    "[VALOR DO DÉBITO]"
  );
  const representante = valueOrPlaceholder(
    data.exequente.representante,
    "[NOME DO REPRESENTANTE]"
  );
  const relatoBruto = valueOrPlaceholder(
    data.relato,
    "[RELATO DO CASO PENDENTE]"
  );

  return `
Você é um assistente jurídico. Produza a petição de CUMPRIMENTO DE SENTENÇA (execução de alimentos – rito da expropriação/penhora) com a MESMA redação, estrutura e ordem do modelo abaixo, alterando apenas campos variáveis. Se faltar dado, mantenha [COLCHETES].

===== TEXTO-MODELO (REPRODUZIR FIELMENTE) =====

AO JUÍZO DA ${valueOrPlaceholder(
    data.vara,
    DEFAULT_VARA
  )} DA COMARCA DE ${valueOrPlaceholder(data.comarca, DEFAULT_COMARCA)} - BAHIA

TRIAGEM SIGAD/SOLAR Nº ${valueOrPlaceholder(
    data.triagemNumero,
    DEFAULT_TRIAGEM
  )}

Distribuição por dependência ao processo nº ${valueOrPlaceholder(
    data.processoDependencia,
    DEFAULT_PROCESSO
  )}

[${valueOrPlaceholder(data.exequente.nome, "[NOME DO EXEQUENTE]")}${
    data.exequente.dataNascimento
      ? `, nascido(a) em ${valueOrPlaceholder(
          data.exequente.dataNascimento,
          "[DATA]"
        )}`
      : ""
  }, CPF ${valueOrPlaceholder(
    data.exequente.cpf,
    "[CPF]"
  )}], representado(a) por [${representante}], assistido(a) pela DEFENSORIA PÚBLICA DO ESTADO DA BAHIA, com base no art. 528 c/c arts. 523 e 530 do CPC, requerer o

CUMPRIMENTO DE SENTENÇA
(execução de alimentos - rito da expropriação)

em face de [${valueOrPlaceholder(
    data.executado.nome,
    "[NOME DO EXECUTADO]"
  )}, CPF ${valueOrPlaceholder(
    data.executado.cpf,
    "[CPF]"
  )}], pelos motivos a seguir:

I. DAS PRERROGATIVAS INSTITUCIONAIS
(Manter o texto do modelo)

II. DA GRATUIDADE DE JUSTIÇA
(Manter o texto do modelo)

III. DA SÍNTESE DOS FATOS
[INSTRUÇÃO PARA IA: Reescreva esta seção com base no texto do modelo e no Relato do Caso abaixo, demonstrando o título executivo, o inadimplemento superior a três meses, o período ${periodo}, o valor de ${valor} e qualquer diligência prévia empreendida.]

Relato do Caso: ${relatoBruto}

IV. DOS FUNDAMENTOS JURÍDICOS
(Manter literalidade do modelo: art. 523; art. 528; art. 530; multa 10%; honorários 10%; penhora/avaliação; protesto; SPC/Serasa; precedentes STJ; medidas atípicas art. 139 IV; ECA/CF/Convenção)

V. DOS PEDIDOS
(Manter lista do modelo, adaptando valores)
- Intimar executado para pagar as parcelas de ${periodo}, total ${valor}, na forma:
${pagamento}
- Multa 10% + honorários 10% (FAJDPE/BA); ofícios INSS/CEF (art. 529 CPC) e eventual desconto em folha; penhora via SISBAJUD, e, se frustrada, RENAJUD; penhora de FGTS conforme precedente; protesto e negativação; medidas atípicas (suspensão CNH/apreensão passaporte – REsp 1782418/RJ); descrição de bens (art. 836 §1º); intimação pessoal; provas.

Dá-se à causa o valor de R$ [00,00].

${valueOrPlaceholder(
    data.cidadeDataAssinatura,
    DEFAULT_CIDADE_ASSINATURA
  )}, datado e assinado eletronicamente.

${valueOrPlaceholder(data.defensoraNome, DEFAULT_DEFENSORA)}
Defensora Pública do Estado da Bahia

${valueOrPlaceholder(data.enderecoDPE, DEFAULT_ENDERECO_DPE)}
Tel.: ${valueOrPlaceholder(data.telefoneDPE, DEFAULT_TELEFONE_DPE)}

===== INSTRUÇÕES DE SAÍDA =====
- Não resuma; replique a formatação do modelo.
- Mantenha citações legais e jurisprudência do modelo.
`.trim();
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
Requerente: ${d.nome_assistido || "[pendente]"}; CPF: ${
    d.cpf_assistido || "[pendente]"
  }; Endereço: ${d.endereco_assistido || "[pendente]"}; Contato: ${
    d.telefone_assistido || "[pendente]"
  }; Email: ${d.email_assistido || "[pendente]"}
Requerido: ${d.nome_requerido || "[pendente]"}; CPF: ${
    d.cpf_requerido || "[pendente]"
  }; Endereço: ${d.endereco_requerido || "[pendente]"}
Filhos: ${d.filhos_info || "[pendente]"}
Relação: início ${d.data_inicio_relacao || "[pendente]"}, separação ${
    d.data_separacao || "[pendente]"
  }
Relato (bruto): ${d.relato_texto || "[pendente]"}

Proposta de Alimentos: ${d.percentual_sm_requerido || "[pendente]"}
Despesas Extras: ${d.percentual_despesas_extra || "[pendente]"}
Data de Pagamento: ${d.dia_pagamento_requerido || "[pendente]"}
Dados Bancários p/ Depósito: ${d.dados_bancarios_deposito || "[pendente]"}

Emprego Formal do Requerido: ${d.requerido_tem_emprego_formal || "[pendente]"}
Empregador: ${d.empregador_requerido_nome || "[pendente]"}, ${
    d.empregador_requerido_endereco || ""
  }

Documentos informados: ${(d.documentos_informados || []).join("; ") || "[nenhum]"}
Resumo IA: ${d.resumo_ia || "[n/d]"}
--- FIM DOS DADOS ---

Gere a petição inicial completa conforme a estrutura e instruções.
  `.trim();
}

function buildPromptExecucao(d, rito) {
  const ritoLabel =
    rito === "prisao" ? "Prisão" : rito === "penhora" ? "Penhora" : "Execução";
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
Requerente: ${d.nome_assistido || "[pendente]"}; CPF: ${
    d.cpf_assistido || "[pendente]"
  }; Endereço: ${d.endereco_assistido || "[pendente]"}; Contato: ${
    d.telefone_assistido || "[pendente]"
  }
Requerido: ${d.nome_requerido || "[pendente]"}; CPF: ${
    d.cpf_requerido || "[pendente]"
  }; Endereço: ${d.endereco_requerido || "[pendente]"}

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
Requerente: ${d.nome_assistido || "[pendente]"}; CPF: ${
    d.cpf_assistido || "[pendente]"
  }; Endereço: ${d.endereco_assistido || "[pendente]"}; Email: ${
    d.email_assistido || "[pendente]"
  }
Requerido: ${d.nome_requerido || "[pendente]"}; CPF: ${
    d.cpf_requerido || "[pendente]"
  }; Endereço: ${d.endereco_requerido || "[pendente]"}
Filhos: ${d.filhos_info || "[pendente]"}
Relação: início ${d.data_inicio_relacao || "[pendente]"}, separação ${
    d.data_separacao || "[pendente]"
  }
Bens: ${d.bens_partilha || "[pendente]"}
Relato (bruto): ${d.relato_texto || "[pendente]"}
--- FIM DOS DADOS ---

Estrutura: Endereçamento; Qualificação; Dos Fatos; Do Direito; Dos Pedidos; Valor da Causa; Fechamento.
Gere a petição completa.
  `.trim();
}
