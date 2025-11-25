import React, { useState, useRef, useReducer, useEffect } from "react";
import { motion } from "framer-motion";
import {
  User,
  FileText,
  Mic,
  Upload,
  Paperclip,
  X,
  Phone,
  AlertTriangle,
  Play,
  Square,
  Briefcase,
  MapPin,
  Users,
  DollarSign,
  Calendar,
  Scale
} from "lucide-react";
import { documentosPorAcao } from "../../../data/documentos.js";
import { API_BASE } from "../../../utils/apiBase";

// 1. Estado Inicial Consolidado
const initialState = {
  // Controle
  tipoAcao: "familia",
  acaoEspecifica: "",
  
  // Identificação Principal (Autor/Assistido)
  assistidoEhIncapaz: "nao", // 'nao' = Próprio, 'sim' = Representando
  nome: "", // Nome do Autor (seja adulto ou criança)
  cpf: "",
  dataNascimentoAssistido: "",
  assistidoNacionalidade: "",
  assistidoEstadoCivil: "",
  assistidoOcupacao: "",
  enderecoAssistido: "", // Residencial
  emailAssistido: "",
  telefone: "",
  assistido_RG: "",
  enderecoProfissionalAssistido: "",

  // Representante Legal (apenas se assistidoEhIncapaz === 'sim')
  representanteNome: "",
  representanteCpf: "",
  representanteNacionalidade: "",
  representanteEstadoCivil: "",
  representanteOcupacao: "",
  representanteEnderecoResidencial: "",
  representanteEnderecoProfissional: "",
  representanteEmail: "",
  representanteTelefone: "",

  // Parte Contrária (Requerido)
  nomeRequerido: "",
  cpfRequerido: "",
  enderecoRequerido: "",
  requeridoTelefone: "",
  requeridoEmail: "",
  requeridoNacionalidade: "",
  requeridoEstadoCivil: "",
  requeridoOcupacao: "",
  requeridoEnderecoProfissional: "",
  dadosAdicionaisRequerido: "",

  // Dados Específicos (Família/Alimentos)
  filhosInfo: "",
  dataInicioRelacao: "",
  dataSeparacao: "",
  bensPartilha: "",
  descricaoGuarda: "",
  situacaoFinanceiraGenitora: "",
  
  // Dados Financeiros/Alimentos
  percentualSmRequerido: "",
  percentualDespesasExtra: "",
  diaPagamentoRequerido: "",
  dadosBancariosDeposito: "",
  valorProvisorioReferencia: "",
  percentualDefinitivoSalarioMin: "",
  percentualDefinitivoExtras: "",
  
  // Dados de Emprego do Requerido
  requeridoTemEmpregoFormal: "",
  empregadorRequeridoNome: "",
  empregadorRequeridoEndereco: "",
  empregadorEmail: "",

  // Dados de Execução
  numeroProcessoOriginario: "",
  varaOriginaria: "",
  processoTituloNumero: "",
  percentualOuValorFixado: "",
  diaPagamentoFixado: "",
  periodoDebitoExecucao: "",
  valorTotalDebitoExecucao: "",
  valorTotalExtenso: "",
  valorDebitoExtenso: "",

  // Dados de Divórcio
  regimeBens: "",
  retornoNomeSolteira: "",
  alimentosParaExConjuge: "",

  // Processual Geral
  varaCompetente: "",
  cidadeAssinatura: "",
  valorCausa: "",
  valorCausaExtenso: "",

  // Narrativa e Arquivos
  relato: "",
  documentFiles: [],
  documentosMarcados: [],
  audioBlob: null,
};

// 2. Reducer para gerenciar estado
function formReducer(state, action) {
  switch (action.type) {
    case 'UPDATE_FIELD':
      return { ...state, [action.field]: action.value };
    case 'RESET_FORM':
      return { ...initialState, documentFiles: [], documentosMarcados: [] };
    case 'SET_ACAO':
       // Limpa campos específicos ao trocar a ação para evitar confusão
       return { 
         ...state, 
         tipoAcao: action.tipoAcao, 
         acaoEspecifica: "", 
         documentosMarcados: [] 
       };
    default:
      return state;
  }
}

const nacionalidadeOptions = [
  { value: "", label: "Selecione..." },
  { value: "brasileira", label: "Brasileiro(a)" },
  { value: "estrangeira", label: "Estrangeiro(a)" },
];

const estadoCivilOptions = [
  { value: "", label: "Selecione..." },
  { value: "solteiro", label: "Solteiro(a)" },
  { value: "casado", label: "Casado(a)" },
  { value: "divorciado", label: "Divorciado(a)" },
  { value: "viuvo", label: "Viúvo(a)" },
  { value: "uniao_estavel", label: "União Estável" },
];

export const FormularioSubmissao = () => {
  const [formState, dispatch] = useReducer(formReducer, initialState);
  const [statusMessage, setStatusMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const documentInputRef = useRef(null);

  // Handler genérico
  const handleFieldChange = (e) => {
    dispatch({ type: 'UPDATE_FIELD', field: e.target.name, value: e.target.value });
  };

  const handleNumericInput = (e) => {
    const value = e.target.value;
    if (/^[0-9]*$/.test(value)) {
      handleFieldChange(e);
    }
  };

  // --- LÓGICA DE GRAVAÇÃO ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = (event) => audioChunksRef.current.push(event.data);
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        dispatch({ type: 'UPDATE_FIELD', field: 'audioBlob', value: audioBlob });
        audioChunksRef.current = [];
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Erro microfone:", err);
      alert("Não foi possível acessar o microfone.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  const removeAudioRecording = () => {
    dispatch({ type: 'UPDATE_FIELD', field: 'audioBlob', value: null });
  };

  // --- LÓGICA DE ARQUIVOS ---
  const handleDocumentChange = (e) => {
    const novosArquivos = Array.from(e.target.files);
    dispatch({ type: 'UPDATE_FIELD', field: 'documentFiles', value: [...formState.documentFiles, ...novosArquivos] });
  };

  const removeDocument = (fileName) => {
    const updatedFiles = formState.documentFiles.filter((file) => file.name !== fileName);
    dispatch({ type: 'UPDATE_FIELD', field: 'documentFiles', value: updatedFiles });
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    if (checked) {
      dispatch({ type: 'UPDATE_FIELD', field: 'documentosMarcados', value: [...formState.documentosMarcados, name] });
    } else {
      dispatch({ type: 'UPDATE_FIELD', field: 'documentosMarcados', value: formState.documentosMarcados.filter((doc) => doc !== name) });
    }
  };

  // --- LÓGICA DE SUBMISSÃO ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setGeneratedCredentials(null);
    
    // Simulando etapas visuais
    const timers = [
      setTimeout(() => setStatusMessage("Validando dados..."), 1000),
      setTimeout(() => setStatusMessage("Processando áudio e documentos..."), 3000),
      setTimeout(() => setStatusMessage("Gerando minuta com Inteligência Artificial..."), 6000),
      setTimeout(() => setStatusMessage("Gerando protocolo..."), 9000),
    ];

    const formData = new FormData();

    // 1. Mapeamento de campos do Estado (camelCase) para o Backend (snake_case)
    // Isso garante que o Controller do Node.js receba os dados como espera
    const fieldMapping = {
      // Identificação Assistido
      nome: "nome",
      cpf: "cpf",
      telefone: "telefone",
      enderecoAssistido: "endereco_assistido",
      emailAssistido: "email_assistido",
      assistido_RG: "dados_adicionais_requerente", // Fallback parcial
      assistidoEhIncapaz: "assistido_eh_incapaz",
      assistidoNacionalidade: "assistido_nacionalidade",
      assistidoEstadoCivil: "assistido_estado_civil",
      assistidoOcupacao: "assistido_ocupacao",
      dataNascimentoAssistido: "assistido_data_nascimento",
      enderecoProfissionalAssistido: "assistido_endereco_profissional",

      // Representante
      representanteNome: "representante_nome",
      representanteCpf: "representante_cpf",
      representanteNacionalidade: "representante_nacionalidade",
      representanteEstadoCivil: "representante_estado_civil",
      representanteOcupacao: "representante_ocupacao",
      representanteEnderecoResidencial: "representante_endereco_residencial",
      representanteEnderecoProfissional: "representante_endereco_profissional",
      representanteEmail: "representante_email",
      representanteTelefone: "representante_telefone",

      // Requerido
      nomeRequerido: "nome_requerido",
      cpfRequerido: "cpf_requerido",
      enderecoRequerido: "endereco_requerido",
      requeridoTelefone: "requerido_telefone",
      requeridoEmail: "requerido_email",
      requeridoNacionalidade: "requerido_nacionalidade",
      requeridoEstadoCivil: "requerido_estado_civil",
      requeridoOcupacao: "requerido_ocupacao",
      requeridoEnderecoProfissional: "requerido_endereco_profissional",
      dadosAdicionaisRequerido: "dados_adicionais_requerido",

      // Família Geral
      filhosInfo: "filhos_info",
      dataInicioRelacao: "data_inicio_relacao",
      dataSeparacao: "data_separacao",
      bensPartilha: "bens_partilha",
      descricaoGuarda: "descricao_guarda",
      situacaoFinanceiraGenitora: "situacao_financeira_genitora",

      // Alimentos / Fixação
      percentualSmRequerido: "percentual_sm_requerido",
      percentualDespesasExtra: "percentual_despesas_extra",
      diaPagamentoRequerido: "dia_pagamento_requerido",
      dadosBancariosDeposito: "dados_bancarios_deposito",
      valorProvisorioReferencia: "valor_provisorio_referencia",
      percentualDefinitivoSalarioMin: "percentual_definitivo_salario_min",
      percentualDefinitivoExtras: "percentual_definitivo_extras",
      
      // Emprego Requerido
      requeridoTemEmpregoFormal: "requerido_tem_emprego_formal",
      empregadorRequeridoNome: "empregador_requerido_nome",
      empregadorRequeridoEndereco: "empregador_requerido_endereco",
      empregadorEmail: "empregador_email",

      // Execução
      numeroProcessoOriginario: "numero_processo_originario",
      varaOriginaria: "vara_originaria",
      processoTituloNumero: "processo_titulo_numero",
      percentualOuValorFixado: "percentual_ou_valor_fixado",
      diaPagamentoFixado: "dia_pagamento_fixado",
      periodoDebitoExecucao: "periodo_debito_execucao",
      valorTotalDebitoExecucao: "valor_total_debito_execucao",
      valorTotalExtenso: "valor_total_extenso",
      valorDebitoExtenso: "valor_debito_extenso",

      // Divórcio
      regimeBens: "regime_bens",
      retornoNomeSolteira: "retorno_nome_solteira",
      alimentosParaExConjuge: "alimentos_para_ex_conjuge",

      // Geral Doc
      varaCompetente: "vara_competente",
      cidadeAssinatura: "cidade_assinatura",
      valorCausa: "valor_causa",
      valorCausaExtenso: "valor_causa_extenso",
      relato: "relato"
    };

    // Preenche o FormData usando o mapeamento
    Object.keys(fieldMapping).forEach(key => {
      if (formState[key]) {
        formData.append(fieldMapping[key], formState[key]);
      }
    });

    // 2. Correção Crítica: Formatar Tipo de Ação para o Backend
    // O backend espera "Area - Ação" para saber qual template DOCX usar
    const tipoAcaoFormatado = `${formState.tipoAcao} - ${formState.acaoEspecifica}`;
    formData.append("tipoAcao", tipoAcaoFormatado);

    // 3. Construção de Campos Compostos para a IA (Gemini)
    // A IA usa 'dados_adicionais_requerente' para criar o resumo, então montamos uma string rica
    const dadosAdicionaisRequerenteString = `
      RG: ${formState.assistido_RG || 'Não inf.'}, 
      Nacionalidade: ${formState.assistidoNacionalidade || 'Não inf.'}, 
      Estado Civil: ${formState.assistidoEstadoCivil || 'Não inf.'}, 
      Profissão: ${formState.assistidoOcupacao || 'Não inf.'},
      Data Nascimento: ${formState.dataNascimentoAssistido || 'Não inf.'}
    `;
    formData.append("dados_adicionais_requerente", dadosAdicionaisRequerenteString);

    // Arquivos e Arrays
    formData.append("documentos_informados", JSON.stringify(formState.documentosMarcados));
    if (formState.audioBlob) formData.append("audio", formState.audioBlob, "gravacao.webm");
    formState.documentFiles.forEach((file) => formData.append("documentos", file));

    try {
      const response = await fetch(`${API_BASE}/casos/novo`, { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha no servidor");
      setGeneratedCredentials({ chaveAcesso: data.chaveAcesso, protocolo: data.protocolo });
    } catch (error) {
      console.error("Erro:", error);
      alert(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
      timers.forEach(clearTimeout);
      setStatusMessage("");
    }
  };

  // --- LISTAS E CONDICIONAIS ---
  const acoesFallbackFamilia = [
    "Fixação de Pensão Alimentícia",
    "Divórcio",
    "Reconhecimento e Dissolução de União Estável",
    "Guarda de Filhos",
    "Alvará",
    "Execução de Alimentos Rito Penhora/Prisão",
    "Revisão de Alimentos",
  ];

  const acoesDisponiveis = formState.tipoAcao && documentosPorAcao[formState.tipoAcao] 
    ? Object.keys(documentosPorAcao[formState.tipoAcao]) 
    : acoesFallbackFamilia;

  const listaDeDocumentos = formState.tipoAcao && formState.acaoEspecifica && documentosPorAcao[formState.tipoAcao]?.[formState.acaoEspecifica]
      ? documentosPorAcao[formState.tipoAcao][formState.acaoEspecifica]
      : [];

  const acaoNorm = (formState.acaoEspecifica || "").toLowerCase();
  const isFixacaoOuOferta = acaoNorm.includes("fixa") || acaoNorm.includes("oferta");
  const isExecucao = acaoNorm.includes("execu");
  const isDivorcio = acaoNorm.includes("divór") || acaoNorm.includes("divor");
  const showFixacaoBaseFields = isFixacaoOuOferta || isExecucao;
  
  // Lógica de Representação (CRUCIAL para organização)
  const isRepresentacao = formState.assistidoEhIncapaz === "sim";
  const labelAutor = isRepresentacao ? "Dados da Criança/Adolescente (Beneficiário)" : "Seus Dados (Você é o autor da ação)";
  const mostrarEmpregador = formState.requeridoTemEmpregoFormal === "sim";

  if (generatedCredentials) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card text-center p-8">
        <h3 className="text-2xl font-bold text-green-400 mb-4">Cadastro Realizado!</h3>
        <div className="bg-surface border border-soft p-4 rounded-xl mb-4 text-left space-y-3">
          <div>
            <p className="text-xs text-muted uppercase font-bold">Protocolo</p>
            <p className="text-xl font-mono text-amber-400">{generatedCredentials.protocolo}</p>
          </div>
          <div>
            <p className="text-xs text-muted uppercase font-bold">Chave de Acesso</p>
            <p className="text-xl font-mono text-amber-400">{generatedCredentials.chaveAcesso}</p>
          </div>
        </div>
        <div className="bg-amber-500/10 p-3 rounded border border-amber-500/30 text-amber-200 text-sm text-left flex gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p>Guarde esses dados! Você precisará deles para consultar o andamento do seu caso.</p>
        </div>
        <button 
          onClick={() => { 
            dispatch({ type: 'RESET_FORM' });
            setGeneratedCredentials(null);
          }} 
          className="mt-6 btn btn-primary w-full"
        >
          Novo Atendimento
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* --- ETAPA 1: DEFINIÇÃO DA AÇÃO --- */}
        <section className="card space-y-4 border-l-4 border-l-blue-500">
          <div className="flex items-center gap-2 mb-2">
            <Scale className="text-blue-400" />
            <h2 className="heading-2">1. O que você precisa?</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Área do Direito</label>
              <select
                value={formState.tipoAcao}
                onChange={(e) => dispatch({ type: 'SET_ACAO', tipoAcao: e.target.value })}
                className="input"
              >
                <option value="familia">Direito de Família</option>
                {/* Futuro: Outras áreas */}
              </select>
            </div>

            <div>
              <label className="label">Tipo de Ação (Selecione o mais próximo)</label>
              <select
                value={formState.acaoEspecifica}
                onChange={handleFieldChange}
                name="acaoEspecifica"
                required
                className="input font-medium text-text"
              >
                <option value="" disabled>Selecione...</option>
                {acoesDisponiveis.map((acao) => (
                  <option key={acao} value={acao}>{acao}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* --- ETAPA 2: IDENTIFICAÇÃO DO AUTOR (ASSISTIDO) --- */}
        <section className="card space-y-6 border-l-4 border-l-green-500">
          <div className="flex items-center gap-2 border-b border-soft pb-2">
            <User className="text-green-400" />
            <h2 className="heading-2">2. Quem está pedindo a ação?</h2>
          </div>

          {/* Pergunta Chave de Representação */}
          <div className="bg-app p-4 rounded-lg border border-soft">
            <label className="block text-sm font-semibold mb-2">Para quem é este processo?</label>
            <div className="flex flex-col sm:flex-row gap-4">
              <label className="flex items-center gap-2 cursor-pointer bg-surface p-3 rounded border border-soft hover:border-primary transition">
                <input 
                  type="radio" 
                  name="assistidoEhIncapaz" 
                  value="nao" 
                  checked={formState.assistidoEhIncapaz === "nao"} 
                  onChange={handleFieldChange}
                  className="w-4 h-4 text-primary"
                />
                <span>Para mim mesmo(a)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer bg-surface p-3 rounded border border-soft hover:border-primary transition">
                <input 
                  type="radio" 
                  name="assistidoEhIncapaz" 
                  value="sim" 
                  checked={formState.assistidoEhIncapaz === "sim"} 
                  onChange={handleFieldChange}
                  className="w-4 h-4 text-primary"
                />
                <span>Para meu filho(a) ou tutelado (Representação)</span>
              </label>
            </div>
          </div>

          {/* Dados do Autor/Beneficiário */}
          <div className="space-y-4">
            <h3 className="heading-3 text-primary">{labelAutor}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" placeholder="Nome Completo" name="nome" value={formState.nome} onChange={handleFieldChange} required className="input" />
              <input type="text" placeholder="CPF (apenas números)" name="cpf" value={formState.cpf} onChange={handleNumericInput} required className="input" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input type="date" placeholder="Data de Nascimento" name="dataNascimentoAssistido" value={formState.dataNascimentoAssistido} onChange={handleFieldChange} className="input" />
              <select name="assistidoNacionalidade" value={formState.assistidoNacionalidade} onChange={handleFieldChange} className="input">
                 {nacionalidadeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select name="assistidoEstadoCivil" value={formState.assistidoEstadoCivil} onChange={handleFieldChange} className="input">
                 {estadoCivilOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <input type="text" placeholder="Profissão" name="assistidoOcupacao" value={formState.assistidoOcupacao} onChange={handleFieldChange} className="input" />
               <input type="text" placeholder="RG (Ex: 00.000.000-00 SSP/BA)" name="assistido_RG" value={formState.assistido_RG} onChange={handleFieldChange} className="input" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <input type="text" placeholder="Endereço Residencial Completo" name="enderecoAssistido" value={formState.enderecoAssistido} onChange={handleFieldChange} required className="input" />
               <input type="email" placeholder="Email (opcional)" name="emailAssistido" value={formState.emailAssistido} onChange={handleFieldChange} className="input" />
            </div>
             {/* Contato é sempre importante */}
             <div className="grid grid-cols-1">
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                  <input type="tel" placeholder="Telefone/WhatsApp para contato" name="telefone" value={formState.telefone} onChange={handleNumericInput} required className="input pl-10" />
                </div>
            </div>
          </div>

          {/* Dados do Representante (Condicional) */}
          {isRepresentacao && (
            <div className="bg-surface-alt p-4 rounded-lg border-l-4 border-amber-500 space-y-4 mt-4 bg-amber-500/5">
              <h3 className="heading-3 text-amber-600">Dados do Representante Legal (Você)</h3>
              <p className="text-sm text-muted mb-2">Preencha com seus dados (mãe, pai, tutor) que está agindo em nome da criança acima.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" placeholder="Seu Nome Completo" name="representanteNome" value={formState.representanteNome} onChange={handleFieldChange} className="input" />
                <input type="text" placeholder="Seu CPF" name="representanteCpf" value={formState.representanteCpf} onChange={handleNumericInput} className="input" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <select name="representanteNacionalidade" value={formState.representanteNacionalidade} onChange={handleFieldChange} className="input">
                   {nacionalidadeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                 </select>
                 <select name="representanteEstadoCivil" value={formState.representanteEstadoCivil} onChange={handleFieldChange} className="input">
                   {estadoCivilOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                 </select>
                 <input type="text" placeholder="Sua Profissão" name="representanteOcupacao" value={formState.representanteOcupacao} onChange={handleFieldChange} className="input" />
              </div>

              <div className="grid grid-cols-1 gap-4">
                 <input type="text" placeholder="Seu Endereço Residencial" name="representanteEnderecoResidencial" value={formState.representanteEnderecoResidencial} onChange={handleFieldChange} className="input" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <input type="email" placeholder="Seu Email" name="representanteEmail" value={formState.representanteEmail} onChange={handleFieldChange} className="input" />
                 <input type="tel" placeholder="Seu Telefone" name="representanteTelefone" value={formState.representanteTelefone} onChange={handleNumericInput} className="input" />
              </div>
            </div>
          )}
        </section>

        {/* --- ETAPA 3: DADOS DA OUTRA PARTE (REQUERIDO) --- */}
        <section className="card space-y-4 border-l-4 border-l-red-500">
          <div className="flex items-center gap-2 border-b border-soft pb-2">
            <Users className="text-red-400" />
            <h2 className="heading-2">3. Contra quem é a ação? (Requerido)</h2>
          </div>
          <p className="text-sm text-muted">Preencha com o máximo de informações que você souber.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="Nome Completo da outra parte" name="nomeRequerido" value={formState.nomeRequerido} onChange={handleFieldChange} className="input" />
            <input type="text" placeholder="CPF (se souber)" name="cpfRequerido" value={formState.cpfRequerido} onChange={handleNumericInput} className="input" />
          </div>
          
          <input type="text" placeholder="Endereço Residencial (se souber)" name="enderecoRequerido" value={formState.enderecoRequerido} onChange={handleFieldChange} className="input" />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input type="tel" placeholder="Telefone (se souber)" name="requeridoTelefone" value={formState.requeridoTelefone} onChange={handleNumericInput} className="input" />
              <input type="text" placeholder="Profissão (se souber)" name="requeridoOcupacao" value={formState.requeridoOcupacao} onChange={handleFieldChange} className="input" />
              <input type="text" placeholder="Endereço de Trabalho (se souber)" name="requeridoEnderecoProfissional" value={formState.requeridoEnderecoProfissional} onChange={handleFieldChange} className="input" />
          </div>
          
          <div>
             <label className="label">Outros dados (RG, Nacionalidade, Estado Civil, etc - Se souber)</label>
             <textarea name="dadosAdicionaisRequerido" value={formState.dadosAdicionaisRequerido} onChange={handleFieldChange} rows="2" className="input"></textarea>
          </div>
        </section>

        {/* --- ETAPA 4: DETALHES ESPECÍFICOS (CONDICIONAL) --- */}
        {formState.acaoEspecifica && (
          <section className="card space-y-6 border-l-4 border-l-amber-500">
            <div className="flex items-center gap-2 border-b border-soft pb-2">
              <Briefcase className="text-amber-400" />
              <h2 className="heading-2">4. Detalhes do Caso</h2>
            </div>

            {/* CAMPOS DE FIXAÇÃO DE ALIMENTOS / OFERTA */}
            {showFixacaoBaseFields && (
              <div className="space-y-4">
                <h4 className="font-semibold text-primary">Valores e Pagamento</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Quanto você quer/pode pagar? (R$ ou %)</label>
                      <input type="text" name="percentualSmRequerido" value={formState.percentualSmRequerido} onChange={handleFieldChange} placeholder="Ex: 30% do salário mínimo ou R$ 400,00" className="input" />
                    </div>
                    <div>
                      <label className="label">Data de pagamento desejada</label>
                      <input type="text" name="diaPagamentoRequerido" value={formState.diaPagamentoRequerido} onChange={handleFieldChange} placeholder="Ex: Todo dia 10" className="input" />
                    </div>
                </div>
                
                <div>
                   <label className="label">Dados Bancários para depósito (Banco, Agência, Conta, PIX)</label>
                   <textarea name="dadosBancariosDeposito" value={formState.dadosBancariosDeposito} onChange={handleFieldChange} rows="2" className="input" placeholder="Ex: Banco do Brasil, Ag 0000, Cc 00000-0, PIX: cpf..."></textarea>
                </div>

                <h4 className="font-semibold text-primary mt-4">Sobre o Emprego da Outra Parte</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">A outra parte tem carteira assinada?</label>
                    <select name="requeridoTemEmpregoFormal" value={formState.requeridoTemEmpregoFormal} onChange={handleFieldChange} className="input">
                      <option value="">Selecione...</option>
                      <option value="sim">Sim</option>
                      <option value="nao">Não</option>
                      <option value="nao_sei">Não sei</option>
                    </select>
                  </div>
                  {mostrarEmpregador && (
                    <>
                      <input type="text" placeholder="Nome da Empresa" name="empregadorRequeridoNome" value={formState.empregadorRequeridoNome} onChange={handleFieldChange} className="input" />
                      <input type="text" placeholder="Endereço da Empresa" name="empregadorRequeridoEndereco" value={formState.empregadorRequeridoEndereco} onChange={handleFieldChange} className="input md:col-span-2" />
                    </>
                  )}
                </div>
              </div>
            )}

            {/* CAMPOS DE EXECUÇÃO */}
            {isExecucao && (
               <div className="space-y-4">
                 <h4 className="font-semibold text-primary">Dados do Processo Anterior</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="Número do Processo Originário" name="numeroProcessoOriginario" value={formState.numeroProcessoOriginario} onChange={handleFieldChange} className="input" />
                    <input type="text" placeholder="Vara onde tramitou" name="varaOriginaria" value={formState.varaOriginaria} onChange={handleFieldChange} className="input" />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input type="text" placeholder="Período da Dívida (Meses)" name="periodoDebitoExecucao" value={formState.periodoDebitoExecucao} onChange={handleFieldChange} className="input" />
                    <input type="text" placeholder="Valor Total da Dívida (R$)" name="valorTotalDebitoExecucao" value={formState.valorTotalDebitoExecucao} onChange={handleFieldChange} className="input" />
                 </div>
               </div>
            )}

            {/* CAMPOS GERAIS DE FAMÍLIA (Filhos, Bens, Datas) */}
            <div className="space-y-4 pt-4 border-t border-soft">
              <h4 className="font-semibold text-primary">Vínculos e Bens</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                   <label className="label">Data Início da Relação</label>
                   <input type="date" name="dataInicioRelacao" value={formState.dataInicioRelacao} onChange={handleFieldChange} className="input" />
                 </div>
                 <div>
                   <label className="label">Data da Separação (se houver)</label>
                   <input type="date" name="dataSeparacao" value={formState.dataSeparacao} onChange={handleFieldChange} className="input" />
                 </div>
              </div>
              
              <div>
                <label className="label">Filhos (Nome e Data de Nascimento)</label>
                <textarea name="filhosInfo" value={formState.filhosInfo} onChange={handleFieldChange} rows="2" placeholder="Ex: João (10/05/2015); Maria (20/01/2018)" className="input"></textarea>
              </div>
              
              <div>
                <label className="label">Bens a Partilhar (Carros, Casas, Móveis)</label>
                <textarea name="bensPartilha" value={formState.bensPartilha} onChange={handleFieldChange} rows="2" placeholder="Descreva os bens se houver partilha" className="input"></textarea>
              </div>
            </div>
          </section>
        )}

        {/* --- ETAPA 5: RELATO E DOCUMENTOS --- */}
        <section className="card space-y-6 border-l-4 border-l-indigo-500">
          <div className="flex items-center gap-2 border-b border-soft pb-2">
            <FileText className="text-indigo-400" />
            <h2 className="heading-2">5. Conte sua História e Anexe Provas</h2>
          </div>

          <div>
            <label className="label font-bold">Relato dos Fatos (O que aconteceu?)</label>
            <textarea
              placeholder="Conte detalhadamente o que aconteceu, por que você precisa da justiça, como está a situação atual..."
              value={formState.relato}
              onChange={handleFieldChange}
              name="relato"
              rows="6"
              className="input w-full"
            ></textarea>
          </div>

          {/* Gravação de Áudio */}
          <div className="bg-surface p-4 rounded-lg border border-dashed border-soft flex flex-col items-center justify-center gap-3">
              <p className="text-sm text-muted">Prefere falar? Grave um áudio contando sua história.</p>
              {!isRecording && !formState.audioBlob && (
                <button type="button" onClick={startRecording} className="btn btn-secondary rounded-full px-6">
                  <Mic size={20} /> Iniciar Gravação
                </button>
              )}
              {isRecording && (
                <button type="button" onClick={stopRecording} className="btn btn-error animate-pulse rounded-full px-6 text-red-600 bg-red-100 border-red-200">
                  <Square size={20} /> Parar Gravação
                </button>
              )}
              {formState.audioBlob && (
                <div className="flex items-center gap-4 w-full max-w-md bg-slate-100 dark:bg-slate-700 p-2 rounded-full">
                  <audio src={URL.createObjectURL(formState.audioBlob)} controls className="w-full h-8" />
                  <button type="button" onClick={removeAudioRecording} className="text-red-500 p-1 hover:bg-red-100 rounded-full">
                    <X size={18} />
                  </button>
                </div>
              )}
          </div>

          {/* Checklist e Upload */}
          {listaDeDocumentos.length > 0 && (
            <div className="bg-surface p-4 rounded-lg border border-soft">
              <h3 className="heading-3 mb-3">Checklist de Documentos Necessários</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                {listaDeDocumentos.map((doc) => (
                  <label key={doc} className="flex items-start gap-2 p-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer text-sm">
                    <input type="checkbox" name={doc} onChange={handleCheckboxChange} className="mt-1 w-4 h-4 accent-primary" />
                    <span className="text-muted">{doc}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="bg-surface p-4 rounded-lg border border-dashed border-soft">
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" ref={documentInputRef} onChange={handleDocumentChange} className="hidden" multiple />
              <button type="button" onClick={() => documentInputRef.current.click()} className="btn btn-ghost w-full border border-soft border-dashed h-24 flex flex-col gap-2 text-muted hover:text-primary hover:border-primary">
                <Paperclip size={24} className="mx-auto" /> 
                <span>Clique para anexar fotos ou PDFs dos documentos</span>
              </button>
              
              {formState.documentFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {formState.documentFiles.map((file, idx) => (
                    <div key={`${file.name}-${idx}`} className="flex items-center justify-between bg-slate-100 dark:bg-slate-700 p-2 rounded text-sm">
                      <span className="truncate max-w-xs">{file.name}</span>
                      <button type="button" onClick={() => removeDocument(file.name)} className="text-red-500 hover:text-red-700">
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
          </div>
        </section>

        {/* --- BOTÃO FINAL --- */}
        <div className="pt-6">
          <button type="submit" disabled={loading} className="btn btn-primary w-full py-4 text-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
            {loading ? (
              <span className="flex items-center gap-2">Processando...</span>
            ) : (
              <>
                <Upload size={20} /> Enviar Caso para a Defensoria
              </>
            )}
          </button>
          {loading && (
            <p className="text-center text-sm text-muted mt-2 animate-pulse">{statusMessage}</p>
          )}
        </div>

      </form>
    </motion.div>
  );
};