import React, { useState, useRef, useReducer } from "react";
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
} from "lucide-react";
import { documentosPorAcao } from "../../../data/documentos.js";
import { API_BASE } from "../../../utils/apiBase";

// 1. Definir o estado inicial em um único objeto
const initialState = {
  nome: "",
  cpf: "",
  telefone: "",
  tipoAcao: "familia",
  relato: "",
  documentFiles: [],
  acaoEspecifica: "",
  documentosMarcados: [],
  enderecoAssistido: "",
  emailAssistido: "",
  assistido_RG: "",
  varaCompetente: "",
  assistidoEhIncapaz: "nao",
  assistidoNacionalidade: "",
  assistidoEstadoCivil: "",
  assistidoOcupacao: "",
  dataNascimentoAssistido: "",
  enderecoProfissionalAssistido: "",
  representanteNome: "",
  representanteNacionalidade: "",
  representanteEstadoCivil: "",
  representanteOcupacao: "",
  representanteCpf: "",
  representanteEnderecoResidencial: "",
  representanteEnderecoProfissional: "",
  representanteEmail: "",
  representanteTelefone: "",
  nomeRequerido: "",
  cpfRequerido: "",
  enderecoRequerido: "",
  dadosAdicionaisRequerido: "",
  requeridoNacionalidade: "",
  requeridoEstadoCivil: "",
  requeridoOcupacao: "",
  requeridoEnderecoProfissional: "",
  requeridoEmail: "",
  requeridoTelefone: "",
  filhosInfo: "",
  dataInicioRelacao: "",
  dataSeparacao: "",
  bensPartilha: "",
  descricaoGuarda: "",
  situacaoFinanceiraGenitora: "",
  percentualSmRequerido: "",
  percentualDespesasExtra: "",
  diaPagamentoRequerido: "",
  dadosBancariosDeposito: "",
  valorProvisorioReferencia: "",
  percentualDefinitivoSalarioMin: "",
  percentualDefinitivoExtras: "",
  requeridoTemEmpregoFormal: "",
  empregadorRequeridoNome: "",
  empregadorRequeridoEndereco: "",
  empregadorEmail: "",
  numeroProcessoOriginario: "",
  varaOriginaria: "",
  processoTituloNumero: "",
  percentualOuValorFixado: "",
  diaPagamentoFixado: "",
  periodoDebitoExecucao: "",
  valorTotalDebitoExecucao: "",
  valorTotalExtenso: "",
  valorDebitoExtenso: "",
  regimeBens: "",
  retornoNomeSolteira: "",
  alimentosParaExConjuge: "",
  valorCausa: "",
  valorCausaExtenso: "",
  cidadeAssinatura: "",
  audioBlob: null,
};

// 2. Criar a função reducer para gerenciar as atualizações de estado
function formReducer(state, action) {
  switch (action.type) {
    case 'UPDATE_FIELD':
      return { ...state, [action.field]: action.value };
    case 'RESET_FORM':
      return { ...initialState, documentFiles: [], documentosMarcados: [] }; // Mantém alguns estados de controle se necessário
    default:
      throw new Error(`Ação desconhecida: ${action.type}`);
  }
}

const nacionalidadeOptions = [
  { value: "", label: "Nacionalidade" },
  { value: "brasileira", label: "Brasileiro(a)" },
  { value: "estrangeira", label: "Estrangeiro(a)" },
];

const estadoCivilOptions = [
  { value: "", label: "Estado Civil" },
  { value: "solteiro", label: "Solteiro(a)" },
  { value: "casado", label: "Casado(a)" },
  { value: "divorciado", label: "Divorciado(a)" },
  { value: "viuvo", label: "Viúvo(a)" },
  { value: "uniao_estavel", label: "União Estável" },
];

export const FormularioSubmissao = () => {
  // 3. Usar o hook useReducer em vez de múltiplos useState
  const [formState, dispatch] = useReducer(formReducer, initialState);

  // Estados de controle da UI permanecem separados
  const [statusMessage, setStatusMessage] = useState("");

  // --- ESTADOS DA GRAVAÃ‡ÃƒO DE ÃUDIO ---
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // --- ESTADOS DE CONTROLE ---
  const [loading, setLoading] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState(null);
  const documentInputRef = useRef(null);

  // 4. Criar um handler genérico para atualizar os campos
  const handleFieldChange = (e) => {
    dispatch({ type: 'UPDATE_FIELD', field: e.target.name, value: e.target.value });
  };

  const { tipoAcao, acaoEspecifica } = formState;
  const acoesDisponiveis =
    tipoAcao && documentosPorAcao[tipoAcao]
      ? Object.keys(documentosPorAcao[tipoAcao])
      : [];

  const listaDeDocumentos =
    tipoAcao && acaoEspecifica && documentosPorAcao[tipoAcao]?.[acaoEspecifica]
      ? documentosPorAcao[tipoAcao][acaoEspecifica]
      : [];

  // Fallback temporÃ¡rio: garantir opÃ§Ãµes visÃ­veis para FamÃ­lia
  const acoesFallbackFamilia = [
    "Fixação de Pensão Alimentí­cia",
    "Divórcio",
    "Reconhecimento e Dissolussão de União Estável",
    "Guarda de Filhos",
    "Alvará",
    "Execução de Alimentos Rito Penhora/Prisão",
    "Revisão de Alimentos",
  ];

  const acoesParaMostrar =
    tipoAcao === "familia" &&
    (!acoesDisponiveis || acoesDisponiveis.length === 0)
      ? acoesFallbackFamilia
      : acoesDisponiveis;

  // Mostrar dados do Requerido apenas quando a aÃ§Ã£o exigir
  const shouldShowRequerido = !formState.acaoEspecifica
    ? true
    : !formState.acaoEspecifica.toLowerCase().includes("alvar");

  // --- HELPERS DE CONDIÇÃO POR AÇÃO ESPECÍFICA ---
  const acaoNorm = (formState.acaoEspecifica || "").toLowerCase();
  const isFixacaoOuOferta = acaoNorm.includes("fixa") || acaoNorm.includes("oferta");
  const isExecucao = acaoNorm.includes("execu");
  const isDivorcio = acaoNorm.includes("divór") || acaoNorm.includes("divor");
  const showFixacaoBaseFields = isFixacaoOuOferta || isExecucao;
  const mostrarRepresentante = formState.assistidoEhIncapaz === "sim";
  const mostrarEmpregador = formState.requeridoTemEmpregoFormal === "sim";

  // --- LÃ“GICA DE VALIDAÃ‡ÃƒO DE INPUT ---
  const handleNumericInput = (e) => {
    const value = e.target.value;
    // Permite apenas números e um campo vazio
    if (/^[0-9]*$/.test(value)) {
      handleFieldChange(e);
    }
  };

  // --- LÃ“GICA DE GRAVAÃ‡ÃƒO DE ÃUDIO ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        dispatch({ type: 'UPDATE_FIELD', field: 'audioBlob', value: audioBlob });
        audioChunksRef.current = [];
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Erro ao acessar o microfone:", err);
      alert(
        "Não foi possí­vel acessar o microfone. Verifique as permissões do navegador."
      );
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  const removeAudioRecording = () => {
    dispatch({ type: 'UPDATE_FIELD', field: 'audioBlob', value: null });
  };

  // --- LÃ“GICA DE UPLOAD DE ARQUIVOS ---
  const handleDocumentChange = (e) => {
    const novosArquivos = Array.from(e.target.files);
    dispatch({ type: 'UPDATE_FIELD', field: 'documentFiles', value: [...formState.documentFiles, ...novosArquivos] });
  };

  const removeDocument = (fileName) => {
    const updatedFiles = formState.documentFiles.filter((file) => file.name !== fileName);
    dispatch({ type: 'UPDATE_FIELD', field: 'documentFiles', value: updatedFiles });
  };

  // --- LÃ“GICA DE GERAÃ‡ÃƒO DE CREDENCIAIS ---
  const generateCredentials = (casoTipo) => {
    // GeraÃ§Ã£o da Chave de Acesso: DPB-00000-0XXXXX
    const randomPart1 = Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, "0");
    const randomPart2 = Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, "0");
    const chaveAcesso = `DPB-${randomPart1}-0${randomPart2}`;

    // GeraÃ§Ã£o do Protocolo
    const now = new Date();
    const ano = now.getFullYear();
    const mes = (now.getMonth() + 1).toString().padStart(2, "0");
    const dia = now.getDate().toString().padStart(2, "0");

    const idCasoMap = {
      familia: "0",
      consumidor: "1",
      saude: "2",
      criminal: "3",
      outro: "4",
    };
    const idCaso = idCasoMap[casoTipo];

    const numeroUnico = Date.now().toString().slice(-6); // Pega os Ãºltimos 6 dÃ­gitos do timestamp
    const protocolo = `${ano}${mes}${dia}${idCaso}${numeroUnico}`;

    return { chaveAcesso, protocolo };
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    if (checked) {
      const newDocs = [...formState.documentosMarcados, name];
      dispatch({ type: 'UPDATE_FIELD', field: 'documentosMarcados', value: newDocs });
    } else {
      const newDocs = formState.documentosMarcados.filter((doc) => doc !== name);
      dispatch({ type: 'UPDATE_FIELD', field: 'documentosMarcados', value: newDocs });
    }
  };

  // --- LÃ“GICA DE SUBMISSÃƒO ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setGeneratedCredentials(null);
    const timers = [
      setTimeout(() => setStatusMessage("Analisando documentos..."), 1000),
      setTimeout(
        () =>
          setStatusMessage("Transcrevendo Áudio (esta etapa pode demorar)..."),
        3000
      ),
      setTimeout(
        () =>
          setStatusMessage("Gerando resumo com a Inteligência Artificial..."),
        8000
      ),
      setTimeout(
        () => setStatusMessage("Finalizando e criando seu protocolo..."),
        12000
      ),
    ];
    const formData = new FormData();

    // Adiciona todos os campos do estado ao formData
    for (const key in formState) {
      if (key !== 'documentFiles' && key !== 'documentosMarcados' && key !== 'audioBlob') {
        formData.append(key, formState[key]);
      }
    }
    formData.append("documentos_informados", JSON.stringify(formState.documentosMarcados));

    // Anexa o Ã¡udio gravado, se existir
    if (formState.audioBlob) {
      formData.append("audio", formState.audioBlob, "gravacao.webm");
    }

    // Anexa todos os documentos
    formState.documentFiles.forEach((file) => {
      formData.append("documentos", file);
    });

    try {
      // ATENÃ‡ÃƒO: Verifique se a URL no seu .env estÃ¡ correta!
      // Ex: VITE_API_URL=http://localhost:3001/api
      const response = await fetch(`${API_BASE}/casos/novo`, {
        method: "POST",
        body: formData, // NÃ£o precisa de 'Content-Type', o FormData cuida disso
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Falha no servidor");
      }

      setGeneratedCredentials({
        chaveAcesso: data.chaveAcesso,
        protocolo: data.protocolo,
      });
    } catch (error) {
      console.error("Erro ao enviar o caso:", error);
      alert(`Ocorreu um erro: ${error.message}`);
    } finally {
      setLoading(false);
      timers.forEach(clearTimeout);
      setStatusMessage("");
    }
  };

  const resetForm = () => {
    console.log("BotÃ£o clicado! A função resetForm foi chamada.");
    dispatch({ type: 'RESET_FORM' });
    setGeneratedCredentials(null); // Isso tambÃ©m esconderÃ¡ a tela de sucesso
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      {generatedCredentials ? (
        // --- TELA DE SUCESSO ---
        <div className="text-center p-4">
          <h3 className="text-2xl font-bold text-green-400 mb-4">
            Caso Enviado com Sucesso!
          </h3>

          <div className="space-y-4 mb-6 text-left">
            <div>
              <label className="text-sm font-semibold text-muted">
                PROTOCOLO
              </label>
              <div className="bg-surface border border-soft p-3 rounded-xl">
                <p className="text-xl font-mono tracking-widest text-amber-400">
                  {generatedCredentials.protocolo}
                </p>
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-muted">
                CHAVE DE ACESSO
              </label>
              <div className="bg-surface border border-soft p-3 rounded-xl">
                <p className="text-xl font-mono tracking-widest text-amber-400">
                  {generatedCredentials.chaveAcesso}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-amber-500/10 p-4 rounded-lg border border-amber-500/30 flex items-start gap-3">
            <AlertTriangle className="text-amber-400 w-8 h-8 flex-shrink-0 mt-1" />
            <p className="text-amber-300 text-left">
              <strong>Atenção:</strong> Anote e guarde seu protocolo e chave de
              acesso em um local seguro. Eles são a **unica forma** de consultar
              o andamento do seu caso.
            </p>
          </div>

          <button onClick={resetForm} className="mt-6 w-full btn btn-primary">
            Enviar Outro Caso
          </button>
        </div>
      ) : (
        // --- FORMULÃRIO DE ENVIO ---
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <User
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                size={20}
              />
              <input
                type="text"
                placeholder="Nome Completo"
                value={formState.nome}
                onChange={handleFieldChange}
                required
                name="nome"
                className="input pl-10"
              />
            </div>
            <div className="relative">
              <FileText
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                size={20}
              />
              <input
                type="text"
                placeholder="CPF (apenas números)"
                value={formState.cpf}
                onChange={handleNumericInput}
                required
                name="cpf"
                className="input pl-10"
              />
            </div>
          </div>

          <div className="relative">
            <Phone
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              size={20}
            />
            <input
              type="tel"
              placeholder="Telefone (apenas números)"
              value={formState.telefone}
              onChange={handleNumericInput}
              required
              name="telefone"
              className="input pl-10"
            />
          </div>
          

          {/* --- NOVOS CAMPOS DO REQUERENTE --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="email"
              placeholder="Seu Email (opcional)"
              value={formState.emailAssistido}
              onChange={handleFieldChange}
              name="emailAssistido"
              className="input"
            />
            <input
              type="text"
              placeholder="Seu Endereço Completo"
              value={formState.enderecoAssistido}
              onChange={handleFieldChange}
              required
              name="enderecoAssistido"
              className="input"
            />
          </div>
          <div>
            <textarea
              placeholder="Insira seu RG: Ex:00.000.000-00"
              value={formState.assistido_RG}
              onChange={handleFieldChange}
              rows="3"
              name="assistido_RG"
              className="input"
            ></textarea>
            
          </div>
          

          {mostrarRepresentante && (
            <div className="bg-surface p-4 rounded-lg border border-soft space-y-4">
              <h3 className="heading-3">Dados do representante legal</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" placeholder="Nome completo do representante" name="representanteNome" value={formState.representanteNome} onChange={handleFieldChange} className="input" />
                <input type="text" placeholder="CPF (apenas números)" name="representanteCpf" value={formState.representanteCpf} onChange={handleNumericInput} className="input" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select name="representanteNacionalidade" value={formState.representanteNacionalidade} onChange={handleFieldChange} className="input">
                  {nacionalidadeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                <select name="representanteEstadoCivil" value={formState.representanteEstadoCivil} onChange={handleFieldChange} className="input">
                  {estadoCivilOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                <input type="text" placeholder="Profissão" name="representanteOcupacao" value={formState.representanteOcupacao} onChange={handleFieldChange} className="input" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" placeholder="Endereço residencial" name="representanteEnderecoResidencial" value={formState.representanteEnderecoResidencial} onChange={handleFieldChange} className="input" />
                <input type="text" placeholder="Endereço profissional" name="representanteEnderecoProfissional" value={formState.representanteEnderecoProfissional} onChange={handleFieldChange} className="input" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="email" placeholder="Email do representante" name="representanteEmail" value={formState.representanteEmail} onChange={handleFieldChange} className="input" />
                <input type="tel" placeholder="Telefone do representante" name="representanteTelefone" value={formState.representanteTelefone} onChange={handleNumericInput} className="input" />
              </div>
            </div>
          )}

          <div className="bg-surface p-4 rounded-lg border border-soft space-y-4">
            <h3 className="heading-3">Informacoes complementares do assistido</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <select
                value={formState.assistidoEhIncapaz}
                onChange={handleFieldChange}
                name="assistidoEhIncapaz"
                className="input"
              >
                <option value="nao">Sou o proprio interessado</option>
                <option value="sim">Estou representando meu filho/filha</option>
              </select>
              <input
                type="date"
                value={formState.dataNascimentoAssistido}
                onChange={handleFieldChange}
                name="dataNascimentoAssistido"
                className="input"
                placeholder="Data de nascimento"
              />
              <select
                value={formState.assistidoNacionalidade}
                onChange={handleFieldChange}
                name="assistidoNacionalidade"
                className="input"
              >
                {nacionalidadeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select
                value={formState.assistidoEstadoCivil}
                onChange={handleFieldChange}
                name="assistidoEstadoCivil"
                className="input"
              >
                {estadoCivilOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              <input
                type="text"
                value={formState.assistidoOcupacao}
                onChange={handleFieldChange}
                name="assistidoOcupacao"
                className="input"
                placeholder="Profissao ou ocupacao"
              />
            </div>
            <input
              type="text"
              value={formState.enderecoProfissionalAssistido}
              onChange={handleFieldChange}
              name="enderecoProfissionalAssistido"
              className="input"
              placeholder="Endereco profissional (se houver)"
            />
            <p className="text-xs text-muted">
              Use estas informacoes para identificar voce ou seu dependente no processo.
            </p>
          </div>


          <div>
            <select
              value={formState.tipoAcao}
              onChange={(e) => {
                dispatch({ type: 'UPDATE_FIELD', field: 'tipoAcao', value: e.target.value });
                dispatch({ type: 'UPDATE_FIELD', field: 'acaoEspecifica', value: '' });
              }}
              name="tipoAcao"
              required
              className="input"
            >
              {/* <option value="" disabled>
                1. Selecione a Ãrea do Direito
              </option> */}
              <option value="familia">Direito de Família </option>
              {/*<option value="civel">Direito Civel</option>
               <option value="consumidor">Direito Do Consumidor</option>
              <option value="saude">Direito Ã Saúde</option>
              <option value="criminal">Defesa Criminal</option>
              <option value="infancia">Direito Infância e Juventude</option> */}
            </select>
            {/*{tipoAcao && (*/}
            <select
              value={formState.acaoEspecifica}
              onChange={handleFieldChange}
              required
              name="acaoEspecifica"
              className="input mt-5"
            >
              <option value="" disabled>
                2. Selecione a Ação Específica
              </option>
              {acoesParaMostrar.map((acao) => (
                <option key={acao} value={acao}>
                  {acao}
                </option>
              ))}
            </select>
            {/* )}*/}
          </div>
          {/* --- SEÃ‡ÃƒO DADOS DO(A) REQUERIDO(A) --- */}
          <div
            className={`space-y-4 border-t border-soft pt-4 ${
              shouldShowRequerido ? "" : "hidden"
            }`}
          >
            <h3 className="heading-3">Dados da Outra Parte (Requerido/a)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Nome Completo do(a) Requerido(a)"
                value={formState.nomeRequerido}
                onChange={handleFieldChange}
                name="nomeRequerido"
                className="input"
              />
              <input
                type="text"
                placeholder="CPF do(a) Requerido(a) (apenas números, se souber)"
                value={formState.cpfRequerido}
                onChange={handleNumericInput}
                name="cpfRequerido"
                className="input"
              />
            </div>
            <input
              type="text"
              placeholder="Endereço Residencial do(a) Requerido(a) (se souber)"
              value={formState.enderecoRequerido}
              onChange={handleFieldChange}
              name="enderecoRequerido"
              className="input"
            />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <select name="requeridoNacionalidade" value={formState.requeridoNacionalidade} onChange={handleFieldChange} className="input">
                {nacionalidadeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              <select name="requeridoEstadoCivil" value={formState.requeridoEstadoCivil} onChange={handleFieldChange} className="input">
                {estadoCivilOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              <input type="text" placeholder="Profissão ou ocupação" name="requeridoOcupacao" value={formState.requeridoOcupacao} onChange={handleFieldChange} className="input" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" placeholder="Endereço profissional (se souber)" name="requeridoEnderecoProfissional" value={formState.requeridoEnderecoProfissional} onChange={handleFieldChange} className="input" />
              <input type="email" placeholder="Email do requerido" name="requeridoEmail" value={formState.requeridoEmail} onChange={handleFieldChange} className="input" />
            </div>
            <input type="tel" placeholder="Telefone do requerido (se souber)" name="requeridoTelefone" value={formState.requeridoTelefone} onChange={handleNumericInput} className="input" />
          <div>
            <textarea
                placeholder="Dados Adicionais do(a) Requerido(a) (RG, Nacionalidade, Estado Civil, Profissão, se souber)"
                value={formState.dadosAdicionaisRequerido}
                onChange={handleFieldChange}
                name="dadosAdicionaisRequerido"
                rows="3"
                className="input"
              ></textarea>
            </div>
          </div>

          {/* --- SEÃ‡ÃƒO DETALHES ADICIONAIS DO CASO --- */}
          <div className="space-y-4 border-t border-soft pt-4">
            <h3 className="heading-3">
              Detalhes Adicionais (Importante para Ações de Família)
            </h3>
            <div>
              <textarea
                placeholder="Filhos (Nome Completo - Data de Nascimento DD/MM/AAAA)"
                value={formState.filhosInfo}
                onChange={handleFieldChange}
                rows="3"
                name="filhosInfo"
                className="input"
              ></textarea>
              <p className="text-xs text-muted mt-1">
                Separe cada filho com ponto e vírgula (;). Ex: João Silva -
                10/05/2015; Maria Silva - 20/12/2018
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted mb-1">
                  Data Casamento/Início União
                </label>
                <input
                  type="date"
                  value={formState.dataInicioRelacao}
                  onChange={handleFieldChange}
                  name="dataInicioRelacao"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">
                  Data Separação de Fato
                </label>
                <input
                  type="date"
                  value={formState.dataSeparacao}
                  onChange={handleFieldChange}
                  name="dataSeparacao"
                  className="input"
                />
              </div>
            </div>
            <div>
              <textarea
                placeholder="Bens a Partilhar (Descreva os bens adquiridos durante a união/casamento, se houver)"
                value={formState.bensPartilha}
                onChange={handleFieldChange}
                name="bensPartilha"
                rows="3"
                className="input"
              ></textarea>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <textarea
                placeholder="Descreva como esta a guarda e rotina dos filhos (quem cuida, onde moram, visitas)"
                value={formState.descricaoGuarda}
                onChange={handleFieldChange}
                name="descricaoGuarda"
                rows="3"
                className="input"
              ></textarea>
              <textarea
                placeholder="Conte a situacao financeira de quem cuida das criancas (renda, despesas, dificuldades)"
                value={formState.situacaoFinanceiraGenitora}
                onChange={handleFieldChange}
                name="situacaoFinanceiraGenitora"
                rows="3"
                className="input"
              ></textarea>
            </div>
          </div>

          <div className="bg-surface p-4 rounded-lg border border-soft space-y-4">
            <h3 className="heading-3">Informacoes para o documento</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Vara competente ou juizo (opcional)"
                value={formState.varaCompetente}
                onChange={handleFieldChange}
                name="varaCompetente"
                className="input"
              />
              <input
                type="text"
                placeholder="Cidade para assinatura do documento"
                value={formState.cidadeAssinatura}
                onChange={handleFieldChange}
                name="cidadeAssinatura"
                className="input"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Valor da causa (em reais)"
                value={formState.valorCausa}
                onChange={handleFieldChange}
                name="valorCausa"
                className="input"
              />
              <input
                type="text"
                placeholder="Valor da causa por extenso"
                value={formState.valorCausaExtenso}
                onChange={handleFieldChange}
                name="valorCausaExtenso"
                className="input"
              />
            </div>
            {showFixacaoBaseFields && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Valor de referencia dos alimentos provisórios"
                  value={formState.valorProvisorioReferencia}
                  onChange={handleFieldChange}
                  name="valorProvisorioReferencia"
                  className="input"
                />
                <input
                  type="text"
                  placeholder="Percentual definitivo sobre o salario minimo"
                  value={formState.percentualDefinitivoSalarioMin}
                  onChange={handleFieldChange}
                  name="percentualDefinitivoSalarioMin"
                  className="input"
                />
                <input
                  type="text"
                  placeholder="Percentual definitivo das despesas extras"
                  value={formState.percentualDefinitivoExtras}
                  onChange={handleFieldChange}
                  name="percentualDefinitivoExtras"
                  className="input"
                />
              </div>
            )}
            {isExecucao && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Numero do titulo/execucao (se houver)"
                  value={formState.processoTituloNumero}
                  onChange={handleFieldChange}
                  name="processoTituloNumero"
                  className="input"
                />
                <input
                  type="text"
                  placeholder="Valor total executado por extenso"
                  value={formState.valorTotalExtenso}
                  onChange={handleFieldChange}
                  name="valorTotalExtenso"
                  className="input"
                />
                <input
                  type="text"
                  placeholder="Valor da divida para prisao por extenso"
                  value={formState.valorDebitoExtenso}
                  onChange={handleFieldChange}
                  name="valorDebitoExtenso"
                  className="input"
                />
              </div>
            )}
          </div>

          {/* Seções condicionais por ação */}
          {showFixacaoBaseFields && (
            <div className="bg-surface p-4 rounded-lg border border-soft space-y-4">
              <h3 className="heading-3">Detalhes da Fixação/Oferta de Alimentos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Percentual/Valor da Pensão</label>
                  <input
                    type="text"
                    placeholder='Ex: "30%" ou "R$ 600,00"'
                    value={formState.percentualSmRequerido}
                    onChange={handleFieldChange}
                    name="percentualSmRequerido"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Despesas Extras</label>
                  <input
                    type="text"
                    placeholder='Ex: "50% de gastos com saúde e educação"'
                    value={formState.percentualDespesasExtra}
                    onChange={handleFieldChange}
                    name="percentualDespesasExtra"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Data de Pagamento</label>
                  <input
                    type="text"
                    placeholder='Ex: "Até o dia 10 de cada mês"'
                    value={formState.diaPagamentoRequerido}
                    onChange={handleFieldChange}
                    name="diaPagamentoRequerido"
                    className="input"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Dados Bancários para Depósito</label>
                  <textarea
                    rows="3"
                    placeholder="Informe: Titular da Conta, CPF do Titular, Banco, Agência, Conta e Chave PIX"
                    value={formState.dadosBancariosDeposito}
                    onChange={handleFieldChange}
                    name="dadosBancariosDeposito"
                    className="input"
                  ></textarea>
                </div>
                <div>
                  <label className="label">Vínculo Empregatício do Requerido</label>
                  <select
                    className="input"
                    value={formState.requeridoTemEmpregoFormal}
                    onChange={handleFieldChange}
                    name="requeridoTemEmpregoFormal"
                  >
                    <option value="">Selecione...</option>
                    <option value="sim">Sim</option>
                    <option value="nao">Não</option>
                    <option value="nao_sei">Não sei</option>
                  </select>
                </div>
                {mostrarEmpregador && (
                  <>
                    <div>
                      <label className="label">Nome do Empregador do Requerido</label>
                      <input
                        type="text"
                        placeholder="Nome da empresa"
                        value={formState.empregadorRequeridoNome}
                        onChange={handleFieldChange}
                        name="empregadorRequeridoNome"
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Endereço do Empregador</label>
                      <input
                        type="text"
                        placeholder="Endereço completo da empresa"
                        value={formState.empregadorRequeridoEndereco}
                        onChange={handleFieldChange}
                        name="empregadorRequeridoEndereco"
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Email do empregador (opcional)</label>
                      <input
                        type="email"
                        placeholder="Email do RH ou responsavel"
                        value={formState.empregadorEmail}
                        onChange={handleFieldChange}
                        name="empregadorEmail"
                        className="input"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {isExecucao && (
            <div className="bg-surface p-4 rounded-lg border border-soft space-y-4">
              <h3 className="heading-3">Dados da Execução de Alimentos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Nº do Processo Originário</label>
                  <input
                    type="text"
                    placeholder="Nº do processo que fixou os alimentos"
                    value={formState.numeroProcessoOriginario}
                    onChange={handleFieldChange}
                    name="numeroProcessoOriginario"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Vara Originária</label>
                  <input
                    type="text"
                    placeholder="Ex: 1ª Vara de Família de Teixeira de Freitas"
                    value={formState.varaOriginaria}
                    onChange={handleFieldChange}
                    name="varaOriginaria"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Valor/Percentual Fixado</label>
                  <input
                    type="text"
                    placeholder='Ex: "30%" ou "R$ 600,00"'
                    value={formState.percentualOuValorFixado}
                    onChange={handleFieldChange}
                    name="percentualOuValorFixado"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Dia de Pagamento (na sentença)</label>
                  <input
                    type="text"
                    placeholder='Ex: "Dia 10 de cada mês"'
                    value={formState.diaPagamentoFixado}
                    onChange={handleFieldChange}
                    name="diaPagamentoFixado"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Período do Débito</label>
                  <input
                    type="text"
                    placeholder='Ex: "Março/2025 a Outubro/2025"'
                    value={formState.periodoDebitoExecucao}
                    onChange={handleFieldChange}
                    name="periodoDebitoExecucao"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Valor Total da Dívida</label>
                  <input
                    type="text"
                    placeholder='Ex: "R$ 3.250,00"'
                    value={formState.valorTotalDebitoExecucao}
                    onChange={handleFieldChange}
                    name="valorTotalDebitoExecucao"
                    className="input"
                  />
                </div>
              </div>
            </div>
          )}

          {isDivorcio && (
            <div className="bg-surface p-4 rounded-lg border border-soft space-y-4">
              <h3 className="heading-3">Detalhes do Divórcio</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Regime de Bens</label>
                  <select
                    className="input"
                    value={formState.regimeBens}
                    onChange={handleFieldChange}
                    name="regimeBens"
                  >
                    <option value="">Selecione...</option>
                    <option value="comunhao_parcial">Comunhão Parcial de Bens</option>
                    <option value="comunhao_universal">Comunhão Universal</option>
                    <option value="separacao_total">Separação Total de Bens</option>
                    <option value="participacao_final_nos_aquestos">Participação Final nos Aquestos</option>
                  </select>
                </div>
                <div>
                  <label className="label">Nome de Solteira</label>
                  <select
                    className="input"
                    value={formState.retornoNomeSolteira}
                    onChange={handleFieldChange}
                    name="retornoNomeSolteira"
                  >
                    <option value="">Selecione...</option>
                    <option value="sim">Sim, desejo voltar a usar o nome de solteira</option>
                    <option value="nao">Não, quero manter o nome de casada</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="label">Pensão para o Cônjuge</label>
                  <select
                    className="input"
                    value={formState.alimentosParaExConjuge}
                    onChange={handleFieldChange}
                    name="alimentosParaExConjuge"
                  >
                    <option value="">Selecione...</option>
                    <option value="sim">Sim, preciso de pensão para mim</option>
                    <option value="nao">Não, dispenso alimentos para mim</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div>
            <textarea
              placeholder="Relate seu caso aqui..."
              value={formState.relato}
              onChange={handleFieldChange}
              name="relato"
              rows="5"
              className="input"
            ></textarea>
          </div>
          {formState.acaoEspecifica && (
            <div className="space-y-3 bg-surface p-4 rounded-lg border border-soft">
              <h3 className="heading-3">
                3. Marque os documentos que você possui:
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {listaDeDocumentos.map((doc) => (
                  <label
                    key={doc}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-surface cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      name={doc}
                      onChange={handleCheckboxChange}
                      className="w-4 h-4"
                    />
                    <span className="text-muted text-sm">{doc}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-4">
            <p className="font-semibold">Anexos (Opcional)</p>
            {/* GravaÃ§Ã£o de Ãudio */}
            <div className="bg-surface p-4 rounded-lg border border-dashed border-soft">
              {!isRecording && !formState.audioBlob && (
                <button
                  type="button"
                  onClick={startRecording}
                  className="btn btn-ghost"
                >
                  <Mic size={20} /> Gravar Relato em Áudio
                </button>
              )}
              {isRecording && (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="btn btn-ghost text-red-500 animate-pulse"
                >
                  <Square size={20} /> Parar Gravação
                </button>
              )}
              {formState.audioBlob && (
                <div className="flex items-center gap-4">
                  <audio
                    src={URL.createObjectURL(formState.audioBlob)}
                    controls
                    className="flex-gro w"
                  />
                  <X
                    onClick={removeAudioRecording}
                    className="text-red-500 cursor-pointer"
                    size={20}
                  />
                </div>
              )}
            </div>
            {/* Upload de Documentos */}
            <div className="bg-surface p-4 rounded-lg border border-dashed border-soft">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                ref={documentInputRef}
                onChange={handleDocumentChange}
                className="hidden"
                multiple
              />
              <button
                type="button"
                onClick={() => documentInputRef.current.click()}
                className="btn btn-ghost"
              >
                <Paperclip size={20} /> Anexar Documentos (RG, Comprovantes,
                etc.)
              </button>
              <div className="mt-2 space-y-1 text-sm">
                {formState.documentFiles.map((file) => (
                  <div
                    key={file.name}
                    className="flex items-center justify-between bg-surface p-1 rounded border border-soft"
                  >
                    <span>{file.name}</span>
                    <X
                      onClick={() => removeDocument(file.name)}
                      className="text-red-500 cursor-pointer"
                      size={18}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full py-4 text-lg"
          >
            {loading ? "Enviando..." : "Enviar Caso"}
            <Upload size={20} />
          </button>
          {loading && (
            <div className="text-center mt-4">
              <p className="text-muted animate-pulse">{statusMessage}</p>
            </div>
          )}
        </form>
      )}
    </motion.div>
  );
};