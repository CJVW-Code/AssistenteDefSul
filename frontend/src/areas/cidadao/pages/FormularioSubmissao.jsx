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
  Scale,
  Plus,
  Info,
} from "lucide-react";
import { documentosPorAcao } from "../../../data/documentos.js";
import { API_BASE } from "../../../utils/apiBase";
import { useToast } from "../../../contexts/ToastContext";

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
  assistidoOcupacao: "",
  assistidoNacionalidade: "",
  assistidoEnderecoProfissional: "",
  assistidoEstadoCivil: "",
  enderecoAssistido: "", // Residencial
  emailAssistido: "",
  telefone: "",
  whatsappContato: "", // Novo campo
  assistidoRgNumero: "",
  assistidoRgOrgao: "",

  // --- NOVO: ARRAY PARA MAIS FILHOS ---
  outrosFilhos: [], // Estrutura: [{ nome: "", cpf: "", dataNascimento: "" }]

  // Representante Legal (apenas se assistidoEhIncapaz === 'sim')
  representanteNome: "",
  representanteDataNascimento: "",
  representanteCpf: "",
  representanteNacionalidade: "",
  representanteEstadoCivil: "",
  representanteOcupacao: "",
  representanteEnderecoResidencial: "",
  representanteEnderecoProfissional: "",
  representanteEmail: "",
  representanteTelefone: "",
  representanteRgNumero: "",
  representanteRgOrgao: "",

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
  requeridoOutrosSelecionados: [],
  requeridoRgNumero: "",
  requeridoRgOrgao: "",
  requeridoDataNascimento: "",
  requeridoNomeMae: "",
  requeridoNomePai: "",
  requeridoOutrosDetalhes: "",

  // Dados Específicos (Família/Alimentos)
  bensPartilha: "", // Será ocultado para fixação de alimentos
  descricaoGuarda: "",
  situacaoFinanceiraGenitora: "",

  // Dados Financeiros/Alimentos
  valorMensalPensao: "", // NOVO CAMPO UNIFICADO
  diaPagamentoRequerido: "",
  tipoContaDeposito: "", // 'corrente_poupanca', 'pix', 'outro'
  bancoDeposito: "",
  agenciaDeposito: "",
  contaDeposito: "",
  chavePixDeposito: "",
  outrosDadosDeposito: "",

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
  cidadeAssinatura: "",

  // Narrativa e Arquivos
  relato: "",
  prefersAudio: false,
  documentFiles: [],
  documentNames: {},
  documentosMarcados: [],
  audioBlob: null,
};

// 2. Reducer para gerenciar estado
function formReducer(state, action) {
  switch (action.type) {
    case "UPDATE_FIELD":
      return { ...state, [action.field]: action.value };

    // --- NOVOS CASOS ---
    case "ADD_FILHO":
      return {
        ...state,
        outrosFilhos: [
          ...state.outrosFilhos,
          {
            nome: "",
            cpf: "",
            dataNascimento: "",
            rgNumero: "",
            rgOrgao: "",
            nacionalidade: "brasileiro(a)",
          },
        ],
      };
    case "REMOVE_FILHO":
      return {
        ...state,
        outrosFilhos: state.outrosFilhos.filter(
          (_, index) => index !== action.index
        ),
      };
    case "UPDATE_FILHO":
      const novosFilhos = [...state.outrosFilhos];
      novosFilhos[action.index][action.field] = action.value;
      return { ...state, outrosFilhos: novosFilhos };

    case "RESET_FORM":
      return {
        ...initialState,
        documentFiles: [],
        documentosMarcados: [],
        requeridoOutrosSelecionados: [],
        outrosFilhos: [], // Limpa os filhos extras também
      };
    case "SET_ACAO":
      // Limpa campos específicos ao trocar a ação para evitar confusão
      return {
        ...state,
        tipoAcao: action.tipoAcao,
        acaoEspecifica: "",
        documentosMarcados: [],
      };
    default:
      return state;
  }
}

const nacionalidadeOptions = [
  { value: "", label: "Nacionalidade" },
  { value: "brasileiro(a)", label: "Brasileiro(a)" },
  { value: "estrangeiro(a)", label: "Estrangeiro(a)" },
];

const estadoCivilOptions = [
  { value: "", label: "Estado Civil" },
  { value: "solteiro(a)", label: "Solteiro(a)" },
  { value: "casado(a)", label: "Casado(a)" },
  { value: "divorciado(a)", label: "Divorciado(a)" },
  { value: "viúvo(a)", label: "Viúvo(a)" },
  { value: "união estável", label: "União Estável" },
];

const orgaoEmissorOptions = [
  { value: "", label: "Órgão emissor" },
  { value: "SSP/AC", label: "SSP/AC" },
  { value: "SSP/AL", label: "SSP/AL" },
  { value: "SSP/AP", label: "SSP/AP" },
  { value: "SSP/AM", label: "SSP/AM" },
  { value: "SSP/BA", label: "SSP/BA" },
  { value: "SSP/CE", label: "SSP/CE" },
  { value: "SSP/DF", label: "SSP/DF" },
  { value: "SSP/ES", label: "SSP/ES" },
  { value: "SSP/GO", label: "SSP/GO" },
  { value: "SSP/MA", label: "SSP/MA" },
  { value: "SSP/MT", label: "SSP/MT" },
  { value: "SSP/MS", label: "SSP/MS" },
  { value: "SSP/MG", label: "SSP/MG" },
  { value: "SSP/PA", label: "SSP/PA" },
  { value: "SSP/PB", label: "SSP/PB" },
  { value: "SSP/PR", label: "SSP/PR" },
  { value: "SSP/PE", label: "SSP/PE" },
  { value: "SSP/PI", label: "SSP/PI" },
  { value: "SSP/RJ", label: "SSP/RJ" },
  { value: "SSP/RN", label: "SSP/RN" },
  { value: "SSP/RS", label: "SSP/RS" },
  { value: "SSP/RO", label: "SSP/RO" },
  { value: "SSP/RR", label: "SSP/RR" },
  { value: "SSP/SC", label: "SSP/SC" },
  { value: "SSP/SP", label: "SSP/SP" },
  { value: "SSP/SE", label: "SSP/SE" },
  { value: "SSP/TO", label: "SSP/TO" },
  { value: "DETRAN", label: "Detran" },
  { value: "OUTRO", label: "Outro" },
];

const cidadesBahia = ["Teixeira de Freitas"];

const stripNonDigits = (value = "") => value.replace(/\D/g, "");

const formatCpf = (value = "") => {
  const digits = stripNonDigits(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(
    6,
    9
  )}-${digits.slice(9)}`;
};

const formatPhone = (value = "") => {
  const digits = stripNonDigits(value).slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const formatRgNumber = (value = "") => {
  const digits = stripNonDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  }
  if (digits.length <= 10) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(
      5,
      8
    )}-${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(
    5,
    8
  )}.${digits.slice(8, 10)}-${digits.slice(10)}`;
};

const formatCurrencyMask = (value = "") => {
  if (!value) return "";
  let digits = value.replace(/\D/g, "");
  if (digits === "") return "";

  // Remove leading zeros
  digits = digits.replace(/^0+/, "");

  if (digits.length === 0) return "0,00";
  if (digits.length === 1) return `0,0${digits}`;
  if (digits.length === 2) return `0,${digits}`;

  const cents = digits.slice(-2);
  let integer = digits.slice(0, -2);

  integer = integer.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");

  return `${integer},${cents}`;
};

const formatDateToBr = (isoDate = "") => {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
};

const outrosDadosRequeridoConfig = [
  { key: "requeridoRg", label: "RG e órgão emissor", renderType: "rg" },
  {
    key: "requeridoDataNascimento",
    label: "Data de nascimento",
    renderType: "date",
    field: "requeridoDataNascimento",
  },
  {
    key: "requeridoOutrosDetalhes",
    label: "Outros detalhes relevantes",
    renderType: "textarea",
    field: "requeridoOutrosDetalhes",
    placeholder: "Ex: Nome do advogado, redes sociais, etc.",
  },
];

const outrosDadosRequeridoFieldMap = {
  requeridoRg: ["requeridoRgNumero", "requeridoRgOrgao"],
  requeridoDataNascimento: ["requeridoDataNascimento"],
  requeridoNomeMae: ["requeridoNomeMae"],
  requeridoNomePai: ["requeridoNomePai"],
  requeridoOutrosDetalhes: ["requeridoOutrosDetalhes"],
};

const sanitizeDecimalInput = (
  value = "",
  { decimalPlaces = 2, maxIntegerDigits = 9 } = {}
) => {
  if (!value) return "";
  const allowed = value.replace(/[^0-9,]/g, "");
  const [intPartRaw, ...decimalParts] = allowed.split(",");
  const integerPart = (intPartRaw || "").slice(0, maxIntegerDigits);
  if (decimalParts.length === 0) {
    return integerPart;
  }
  const decimalPart = decimalParts.join("").slice(0, decimalPlaces);
  return `${integerPart},${decimalPart}`;
};

const normalizeDecimalForSubmit = (value = "", decimals = 2) => {
  if (!value) return "";
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const number = Number(normalized);
  if (Number.isNaN(number)) {
    return "";
  }
  return number.toFixed(decimals);
};

const currencyFields = new Set([
  "valorMensalPensao",
  "valorTotalDebitoExecucao",
]);

const validateCpfAlgorithm = (cpf) => {
  const cleanCpf = String(cpf).replace(/[^\d]+/g, "");
  if (cleanCpf.length !== 11 || /^(\d)\1+$/.test(cleanCpf)) return false;

  let soma = 0;
  let resto;

  for (let i = 1; i <= 9; i++) {
    soma = soma + parseInt(cleanCpf.substring(i - 1, i)) * (11 - i);
  }
  resto = (soma * 10) % 11;

  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cleanCpf.substring(9, 10))) return false;

  soma = 0;
  for (let i = 1; i <= 10; i++) {
    soma = soma + parseInt(cleanCpf.substring(i - 1, i)) * (12 - i);
  }
  resto = (soma * 10) % 11;

  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cleanCpf.substring(10, 11))) return false;

  return true;
};

export const FormularioSubmissao = () => {
  const { toast } = useToast();
  const [formState, dispatch] = useReducer(formReducer, initialState);
  useEffect( () => {fetch(`${API_BASE}/health`).catch(()=>{});},[]);
  const [statusMessage, setStatusMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [checklistWarningOpen, setChecklistWarningOpen] = useState(false);
  const [sugestoesCidades, setSugestoesCidades] = useState([]);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);

  // Helper para validação personalizada (substitui o required padrão)
  const validar = (msg) => ({
    required: true,
    onInvalid: (e) =>
      e.target.setCustomValidity(msg || "Por favor, preencha este campo."),
    onInput: (e) => e.target.setCustomValidity(""),
  });

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const documentInputRef = useRef(null);

  const acaoNorm = (formState.acaoEspecifica || "").toLowerCase();
  const isFixacaoDeAlimentos = acaoNorm.includes(
    "fixação de pensão alimentícia"
  );

  // Efeito para automatizar a seleção de representação para "Fixação de Alimentos"
  useEffect(() => {
    if (isFixacaoDeAlimentos) {
      if (formState.assistidoEhIncapaz !== "sim") {
        dispatch({
          type: "UPDATE_FIELD",
          field: "assistidoEhIncapaz",
          value: "sim",
        });
      }
    }
    // Opcional: Se o usuário mudar de "Fixação" para outra ação,
    // você pode querer resetar a seleção, mas por enquanto vamos manter simples.
  }, [
    formState.acaoEspecifica,
    formState.assistidoEhIncapaz,
    isFixacaoDeAlimentos,
  ]);

  const clearFieldError = (field) => {
    setFormErrors((prev) => {
      const hasFieldError = Boolean(prev[field]);
      const shouldClearContato =
        (field === "enderecoRequerido" ||
          field === "requeridoTelefone" ||
          field === "requeridoEmail") &&
        prev.requeridoContato;
      if (!hasFieldError && !shouldClearContato) {
        return prev;
      }
      const updated = { ...prev };
      if (hasFieldError) {
        delete updated[field];
      }
      if (shouldClearContato) {
        delete updated.requeridoContato;
      }
      return updated;
    });
  };

  // Handler genérico
  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    dispatch({ type: "UPDATE_FIELD", field: name, value });
    clearFieldError(name);
  };

  const handleCidadeChange = (e) => {
    const { value } = e.target;
    dispatch({ type: "UPDATE_FIELD", field: "cidadeAssinatura", value });

    if (value.length > 0) {
      const filtered = cidadesBahia.filter((cidade) =>
        cidade.toLowerCase().includes(value.toLowerCase())
      );
      setSugestoesCidades(filtered);
      setMostrarSugestoes(true);
    } else {
      setMostrarSugestoes(false);
    }
  };

  const handleSelecionaCidade = (cidade) => {
    dispatch({
      type: "UPDATE_FIELD",
      field: "cidadeAssinatura",
      value: cidade,
    });
    setMostrarSugestoes(false);
  };

  const handleNumericInput = (e) => {
    const value = e.target.value;
    if (/^[0-9]*$/.test(value)) {
      handleFieldChange(e);
    }
  };

  const handleMaskedChange = (formatter, field) => (event) => {
    const formattedValue = formatter(event.target.value);
    dispatch({ type: "UPDATE_FIELD", field, value: formattedValue });
    clearFieldError(field);
  };

  const handleCpfChangeAndValidate = (field) => (e) => {
    const rawValue = e.target.value;
    const formattedValue = formatCpf(rawValue);
    dispatch({ type: "UPDATE_FIELD", field, value: formattedValue });

    const cleanCpf = stripNonDigits(rawValue);
    if (cleanCpf.length === 11) {
      if (!validateCpfAlgorithm(cleanCpf)) {
        setFormErrors((prev) => ({ ...prev, [field]: "O CPF informado é inválido." }));
      } else {
        // CPF is valid, clear the error for this field
        setFormErrors((prev) => {
          const updated = { ...prev };
          if (updated[field] === "O CPF informado é inválido.") {
            delete updated[field];
          }
          return updated;
        });
      }
    } else {
      // CPF is not yet complete, clear any existing "invalid" error
      setFormErrors((prev) => {
        const updated = { ...prev };
        if (updated[field] === "O CPF informado é inválido.") {
          delete updated[field];
        }
        return updated;
      });
    }
  };

  const handlePhoneChange = (field) => handleMaskedChange(formatPhone, field);
  const handleRgChange = (field) => (event) => {
    dispatch({
      type: "UPDATE_FIELD",
      field,
      value: formatRgNumber(event.target.value),
    });
    clearFieldError(field);
  };

  const toggleRequeridoDetalhe = (key) => {
    const selecionados = formState.requeridoOutrosSelecionados || [];
    const jaSelecionado = selecionados.includes(key);
    if (jaSelecionado) {
      const atualizados = selecionados.filter((item) => item !== key);
      dispatch({
        type: "UPDATE_FIELD",
        field: "requeridoOutrosSelecionados",
        value: atualizados,
      });
      (outrosDadosRequeridoFieldMap[key] || []).forEach((field) => {
        dispatch({ type: "UPDATE_FIELD", field, value: "" });
      });
    } else {
      dispatch({
        type: "UPDATE_FIELD",
        field: "requeridoOutrosSelecionados",
        value: [...selecionados, key],
      });
    }
  };

  const handleDecimalFieldChange =
    (field, options = {}) =>
    (event) => {
      dispatch({
        type: "UPDATE_FIELD",
        field,
        value: sanitizeDecimalInput(event.target.value, options),
      });
    };

  const handleCurrencyChange = (field) => (event) => {
    dispatch({
      type: "UPDATE_FIELD",
      field,
      value: formatCurrencyMask(event.target.value),
    });
    clearFieldError(field);
  };

  const handleDayInputChange = (field) => (e) => {
    let value = parseInt(e.target.value, 10);
    if (isNaN(value) || value < 1) {
      value = "";
    } else if (value > 31) {
      value = 31;
    }
    dispatch({ type: "UPDATE_FIELD", field, value: String(value) });
  };

  // --- LÓGICA DE GRAVAÇÃO ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = (event) =>
        audioChunksRef.current.push(event.data);
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        dispatch({
          type: "UPDATE_FIELD",
          field: "audioBlob",
          value: audioBlob,
        });
        audioChunksRef.current = [];
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Erro microfone:", err);
      toast.error("Não foi possível acessar o microfone.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  const removeAudioRecording = () => {
    dispatch({ type: "UPDATE_FIELD", field: "audioBlob", value: null });
  };

  // --- LÓGICA DE ARQUIVOS ---
  const handleDocumentChange = (e) => {
    const novosArquivos = Array.from(e.target.files);
    dispatch({
      type: "UPDATE_FIELD",
      field: "documentFiles",
      value: [...formState.documentFiles, ...novosArquivos],
    });
  };

  const handleDocumentNameChange = (fileName, newName) => {
    const currentNames = formState.documentNames || {};
    const updatedNames = { ...currentNames, [fileName]: newName };
    dispatch({
      type: "UPDATE_FIELD",
      field: "documentNames",
      value: updatedNames,
    });
  };

  const removeDocument = (fileName) => {
    const updatedFiles = formState.documentFiles.filter(
      (file) => file.name !== fileName
    );
    dispatch({
      type: "UPDATE_FIELD",
      field: "documentFiles",
      value: updatedFiles,
    });
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    if (checked) {
      dispatch({
        type: "UPDATE_FIELD",
        field: "documentosMarcados",
        value: [...formState.documentosMarcados, name],
      });
    } else {
      dispatch({
        type: "UPDATE_FIELD",
        field: "documentosMarcados",
        value: formState.documentosMarcados.filter((doc) => doc !== name),
      });
    }
  };

  // --- LÓGICA DE SUBMISSÃO ---fffff
  const processSubmission = async ({
    bypassChecklist = false,
    isAlvaraContext = false,
    requiredDocs = [],
  } = {}) => {
    const validationErrors = {};
    const nomeRequeridoTrim = (formState.nomeRequerido || "").trim();
    const enderecoRequeridoTrim = (formState.enderecoRequerido || "").trim();
    const telefoneRequeridoDigits = stripNonDigits(
      formState.requeridoTelefone || ""
    );
    const requeridoEmailTrim = (formState.requeridoEmail || "").trim();

    if (!isAlvaraContext) {
      if (!nomeRequeridoTrim) {
        validationErrors.nomeRequerido =
          "Informe o nome completo da outra parte.";
      }
      if (
        !enderecoRequeridoTrim &&
        !telefoneRequeridoDigits &&
        !requeridoEmailTrim
      ) {
        validationErrors.requeridoContato =
          "Informe pelo menos um endereço, e-mail ou telefone da outra parte.";
      }
    }

    // --- NOVAS VALIDAÇÕES OBRIGATÓRIAS ---
    
    // 1. WhatsApp Obrigatório
    if (!stripNonDigits(formState.whatsappContato)) {
      validationErrors.whatsappContato = "O WhatsApp para reunião é obrigatório.";
    }

    // Validação CPF Matemático
    if (formState.cpf && !validateCpfAlgorithm(formState.cpf)) {
      validationErrors.cpf = "CPF inválido.";
    }
    if (
      formState.assistidoEhIncapaz === "sim" &&
      formState.representanteCpf &&
      !validateCpfAlgorithm(formState.representanteCpf)
    ) {
      validationErrors.representanteCpf = "CPF inválido.";
    }

    // 2. Validação Relato vs Áudio
    if (formState.prefersAudio) {
      if (!formState.audioBlob) {
        validationErrors.audio = "Como você optou por enviar áudio, a gravação é obrigatória.";
      }
    } else {
      const relatoLimpo = (formState.relato || "").trim();
      if (relatoLimpo.length < 250) {
        validationErrors.relato = `O relato deve ser mais detalhado (mínimo 250 caracteres). Atual: ${relatoLimpo.length}.`;
      }
    }

    // 3. Mínimo 4 Documentos
    if (formState.documentFiles.length < 4) {
      validationErrors.documentos = `É necessário anexar pelo menos 4 documentos (RG, CPF, Comprovantes, etc). Atual: ${formState.documentFiles.length}.`;
    }

    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }

    if (
      requiredDocs.length > 0 &&
      formState.documentosMarcados.length === 0 &&
      !bypassChecklist
    ) {
      setChecklistWarningOpen(true);
      return;
    }

    setChecklistWarningOpen(false);
    setFormErrors({});
    setLoading(true);
    setGeneratedCredentials(null);

    // Simulando etapas visuais
    const timers = [
      setTimeout(() => setStatusMessage("Validando dados..."), 1000),
      setTimeout(
        () => setStatusMessage("Processando áudio e documentos..."),
        3000
      ),
      setTimeout(
        () => setStatusMessage("Gerando minuta com Inteligência Artificial..."),
        6000
      ),
      setTimeout(() => setStatusMessage("Gerando protocolo..."), 9000),
    ];

    const formData = new FormData();

    let dadosBancariosFormatado = "";
    switch (formState.tipoContaDeposito) {
      case "corrente_poupanca":
        if (
          formState.bancoDeposito ||
          formState.agenciaDeposito ||
          formState.contaDeposito
        ) {
          dadosBancariosFormatado = `Tipo: Conta Corrente/Poupança, Banco: ${
            formState.bancoDeposito || "N/A"
          }, Agência: ${formState.agenciaDeposito || "N/A"}, Conta: ${
            formState.contaDeposito || "N/A"
          }`;
        }
        break;
      case "pix":
        if (formState.chavePixDeposito) {
          dadosBancariosFormatado = `Tipo: PIX, Chave: ${formState.chavePixDeposito}`;
        }
        break;
      case "outro":
        if (formState.outrosDadosDeposito) {
          dadosBancariosFormatado = `Tipo: Outro, Detalhes: ${formState.outrosDadosDeposito}`;
        }
        break;
      default:
        // No account type selected
        break;
    }
    if (dadosBancariosFormatado) {
      formData.append("dados_bancarios_deposito", dadosBancariosFormatado);
    }

    // 1. Mapeamento de campos do Estado (camelCase) para o Backend (snake_case)
    // Isso garante que o Controller do Node.js receba os dados como espera
    const fieldMapping = {
      // Identificação Assistido
      nome: "nome",
      cpf: "cpf",
      telefone: "telefone",
      enderecoAssistido: "endereco_assistido",
      assistidoOcupacao: "assistido_ocupacao",
      whatsappContato: "whatsapp_contato",
      emailAssistido: "email_assistido",
      assistidoEhIncapaz: "assistido_eh_incapaz",
      assistidoNacionalidade: "assistido_nacionalidade",
      assistidoEstadoCivil: "assistido_estado_civil",
      dataNascimentoAssistido: "assistido_data_nascimento",
      assistidoRgNumero: "assistido_rg_numero",
      assistidoRgOrgao: "assistido_rg_orgao",

      // Representante
      representanteNome: "representante_nome",
      representanteDataNascimento: "representante_data_nascimento",
      representanteCpf: "representante_cpf",
      representanteNacionalidade: "representante_nacionalidade",
      representanteEstadoCivil: "representante_estado_civil",
      representanteOcupacao: "representante_ocupacao",
      representanteEnderecoResidencial: "representante_endereco_residencial",
      representanteEnderecoProfissional: "representante_endereco_profissional",
      representanteEmail: "representante_email",
      representanteTelefone: "representante_telefone",
      representanteRgNumero: "representante_rg_numero",
      representanteRgOrgao: "representante_rg_orgao",

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
      requeridoRgNumero: "requerido_rg_numero",
      requeridoRgOrgao: "requerido_rg_orgao",

      // Família Geral
      dataSeparacao: "data_separacao",
      bensPartilha: "bens_partilha",
      descricaoGuarda: "descricao_guarda",
      situacaoFinanceiraGenitora: "situacao_financeira_genitora",

      // Alimentos / Fixação
      valorMensalPensao: "valor_mensal_pensao",
      diaPagamentoRequerido: "dia_pagamento_requerido",

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
      cidadeAssinatura: "cidade_assinatura",
      relato: "relato",
    };

    const digitsOnlyFields = new Set([
      "cpf",
      "telefone",
      "whatsappContato",
      "representanteCpf",
      "representanteTelefone",
      "cpfRequerido",
      "requeridoTelefone",
    ]);

    // Ajuste para representação (criança): usa contatos do representante
    const valuesToSubmit = { ...formState };
    if (valuesToSubmit.assistidoEhIncapaz === "sim") {
      valuesToSubmit.telefone = valuesToSubmit.representanteTelefone;
      valuesToSubmit.emailAssistido = valuesToSubmit.representanteEmail;
      valuesToSubmit.assistidoEstadoCivil = "solteiro(a)";
    }

    // Preenche o FormData usando o mapeamento
    Object.keys(fieldMapping).forEach((key) => {
      const rawValue = valuesToSubmit[key];
      if (!rawValue) {
        return;
      }
      let normalizedValue = rawValue;
      if (digitsOnlyFields.has(key)) {
        normalizedValue = stripNonDigits(rawValue);
      } else if (currencyFields.has(key)) {
        normalizedValue = normalizeDecimalForSubmit(rawValue);
      }
      if (normalizedValue) {
        formData.append(fieldMapping[key], normalizedValue);
      }
    });

    // 2. Correção Crítica: Formatar Tipo de Ação para o Backend
    // O backend espera "Area - Ação" para saber qual template DOCX usar
    const tipoAcaoFormatado = `${formState.tipoAcao} - ${formState.acaoEspecifica}`;
    formData.append("tipoAcao", tipoAcaoFormatado);

    // Lógica para múltiplos filhos
    if (formState.assistidoEhIncapaz === "sim") {
      // Filho 1 (Principal)
      let infoFilhos = formState.nome;

      // Filhos Extras
      if (formState.outrosFilhos.length > 0) {
        const nomesExtras = formState.outrosFilhos
          .map((f) => f.nome)
          .filter((n) => n.trim() !== "")
          .join(", ");
        if (nomesExtras) infoFilhos += `, ${nomesExtras}`;

        // Envia o array completo como JSON string para o backend processar
        formData.append(
          "outros_filhos_detalhes",
          JSON.stringify(formState.outrosFilhos)
        );
      }

      // Envia a string completa com todos os nomes
      if (infoFilhos) {
        formData.append("filhos_info", infoFilhos);
      }
    }

    // 3. Construção de Campos Compostos para a IA (Gemini)
    // A IA usa 'dados_adicionais_requerente' para criar o resumo, então montamos uma string rica
    const dadosAdicionaisRequerente = [
      `RG: ${
        formState.assistidoRgNumero
          ? `${formState.assistidoRgNumero}${
              formState.assistidoRgOrgao ? ` ${formState.assistidoRgOrgao}` : ""
            }`
          : "Não informado"
      },`,
      `Nacionalidade: ${formState.assistidoNacionalidade || "Não informado"},`,
      !isFixacaoDeAlimentos ? `Estado Civil: ${formState.assistidoEstadoCivil || "Não informado"},` : "",
      `Data Nascimento: ${
        formatDateToBr(formState.dataNascimentoAssistido) || "Não informado"
      },`,
    ].filter(Boolean).join(" ");
    formData.append(
      "dados_adicionais_requerente",
      `${dadosAdicionaisRequerente.trim()} `
    );

    const detalhesRequerido = [];
    if (
      formState.requeridoOutrosSelecionados?.includes("requeridoRg") &&
      formState.requeridoRgNumero
    ) {
      detalhesRequerido.push(
        `RG: ${formState.requeridoRgNumero}${
          formState.requeridoRgOrgao ? ` ${formState.requeridoRgOrgao}` : ""
        }`
      );
    }
    if (
      formState.requeridoOutrosSelecionados?.includes(
        "requeridoDataNascimento"
      ) &&
      formState.requeridoDataNascimento
    ) {
      detalhesRequerido.push(
        `Data de nascimento: ${formatDateToBr(
          formState.requeridoDataNascimento
        )}`
      );
    }
    if (
      formState.requeridoOutrosSelecionados?.includes("requeridoNomeMae") &&
      formState.requeridoNomeMae
    ) {
      detalhesRequerido.push(`Nome da mãe: ${formState.requeridoNomeMae}`);
    }
    if (
      formState.requeridoOutrosSelecionados?.includes("requeridoNomePai") &&
      formState.requeridoNomePai
    ) {
      detalhesRequerido.push(`Nome do pai: ${formState.requeridoNomePai}`);
    }
    if (
      formState.requeridoOutrosSelecionados?.includes(
        "requeridoOutrosDetalhes"
      ) &&
      formState.requeridoOutrosDetalhes
    ) {
      detalhesRequerido.push(
        `Observações: ${formState.requeridoOutrosDetalhes}`
      );
    }
    if (detalhesRequerido.length > 0) {
      formData.append(
        "dados_adicionais_requerido",
        detalhesRequerido.join(" | ")
      );
    }

    // Arquivos e Arrays
    formData.append(
      "documentos_informados",
      JSON.stringify(formState.documentosMarcados)
    );
    formData.append(
      "documentos_nomes",
      JSON.stringify(formState.documentNames || {})
    );
    if (formState.audioBlob)
      formData.append("audio", formState.audioBlob, "gravacao.webm");
    formState.documentFiles.forEach((file) => {
      // Sanitiza o nome do arquivo (remove acentos) para evitar erros de encoding no servidor
      const safeName = file.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      formData.append("documentos", file, safeName);
    });

    try {
      const response = await fetch(`${API_BASE}/casos/novo`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha no servidor");
      setGeneratedCredentials({
        chaveAcesso: data.chaveAcesso,
        protocolo: data.protocolo,
      });
    } catch (error) {
      console.error("Erro:", error);
      toast.error(`Erro: ${error.message}`);
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

  const acoesDisponiveis =
    formState.tipoAcao && documentosPorAcao[formState.tipoAcao]
      ? Object.keys(documentosPorAcao[formState.tipoAcao])
      : acoesFallbackFamilia;

  const listaDeDocumentos =
    formState.tipoAcao &&
    formState.acaoEspecifica &&
    documentosPorAcao[formState.tipoAcao]?.[formState.acaoEspecifica]
      ? documentosPorAcao[formState.tipoAcao][formState.acaoEspecifica]
      : [];

  const isFixacaoOuOferta =
    acaoNorm.includes("fixa") || acaoNorm.includes("oferta");
  const isExecucao = acaoNorm.includes("execu");
  const isDivorcio = acaoNorm.includes("divór") || acaoNorm.includes("divor");
  const isAlvara = acaoNorm.includes("alvar");
  const showFixacaoBaseFields = isFixacaoOuOferta || isExecucao;

  // Lógica de Representação (CRUCIAL para organização)
  const isRepresentacao = formState.assistidoEhIncapaz === "sim";
  const labelAutor = isRepresentacao
    ? "Dados da Criança/Adolescente (Assistido)"
    : "Seus Dados (Você é o autor da ação)";
  const mostrarEmpregador = formState.requeridoTemEmpregoFormal === "sim";

  const handleSubmit = async (e) => {
    e.preventDefault();
    await processSubmission({
      isAlvaraContext: isAlvara,
      requiredDocs: listaDeDocumentos,
    });
  };

  const handleChecklistConfirm = async () => {
    setChecklistWarningOpen(false);
    await processSubmission({
      bypassChecklist: true,
      isAlvaraContext: isAlvara,
      requiredDocs: listaDeDocumentos,
    });
  };

  const handleChecklistReview = () => {
    setChecklistWarningOpen(false);
  };

  if (generatedCredentials) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card text-center p-8"
      >
        <h3 className="text-2xl font-bold text-muted mb-4">
          Cadastro Realizado!
        </h3>
        <div className="bg-surface border border-soft p-4 rounded-xl mb-4 text-left space-y-3">
          <div>
            <p className="text-xs text-muted uppercase font-bold">
              CPF (Seu Login)
            </p>
            <p className="text-xl font-mono text-primary-600">
              {formState.cpf}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted uppercase font-bold">
              Sua Senha (Chave de Acesso)
            </p>
            <p className="text-xl font-mono text-primary-600">
              {generatedCredentials.chaveAcesso}
            </p>
          </div>
          <div className="pt-2 border-t border-soft/50">
            <p className="text-x text-muted">
              Protocolo do sistema:{" "}
              <span className="font-mono text-primary-600">
                {generatedCredentials.protocolo}
              </span>
            </p>
          </div>
        </div>
        <div className="bg-border/10 p-3 rounded border border-border/30 text-error text-sm text-left flex gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p>
            Tire um print! Você precisará do seu CPF e desta Chave de Acesso
            para consultar o andamento.
          </p>
        </div>
        <button
          onClick={() => {
            dispatch({ type: "RESET_FORM" });
            setGeneratedCredentials(null);
            setFormErrors({});
          }}
          className="mt-6 btn btn-primary w-full"
        >
          Novo Atendimento
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto px-3 sm:px-0"
    >
      {/* AVISO INICIAL DE REQUISITOS */}
      <div className="card border-l-4 border-special mb-8 flex items-start gap-3">
        <Info className="text-special shrink-0 mt-1" size={24} />
        <div>
          <h3 className="font-bold text-special text-lg">Antes de começar</h3>
          <p className="text-muted mt-1">
            Tenha em mãos seus documentos (RG, Comprovante de renda, Comprovante
            de Residência e Certidão de nascimento). Para garantir a análise do
            seu caso, será necessário:
          </p>
          <ul className="list-disc list-inside text-muted text-sm mt-2 space-y-1 font-medium">
            <li>
              Anexar pelo menos esses <strong>4 documentos</strong>;
            </li>
          </ul>
        </div>
      </div>

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
                onChange={(e) =>
                  dispatch({ type: "SET_ACAO", tipoAcao: e.target.value })
                }
                className="input"
              >
                <option value="familia">Direito de Família</option>
                {/* Futuro: Outras áreas */}
              </select>
            </div>

            <div>
              <label className="label">
                Tipo de Ação (Selecione o mais próximo)
              </label>
              <select
                value={formState.acaoEspecifica}
                onChange={handleFieldChange}
                name="acaoEspecifica"
                {...validar("Selecione o tipo de ação.")}
                className="input font-medium text-text"
              >
                <option value="" disabled>
                  Tipo de Ação
                </option>
                {acoesDisponiveis.map((acao) => (
                  <option key={acao} value={acao}>
                    {acao}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Renderização condicional das próximas seções */}
        {formState.acaoEspecifica && (
          <>
            {/* --- ETAPA 2: IDENTIFICAÇÃO DO AUTOR (ASSISTIDO) --- */}
            <section className="card space-y-6 border-l-4 border-l-green-500">
              <div className="flex items-center gap-2 border-b border-soft pb-2">
                <User className="text-green-400" />
                <h2 className="heading-2">2. Quem está pedindo a ação?</h2>
              </div>

              {/* Pergunta Chave de Representação (agora condicional) */}
              {!isFixacaoDeAlimentos && (
                <div className="bg-surface p-4 rounded-lg border border-soft">
                  <label className="block text-sm font-semibold mb-2">
                    Para quem é este processo?
                  </label>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <label className="flex items-center gap-2 cursor-pointer p-3 bg-surface rounded-lg border border-soft hover:border-primary transition">
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
                    <label className="flex items-center gap-2 cursor-pointer bg-surface p-3 rounded-lg border border-soft hover:border-primary transition">
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
              )}

              {/* Dados do Autor/Asssitido */}
              <div className="space-y-4">
                <h3 className="heading-3 text-primary">{labelAutor}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Nome Completo *"
                    name="nome"
                    value={formState.nome}
                    onChange={handleFieldChange}
                    {...validar("Informe o nome completo.")}
                    className="input"
                  />
                  <div>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="CPF *"
                      name="cpf"
                      value={formState.cpf}
                      onChange={handleCpfChangeAndValidate("cpf")}
                      {...validar("Informe o CPF.")}
                      className={`input ${
                        formErrors.cpf ? "border-error ring-1 ring-error" : ""
                      }`}
                    />
                    {formErrors.cpf && (
                      <span className="text-xs text-error mt-1 ml-1">
                        {formErrors.cpf}
                      </span>
                    )}
                  </div>
                </div>
                <div
                  className={`grid grid-cols-1 ${isFixacaoDeAlimentos ? "md:grid-cols-2" : "md:grid-cols-3"} gap-4`}
                >
                  <input
                    type="date"
                    placeholder="Data de Nascimento"
                    name="dataNascimentoAssistido"
                    value={formState.dataNascimentoAssistido}
                    onChange={handleFieldChange}
                    className="input"
                  />
                  {!isRepresentacao && (
                  <select
                    name="assistidoNacionalidade"
                    value={formState.assistidoNacionalidade}
                    onChange={handleFieldChange}
                    className="input"
                  >
                    {nacionalidadeOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  )}
                  {!isRepresentacao && (
                    <select
                      name="assistidoEstadoCivil"
                      value={formState.assistidoEstadoCivil}
                      onChange={handleFieldChange}
                      className="input"
                    >
                      {estadoCivilOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  )}
                  {!isRepresentacao && (
                    <input
                      type="text"
                      placeholder="Sua Profissão"
                      name="assistidoOcupacao"
                      value={formState.assistidoOcupacao}
                      onChange={handleFieldChange}
                      className="input"
                    />
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {!isRepresentacao && (
                    <input
                      type="text"
                      placeholder="Seu Endereço Profissional (se houver)"
                      name="assistidoEnderecoProfissional"
                      value={formState.assistidoEnderecoProfissional}
                      onChange={handleFieldChange}
                      className="input"
                    />
                  )}
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="RG (Opcional)"
                    name="assistidoRgNumero"
                    value={formState.assistidoRgNumero}
                    onChange={handleRgChange("assistidoRgNumero")}
                    className="input"
                  />
                  <select
                    name="assistidoRgOrgao"
                    value={formState.assistidoRgOrgao}
                    onChange={handleFieldChange}
                    className="input"
                  >
                    {orgaoEmissorOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {!isRepresentacao && (
                    <input
                    type="text"
                    placeholder="Endereço Residencial Completo *"
                    name="enderecoAssistido"
                    value={formState.enderecoAssistido}
                    onChange={handleFieldChange}
                    {...validar("Informe o endereço completo.")}
                    className="input"
                    />
                  )}
                </div>
                {!isRepresentacao && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="email"
                      placeholder="Email (opcional)"
                      name="emailAssistido"
                      value={formState.emailAssistido}
                      onChange={handleFieldChange}
                      className="input"
                    />
                    <div className="relative">
                      <Phone
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                        size={18}
                      />
                      <input
                        type="text"
                        inputMode="tel"
                        placeholder="Telefone/WhatsApp para contato *"
                        name="telefone"
                        value={formState.telefone}
                        onChange={handlePhoneChange("telefone")}
                        {...validar("Informe um telefone para contato.")}
                        className="input pl-10"
                      />
                    </div>
                  </div>
                )}
                <div className="relative">
                  <Phone
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500"
                    size={18}
                  />
                  <input
                    type="text"
                    inputMode="tel"
                    placeholder="WhatsApp para receber o link da reunião *"
                    name="whatsappContato"
                    value={formState.whatsappContato}
                    onChange={handlePhoneChange("whatsappContato")}
                    className={`input pl-10 border-green-500/30 focus:ring-green-500 ${formErrors.whatsappContato ? "border-red-500 ring-1 ring-red-500" : ""}`}
                  />
                </div>
                {formErrors.whatsappContato && (
                  <p className="text-xs text-error font-medium">
                    {formErrors.whatsappContato}
                  </p>
                )}
              </div>

              {/* --- SEÇÃO DE MÚLTIPLOS FILHOS --- */}
              {isRepresentacao && (
                <div className="mt-6 space-y-4">
                  {formState.outrosFilhos.map((filho, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="bg-surface-alt p-4 rounded-lg border border-soft relative group"
                    >
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-semibold text-sm text-primary">
                          Filho(a) {index + 2}
                        </h4>
                        <button
                          type="button"
                          onClick={() =>
                            dispatch({ type: "REMOVE_FILHO", index })
                          }
                          className="text-error hover:text-error p-1"
                          title="Remover"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                          type="text"
                          placeholder="Nome Completo *"
                          value={filho.nome}
                          onChange={(e) =>
                            dispatch({
                              type: "UPDATE_FILHO",
                              index,
                              field: "nome",
                              value: e.target.value,
                            })
                          }
                          className="input"
                          {...validar("Informe o nome do filho.")}
                        />
                        <div>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="CPF *"
                            value={filho.cpf}
                            onChange={(e) => {
                              const rawValue = e.target.value;
                              const formattedValue = formatCpf(rawValue);
                              const fieldName = `filho_cpf_${index}`;

                              dispatch({
                                type: "UPDATE_FILHO",
                                index,
                                field: "cpf",
                                value: formattedValue,
                              });

                              const cleanCpf = stripNonDigits(rawValue);
                              if (cleanCpf.length === 11) {
                                if (!validateCpfAlgorithm(cleanCpf)) {
                                  setFormErrors((prev) => ({ ...prev, [fieldName]: "CPF inválido." }));
                                } else {
                                  setFormErrors((prev) => {
                                    const updated = { ...prev };
                                    delete updated[fieldName];
                                    return updated;
                                  });
                                }
                              } else {
                                setFormErrors((prev) => {
                                  const updated = { ...prev };
                                  delete updated[fieldName];
                                  return updated;
                                });
                              }
                            }}
                            className={`input ${formErrors[`filho_cpf_${index}`] ? "border-error ring-1 ring-error" : ""}`}
                            {...validar("Informe o CPF do filho.")}
                          />
                          {formErrors[`filho_cpf_${index}`] && (
                            <span className="text-xs text-error mt-1 ml-1">
                              {formErrors[`filho_cpf_${index}`]}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <input
                          type="date"
                          placeholder="Data de Nascimento *"
                          value={filho.dataNascimento}
                          onChange={(e) =>
                            dispatch({
                              type: "UPDATE_FILHO",
                              index,
                              field: "dataNascimento",
                              value: e.target.value,
                            })
                          }
                          className="input"
                          {...validar("Informe a data de nascimento.")}
                        />
                        <select
                          value={filho.nacionalidade}
                          onChange={(e) =>
                            dispatch({
                              type: "UPDATE_FILHO",
                              index,
                              field: "nacionalidade",
                              value: e.target.value,
                            })
                          }
                          className="input"
                          {...validar("Selecione a nacionalidade.")}
                        >
                          {nacionalidadeOptions.map((o) => (
                            <option
                              key={`filho-nac-${index}-${o.value}`}
                              value={o.value}
                            >
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="RG (Opcional)"
                          value={filho.rgNumero}
                          onChange={(e) =>
                            dispatch({
                              type: "UPDATE_FILHO",
                              index,
                              field: "rgNumero",
                              value: formatRgNumber(e.target.value),
                            })
                          }
                          className="input"
                        />
                        <select
                          value={filho.rgOrgao}
                          onChange={(e) =>
                            dispatch({
                              type: "UPDATE_FILHO",
                              index,
                              field: "rgOrgao",
                              value: e.target.value,
                            })
                          }
                          className="input"
                        >
                          {orgaoEmissorOptions.map((option) => (
                            <option
                              key={`filho-${index}-${option.value}`}
                              value={option.value}
                            >
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </motion.div>
                  ))}

                  <button
                    type="button"
                    onClick={() => dispatch({ type: "ADD_FILHO" })}
                    className="btn btn-ghost border border-dashed border-primary text-primary w-full flex items-center justify-center gap-2 hover:bg-primary/5"
                  >
                    <Plus size={18} />
                    Adicionar mais um filho(a)
                  </button>
                </div>
              )}

              {/* Dados do Representante (Condicional) */}
              {isRepresentacao && (
                <div className="bg-surface-alt p-4 rounded-lg border-l-4 border-primary space-y-4 mt-4 bg-amber-500/5">
                  <h3 className="heading-3 text-primary">
                    Dados do Representante Legal (Você)
                  </h3>
                  <p className="text-sm text-muted mb-2">
                    Preencha com seus dados (mãe, pai, tutor) que está agindo em
                    nome da criança acima.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Seu Nome Completo *"
                      name="representanteNome"
                      value={formState.representanteNome}
                      onChange={handleFieldChange}
                      className="input"
                      {...validar("Informe o nome do representante.")}
                    />
                    <div>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Seu CPF *"
                        name="representanteCpf"
                        value={formState.representanteCpf}
                        onChange={handleCpfChangeAndValidate("representanteCpf")}
                        className={`input ${
                          formErrors.representanteCpf
                            ? "border-error ring-1 ring-error"
                            : ""
                        }`}
                        {...validar("Informe o CPF do representante.")}
                      />
                      {formErrors.representanteCpf && (
                        <span className="text-xs text-error mt-1 ml-1">
                          {formErrors.representanteCpf}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                      type="date"
                      placeholder="Sua Data de Nascimento"
                      name="representanteDataNascimento"
                      value={formState.representanteDataNascimento}
                      onChange={handleFieldChange}
                      className="input"
                    />
                    <select
                      name="representanteNacionalidade"
                      value={formState.representanteNacionalidade}
                      onChange={handleFieldChange}
                      className="input"
                    >
                      {nacionalidadeOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <select
                      name="representanteEstadoCivil"
                      value={formState.representanteEstadoCivil}
                      onChange={handleFieldChange}
                      className="input"
                    >
                      {estadoCivilOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Sua Profissão"
                      name="representanteOcupacao"
                      value={formState.representanteOcupacao}
                      onChange={handleFieldChange}
                      className="input"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Seu Endereço Residencial *"
                      name="representanteEnderecoResidencial"
                      value={formState.representanteEnderecoResidencial}
                      onChange={handleFieldChange}
                      className="input"
                    />
                    <input
                      type="text"
                      placeholder="Seu Endereço Profissional (se houver)"
                      name="representanteEnderecoProfissional"
                      value={formState.representanteEnderecoProfissional}
                      onChange={handleFieldChange}
                      className="input"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="email"
                      placeholder="Seu Email"
                      name="representanteEmail"
                      value={formState.representanteEmail}
                      onChange={handleFieldChange}
                      className="input"
                    />
                    <input
                      type="text"
                      inputMode="tel"
                      placeholder="Seu Telefone"
                      name="representanteTelefone"
                      value={formState.representanteTelefone}
                      onChange={handlePhoneChange("representanteTelefone")}
                      className="input"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Seu RG (Opcional)"
                      name="representanteRgNumero"
                      value={formState.representanteRgNumero}
                      onChange={handleRgChange("representanteRgNumero")}
                      className="input"
                    />
                    <select
                      name="representanteRgOrgao"
                      value={formState.representanteRgOrgao}
                      onChange={handleFieldChange}
                      className="input"
                    >
                      {orgaoEmissorOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </section>

            {/* --- ETAPA 3: DADOS DA OUTRA PARTE (REQUERIDO) --- */}
            {!isAlvara && (
              <section className="card space-y-4 border-l-4 border-l-red-500">
                <div className="flex items-center gap-2 border-b border-soft pb-2">
                  <Users className="text-red-400" />
                  <h2 className="heading-2">
                    3. Contra quem é a ação? (Requerido)
                  </h2>
                </div>
                <p className="text-sm text-muted">
                  Preencha com o máximo de informações que você souber.
                </p>
                <p className="text-thirt text-sm">
                  Informando o Número para contato aumenta em 40% as chances do
                  processo progredir mais rapido.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <input
                      type="text"
                      placeholder="Nome Completo da outra parte *"
                      name="nomeRequerido"
                      value={formState.nomeRequerido}
                      onChange={handleFieldChange}
                      className="input"
                      aria-invalid={Boolean(formErrors.nomeRequerido)}
                    />
                    {formErrors.nomeRequerido && (
                      <p className="text-xs text-red-500 mt-1">
                        {formErrors.nomeRequerido}
                      </p>
                    )}
                  </div>
                  <div>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="CPF (se souber)"
                      name="cpfRequerido"
                      value={formState.cpfRequerido}
                      onChange={handleCpfChangeAndValidate("cpfRequerido")}
                      className="input"
                    />
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="Endereço Residencial (pelo menos um contato é obrigatório) *"
                    name="enderecoRequerido"
                    value={formState.enderecoRequerido}
                    onChange={handleFieldChange}
                    className="input"
                    aria-invalid={Boolean(formErrors.requeridoContato)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <input
                      type="text"
                      inputMode="tel"
                      placeholder="Telefone (pelo menos um contato é obrigatório) *"
                      name="requeridoTelefone"
                      value={formState.requeridoTelefone}
                      onChange={handlePhoneChange("requeridoTelefone")}
                      className="input"
                      aria-invalid={Boolean(formErrors.requeridoContato)}
                    />
                  </div>
                  <div>
                    <input
                      type="email"
                      placeholder="Email (pelo menos um contato é obrigatório) *"
                      name="requeridoEmail"
                      value={formState.requeridoEmail}
                      onChange={handleFieldChange}
                      className="input"
                    />
                  </div>
                </div>
                {formErrors.requeridoContato && (
                  <p className="text-xs text-red-500">
                    {formErrors.requeridoContato}
                  </p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    placeholder="Profissão (se souber)"
                    name="requeridoOcupacao"
                    value={formState.requeridoOcupacao}
                    onChange={handleFieldChange}
                    className="input"
                  />
                  <select
                    name="requeridoNacionalidade"
                    value={formState.requeridoNacionalidade}
                    onChange={handleFieldChange}
                    className="input"
                  >
                    {nacionalidadeOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <select
                    name="requeridoEstadoCivil"
                    value={formState.requeridoEstadoCivil}
                    onChange={handleFieldChange}
                    className="input"
                  >
                    {estadoCivilOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <input
                  type="text"
                  placeholder="Endereço de Trabalho (se souber)"
                  name="requeridoEnderecoProfissional"
                  value={formState.requeridoEnderecoProfissional}
                  onChange={handleFieldChange}
                  className="input"
                />

                <div className="border border-dashed border-soft rounded-xl p-4 space-y-3 bg-app/40">
                  <p className="label mb-0">
                    Quais dessas informações adicionais você possui?
                  </p>
                  <div className="space-y-2">
                    {outrosDadosRequeridoConfig.map((item) => {
                      const selecionado =
                        formState.requeridoOutrosSelecionados.includes(
                          item.key,
                        );
                      return (
                        <div
                          key={item.key}
                          className="bg-surface rounded-lg border border-soft/60 p-3 space-y-2"
                        >
                          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                            <input
                              type="checkbox"
                              className="w-4 h-4 accent-primary"
                              checked={selecionado}
                              onChange={() => toggleRequeridoDetalhe(item.key)}
                            />
                            <span>{item.label}</span>
                          </label>
                          {selecionado && (
                            <>
                              {item.renderType === "rg" && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="RG"
                                    name="requeridoRgNumero"
                                    value={formState.requeridoRgNumero}
                                    onChange={handleRgChange(
                                      "requeridoRgNumero",
                                    )}
                                    className="input"
                                  />
                                  <select
                                    name="requeridoRgOrgao"
                                    value={formState.requeridoRgOrgao}
                                    onChange={handleFieldChange}
                                    className="input"
                                  >
                                    {orgaoEmissorOptions.map((option) => (
                                      <option
                                        key={option.value}
                                        value={option.value}
                                      >
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                              {item.renderType === "date" && (
                                <input
                                  type="date"
                                  name={item.field}
                                  value={formState[item.field]}
                                  onChange={handleFieldChange}
                                  className="input"
                                />
                              )}
                              {item.renderType === "text" && (
                                <input
                                  type="text"
                                  name={item.field}
                                  value={formState[item.field]}
                                  onChange={handleFieldChange}
                                  className="input"
                                  placeholder={item.placeholder}
                                />
                              )}
                              {item.renderType === "textarea" && (
                                <textarea
                                  name={item.field}
                                  value={formState[item.field]}
                                  onChange={handleFieldChange}
                                  className="input"
                                  rows="2"
                                  placeholder={item.placeholder}
                                />
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            {/* --- ETAPA 4: DETALHES ESPECÍFICOS (CONDICIONAL) --- */}
            <section className="card space-y-6 border-l-4 border-l-green-500">
              <div className="flex items-center gap-2 border-b border-soft pb-2">
                <Briefcase className="text-green-400" />
                <h2 className="heading-2">4. Detalhes do Caso</h2>
              </div>

              {/* CAMPOS DE FIXAÇÃO / OFERTA / EXECUÇÃO (VALORES) */}
              {showFixacaoBaseFields && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-primary">
                    Valores e Pagamento (Pedido Principal)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">
                        Valor Mensal da Pensão e Despesas Extras
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-semibold">
                          R$
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          name="valorMensalPensao"
                          value={formState.valorMensalPensao}
                          onChange={handleCurrencyChange("valorMensalPensao")}
                          placeholder="0,00"
                          className="input pl-12"
                          {...validar("Informe o valor da pensão.")}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4 rounded-lg border border-soft p-4 bg-surface">
                    <h4 className="font-semibold text-text">
                      Dados para Depósito da Pensão
                    </h4>
                    <div>
                      <label className="label">Tipo de Conta</label>
                      <select
                        name="tipoContaDeposito"
                        value={formState.tipoContaDeposito}
                        onChange={handleFieldChange}
                        className="input"
                      >
                        <option value="">Tipo de Conta</option>
                        <option value="corrente_poupanca">
                          Conta Corrente / Poupança
                        </option>
                        <option value="pix">PIX</option>
                        <option value="outro">Outro / Não sei</option>
                      </select>
                    </div>

                    {formState.tipoContaDeposito === "corrente_poupanca" && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input
                          type="text"
                          name="bancoDeposito"
                          value={formState.bancoDeposito}
                          onChange={handleFieldChange}
                          placeholder="Nome do Banco"
                          className="input"
                        />
                        <input
                          type="text"
                          name="agenciaDeposito"
                          value={formState.agenciaDeposito}
                          onChange={handleFieldChange}
                          placeholder="Agência"
                          className="input"
                        />
                        <input
                          type="text"
                          name="contaDeposito"
                          value={formState.contaDeposito}
                          onChange={handleFieldChange}
                          placeholder="Conta com dígito"
                          className="input"
                        />
                      </div>
                    )}

                    {formState.tipoContaDeposito === "pix" && (
                      <div>
                        <label className="label">Chave PIX</label>
                        <input
                          type="text"
                          name="chavePixDeposito"
                          value={formState.chavePixDeposito}
                          onChange={handleFieldChange}
                          placeholder="CPF, e-mail, telefone, etc."
                          className="input"
                        />
                      </div>
                    )}

                    {formState.tipoContaDeposito === "outro" && (
                      <div>
                        <label className="label">
                          Descreva os dados que você possui
                        </label>
                        <textarea
                          name="outrosDadosDeposito"
                          value={formState.outrosDadosDeposito}
                          onChange={handleFieldChange}
                          rows="2"
                          className="input"
                          placeholder="Informe todos os dados para depósito que você tiver"
                        ></textarea>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* EMPREGO DO REQUERIDO */}
              {showFixacaoBaseFields && (
                <div className="space-y-4 pt-4 border-t border-soft">
                  <h4 className="font-semibold text-primary">
                    Sobre o Emprego da Outra Parte
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">
                        A outra parte tem carteira assinada?
                      </label>
                      <select
                        name="requeridoTemEmpregoFormal"
                        value={formState.requeridoTemEmpregoFormal}
                        onChange={handleFieldChange}
                        className="input"
                      >
                        <option value="">Tem carteira assinada?</option>
                        <option value="sim">Sim</option>
                        <option value="nao">Não</option>
                        <option value="nao_sei">Não sei</option>
                      </select>
                    </div>
                    {mostrarEmpregador && (
                      <>
                        <input
                          type="text"
                          placeholder="Nome da Empresa"
                          name="empregadorRequeridoNome"
                          value={formState.empregadorRequeridoNome}
                          onChange={handleFieldChange}
                          className="input"
                        />
                        <input
                          type="text"
                          placeholder="Endereço da Empresa"
                          name="empregadorRequeridoEndereco"
                          value={formState.empregadorRequeridoEndereco}
                          onChange={handleFieldChange}
                          className="input md:col-span-2"
                        />
                        <input
                          type="email"
                          placeholder="Email da Empresa (para ofício)"
                          name="empregadorEmail"
                          value={formState.empregadorEmail}
                          onChange={handleFieldChange}
                          className="input md:col-span-2"
                        />
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* CAMPOS DE EXECUÇÃO */}
              {isExecucao && (
                <div className="space-y-4 pt-4 border-t border-soft">
                  <h4 className="font-semibold text-primary">
                    Dados do Processo de Alimentos Original
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Número do Processo Original"
                      name="numeroProcessoOriginario"
                      value={formState.numeroProcessoOriginario}
                      onChange={handleFieldChange}
                      className="input"
                    />
                    <input
                      type="text"
                      placeholder="Nº do Título (se houver)"
                      name="processoTituloNumero"
                      value={formState.processoTituloNumero}
                      onChange={handleFieldChange}
                      className="input"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                      type="text"
                      placeholder="Vara onde tramitou"
                      name="varaOriginaria"
                      value={formState.varaOriginaria}
                      onChange={handleFieldChange}
                      className="input"
                    />

                    <input
                      type="number"
                      min="1"
                      max="31"
                      placeholder="Dia (1-31)"
                      name="diaPagamentoFixado"
                      value={formState.diaPagamentoFixado}
                      onChange={handleDayInputChange("diaPagamentoFixado")}
                      className="input"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Período da Dívida (ex: Jan/2023 a Dez/2023)"
                      name="periodoDebitoExecucao"
                      value={formState.periodoDebitoExecucao}
                      onChange={handleFieldChange}
                      className="input"
                    />
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-semibold">
                        R$
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0,00"
                        name="valorTotalDebitoExecucao"
                        value={formState.valorTotalDebitoExecucao}
                        onChange={handleCurrencyChange(
                          "valorTotalDebitoExecucao",
                        )}
                        className="input pl-12"
                      />
                    </div>
                  </div>
                  {/* Fields for "definitivo" values can also be useful in execution cases */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4"></div>
                </div>
              )}

              {/* CAMPOS DE DIVÓRCIO */}
              {isDivorcio && (
                <div className="space-y-4 pt-4 border-t border-soft">
                  <h4 className="font-semibold text-primary">
                    Dados do Divórcio
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">
                        Regime de Bens do Casamento
                      </label>
                      <input
                        type="text"
                        name="regimeBens"
                        value={formState.regimeBens}
                        onChange={handleFieldChange}
                        placeholder="Ex: Comunhão Parcial de Bens"
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">
                        Deseja voltar a usar o nome de solteira?
                      </label>
                      <select
                        name="retornoNomeSolteira"
                        value={formState.retornoNomeSolteira}
                        onChange={handleFieldChange}
                        className="input"
                      >
                        <option value="">Voltar ao nome de solteira?</option>
                        <option value="sim">Sim</option>
                        <option value="nao">Não</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="label">
                      Haverá pedido de pensão para o(a) ex-cônjuge?
                    </label>
                    <input
                      type="text"
                      name="alimentosParaExConjuge"
                      value={formState.alimentosParaExConjuge}
                      onChange={handleFieldChange}
                      placeholder="Ex: Sim, no valor de R$ 500"
                      className="input"
                    />
                  </div>
                </div>
              )}

              {/* CAMPOS GERAIS DE FAMÍLIA (Filhos, Bens, Datas) */}
              <div className="space-y-4 pt-4 border-t border-soft">
                <h4 className="font-semibold text-primary">
                  Vínculos, Guarda...
                </h4>

                <div>
                  <label className="label">
                    Como a guarda dos filhos é exercida hoje?
                  </label>
                  <textarea
                    name="descricaoGuarda"
                    value={formState.descricaoGuarda}
                    onChange={handleFieldChange}
                    rows="2"
                    placeholder="Ex: A guarda de fato é minha, e o pai visita aos fins de semana."
                    className="input"
                  ></textarea>
                </div>
                {!isFixacaoDeAlimentos && (
                  <div>
                    <label className="label">
                      Bens a Partilhar (Carros, Casas, Móveis)
                    </label>
                    <textarea
                      name="bensPartilha"
                      value={formState.bensPartilha}
                      onChange={handleFieldChange}
                      rows="2"
                      placeholder="Descreva os bens e se há acordo sobre a divisão"
                      className="input"
                    ></textarea>
                  </div>
                )}
                <div>
                  <label className="label">
                    Situação Financeira de quem cuida dos filhos
                  </label>
                  <textarea
                    name="situacaoFinanceiraGenitora"
                    value={formState.situacaoFinanceiraGenitora}
                    onChange={handleFieldChange}
                    rows="2"
                    placeholder="Descreva brevemente sua situação financeira (renda, ajuda de familiares, etc.)"
                    className="input"
                  ></textarea>
                </div>
              </div>
            </section>

            {/* --- DADOS PROCESSUAIS GERAIS --- */}
            <section className="card space-y-4 border-l-4 border-l-purple-500">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="text-purple-400" />
                <h2 className="heading-2">Dados Processuais</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="label">Cidade para assinatura</label>
                  <input
                    type="text"
                    name="cidadeAssinatura"
                    value={formState.cidadeAssinatura}
                    onChange={handleCidadeChange}
                    onBlur={() =>
                      setTimeout(() => setMostrarSugestoes(false), 150)
                    }
                    placeholder="Ex: Teixeira de Freitas"
                    className="input"
                    autoComplete="off"
                  />
                  {mostrarSugestoes && sugestoesCidades.length > 0 && (
                    <ul className="absolute z-10 w-full bg-surface border border-soft rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
                      {sugestoesCidades.map((cidade) => (
                        <li
                          key={cidade}
                          onMouseDown={() => handleSelecionaCidade(cidade)}
                          className="p-2 hover:bg-app cursor-pointer"
                        >
                          {cidade}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </section>

            {/* --- ETAPA 5: RELATO E DOCUMENTOS --- */}
            <section className="card space-y-6 border-l-4 border-l-indigo-500">
              <div className="flex items-center gap-2 border-b border-soft pb-2">
                <FileText className="text-indigo-400" />
                <h2 className="heading-2">
                  5. Conte sua História e Anexe Provas
                </h2>
              </div>

              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="label font-bold mb-0">
                    Relato dos Fatos (O que aconteceu?)
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer bg-surface p-2 rounded-lg border border-soft hover:border-primary transition select-none">
                    <input
                      type="checkbox"
                      name="prefersAudio"
                      checked={formState.prefersAudio}
                      onChange={(e) =>
                        dispatch({
                          type: "UPDATE_FIELD",
                          field: "prefersAudio",
                          value: e.target.checked,
                        })
                      }
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-primary font-medium flex items-center gap-1">
                      <Mic size={14} /> Prefiro enviar áudio
                    </span>
                  </label>
                </div>
                <textarea
                  placeholder={
                    formState.prefersAudio
                      ? "Se desejar, faça um breve resumo aqui (opcional)..."
                      : "Conte detalhadamente o que aconteceu, por que você precisa da justiça, como está a situação atual..."
                  }
                  value={formState.relato}
                  onChange={handleFieldChange}
                  name="relato"
                  rows="10"
                  className={`input w-full ${formErrors.relato ? "border-error ring-1 ring-error" : ""}`}
                ></textarea>

                {/* Barra de Progresso */}
                {!formState.prefersAudio && (
                  <div className="w-full h-2 bg-app rounded-full mt-2 overflow-hidden border border-soft">
                    <div
                      className={`h-full transition-all duration-500 ${
                        (formState.relato || "").length >= 250
                          ? "bg-success"
                          : "bg-error"
                      }`}
                      style={{
                        width: `${Math.min(((formState.relato || "").length / 250) * 100, 100)}%`,
                      }}
                    />
                  </div>
                )}

                <div className="flex justify-between mt-1 px-1">
                  <span className="text-xs text-error font-medium">
                    {formErrors.relato}
                  </span>
                  {!formState.prefersAudio && (
                    <span
                      className={`text-xs font-medium ${(formState.relato || "").length < 250 ? "text-error" : "text-success"}`}
                    >
                      {(formState.relato || "").length} / 250 caracteres
                    </span>
                  )}
                </div>
              </div>

              {/* Gravação de Áudio */}
              <div
                className={`bg-surface p-4 rounded-lg border border-dashed ${formErrors.audio ? "border-error bg-red-50/10" : "border-soft"} flex flex-col items-center justify-center gap-3`}
              >
                <p className="text-sm text-muted">
                  {formState.prefersAudio ? (
                    <strong className="text-primary">
                      Grave seu relato aqui (Obrigatório)
                    </strong>
                  ) : (
                    "Prefere falar? Grave um áudio contando sua história."
                  )}
                </p>
                {!isRecording && !formState.audioBlob && (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="btn btn-secondary rounded-full px-6"
                  >
                    <Mic size={20} /> Iniciar Gravação
                  </button>
                )}
                {isRecording && (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="btn btn-error animate-pulse rounded-full px-6 text-red-600 bg-red-100 border-red-200"
                  >
                    <Square size={20} /> Parar Gravação
                  </button>
                )}
                {formState.audioBlob && (
                  <div className="flex items-center gap-4 w-full max-w-md bg-slate-100 dark:bg-slate-700 p-2 rounded-full">
                    <audio
                      src={URL.createObjectURL(formState.audioBlob)}
                      controls
                      className="w-full h-8"
                    />
                    <button
                      type="button"
                      onClick={removeAudioRecording}
                      className="text-red-500 p-1 hover:bg-red-100 rounded-full"
                    >
                      <X size={18} />
                    </button>
                  </div>
                )}
              </div>
              {formErrors.audio && (
                <p className="text-sm text-error font-bold text-center">
                  {formErrors.audio}
                </p>
              )}

              {/* Checklist e Upload */}
              {listaDeDocumentos.length > 0 && (
                <div className="bg-surface p-4 rounded-lg border border-soft">
                  <h3 className="heading-3 mb-3">
                    Lista de Documentos Necessários
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                    {listaDeDocumentos.map((doc) => (
                      <label
                        key={doc}
                        className="flex items-start gap-2 p-2 rounded-md cursor-pointer text-sm transition-colors hover:bg-primary/5 select-none"
                      >
                        <input
                          type="checkbox"
                          name={doc}
                          onChange={handleCheckboxChange}
                          className="mt-1 w-4 h-4 accent-primary"
                        />
                        <span className="text-muted">{doc}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div
                className={`bg-surface p-4 rounded-lg border border-dashed ${formErrors.documentos ? "border-error bg-red-50/10" : "border-soft"}`}
              >
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
                  className="btn btn-ghost w-full border border-soft border-dashed h-24 flex flex-col gap-2 text-muted hover:text-primary hover:border-primary"
                >
                  <Paperclip size={24} className="mx-auto" />
                  <span>Clique para anexar fotos ou PDFs dos documentos</span>
                </button>

                {formState.documentFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {formState.documentFiles.map((file, idx) => (
                      <div
                        key={`${file.name}-${idx}`}
                        className="flex items-center justify-between bg-slate-100 dark:bg-slate-700 p-2 rounded text-sm"
                      >
                        <span className="truncate max-w-xs">{file.name}</span>
                        <input
                          type="text"
                          placeholder="Nomeie este documento (ex: RG, Comprovante)"
                          className="input py-1 px-2 text-sm flex-1 h-8"
                          value={formState.documentNames?.[file.name] || ""}
                          onChange={(e) =>
                            handleDocumentNameChange(file.name, e.target.value)
                          }
                        />
                        <button
                          type="button"
                          onClick={() => removeDocument(file.name)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {formErrors.documentos && (
                <p className="text-sm text-red-500 font-bold text-center">
                  {formErrors.documentos}
                </p>
              )}
            </section>

            {/* --- BOTÃO FINAL --- */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full py-4 text-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    Processando...
                  </span>
                ) : (
                  <>
                    <Upload size={20} /> Enviar Caso para a Defensoria
                  </>
                )}
              </button>
              {loading && (
                <p className="text-center text-sm text-muted mt-2 animate-pulse">
                  {statusMessage}
                </p>
              )}
            </div>
          </>
        )}
      </form>
      {checklistWarningOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-surface max-w-md w-full rounded-2xl p-6 border border-soft shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-secondary" />
              <h3 className="text-lg font-semibold">Documentos obrigatórios</h3>
            </div>
            7
            <p className="text-sm text-muted">
              Você está enviando o caso sem marcar nenhum documento obrigatório
              para esta ação. Confirme que está ciente para continuar ou volte
              para revisar a lista.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleChecklistReview}
                className="btn btn-ghost border border-soft flex-1"
              >
                Revisar checklist
              </button>
              <button
                type="button"
                onClick={handleChecklistConfirm}
                className="btn btn-primary flex-1"
              >
                OK, enviar assim mesmo
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
