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
