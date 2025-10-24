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
export const FormularioSubmissao = () => {
  // --- ESTADOS DO FORMULÁRIO ---
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

  // --- ESTADOS DA GRAVAÇÃO DE ÁUDIO ---
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null); // Armazena o áudio gravado como Blob
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

  // Fallback temporário: garantir opções visíveis para Família
  const acoesFallbackFamilia = [
    "Fixação de Pensão Alimentícia",
    "Divórcio",
    "Reconhecimento e Dissolução de União Estável",
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

  // Mostrar dados do Requerido apenas quando a ação exigir
  const shouldShowRequerido = !acaoEspecifica
    ? true
    : !acaoEspecifica.toLowerCase().includes("alvar");

  // --- LÓGICA DE VALIDAÇÃO DE INPUT ---
  const handleNumericInput = (e, setter) => {
    const value = e.target.value;
    // Permite apenas números e um campo vazio
    if (/^[0-9]*$/.test(value)) {
      setter(value);
    }
  };

  // --- LÓGICA DE GRAVAÇÃO DE ÁUDIO ---
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
        "Não foi possível acessar o microfone. Verifique as permissões do navegador."
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

  // --- LÓGICA DE UPLOAD DE ARQUIVOS ---
  const handleDocumentChange = (e) => {
    const novosArquivos = Array.from(e.target.files);
    setDocumentFiles((prevFiles) => [...prevFiles, ...novosArquivos]);
  };

  const removeDocument = (fileName) => {
    setDocumentFiles((prevFiles) =>
      prevFiles.filter((file) => file.name !== fileName)
    );
  };

  // --- LÓGICA DE GERAÇÃO DE CREDENCIAIS ---
  const generateCredentials = (casoTipo) => {
    // Geração da Chave de Acesso: DPB-00000-0XXXXX
    const randomPart1 = Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, "0");
    const randomPart2 = Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, "0");
    const chaveAcesso = `DPB-${randomPart1}-0${randomPart2}`;

    // Geração do Protocolo
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

    const numeroUnico = Date.now().toString().slice(-6); // Pega os últimos 6 dígitos do timestamp
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

  // --- LÓGICA DE SUBMISSÃO ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setGeneratedCredentials(null);
    const timers = [
      setTimeout(() => setStatusMessage("Analisando documentos..."), 1000),
      setTimeout(
        () =>
          setStatusMessage("Transcrevendo áudio (esta etapa pode demorar)..."),
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
    // Anexa o áudio gravado, se existir
    if (audioBlob) {
      formData.append("audio", audioBlob, "gravacao.webm");
    }

    // Anexa todos os documentos
    documentFiles.forEach((file) => {
      formData.append("documentos", file);
    });

    try {
      // ATENÇÃO: Verifique se a URL no seu .env está correta!
      // Ex: VITE_API_URL=http://localhost:3001/api
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/casos/novo`,
        {
          method: "POST",
          body: formData, // Não precisa de 'Content-Type', o FormData cuida disso
        }
      );

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
    console.log("Botão clicado! A função resetForm foi chamada.");
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
    setGeneratedCredentials(null); // Isso também esconderá a tela de sucesso
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800/50 p-6 sm:p-8 rounded-2xl border border-slate-700"
    >
      {generatedCredentials ? (
        // --- TELA DE SUCESSO ---
        <div className="text-center p-4">
          <h3 className="text-2xl font-bold text-green-400 mb-4">
            Caso Enviado com Sucesso!
          </h3>

          <div className="space-y-4 mb-6 text-left">
            <div>
              <label className="text-sm font-semibold text-slate-400">
                PROTOCOLO
              </label>
              <div className="bg-slate-900 p-3 rounded-lg">
                <p className="text-xl font-mono tracking-widest text-amber-400">
                  {generatedCredentials.protocolo}
                </p>
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-400">
                CHAVE DE ACESSO
              </label>
              <div className="bg-slate-900 p-3 rounded-lg">
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
              acesso em um local seguro. Eles são a **única forma** de consultar
              o andamento do seu caso.
            </p>
          </div>

          <button
            onClick={resetForm}
            className="mt-6 w-full bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Enviar Outro Caso
          </button>
        </div>
      ) : (
        // --- FORMULÁRIO DE ENVIO ---
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome e CPF */}
            <div className="relative">
              <User
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Nome Completo"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 bg-slate-700 rounded-lg border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
              />
            </div>
            <div className="relative">
              <FileText
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={20}
              />
              <input
                type="text"
                placeholder="CPF (apenas números)"
                value={cpf}
                onChange={(e) => handleNumericInput(e, setCpf)}
                required
                className="w-full pl-10 pr-4 py-3 bg-slate-700 rounded-lg border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="relative">
            <Phone
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={20}
            />
            <input
              type="tel"
              placeholder="Telefone (apenas números)"
              value={telefone}
              onChange={(e) => handleNumericInput(e, setTelefone)}
              required
              className="w-full pl-10 pr-4 py-3 bg-slate-700 rounded-lg border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
            />
          </div>

          {/* --- NOVOS CAMPOS DO REQUERENTE --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="email"
              placeholder="Seu Email (opcional)"
              value={emailAssistido}
              onChange={(e) => setEmailAssistido(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 rounded-lg border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
            />
            <input
              type="text"
              placeholder="Seu Endereço Completo"
              value={enderecoAssistido}
              onChange={(e) => setEnderecoAssistido(e.target.value)}
              required
              className="w-full px-4 py-3 bg-slate-700 rounded-lg border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
            />
          </div>
          <div>
            <textarea
              placeholder="Seus Dados Adicionais (RG, Nacionalidade, Estado Civil, Profissão, Data de Nascimento)"
              value={dadosAdicionaisRequerente}
              onChange={(e) => setDadosAdicionaisRequerente(e.target.value)}
              rows="3"
              className="w-full px-4 py-3 bg-slate-700 rounded-lg border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
            ></textarea>
            <p className="text-xs text-slate-400 mt-1">
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
              className="w-full px-4 py-3 bg-slate-700 rounded-lg ..."
            >
              {/* <option value="" disabled>
                1. Selecione a Área do Direito
              </option> */}
              <option value="familia">Direito de Família </option>
              {/*<option value="civel">Direito Cível</option>
               <option value="consumidor">Direito Do Consumidor</option>
              <option value="saude">Direito à Saúde</option>
              <option value="criminal">Defesa Criminal</option>
              <option value="infancia">Direito Infância e Juventude</option> */}
            </select>
            {/*{tipoAcao && (*/}
            <select
              value={acaoEspecifica}
              onChange={(e) => setAcaoEspecifica(e.target.value)}
              required
              className="w-full px-4 py-3 mt-5 bg-slate-700 rounded-lg ..."
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
          {/* --- SEÇÃO DADOS DO(A) REQUERIDO(A) --- */}
          <div
            className={`space-y-4 border-t border-slate-700 pt-4 ${
              shouldShowRequerido ? "" : "hidden"
            }`}
          >
            <h3 className="font-semibold text-lg text-slate-300">
              Dados da Outra Parte (Requerido/a)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Nome Completo do(a) Requerido(a)"
                value={nomeRequerido}
                onChange={(e) => setNomeRequerido(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 rounded-lg border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
              />
              <input
                type="text"
                placeholder="CPF do(a) Requerido(a) (apenas números, se souber)"
                value={cpfRequerido}
                onChange={(e) => handleNumericInput(e, setCpfRequerido)}
                className="w-full px-4 py-3 bg-slate-700 rounded-lg border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
              />
            </div>
            <input
              type="text"
              placeholder="Endereço Completo do(a) Requerido(a) (se souber)"
              value={enderecoRequerido}
              onChange={(e) => setEnderecoRequerido(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 rounded-lg border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
            />
            <div>
              <textarea
                placeholder="Dados Adicionais do(a) Requerido(a) (RG, Nacionalidade, Estado Civil, Profissão, se souber)"
                value={dadosAdicionaisRequerido}
                onChange={(e) => setDadosAdicionaisRequerido(e.target.value)}
                rows="3"
                className="w-full px-4 py-3 bg-slate-700 rounded-lg border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
              ></textarea>
            </div>
          </div>

          {/* --- SEÇÃO DETALHES ADICIONAIS DO CASO --- */}
          <div className="space-y-4 border-t border-slate-700 pt-4">
            <h3 className="font-semibold text-lg text-slate-300">
              Detalhes Adicionais (Importante para Ações de Família)
            </h3>
            <div>
              <textarea
                placeholder="Filhos (Nome Completo - Data de Nascimento DD/MM/AAAA)"
                value={filhosInfo}
                onChange={(e) => setFilhosInfo(e.target.value)}
                rows="3"
                className="w-full px-4 py-3 bg-slate-700 rounded-lg border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
              ></textarea>
              <p className="text-xs text-slate-400 mt-1">
                Separe cada filho com ponto e vírgula (;). Ex: João Silva -
                10/05/2015; Maria Silva - 20/12/2018
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Data Casamento/Início União
                </label>
                <input
                  type="date"
                  value={dataInicioRelacao}
                  onChange={(e) => setDataInicioRelacao(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 rounded-lg border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Data Separação de Fato
                </label>
                <input
                  type="date"
                  value={dataSeparacao}
                  onChange={(e) => setDataSeparacao(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 rounded-lg border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                />
              </div>
            </div>
            <div>
              <textarea
                placeholder="Bens a Partilhar (Descreva os bens adquiridos durante a união/casamento, se houver)"
                value={bensPartilha}
                onChange={(e) => setBensPartilha(e.target.value)}
                rows="3"
                className="w-full px-4 py-3 bg-slate-700 rounded-lg border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
              ></textarea>
            </div>
          </div>

          <div>
            <textarea
              placeholder="Relate seu caso aqui..."
              value={relato}
              onChange={(e) => setRelato(e.target.value)}
              rows="5"
              className="w-full px-4 py-3 bg-slate-700 rounded-lg border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
            ></textarea>
          </div>
          {acaoEspecifica && (
            <div className="space-y-3 bg-slate-800 p-4 rounded-lg">
              <h3 className="font-semibold text-slate-300">
                3. Marque os documentos que você possui:
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {listaDeDocumentos.map((doc) => (
                  <label
                    key={doc}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-slate-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      name={doc}
                      onChange={handleCheckboxChange}
                      className="w-4 h-4 bg-slate-600 border-slate-500 rounded text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-slate-400 text-sm">{doc}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-4">
            <p className="font-semibold">Anexos (Opcional)</p>
            {/* Gravação de Áudio */}
            <div className="bg-slate-700/50 p-4 rounded-lg border border-dashed border-slate-600">
              {!isRecording && !audioBlob && (
                <button
                  type="button"
                  onClick={startRecording}
                  className="flex items-center gap-2 text-amber-400 hover:text-amber-300"
                >
                  <Mic size={20} /> Gravar Relato em Áudio
                </button>
              )}
              {isRecording && (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="flex items-center gap-2 text-red-500 animate-pulse"
                >
                  <Square size={20} /> Parar Gravação
                </button>
              )}
              {audioBlob && (
                <div className="flex items-center gap-4">
                  <audio
                    src={URL.createObjectURL(audioBlob)}
                    controls
                    className="flex-grow"
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
            <div className="bg-slate-700/50 p-4 rounded-lg border border-dashed border-slate-600">
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
                className="flex items-center gap-2 text-blue-400 hover:text-blue-300"
              >
                <Paperclip size={20} /> Anexar Documentos (RG, Comprovantes,
                etc.)
              </button>
              <div className="mt-2 space-y-1 text-sm">
                {documentFiles.map((file) => (
                  <div
                    key={file.name}
                    className="flex items-center justify-between bg-slate-800 p-1 rounded"
                  >
                    <span className="text-slate-300">{file.name}</span>
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
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 px-6 py-4 rounded-lg font-semibold text-lg flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? "Enviando..." : "Enviar Caso"}
            <Upload size={20} />
          </button>
          {loading && (
            <div className="text-center mt-4">
              <p className="text-amber-400 animate-pulse">{statusMessage}</p>
            </div>
          )}
        </form>
      )}
    </motion.div>
  );
};
