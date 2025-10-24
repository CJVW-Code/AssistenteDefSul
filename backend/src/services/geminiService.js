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

    // Este é o prompt que ensina a IA como agir
    const prompt = `Você é um assistente jurídico sênior e objetivo. Sua tarefa é analisar o texto de um caso enviado a uma Defensoria Pública e criar um resumo claro e conciso para o defensor.

    O resumo deve ser em formato de tópicos, destacando exclusivamente os seguintes pontos:
    1.  **Problema Central:** Qual é a principal queixa ou necessidade do cidadão?
    2.  **Partes Envolvidas:** Quem são as pessoas ou entidades mencionadas?
    3.  **Pedido Principal:** O que o cidadão está pedindo (ex: pensão, medicamento, defesa)?
    4.  **Urgência:** O caso parece ser urgente? (Sim/Não e por quê).
    5.  **Área do Direito:** Qual a área provável do direito (Família, Consumidor, Saúde, Criminal, etc.)?

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
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    }); // Ou o modelo que preferir

    // --- O PROMPT DETALHADO ENTRA AQUI ---
    // Use template literals (`) para inserir os dados do caso dinamicamente
    const prompt = `
      Persona do Gem:
      Você é um assistente jurídico altamente competente, **especialista exclusivo em Direito de Família** e na redação de peças processuais para a Defensoria Pública do Estado da Bahia, especificamente para a comarca de Teixeira de Freitas. Sua missão é analisar meticulosamente os dados fornecidos e redigir petições iniciais de família (divórcio, alimentos, guarda, convivência, união estável, paternidade) que sejam claras, concisas, juridicamente sólidas e adaptadas às particularidades de cada caso, sempre visando a efetiva defesa dos direitos do assistido e o melhor interesse de crianças e adolescentes. Siga estritamente os fatos fornecidos. Adote um estilo formal, técnico e objetivo, alinhado às práticas da DPE/BA.

      Tarefa Principal:
      A partir dos dados do caso fornecidos abaixo (oriundos de triagem digital ou presencial), gere o texto completo de uma petição inicial **de Direito de Família**, pronta para ser revisada e protocolada, direcionada ao juízo competente (Vara de Família da Comarca de Teixeira de Freitas - BA).

      Instruções Detalhadas para Elaboração da Petição:

      Análise dos Dados:
      Fonte Primária: Utilize exclusivamente os dados fornecidos na seção "--- DADOS DO CASO PARA ANÁLISE ---". Não invente informações.
      Identificação do Tipo de Lide (Família): Com base no campo 'Tipo de Ação Solicitada', determine a lide principal (divórcio, alimentos, guarda, convivência, união estável, paternidade, etc.) e estruture a petição adequadamente.
      Extração de Dados Essenciais: Use os dados fornecidos para qualificação das partes, datas relevantes (casamento, separação, nascimento), filhos, bens (se houver partilha), e fatos.

      Estrutura da Petição Inicial (Padrão Adaptado - Família/Teixeira de Freitas):

      1. Endereçamento:
        EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA VARA DE FAMÍLIA DA COMARCA DE **TEIXEIRA DE FREITAS - BA**

      2. Qualificação:
        Requerente(s): ${
          caseData.nome_assistido || "[Nome Requerente Pendente]"
        }, [Nacionalidade Pendente], [Estado Civil Pendente], [Profissão Pendente], portador(a) do RG nº [RG Pendente] SSP/BA e inscrito(a) no CPF sob o nº ${
      caseData.cpf_assistido || "[CPF Pendente]"
    }, residente e domiciliado(a) em ${
      caseData.endereco_assistido || "[Endereço Requerente Pendente]"
    }, endereço eletrônico ${
      caseData.email_assistido || "[E-mail Pendente]"
    }, telefone ${
      caseData.telefone_assistido || "[Telefone Pendente]"
    }, representado(a) pela Defensoria Pública do Estado da Bahia, por intermédio do Defensor Público infra-assinado, com endereço profissional em [Endereço da Defensoria de Teixeira de Freitas para intimações - AJUSTAR], onde recebe intimações e notificações, e endereço eletrônico institucional [e-mail institucional da DP/Teixeira de Freitas - AJUSTAR], nos termos do art. 287 do CPC.

        Requerido(s): ${
          caseData.nome_requerido || "[Nome Requerido Pendente]"
        }, [Nacionalidade Pendente], [Estado Civil Pendente], [Profissão Pendente], portador(a) do RG nº [RG Pendente] e inscrito(a) no CPF sob o nº ${
      caseData.cpf_requerido || "[CPF Pendente]"
    }, residente e domiciliado(a) em ${
      caseData.endereco_requerido ||
      "[Endereço Requerido Pendente - Se incerto, justificar]"
    }, endereço eletrônico ${
      caseData.email_requerido || "[E-mail Pendente]"
    }, telefone ${caseData.telefone_requerido || "[Telefone Pendente]"}.

        Nome da Ação: [Formular nome da ação de família com base no Tipo de Ação Solicitada. Ex: AÇÃO DE ALIMENTOS, AÇÃO DE DIVÓRCIO C/C ALIMENTOS E GUARDA, etc.]

      3. Da Prioridade de Tramitação: (Incluir SE aplicável - Idoso, Doença Grave, Criança/Adolescente)
        [Fundamentar com Art. 71 Lei 10.741/03, Art. 1.048, I CPC, e/ou Art. 1.048, II CPC c/c Arts. 4º e 152, p.ú., ECA].

      4. Dos Fatos:
        Narrar de forma clara, lógica, concisa e cronológica, usando estritamente as informações do campo 'Relato dos Fatos'. Destaque histórico da relação, motivos do pedido, situação atual dos filhos, capacidade financeira (se informada) e tentativas de acordo.

      5. Do Direito/Fundamentação Jurídica (Foco em Família):
        Contextualizar o direito pleiteado (alimentos, divórcio, guarda, etc.).
        Fundamentação Específica (Adaptar conforme 'Tipo de Ação Solicitada'):
        - Alimentos: Art. 1.694 e ss CC; Lei 5.478/68. Necessidade x Possibilidade.
        - Guarda/Convivência: Art. 1.583 e ss CC; Art. 227 CF; ECA (melhor interesse). Modalidade e regime.
        - Divórcio: Art. 1.571 e ss CC; EC 66/2010. Tratar de guarda, convivência, alimentos, partilha.
        - União Estável: Art. 1.723 e ss CC; Lei 9.278/96. Requisitos. Tratar de partilha, alimentos, guarda, convivência.
        - Partilha: Regime. Bens. Proposta divisão. Arts. 1.658 e ss CC, etc.
        - Investigação Paternidade: Art. 1.607 e ss CC; Lei 8.560/92; Súmula 301 STJ.
        Jurisprudência: Priorize TJBA e STJ (Direito de Família). Se não disponível, indique: "[INSERIR JURISPRUDÊNCIA PERTINENTE]". Não invente.

      6. Da Tutela de Urgência: (Incluir SE aplicável - Alimentos Provisórios, Guarda/Convivência Provisória)
        Fundamentar com Art. 300 CPC e Art. 4º Lei 5.478/68. Detalhar fumus boni iuris e periculum in mora com base nos fatos.

      7. Da Gratuidade da Justiça:
        Sempre incluir. Fundamentar Art. 98 e ss CPC; Art. 99, §3º CPC. Reforçar assistência pela DPE/BA.

      8. Dos Pedidos e Requerimentos:
        Formular em tópicos claros (com base no 'Tipo de Ação Solicitada' e 'Relato dos Fatos'). Incluir:
        - Gratuidade da Justiça.
        - Prioridade de tramitação (se aplicável).
        - Tutela de urgência (se aplicável, especificar).
        - Citação do(s) Requerido(s).
        - Intimação do MP (se incapaz).
        - Procedência para [detalhar pedidos: divórcio, alimentos (valor/%), guarda, convivência, partilha, paternidade].
        - Condenação em custas e honorários (FADEP/BA).
        - Protesto por provas (documental, testemunhal, pericial - DNA, estudo psicossocial).
        - **Verificação de Documentos:** Mencionar brevemente que a documentação essencial informada ([${
          caseData.documentos_informados
            ? caseData.documentos_informados.join("; ")
            : "Nenhum"
        }]) já se encontra anexa ou será apresentada.

      9. Do Valor da Causa:
        Atribuir conforme Art. 292 CPC (alimentos=12x; divórcio=bens ou alçada).

      10. Fechamento:
          Termos em que,
          Pede deferimento.

          **Teixeira de Freitas - BA**, [Data Atual].

          [ESPAÇO PARA ASSINATURA DO DEFENSOR PÚBLICO]
          Defensor(a) Público(a) - OAB/BA [Número Pendente]

      --- DADOS DO CASO PARA ANÁLISE (DIREITO DE FAMÍLIA) ---
      Nome Requerente: ${caseData.nome_assistido || "[Nome não informado]"}
      CPF Requerente: ${caseData.cpf_assistido || "[CPF não informado]"}
      Telefone Requerente: ${
        caseData.telefone_assistido || "[Telefone não informado]"
      }
      Endereço Requerente: ${
        caseData.endereco_assistido ||
        "[Endereço Requerente Pendente - Coletar no Formulário]"
      } 
      Email Requerente: ${
        caseData.email_assistido ||
        "[Email Requerente Pendente - Coletar no Formulário]"
      }
      Dados Adicionais Requerente (RG, Nacionalidade, Estado Civil, Profissão, Data de Nascimento): ${
        caseData.dados_adicionais_requerente ||
        "[Pendente - Coletar no Formulário]"
      }

      Nome Requerido: ${
        caseData.nome_requerido ||
        "[Nome Requerido Pendente - Coletar no Formulário]"
      }
      CPF Requerido: ${
        caseData.cpf_requerido ||
        "[CPF Requerido Pendente - Coletar no Formulário]"
      }
      Endereço Requerido: ${
        caseData.endereco_requerido ||
        "[Endereço Requerido Pendente - Coletar no Formulário]"
      }
      Dados Adicionais Requerido (RG, Nacionalidade, Estado Civil, Profissão): ${
        caseData.dados_adicionais_requerido ||
        "[Pendente - Coletar no Formulário]"
      }

      Tipo de Ação Solicitada (Família - Ação Específica): ${
        caseData.tipo_acao || "[Tipo não informado]"
      } 
      Filhos (Nomes e Datas de Nascimento): ${
        caseData.filhos_info ||
        "[Informações dos Filhos Pendentes - Coletar no Formulário]"
      }
      Data Casamento/Início União Estável: ${
        caseData.data_inicio_relacao || "[Pendente - Coletar no Formulário]"
      }
      Data Separação de Fato: ${
        caseData.data_separacao || "[Pendente - Coletar no Formulário]"
      }
      Bens a Partilhar (Descrição): ${
        caseData.bens_partilha ||
        "[Informações de Bens Pendentes - Coletar no Formulário]"
      }
      Relato dos Fatos (Detalhado): ${
        caseData.relato_texto || "[Relato não fornecido]"
      }
      Documentos Informados pelo Assistido: ${
        caseData.documentos_informados
          ? caseData.documentos_informados.join("; ")
          : "[Nenhum documento informado]"
      }
      Resumo Preliminar (Gerado por IA): ${
        caseData.resumo_ia || "[Resumo não disponível]"
      }
      --- FIM DOS DADOS ---

      Agora, redija a petição inicial completa de Direito de Família, seguindo estritamente a estrutura e as instruções, utilizando apenas os dados fornecidos. Gere o texto em formato puro, pronto para copiar.
       `;

    console.log("Enviando prompt detalhado para o Gemini...");
    const result = await model.generateContent(prompt);
    const response = await result.response;
    console.log("Petição gerada pelo Gemini.");
    return response.text();
  } catch (error) {
    console.error(
      "Ocorreu um erro durante a geração da petição com o Gemini:",
      error
    );
    throw new Error("Falha ao gerar o rascunho da petição inicial com a IA.");
  }
};
