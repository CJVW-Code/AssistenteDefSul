import React, { useState, useRef, useEffect } from "react";
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
export const FormularioSubmissao = () => {
  // --- ESTADOS DO FORMULÃRIO ---
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [tipoAcao, setTipoAcao] = useState("familia"); // Quando for adicionar outras areas, Remover
  const [relato, setRelato] = useState("");
  const [documentFiles, setDocumentFiles] = useState([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [acaoEspecifica, setAcaoEspecifica] = useState("");
  const [documentosMarcados, setDocumentosMarcados] = useState([]);

  // --- NOVOS ESTADOS PARA DADOS ADICIONAIS ---
  const [enderecoAssistido, setEnderecoAssistido] = useState("");
  const [emailAssistido, setEmailAssistido] = useState("");
  const [dadosAdicionaisRequerente, setDadosAdicionaisRequerente] =
    useState("");

  const [nomeRequerido, setNomeRequerido] = useState("");
  const [cpfRequerido, setCpfRequerido] = useState("");
  const [enderecoRequerido, setEnderecoRequerido] = useState("");
  const [dadosAdicionaisRequerido, setDadosAdicionaisRequerido] = useState("");

  const [filhosInfo, setFilhosInfo] = useState("");
  const [dataInicioRelacao, setDataInicioRelacao] = useState("");
  const [dataSeparacao, setDataSeparacao] = useState("");
  const [bensPartilha, setBensPartilha] = useState("");

  // --- CAMPOS ESPECÍFICOS: FIXAÇÃO/OFERTA DE ALIMENTOS ---
  const [percentualSmRequerido, setPercentualSmRequerido] = useState("");
  const [percentualDespesasExtra, setPercentualDespesasExtra] = useState("");
  const [diaPagamentoRequerido, setDiaPagamentoRequerido] = useState("");
  const [dadosBancariosDeposito, setDadosBancariosDeposito] = useState("");
  const [requeridoTemEmpregoFormal, setRequeridoTemEmpregoFormal] =
    useState(""); // "sim" | "nao" | "nao_sei"
  const [empregadorRequeridoNome, setEmpregadorRequeridoNome] = useState("");
  const [empregadorRequeridoEndereco, setEmpregadorRequeridoEndereco] =
    useState("");

  // --- CAMPOS ESPECÍFICOS: EXECUÇÃO DE ALIMENTOS ---
  const [numeroProcessoOriginario, setNumeroProcessoOriginario] = useState("");
  const [varaOriginaria, setVaraOriginaria] = useState("");
  const [percentualOuValorFixado, setPercentualOuValorFixado] = useState("");
  const [diaPagamentoFixado, setDiaPagamentoFixado] = useState("");
  const [periodoDebitoExecucao, setPeriodoDebitoExecucao] = useState("");
  const [valorTotalDebitoExecucao, setValorTotalDebitoExecucao] = useState("");

  // --- CAMPOS ESPECÍFICOS: DIVÓRCIO ---
  const [regimeBens, setRegimeBens] = useState("");
  const [retornoNomeSolteira, setRetornoNomeSolteira] = useState("");
  const [alimentosParaExConjuge, setAlimentosParaExConjuge] = useState("");

  // --- ESTADOS DA GRAVAÃ‡ÃƒO DE ÃUDIO ---
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null); // Armazena o Ã¡udio gravado como Blob
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // --- ESTADOS DE CONTROLE ---
  const [loading, setLoading] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState(null);
  const documentInputRef = useRef(null);

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
    "FixaÃ§Ã£o de PensÃ£o AlimentÃ­cia",
    "DivÃ³rcio",
    "Reconhecimento e DissoluÃ§Ã£o de UniÃ£o EstÃ¡vel",
    "Guarda de Filhos",
    "AlvarÃ¡",
    "ExecuÃ§Ã£o de Alimentos Rito Penhora/PrisÃ£o",
    "RevisÃ£o de Alimentos",
  ];

  const acoesParaMostrar =
    tipoAcao === "familia" &&
    (!acoesDisponiveis || acoesDisponiveis.length === 0)
      ? acoesFallbackFamilia
      : acoesDisponiveis;

  // Mostrar dados do Requerido apenas quando a aÃ§Ã£o exigir
  const shouldShowRequerido = !acaoEspecifica
    ? true
    : !acaoEspecifica.toLowerCase().includes("alvar");

  // --- HELPERS DE CONDIÇÃO POR AÇÃO ESPECÍFICA ---
  const acaoNorm = (acaoEspecifica || "").toLowerCase();
  const isFixacaoOuOferta = acaoNorm.includes("fixa") || acaoNorm.includes("oferta");
  const isExecucao = acaoNorm.includes("execu");
  const isDivorcio = acaoNorm.includes("divór") || acaoNorm.includes("divor");
  const showFixacaoBaseFields = isFixacaoOuOferta || isExecucao;
  const mostrarEmpregador = requeridoTemEmpregoFormal === "sim";

  // --- LÃ“GICA DE VALIDAÃ‡ÃƒO DE INPUT ---
  const handleNumericInput = (e, setter) => {
    const value = e.target.value;
    // Permite apenas nÃºmeros e um campo vazio
    if (/^[0-9]*$/.test(value)) {
      setter(value);
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
        setAudioBlob(audioBlob);
        audioChunksRef.current = [];
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Erro ao acessar o microfone:", err);
      alert(
        "NÃ£o foi possÃ­vel acessar o microfone. Verifique as permissÃµes do navegador."
      );
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  const removeAudioRecording = () => {
    setAudioBlob(null);
  };

  // --- LÃ“GICA DE UPLOAD DE ARQUIVOS ---
  const handleDocumentChange = (e) => {
    const novosArquivos = Array.from(e.target.files);
    setDocumentFiles((prevFiles) => [...prevFiles, ...novosArquivos]);
  };

  const removeDocument = (fileName) => {
    setDocumentFiles((prevFiles) =>
      prevFiles.filter((file) => file.name !== fileName)
    );
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
      setDocumentosMarcados((prev) => [...prev, name]);
    } else {
      setDocumentosMarcados((prev) => prev.filter((doc) => doc !== name));
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
    formData.append("nome", nome);
    formData.append("cpf", cpf);
    formData.append("telefone", telefone);
    formData.append("tipoAcao", `${tipoAcao} - ${acaoEspecifica}`);
    formData.append("relato", relato);
    formData.append(
      "documentos_informados",
      JSON.stringify(documentosMarcados)
    );
    // --- ADICIONA OS NOVOS CAMPOS AO FORMDATA ---
    formData.append("endereco_assistido", enderecoAssistido);
    formData.append("email_assistido", emailAssistido);
    formData.append("dados_adicionais_requerente", dadosAdicionaisRequerente);
    formData.append("nome_requerido", nomeRequerido);
    formData.append("cpf_requerido", cpfRequerido);
    formData.append("endereco_requerido", enderecoRequerido);
    formData.append("dados_adicionais_requerido", dadosAdicionaisRequerido);
    formData.append("filhos_info", filhosInfo);
    formData.append("data_inicio_relacao", dataInicioRelacao);
    formData.append("data_separacao", dataSeparacao);
    formData.append("bens_partilha", bensPartilha);
    // --- CAMPOS ESPECÍFICOS: FIXAÇÃO/OFERTA (também usados na Execução) ---
    formData.append("percentual_sm_requerido", percentualSmRequerido);
    formData.append("percentual_despesas_extra", percentualDespesasExtra);
    formData.append("dia_pagamento_requerido", diaPagamentoRequerido);
    formData.append("dados_bancarios_deposito", dadosBancariosDeposito);
    formData.append(
      "requerido_tem_emprego_formal",
      requeridoTemEmpregoFormal
    );
    formData.append("empregador_requerido_nome", empregadorRequeridoNome);
    formData.append(
      "empregador_requerido_endereco",
      empregadorRequeridoEndereco
    );
    // --- CAMPOS ESPECÍFICOS: EXECUÇÃO ---
    formData.append("numero_processo_originario", numeroProcessoOriginario);
    formData.append("vara_originaria", varaOriginaria);
    formData.append("percentual_ou_valor_fixado", percentualOuValorFixado);
    formData.append("dia_pagamento_fixado", diaPagamentoFixado);
    formData.append("periodo_debito_execucao", periodoDebitoExecucao);
    formData.append("valor_total_debito_execucao", valorTotalDebitoExecucao);
    // --- CAMPOS ESPECÍFICOS: DIVÓRCIO ---
    formData.append("regime_bens", regimeBens);
    formData.append("retorno_nome_solteira", retornoNomeSolteira);
    formData.append("alimentos_para_ex_conjuge", alimentosParaExConjuge);
    // Anexa o Ã¡udio gravado, se existir
    if (audioBlob) {
      formData.append("audio", audioBlob, "gravacao.webm");
    }

    // Anexa todos os documentos
    documentFiles.forEach((file) => {
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
    setNome("");
    setCpf("");
    setTelefone("");
    setTipoAcao("");
    setRelato("");
    // limpar novos campos adicionados
    setEnderecoAssistido("");
    setEmailAssistido("");
    setDadosAdicionaisRequerente("");
    setNomeRequerido("");
    setCpfRequerido("");
    setEnderecoRequerido("");
    setDadosAdicionaisRequerido("");
    setFilhosInfo("");
    setDataInicioRelacao("");
    setDataSeparacao("");
    setBensPartilha("");
    // limpar campos específicos
    setPercentualSmRequerido("");
    setPercentualDespesasExtra("");
    setDiaPagamentoRequerido("");
    setDadosBancariosDeposito("");
    setRequeridoTemEmpregoFormal("");
    setEmpregadorRequeridoNome("");
    setEmpregadorRequeridoEndereco("");
    setNumeroProcessoOriginario("");
    setVaraOriginaria("");
    setPercentualOuValorFixado("");
    setDiaPagamentoFixado("");
    setPeriodoDebitoExecucao("");
    setValorTotalDebitoExecucao("");
    setRegimeBens("");
    setRetornoNomeSolteira("");
    setAlimentosParaExConjuge("");
    setAudioBlob(null);
    setDocumentFiles([]);
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
            {/* Nome e CPF */}
            <div className="relative">
              <User
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                size={20}
              />
              <input
                type="text"
                placeholder="Nome Completo"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
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
                value={cpf}
                onChange={(e) => handleNumericInput(e, setCpf)}
                required
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
              value={telefone}
              onChange={(e) => handleNumericInput(e, setTelefone)}
              required
              className="input pl-10"
            />
          </div>

          {/* --- NOVOS CAMPOS DO REQUERENTE --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="email"
              placeholder="Seu Email (opcional)"
              value={emailAssistido}
              onChange={(e) => setEmailAssistido(e.target.value)}
              className="input"
            />
            <input
              type="text"
              placeholder="Seu Endereço Completo"
              value={enderecoAssistido}
              onChange={(e) => setEnderecoAssistido(e.target.value)}
              required
              className="input"
            />
          </div>
          <div>
            <textarea
              placeholder="Seus Dados Adicionais (RG, Nacionalidade, Estado Civil, Profissão , Data de Nascimento)"
              value={dadosAdicionaisRequerente}
              onChange={(e) => setDadosAdicionaisRequerente(e.target.value)}
              rows="3"
              className="input"
            ></textarea>
            <p className="text-xs text-muted mt-1">
              Ex: 1234567 SSP/BA, Brasileiro(a), Casado(a), Vendedor(a),
              01/01/1990
            </p>
          </div>

          <div>
            <select
              value={tipoAcao}
              onChange={(e) => {
                setTipoAcao(e.target.value);
                setAcaoEspecifica("");
                setDocumentosMarcados([]);
              }}
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
              value={acaoEspecifica}
              onChange={(e) => setAcaoEspecifica(e.target.value)}
              required
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
                value={nomeRequerido}
                onChange={(e) => setNomeRequerido(e.target.value)}
                className="input"
              />
              <input
                type="text"
                placeholder="CPF do(a) Requerido(a) (apenas números, se souber)"
                value={cpfRequerido}
                onChange={(e) => handleNumericInput(e, setCpfRequerido)}
                className="input"
              />
            </div>
            <input
              type="text"
              placeholder="Endereço Completo do(a) Requerido(a) (se souber)"
              value={enderecoRequerido}
              onChange={(e) => setEnderecoRequerido(e.target.value)}
              className="input"
            />
            <div>
              <textarea
                placeholder="Dados Adicionais do(a) Requerido(a) (RG, Nacionalidade, Estado Civil, Profissão, se souber)"
                value={dadosAdicionaisRequerido}
                onChange={(e) => setDadosAdicionaisRequerido(e.target.value)}
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
                value={filhosInfo}
                onChange={(e) => setFilhosInfo(e.target.value)}
                rows="3"
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
                  value={dataInicioRelacao}
                  onChange={(e) => setDataInicioRelacao(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">
                  Data Separação de Fato
                </label>
                <input
                  type="date"
                  value={dataSeparacao}
                  onChange={(e) => setDataSeparacao(e.target.value)}
                  className="input"
                />
              </div>
            </div>
            <div>
              <textarea
                placeholder="Bens a Partilhar (Descreva os bens adquiridos durante a união/casamento, se houver)"
                value={bensPartilha}
                onChange={(e) => setBensPartilha(e.target.value)}
                rows="3"
                className="input"
              ></textarea>
            </div>
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
                    value={percentualSmRequerido}
                    onChange={(e) => setPercentualSmRequerido(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Despesas Extras</label>
                  <input
                    type="text"
                    placeholder='Ex: "50% de gastos com saúde e educação"'
                    value={percentualDespesasExtra}
                    onChange={(e) => setPercentualDespesasExtra(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Data de Pagamento</label>
                  <input
                    type="text"
                    placeholder='Ex: "Até o dia 10 de cada mês"'
                    value={diaPagamentoRequerido}
                    onChange={(e) => setDiaPagamentoRequerido(e.target.value)}
                    className="input"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Dados Bancários para Depósito</label>
                  <textarea
                    rows="3"
                    placeholder="Informe: Titular da Conta, CPF do Titular, Banco, Agência, Conta e Chave PIX"
                    value={dadosBancariosDeposito}
                    onChange={(e) => setDadosBancariosDeposito(e.target.value)}
                    className="input"
                  ></textarea>
                </div>
                <div>
                  <label className="label">Vínculo Empregatício do Requerido</label>
                  <select
                    className="input"
                    value={requeridoTemEmpregoFormal}
                    onChange={(e) => setRequeridoTemEmpregoFormal(e.target.value)}
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
                        value={empregadorRequeridoNome}
                        onChange={(e) => setEmpregadorRequeridoNome(e.target.value)}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Endereço do Empregador</label>
                      <input
                        type="text"
                        placeholder="Endereço completo da empresa"
                        value={empregadorRequeridoEndereco}
                        onChange={(e) => setEmpregadorRequeridoEndereco(e.target.value)}
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
                    value={numeroProcessoOriginario}
                    onChange={(e) => setNumeroProcessoOriginario(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Vara Originária</label>
                  <input
                    type="text"
                    placeholder="Ex: 1ª Vara de Família de Teixeira de Freitas"
                    value={varaOriginaria}
                    onChange={(e) => setVaraOriginaria(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Valor/Percentual Fixado</label>
                  <input
                    type="text"
                    placeholder='Ex: "30%" ou "R$ 600,00"'
                    value={percentualOuValorFixado}
                    onChange={(e) => setPercentualOuValorFixado(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Dia de Pagamento (na sentença)</label>
                  <input
                    type="text"
                    placeholder='Ex: "Dia 10 de cada mês"'
                    value={diaPagamentoFixado}
                    onChange={(e) => setDiaPagamentoFixado(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Período do Débito</label>
                  <input
                    type="text"
                    placeholder='Ex: "Março/2025 a Outubro/2025"'
                    value={periodoDebitoExecucao}
                    onChange={(e) => setPeriodoDebitoExecucao(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Valor Total da Dívida</label>
                  <input
                    type="text"
                    placeholder='Ex: "R$ 3.250,00"'
                    value={valorTotalDebitoExecucao}
                    onChange={(e) => setValorTotalDebitoExecucao(e.target.value)}
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
                    value={regimeBens}
                    onChange={(e) => setRegimeBens(e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    <option value="comunhao_parcial">Comunhão Parcial de Bens</option>
                    <option value="comunhao_universal">Comunhão Universal</option>
                    <option value="separacao_total">Separação Total de Bens</option>
                  </select>
                </div>
                <div>
                  <label className="label">Nome de Solteira</label>
                  <select
                    className="input"
                    value={retornoNomeSolteira}
                    onChange={(e) => setRetornoNomeSolteira(e.target.value)}
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
                    value={alimentosParaExConjuge}
                    onChange={(e) => setAlimentosParaExConjuge(e.target.value)}
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
              value={relato}
              onChange={(e) => setRelato(e.target.value)}
              rows="5"
              className="input"
            ></textarea>
          </div>
          {acaoEspecifica && (
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
              {!isRecording && !audioBlob && (
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
              {audioBlob && (
                <div className="flex items-center gap-4">
                  <audio
                    src={URL.createObjectURL(audioBlob)}
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
                {documentFiles.map((file) => (
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
