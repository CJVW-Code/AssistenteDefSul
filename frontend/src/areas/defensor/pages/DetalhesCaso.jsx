import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  ChevronLeft,
  Download,
  Mic,
  Eye,
  Upload,
  CheckCircle,
  FileText,
  Scale,
  Trash2,
  HelpCircle,
  Loader2,
  RefreshCw,
  MessageSquare,
  Save,
  Video,
  Calendar,
  Bell,
  Pencil,
  X,
  Check,
  AlertTriangle,
  History,
  Copy,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import { API_BASE } from "../../../utils/apiBase";
import { useToast } from "../../../contexts/ToastContext";
import { useConfirm } from "../../../contexts/ConfirmContext";

const manualStatusOptions = [
  { value: "em_analise", label: "Em análise" },
  { value: "aguardando_docs", label: "Pendentes de documentos" },
  {
    value: "reuniao_presencial_agendada",
    label: "Reunião Presencial Agendada",
  },
  { value: "reuniao_online_agendada", label: "Reunião Online Agendada" },
];

const statusBadges = {
  recebido: "bg-slate-100 text-slate-700 border-slate-200",
  em_analise: "bg-special/10 text-special border-special/20",
  documentos_entregues: "bg-highlight/15 text-highlight border-highlight/30",
  reuniao_agendada: "bg-purple-100 text-purple-800 border-purple-200",
  reuniao_online_agendada: "bg-blue-100 text-blue-800 border-blue-200",
  reuniao_presencial_agendada:
    "bg-purple-100 text-purple-800 border-purple-200",
  reagendamento_solicitado: "bg-error/10 text-error border-error/20",
  aguardando_docs: "bg-orange-100 text-orange-800 border-orange-200",
  processando: "bg-indigo-100 text-indigo-800 border-indigo-200",
  processado: "bg-green-100 text-green-800 border-green-200",
  encaminhado_solar: "bg-teal-100 text-teal-800 border-teal-200",
  finalizado: "bg-gray-100 text-gray-800 border-gray-200",
  erro: "bg-red-100 text-red-800 border-red-200",
};

const statusDescriptions = {
  recebido:
    "O caso foi submetido e está na fila para processamento automático.",
  processando:
    "O sistema está extraindo informações dos documentos e gerando a minuta inicial.",
  processado:
    "O processamento automático foi concluído. A minuta está pronta para revisão.",
  em_analise:
    "O caso está sendo analisado manualmente por um defensor ou estagiário.",
  aguardando_docs:
    "O processo está pausado, aguardando o envio de documentos adicionais pelo cidadão.",
  documentos_entregues:
    "O cidadão enviou novos documentos. Verifique os anexos.",
  reuniao_agendada:
    "O atendimento com o defensor foi agendado. Aguarde a data prevista.",
  reuniao_online_agendada:
    "O atendimento online foi agendado. Configure o link e a data abaixo.",
  reuniao_presencial_agendada:
    "O atendimento presencial foi agendado. Informe o local e data abaixo.",
  reagendamento_solicitado:
    "O cidadão informou que não pode comparecer. Verifique o motivo em 'Anotações/Feedback'.",
  encaminhado_solar:
    "O caso foi finalizado e encaminhado para o sistema Solar da defensoria.",
  finalizado: "O caso foi concluído.",
  erro: "Ocorreu um erro crítico durante o processamento automático. Verifique os logs do sistema.",
};

const formatValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return "Não informado";
  }

  if (typeof value === "boolean") {
    return value ? "Sim" : "Não";
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return "Não informado";
    return value.join(", ");
  }

  if (typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) return "Não informado";
    // Ex.: "chave: valor • chave2: valor2"
    return entries
      .map(([k, v]) => `${k.replace(/_/g, " ")}: ${formatValue(v)}`)
      .join(" • ");
  }

  return String(value);
};

// Função auxiliar para formatar data na visualização
const formatDateDisplay = (dateString) => {
  if (!dateString) return "Não informado";
  const [year, month, day] = dateString.split("-");
  if (!year || !month || !day) return dateString;
  return `${day}/${month}/${year}`;
};

const CollapsibleText = ({
  text,
  maxLength = 350,
  isPre = false,
  defaultCollapsed = true,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  if (!text || text.length === 0) {
    return <p className="text-sm text-muted">Nenhuma informação fornecida.</p>;
  }

  const textToShow =
    isCollapsed && text.length > maxLength
      ? text.substring(0, maxLength) + "..."
      : text;

  const Wrapper = ({ children }) =>
    isPre ? (
      <pre className="text-sm whitespace-pre-wrap font-sans p-4 bg-surface border border-soft rounded-lg">
        {children}
      </pre>
    ) : (
      <p className="text-muted whitespace-pre-wrap">{children}</p>
    );

  return (
    <div>
      <Wrapper>{textToShow}</Wrapper>
      {text.length > maxLength && (
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="btn btn-ghost btn-sm mt-2"
        >
          {isCollapsed ? "Ler mais" : "Ler menos"}
        </button>
      )}
    </div>
  );
};

export const DetalhesCaso = () => {
  const { id } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [caso, setCaso] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showFullPetition, setShowFullPetition] = useState(false);
  const [numSolar, setNumSolar] = useState("");
  const [numProcesso, setNumProcesso] = useState("");
  const [arquivoCapa, setArquivoCapa] = useState(null);
  const [enviandoFinalizacao, setEnviandoFinalizacao] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedbackInitialized, setFeedbackInitialized] = useState(false);
  const [isGeneratingTermo, setIsGeneratingTermo] = useState(false);
  const [isRegeneratingMinuta, setIsRegeneratingMinuta] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  const [dataAgendamento, setDataAgendamento] = useState("");
  const [linkAgendamento, setLinkAgendamento] = useState("");
  const [isAgendando, setIsAgendando] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [pendenciaTexto, setPendenciaTexto] = useState("");
  const [editingFile, setEditingFile] = useState({ url: null, name: "" });
  const [isRenaming, setIsRenaming] = useState(false);
  const [showStatusHelp, setShowStatusHelp] = useState(false);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState("");

  const fetchDetalhes = useCallback(
    async (silent = false) => {
      if (!id || id === 'undefined') return;
      
      // Proteção: Se a rota capturou "arquivados" como ID, não faz a requisição
      if (id === 'arquivados') {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/casos/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Falha ao carregar o caso.");
        }
        const data = await response.json();
        if (data.agendamento_data) {
          // Converte a data UTC do banco para o formato local esperado pelo input datetime-local
          const date = new Date(data.agendamento_data);
          const offset = date.getTimezoneOffset() * 60000;
          const localISOTime = new Date(date.getTime() - offset)
            .toISOString()
            .slice(0, 16);
          setDataAgendamento(localISOTime);
        }
        setLinkAgendamento(data.agendamento_link || "");
        setCaso(data);
      } catch (error) {
        console.error(error);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [id, token],
  );

  useEffect(() => {
    fetchDetalhes();
  }, [fetchDetalhes]);

  // Polling automático se estiver processando
  useEffect(() => {
    let interval;
    if (caso?.status === "processando") {
      interval = setInterval(() => {
        fetchDetalhes(true);
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [caso?.status, fetchDetalhes]);

  // Inicializa o feedback apenas uma vez ao carregar o caso
  useEffect(() => {
    if (caso && !feedbackInitialized) {
      setFeedback(caso.feedback || "");
      setPendenciaTexto(caso.descricao_pendencia || "");
      setNumSolar(caso.numero_solar || "");
      setFeedbackInitialized(true);
    }
  }, [caso, feedbackInitialized]);

  const handleSalvarPendencia = async () => {
    setIsUpdating(true);
    try {
      const response = await fetch(`${API_BASE}/casos/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: "aguardando_docs",
          descricao_pendencia: pendenciaTexto,
        }),
      });

      if (!response.ok) throw new Error("Falha ao atualizar pendência.");

      const casoAtualizado = await response.json();
      setCaso(casoAtualizado);
      toast.success("Descrição da pendência salva!");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusChange = async (novoStatus) => {
    if (!caso || !novoStatus || novoStatus === caso.status) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`${API_BASE}/casos/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: novoStatus,
          descricao_pendencia:
            novoStatus === "aguardando_docs"
              ? pendenciaTexto
              : caso.descricao_pendencia,
        }),
      });

      if (!response.ok) {
        throw new Error("Falha ao atualizar o status.");
      }

      const casoAtualizado = await response.json();
      setCaso(casoAtualizado);
    } catch (error) {
      console.error(error);
      toast.error(error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSalvarSolar = async () => {
    // Remove tudo que não for número para evitar erro 500 no backend (tipo integer)
    const solarLimpo = numSolar.replace(/\D/g, "");
    const valorParaSalvar = solarLimpo === "" ? null : solarLimpo;
    const valorAtual = caso.numero_solar || null;

    if (valorParaSalvar === valorAtual) return;

    try {
      const response = await fetch(`${API_BASE}/casos/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          numero_solar: valorParaSalvar,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Erro ao salvar dados.");
      }

      setCaso((prev) => ({ ...prev, numero_solar: valorParaSalvar }));
      toast.success("Número Solar salvo!");
    } catch (error) {
      console.error(error);
      toast.error(error.message);
    }
  };

  const handleCopySolar = () => {
    if (!numSolar) return;
    navigator.clipboard.writeText(numSolar);
    toast.success("Número Solar copiado!");
  };

  if (loading) {
    return (
      <div className="card text-center text-muted">Carregando detalhes...</div>
    );
  }

  if (!caso) {
    return (
      <div className="card border-l-4 border-l-red-500 text-red-600">
        Caso não encontrado.
      </div>
    );
  }

  const statusKey = (caso.status || "recebido").toLowerCase();
  const badgeClass = statusBadges[statusKey] || "";

  const renderDataField = (label, value) => (
    <div>
      <p className="text-xs text-muted uppercase tracking-wide">{label}</p>
      <p className="font-semibold break-words">{formatValue(value)}</p>
    </div>
  );

  const handleGenerateFatos = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(`${API_BASE}/casos/${id}/gerar-fatos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Falha ao gerar a sessão dos fatos.");
      }

      const updatedCaso = await response.json();
      setCaso(updatedCaso);
      toast.success("Solicitação enviada. O sistema está processando...");
    } catch (error) {
      console.error(error);
      toast.error(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateTermo = async () => {
    setIsGeneratingTermo(true);
    try {
      const response = await fetch(`${API_BASE}/casos/${id}/gerar-termo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Falha ao gerar o termo de declaração.");
      }

      const updatedCaso = await response.json();
      setCaso(updatedCaso);
      toast.success("Termo de declaração gerado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error(error.message);
    } finally {
      setIsGeneratingTermo(false);
    }
  };

  const handleRegenerateMinuta = async () => {
    if (
      !(await confirm(
        "Isso irá gerar um novo arquivo Word com os dados atuais. O arquivo anterior será substituído. Continuar?",
        "Regerar Minuta",
      ))
    )
      return;

    setIsRegeneratingMinuta(true);
    try {
      const response = await fetch(`${API_BASE}/casos/${id}/regerar-minuta`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Falha ao regerar minuta.");

      const updatedCaso = await response.json();
      setCaso(updatedCaso);
      toast.success("Minuta regerada com sucesso!");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsRegeneratingMinuta(false);
    }
  };

  const handleSaveFeedback = async () => {
    setSavingFeedback(true);
    try {
      const response = await fetch(`${API_BASE}/casos/${id}/feedback`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ feedback }),
      });

      if (!response.ok) throw new Error("Falha ao salvar anotações.");

      toast.success("Anotações salvas com sucesso.");
    } catch (error) {
      console.error(error);
      toast.error(error.message);
    } finally {
      setSavingFeedback(false);
    }
  };

  const handleFinalizarCaso = async (e) => {
    e.preventDefault();
    if (!arquivoCapa || !numSolar || !numProcesso) {
      toast.warning("Por favor, preencha todos os campos e anexe a capa.");
      return;
    }

    setEnviandoFinalizacao(true);
    const formData = new FormData();
    formData.append("numero_solar", numSolar);
    formData.append("numero_processo", numProcesso);
    formData.append("capa", arquivoCapa);

    try {
      const response = await fetch(`${API_BASE}/casos/${id}/finalizar`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error("Erro ao finalizar caso.");

      toast.success("Caso finalizado e capa enviada com sucesso!");
      // Recarrega os dados da página
      window.location.reload();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao finalizar: " + error.message);
    } finally {
      setEnviandoFinalizacao(false);
    }
  };

  const handleDeleteCaso = async () => {
    if (
      await confirm(
        `Tem certeza que deseja excluir permanentemente o caso ${caso.protocolo}?`,
        "Excluir Caso",
      )
    ) {
      setIsDeleting(true);
      try {
        const response = await fetch(`${API_BASE}/casos/${id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          let errorMessage = "Falha ao excluir o caso.";
          try {
            const errorData = await response.json();
            // Prioriza a mensagem de erro específica da API, se houver
            errorMessage =
              errorData.message || errorData.error || response.statusText;
          } catch (e) {
            // Fallback se a resposta não for um JSON válido
            errorMessage = response.statusText || errorMessage;
          }
          throw new Error(errorMessage);
        }

        toast.success("Caso excluído com sucesso.");
        window.location.href = "/painel";
      } catch (error) {
        console.error("Erro ao excluir caso:", error);
        // Garante que uma mensagem de erro útil seja sempre exibida
        toast.error(error.message || "Não foi possível processar a exclusão.");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleAgendarReuniao = async () => {
    if (!dataAgendamento || !linkAgendamento) {
      toast.warning("Preencha a data e o link da reunião.");
      return;
    }

    setIsAgendando(true);
    try {
      const response = await fetch(`${API_BASE}/casos/${id}/agendar`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          // Converte a string do input (local) para um objeto Date e envia como ISO (UTC)
          agendamento_data: new Date(dataAgendamento).toISOString(),
          agendamento_link: linkAgendamento,
        }),
      });
      if (!response.ok) throw new Error("Erro ao salvar agendamento.");
      toast.success("Atendimento online agendado com sucesso!");
      fetchDetalhes(true);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsAgendando(false);
    }
  };

  const handleReverterFinalizacao = async () => {
    if (
      !(await confirm(
        "Esta ação irá reabrir o caso, remover os números de Solar/Processo e excluir a capa processual anexada. Deseja continuar?",
        "Reverter Finalização?",
      ))
    ) {
      return;
    }

    setIsReverting(true);
    try {
      const response = await fetch(
        `${API_BASE}/casos/${id}/reverter-finalizacao`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Falha ao reverter a finalização.");
      }

      toast.success("Finalização revertida! O caso foi reaberto para edição.");
      fetchDetalhes();
    } catch (error) {
      console.error("Erro ao reverter finalização:", error);
      toast.error(error.message);
    } finally {
      setIsReverting(false);
    }
  };

  const handleReprocessar = async () => {
    if (
      !(await confirm(
        "Isso irá reiniciar todo o processo de leitura de documentos (OCR) e geração de texto pela IA. Deseja continuar?",
        "Reprocessar Caso",
      ))
    ) {
      return;
    }

    setIsReprocessing(true);
    try {
      const response = await fetch(`${API_BASE}/casos/${id}/reprocessar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Erro ao solicitar reprocessamento.");

      toast.success("Processamento reiniciado! Aguarde alguns instantes.");
      fetchDetalhes(true); // Atualiza para ver o status mudando para 'processando'
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsReprocessing(false);
    }
  };

  const handleArquivarClick = async () => {
    if (caso.arquivado) {
      // Se já está arquivado, é uma ação de RESTAURAR
      if (await confirm("Deseja mover este caso de volta para os Ativos?", "Restaurar Caso")) {
        await processarArquivamento(false, null);
      }
    } else {
      // Se não está arquivado, abre o modal para pedir MOTIVO
      setArchiveReason("");
      setArchiveModalOpen(true);
    }
  };

  const confirmArchive = async () => {
    if (archiveReason.trim().length < 5) {
      toast.error("Por favor, informe um motivo válido (mín. 5 caracteres).");
      return;
    }
    await processarArquivamento(true, archiveReason);
    setArchiveModalOpen(false);
  };

  const processarArquivamento = async (novoEstado, motivo) => {
    try {
      const response = await fetch(`${API_BASE}/casos/${id}/arquivar`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ arquivado: novoEstado, motivo }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao alterar status.");
      }

      toast.success(novoEstado ? "Caso arquivado!" : "Caso restaurado!");
      navigate(novoEstado ? "/painel/casos" : "/painel/casos");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSaveRename = async () => {
    if (!editingFile.url || !editingFile.name.trim()) return;
    setIsRenaming(true);
    try {
      const response = await fetch(
        `${API_BASE}/casos/${id}/documento/renomear`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            fileUrl: editingFile.url,
            newName: editingFile.name,
          }),
        },
      );
      if (!response.ok) throw new Error("Falha ao renomear arquivo.");
      toast.success("Arquivo renomeado com sucesso!");
      setEditingFile({ url: null, name: "" });
      fetchDetalhes(true);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsRenaming(false);
    }
  };

  return (
    <div className="space-y-8 pb-24">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link
            to="/painel"
            className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary-600"
          >
            <ChevronLeft size={18} />
            Voltar para o dashboard
          </Link>
          <h1 className="heading-1 mt-3">{caso.nome_assistido}</h1>
          <div className="flex flex-wrap items-center gap-4 mt-2">
            <p className="text-muted text-sm">
              Protocolo {caso.protocolo} • {caso.tipo_acao}
            </p>
            <div className="flex items-center gap-2 bg-surface border border-soft rounded-md px-3 py-1.5 shadow-sm">
              <label htmlFor="numeroSolar" className="text-xs font-bold text-muted uppercase tracking-wider">
                Solar:
              </label>
              <input
                type="text"
                id="numeroSolar"
                value={numSolar}
                onChange={(e) => {
                  // Permite apenas números enquanto digita
                  setNumSolar(e.target.value.replace(/\D/g, ""));
                }}
                onBlur={handleSalvarSolar}
                className="bg-transparent border-none outline-none text-sm font-mono w-32 text-primary font-bold placeholder:text-muted/50"
                placeholder="---"
                title="Número do Atendimento Solar"
              />
              <button
                onClick={handleCopySolar}
                className="text-muted hover:text-primary transition-colors"
                title="Copiar número"
              >
                <Copy size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* NOTIFICAÇÃO DE ARQUIVAMENTO */}
      {caso.arquivado && (
        <div className="alert flex items-start gap-3 mb-6 animate-fade-in">
          <Archive className="text-muted shrink-0 mt-1" size={24} />
          <div>
            <h3 className="font-bold">Caso Arquivado</h3>
            <p className="text-muted mt-1">
              <strong>Motivo:</strong> {caso.motivo_arquivamento || "Não informado."}
            </p>
          </div>
        </div>
      )}

      {/* NOTIFICAÇÃO DE DOCUMENTOS ENTREGUES */}
      {caso.status === "documentos_entregues" && (
        <div className="bg-highlight/10 border-l-4 border-highlight p-4 rounded-r shadow-sm flex items-start gap-3 animate-fade-in mb-6">
          <Bell className="text-highlight shrink-0 mt-1" size={24} />
          <div>
            <h3 className="font-bold text-highlight">
              Novos Documentos Recebidos!
            </h3>
            <p className="text-highlight/90 text-sm">
              O cidadão enviou os documentos complementares solicitados.
              Verifique os itens destacados abaixo na seção de anexos.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* BOTÕES DE AÇÃO RÁPIDA (ARQUIVAR) */}
        <div className="lg:col-span-3 flex justify-end">
          <button
            onClick={handleArquivarClick}
            className={`btn ${
              caso.arquivado
                ? "btn-primary"
                : "bg-slate-500 hover:bg-slate-600 text-white border-slate-500"
            }`}
          >
            {caso.arquivado ? (
              <ArchiveRestore size={18} />
            ) : (
              <Archive size={18} />
            )}
            {caso.arquivado ? "Restaurar Caso" : "Arquivar Caso"}
          </button>
        </div>

        <section className="space-y-6 lg:col-span-2">
          <div className="card space-y-4">
            <h2 className="heading-2">Dados do assistido</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {renderDataField("Nome completo", caso.nome_assistido)}
              {renderDataField("CPF", caso.cpf_assistido)}
              {renderDataField("Telefone", caso.telefone_assistido)}
              {renderDataField(
                "Tipo de ação",
                caso.tipo_acao?.replace("_", " "),
              )}
            </div>
            <div className="pt-4">
              <button
                onClick={() => setShowReview(!showReview)}
                className="btn btn-secondary w-full justify-start"
              >
                <Eye size={18} />
                Revisar dados preenchidos
              </button>
              {showReview &&
                (() => {
                  const dados = caso.dados_formulario || {};
                  const isRepresentacao = dados.assistido_eh_incapaz === "sim";
                  const isFixacaoAlimentos = (caso.tipo_acao || "")
                    .toLowerCase()
                    .includes("fixação de pensão alimentícia");
                  let outrosFilhos = [];
                  try {
                    if (dados.outros_filhos_detalhes) {
                      outrosFilhos =
                        typeof dados.outros_filhos_detalhes === "string"
                          ? JSON.parse(dados.outros_filhos_detalhes)
                          : dados.outros_filhos_detalhes;
                    }
                  } catch (e) {
                    console.error(
                      "Erro ao processar dados de outros filhos:",
                      e,
                    );
                  }

                  return (
                    <div className="mt-4 space-y-6 border-t border-soft pt-6">
                      {/* Seção do Beneficiário */}
                      <div className="space-y-4">
                        <h3 className="heading-3 text-primary">
                          {isRepresentacao
                            ? "Dados do Assistido (Criança/Adolescente)"
                            : "Dados do Autor da Ação"}
                        </h3>
                        <div className="grid gap-4 md:grid-cols-2">
                          {renderDataField("Nome Completo", dados.nome)}
                          {renderDataField("CPF", dados.cpf)}
                          {renderDataField(
                            "Data de Nascimento",
                            formatDateDisplay(dados.assistido_data_nascimento),
                          )}
                          {!isFixacaoAlimentos &&
                            renderDataField(
                              "Nacionalidade",
                              dados.assistido_nacionalidade,
                            )}
                          {renderDataField(
                            "Estado Civil",
                            dados.assistido_estado_civil,
                          )}
                          {!isFixacaoAlimentos &&
                            renderDataField(
                              "Endereço Residencial",
                              dados.endereco_assistido,
                            )}
                          {!isFixacaoAlimentos &&
                            renderDataField("Email", dados.email_assistido)}
                          {renderDataField(
                            "Telefone de Contato",
                            dados.telefone,
                          )}
                          {renderDataField(
                            "WhatsApp para Reunião",
                            dados.whatsapp_contato,
                          )}
                          {renderDataField(
                            "RG",
                            `${dados.assistido_rg_numero || ""} ${
                              dados.assistido_rg_orgao || ""
                            }`.trim(),
                          )}
                        </div>
                      </div>

                      {/* Seção de Filhos Adicionais */}
                      {outrosFilhos.length > 0 &&
                        outrosFilhos.map((filho, index) => (
                          <div
                            key={index}
                            className="space-y-4 pt-4 border-t border-soft"
                          >
                            <h3 className="heading-3 text-primary">
                              Dados do Assistido {index + 2}{" "}
                              (Criança/Adolescente)
                            </h3>
                            <div className="grid gap-4 md:grid-cols-2">
                              {renderDataField("Nome Completo", filho.nome)}
                              {renderDataField("CPF", filho.cpf)}
                              {renderDataField(
                                "Data de Nascimento",
                                filho.dataNascimento,
                              )}
                              {renderDataField(
                                "Nacionalidade",
                                filho.nacionalidade,
                              )}
                              {renderDataField(
                                "RG",
                                `${filho.rgNumero || ""} ${
                                  filho.rgOrgao || ""
                                }`.trim(),
                              )}
                            </div>
                          </div>
                        ))}

                      {/* Seção do Representante (Condicional) */}
                      {isRepresentacao && (
                        <div className="space-y-4 pt-4 border-t border-soft">
                          <h3 className="heading-3 text-primary">
                            Dados do Representante Legal
                          </h3>
                          <div className="grid gap-4 md:grid-cols-2">
                            {renderDataField(
                              "Nome Completo",
                              dados.representante_nome,
                            )}
                            {renderDataField("CPF", dados.representante_cpf)}
                            {renderDataField(
                              "Nacionalidade",
                              dados.representante_nacionalidade,
                            )}
                            {renderDataField(
                              "Estado Civil",
                              dados.representante_estado_civil,
                            )}
                            {renderDataField(
                              "Profissão",
                              dados.representante_ocupacao,
                            )}
                            {renderDataField(
                              "Endereço Residencial",
                              dados.representante_endereco_residencial,
                            )}
                            {renderDataField(
                              "Endereço Profissional",
                              dados.representante_endereco_profissional,
                            )}
                            {renderDataField(
                              "Email",
                              dados.representante_email,
                            )}
                            {renderDataField(
                              "Telefone",
                              dados.representante_telefone,
                            )}
                            {renderDataField(
                              "RG",
                              `${dados.representante_rg_numero || ""} ${
                                dados.representante_rg_orgao || ""
                              }`.trim(),
                            )}
                          </div>
                        </div>
                      )}

                      {/* Seção do Requerido */}
                      <div className="space-y-4 pt-4 border-t border-soft">
                        <h3 className="heading-3 text-primary">
                          Dados da Parte Contrária (Requerido)
                        </h3>
                        <div className="grid gap-4 md:grid-cols-2">
                          {renderDataField(
                            "Nome Completo",
                            dados.nome_requerido,
                          )}
                          {renderDataField("CPF", dados.cpf_requerido)}
                          {renderDataField(
                            "Endereço conhecido",
                            dados.endereco_requerido,
                          )}
                          {renderDataField(
                            "Telefone",
                            dados.requerido_telefone,
                          )}
                          {renderDataField("Email", dados.requerido_email)}
                          {renderDataField(
                            "Profissão",
                            dados.requerido_ocupacao,
                          )}
                          {renderDataField(
                            "Endereço de Trabalho",
                            dados.requerido_endereco_profissional,
                          )}
                          {renderDataField(
                            "Dados Adicionais",
                            dados.dados_adicionais_requerido,
                          )}
                        </div>
                      </div>

                      {/* Seção de Detalhes do Caso */}
                      <div className="space-y-4 pt-4 border-t border-soft">
                        <h3 className="heading-3 text-primary">
                          Detalhes do Pedido e do Caso
                        </h3>
                        <div className="grid gap-4 md:grid-cols-2">
                          {renderDataField(
                            "Valor da Pensão Solicitado",
                            dados.valor_mensal_pensao,
                          )}
                          {renderDataField(
                            "Dados Bancários para Depósito",
                            dados.dados_bancarios_deposito,
                          )}
                          {renderDataField(
                            "Descrição da Guarda",
                            dados.descricao_guarda,
                          )}
                          {renderDataField(
                            "Situação Financeira de quem cuida",
                            dados.situacao_financeira_genitora,
                          )}
                          {renderDataField(
                            "Requerido tem emprego formal?",
                            dados.requerido_tem_emprego_formal,
                          )}
                          {renderDataField(
                            "Nome da Empresa",
                            dados.empregador_requerido_nome,
                          )}
                          {renderDataField(
                            "Endereço da Empresa",
                            dados.empregador_requerido_endereco,
                          )}
                          {/* Adicionar outros campos específicos da ação, se houver */}
                          {dados.numero_processo_originario &&
                            renderDataField(
                              "Processo Original",
                              dados.numero_processo_originario,
                            )}
                          {dados.periodo_debito_execucao &&
                            renderDataField(
                              "Período do Débito",
                              dados.periodo_debito_execucao,
                            )}
                          {dados.valor_total_debito_execucao &&
                            renderDataField(
                              "Valor Total do Débito",
                              dados.valor_total_debito_execucao,
                            )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
            </div>
          </div>

          <div className="card space-y-4">
            <div className="flex items-center gap-3">
              <FileText />
              <h2 className="heading-2">Relato do caso</h2>
            </div>
            <CollapsibleText
              className="text-primary"
              text={caso.relato_texto}
            />
          </div>

          <section className="card space-y-4 ">
            <h2 className="heading-2 text-primary">Seção DOS FATOS</h2>
            <div>
              <CollapsibleText
                className=""
                text={
                  caso.peticao_inicial_rascunho ||
                  "Rascunho não disponível ou ainda não gerado."
                }
                isPre={true}
                maxLength={500}
                defaultCollapsed={true}
              />
            </div>
            {user?.cargo === "admin" && (
              <button
                onClick={handleGenerateFatos}
                disabled={isGenerating || caso.status === "processando"}
                className="btn btn-primary w-full mt-4 flex items-center justify-center gap-2"
              >
                {isGenerating || caso.status === "processando" ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Processando IA...
                  </>
                ) : (
                  "Gerar sessão dos fatos"
                )}
              </button>
            )}
          </section>

          <section className="card space-y-4">
            <button
              onClick={() => setShowFullPetition(!showFullPetition)}
              className="btn btn-secondary w-full justify-start"
            >
              <Eye size={18} />
              {showFullPetition
                ? "Ocultar minuta completa"
                : "Visualizar minuta completa (Backup)"}
            </button>

            {showFullPetition && (
              <div className="mt-4">
                <CollapsibleText
                  text={
                    caso.peticao_completa_texto ||
                    "Minuta completa não disponível ou ainda não gerada."
                  }
                  isPre={true}
                  maxLength={2000}
                  defaultCollapsed={false}
                />
              </div>
            )}
          </section>

          {/* SEÇÃO DE FEEDBACK / ANOTAÇÕES */}
          <section className="card space-y-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="text-primary" />
              <h2 className="heading-2">Anotações / Feedback</h2>
            </div>
            <p className="text-sm text-muted">
              Espaço para observações internas sobre o caso ou ajustes
              necessários na minuta.
            </p>
            <textarea
              className="input min-h-[120px] resize-y font-sans"
              placeholder="Digite suas observações aqui..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveFeedback}
                disabled={savingFeedback}
                className="btn btn-primary flex items-center gap-2"
              >
                <Save size={18} />
                {savingFeedback ? "Salvando..." : "Salvar Anotações"}
              </button>
            </div>
          </section>
        </section>

        <section className="space-y-6">
          {/* Botão de Excluir Caso - Apenas para Admin */}
          {user?.cargo === "admin" && (
            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="heading-2 text-error">Excluir Caso</h2>
                <button
                  onClick={handleDeleteCaso}
                  disabled={isDeleting}
                  className="btn btn-danger w-fit flex items-center gap-2"
                >
                  <Trash2 size={18} />
                  {isDeleting ? "Excluindo..." : ""}
                </button>
              </div>
              <p className="text-sm text-muted">
                Esta ação não pode ser desfeita. Todos os dados do caso serão
                removidos permanentemente.
              </p>
            </div>
          )}

          <div className="card space-y-4">
            <h2 className="heading-2">Documentos e anexos</h2>
            <div className="space-y-3">
              {caso.url_documento_gerado && (
                <div className="space-y-2">
                  <a
                    href={caso.url_documento_gerado}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary w-full justify-start"
                  >
                    <Download size={18} />
                    Baixar minuta gerada
                  </a>
                  {user?.cargo === "admin" && (
                    <button
                      onClick={handleRegenerateMinuta}
                      disabled={isRegeneratingMinuta}
                      className="btn btn-ghost border border-soft w-full justify-start text-xs"
                    >
                      <RefreshCw
                        size={14}
                        className={isRegeneratingMinuta ? "animate-spin" : ""}
                      />
                      {isRegeneratingMinuta
                        ? "Regerando..."
                        : "Regerar Minuta Word"}
                    </button>
                  )}
                </div>
              )}
              {caso.url_termo_declaracao ? (
                <div className="space-y-2">
                  <a
                    href={caso.url_termo_declaracao}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary w-full justify-start"
                  >
                    <Download size={18} />
                    Baixar Termo de Declaração
                  </a>
                  {user?.cargo === "admin" && (
                    <button
                      onClick={handleGenerateTermo}
                      disabled={isGeneratingTermo}
                      className="btn btn-ghost border border-soft w-full justify-start text-xs"
                    >
                      <RefreshCw
                        size={14}
                        className={isGeneratingTermo ? "animate-spin" : ""}
                      />
                      {isGeneratingTermo ? "Regerando..." : "Regerar Termo"}
                    </button>
                  )}
                </div>
              ) : (
                user?.cargo === "admin" && (
                  <button
                    onClick={handleGenerateTermo}
                    disabled={isGeneratingTermo}
                    className="btn btn-secondary w-full justify-start"
                  >
                    {isGeneratingTermo ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Gerando Termo...
                      </>
                    ) : (
                      <>
                        <FileText size={18} />
                        Gerar Termo de Declaração
                      </>
                    )}
                  </button>
                )
              )}
              {caso.url_audio && (
                <a
                  href={caso.url_audio}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary w-full justify-start"
                >
                  <Mic size={18} />
                  Ouvir áudio do relato
                </a>
              )}
              {caso.urls_documentos?.length > 0 ? (
                caso.urls_documentos.map((url, index) => {
                  // Tenta extrair o nome original do arquivo da URL ou usa o mapa de nomes
                  let rawFileName = url.split("/").pop().split("?")[0];
                  rawFileName = decodeURIComponent(rawFileName);
                  let fileName = rawFileName;

                  // Limpeza visual do nome: remove prefixos "complementar_" e timestamps numéricos (hífen ou underscore)
                  fileName = fileName
                    .replace(/^complementar_(\d+[-_])?/, "")
                    .replace(/^\d+[-_]/, "");

                  const isComplementar = url.includes("complementar_");

                  // Tenta recuperar o nome personalizado definido no formulário
                  const docNames = caso.dados_formulario?.documentNames || {};
                  // 1. Tenta busca exata pela chave (prioridade para arquivos renomeados)
                  let customName = docNames[rawFileName];

                  // 2. Se não achar, tenta a lógica legada de matching aproximado
                  if (!customName) {
                    Object.keys(docNames).forEach((originalKey) => {
                      // Sanitiza a chave original (remove acentos) para comparar com o nome do arquivo salvo
                      const safeKey = originalKey
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "");

                      // Normalização agressiva: remove acentos e tudo que não for letra ou número (incluindo pontos e traços)
                      const fileNameNorm = fileName
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")
                        .replace(/[^a-zA-Z0-9]/g, "")
                        .toLowerCase();

                      const safeKeyNorm = safeKey
                        .replace(/[^a-zA-Z0-9]/g, "")
                        .toLowerCase();

                      // 1. Comparação exata ou flexível
                      if (
                        safeKey === fileName ||
                        fileNameNorm === safeKeyNorm
                      ) {
                        customName = docNames[originalKey];
                      }
                      // 2. Comparação por sufixo (salva casos onde o timestamp não foi removido corretamente)
                      // Verifica se o nome do arquivo (do URL) termina com o nome original (do formulário)
                      else if (
                        !customName &&
                        fileNameNorm.endsWith(safeKeyNorm) &&
                        safeKeyNorm.length > 3
                      ) {
                        customName = docNames[originalKey];
                      }
                    });
                  }

                  const displayName = customName || fileName;

                  const isEditing = editingFile.url === url;

                  if (isEditing) {
                    return (
                      <div
                        key={url}
                        className="flex items-center gap-2 w-full p-1 bg-surface border border-primary/30 rounded-lg animate-fade-in"
                      >
                        <input
                          type="text"
                          value={editingFile.name}
                          onChange={(e) =>
                            setEditingFile({
                              ...editingFile,
                              name: e.target.value,
                            })
                          }
                          className="input input-sm flex-1 h-8 text-sm"
                          autoFocus
                          placeholder="Novo nome do arquivo..."
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveRename();
                            if (e.key === "Escape")
                              setEditingFile({ url: null, name: "" });
                          }}
                        />
                        <button
                          onClick={handleSaveRename}
                          disabled={isRenaming}
                          className="btn btn-primary btn-xs h-8 px-3 flex items-center gap-1"
                          title="Salvar"
                        >
                          <Check size={14} /> Salvar
                        </button>
                        <button
                          onClick={() =>
                            setEditingFile({ url: null, name: "" })
                          }
                          className="btn btn-ghost btn-xs h-8 px-3 flex items-center gap-1"
                          title="Cancelar"
                        >
                          <X size={14} /> Cancelar
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div key={url} className="group flex items-center gap-2">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`btn btn-ghost border w-full justify-start text-left break-all ${
                          isComplementar
                            ? "border-highlight/30 bg-highlight/5 hover:bg-highlight/10"
                            : "border-soft"
                        }`}
                      >
                        <FileText
                          size={18}
                          className={`shrink-0 ${isComplementar ? "text-highlight" : ""}`}
                        />
                        <span
                          className={
                            isComplementar ? "font-medium text-highlight" : ""
                          }
                        >
                          {displayName}
                        </span>
                        {isComplementar && (
                          <span className="ml-auto text-[10px] uppercase font-bold bg-highlight/20 text-highlight px-2 py-0.5 rounded-full">
                            Novo
                          </span>
                        )}
                      </a>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setEditingFile({ url, name: displayName });
                        }}
                        className="btn btn-ghost btn-sm btn-square opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-primary"
                        title="Renomear arquivo"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted">
                  Nenhum documento complementar enviado.
                </p>
              )}
            </div>
          </div>
          <div className="card space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted">Status atual</p>
              <div className="relative flex items-center gap-2 z-10">
                <button
                  onClick={() => fetchDetalhes(true)}
                  className="text-muted hover:text-primary transition-colors p-1"
                  title="Atualizar status"
                >
                  <RefreshCw
                    size={16}
                    className={
                      caso.status === "processando" ? "animate-spin" : ""
                    }
                  />
                </button>
                <span className={`badge capitalize ${badgeClass}`}>
                  {statusKey.replace(/_/g, " ")}
                </span>
                <button
                  onClick={() => setShowStatusHelp(!showStatusHelp)}
                  className="text-muted hover:text-primary transition-colors focus:outline-none"
                >
                  <HelpCircle size={16} className="cursor-help" />
                </button>
                <div
                  className={`absolute bottom-full right-0 mb-2 w-72 origin-bottom transform-gpu transition-all duration-200 ease-in-out ${showStatusHelp ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none"}`}
                  role="tooltip"
                >
                  <div className="rounded-md border border-soft bg-surface p-3 text-sm shadow-lg">
                    <p className="font-bold capitalize">
                      {statusKey.replace(/_/g, " ")}
                    </p>
                    <p className="text-muted">
                      {statusDescriptions[statusKey] || "Sem descrição."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* BOTÃO DE REPROCESSAMENTO (Aparece em caso de ERRO ou para ADMIN) */}
            {(statusKey === "erro" || user?.cargo === "admin") && (
              <button
                onClick={handleReprocessar}
                disabled={isReprocessing || caso.status === "processando"}
                className="btn btn-ghost border border-red-200 bg-red-50 text-red-700 w-full flex items-center justify-center gap-2 hover:bg-red-100"
              >
                <RefreshCw
                  size={16}
                  className={isReprocessing ? "animate-spin" : ""}
                />
                {isReprocessing
                  ? "Reiniciando..."
                  : "Reprocessar Caso (OCR + IA)"}
              </button>
            )}

            {/* ALERTA DE REAGENDAMENTO */}
            {statusKey === "reagendamento_solicitado" && (
              <div className="alert alert-error space-y-3 animate-fade-in mt-4">
                <div className="flex items-center gap-2 text-error font-bold">
                  <AlertTriangle size={20} />
                  <h3>Solicitação de Reagendamento</h3>
                </div>

                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-error/80 uppercase font-bold">
                      Motivo informado pelo cidadão
                    </p>
                    <p className="text-sm bg-surface/50 p-2 rounded border border-error/20">
                      {caso.motivo_reagendamento || "Não informado."}
                    </p>
                  </div>

                  {caso.data_sugerida_reagendamento && (
                    <div>
                      <p className="text-xs text-error/80 uppercase font-bold">
                        Sugestão de nova data
                      </p>
                      <p className="text-sm bg-surface/50 p-2 rounded border border-error/20">
                        {caso.data_sugerida_reagendamento}
                      </p>
                    </div>
                  )}
                </div>

                <p className="text-xs text-error/90 italic">
                  Para reagendar, selecione "Reunião Online" ou "Presencial"
                  abaixo e defina a nova data.
                </p>
              </div>
            )}

            {/* SEÇÃO DE AGENDAMENTO ONLINE */}
            {statusKey === "reuniao_online_agendada" && (
              <div className="card space-y-4 border-t-4 border-t-blue-500 animate-fade-in mt-4 bg-blue-50/50">
                <h2 className="heading-2 flex items-center gap-2 text-blue-700">
                  <Video size={20} className="text-blue-500" />
                  Agendamento Online
                </h2>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted uppercase font-bold">
                      Data e Hora
                    </label>
                    <input
                      type="datetime-local"
                      className="input mt-1"
                      value={dataAgendamento}
                      onChange={(e) => setDataAgendamento(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted uppercase font-bold">
                      Link da Reunião
                    </label>
                    <input
                      type="text"
                      placeholder="Google Meet, Teams, etc."
                      className="input mt-1"
                      value={linkAgendamento}
                      onChange={(e) => setLinkAgendamento(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={handleAgendarReuniao}
                    disabled={isAgendando}
                    className="btn btn-primary w-full"
                  >
                    {isAgendando ? "Salvando..." : "Salvar Agendamento"}
                  </button>

                  {caso.agendamento_link && (
                    <div className="pt-2">
                      <a
                        href={`https://wa.me/55${(caso.whatsapp_contato || caso.telefone_assistido)?.replace(/\D/g, "")}?text=${encodeURIComponent(
                          `Olá, Sr(a). ${caso.nome_assistido}. A Defensoria Pública agendou seu atendimento online para ${new Date(
                            caso.agendamento_data,
                          ).toLocaleString("pt-BR", {
                            timeZone: "America/Sao_Paulo",
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}. Acesse pelo link: ${caso.agendamento_link}. Favor confirmar.`,
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white border-none"
                      >
                        <MessageSquare size={18} />
                        Notificar via WhatsApp
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SEÇÃO DE AGENDAMENTO PRESENCIAL */}
            {statusKey === "reuniao_presencial_agendada" && (
              <div className="card space-y-4 border-t-4 border-t-purple-500 animate-fade-in mt-4 bg-purple-50/50">
                <h2 className="heading-2 flex items-center gap-2 text-purple-700">
                  <Calendar size={20} className="text-purple-500" />
                  Agendamento Presencial
                </h2>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted uppercase font-bold">
                      Data e Hora
                    </label>
                    <input
                      type="datetime-local"
                      className="input mt-1"
                      value={dataAgendamento}
                      onChange={(e) => setDataAgendamento(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted uppercase font-bold">
                      Local / Instruções
                    </label>
                    <textarea
                      className="input mt-1 min-h-[80px]"
                      placeholder="Ex: Sede da Defensoria, Sala 104. Trazer documentos originais."
                      value={linkAgendamento}
                      onChange={(e) => setLinkAgendamento(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={handleAgendarReuniao}
                    disabled={isAgendando}
                    className="btn btn-primary w-full"
                  >
                    {isAgendando
                      ? "Salvando..."
                      : "Salvar Agendamento Presencial"}
                  </button>

                  {caso.agendamento_data && (
                    <div className="pt-2">
                      <a
                        href={`https://wa.me/55${(caso.whatsapp_contato || caso.telefone_assistido)?.replace(/\D/g, "")}?text=${encodeURIComponent(
                          `Olá, Sr(a). ${caso.nome_assistido}. A Defensoria Pública agendou seu atendimento presencial para ${new Date(
                            caso.agendamento_data,
                          ).toLocaleString("pt-BR", {
                            timeZone: "America/Sao_Paulo",
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}. Local/Instruções: ${caso.agendamento_link || "Sede da Defensoria"}. Favor confirmar.`,
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white border-none"
                      >
                        <MessageSquare size={18} />
                        Notificar via WhatsApp
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* HISTÓRICO DE AGENDAMENTOS */}
            {caso.historico_agendamentos &&
              caso.historico_agendamentos.length > 0 && (
                <div className="card space-y-4 mt-4 bg-gray-50 border border-gray-200">
                  <h2 className="heading-3 flex items-center gap-2 text-gray-700">
                    <History size={18} />
                    Histórico de Agendamentos
                  </h2>
                  <div className="space-y-3">
                    {caso.historico_agendamentos.map((hist) => (
                      <div
                        key={hist.id}
                        className="text-sm border-l-2 border-gray-300 pl-3 py-1"
                      >
                        <p className="font-semibold text-gray-800">
                          {new Date(hist.data_agendamento).toLocaleString(
                            "pt-BR",
                            { timeZone: "America/Sao_Paulo" }
                          )}{" "}
                          <span className="text-xs font-normal text-muted uppercase ml-1 bg-gray-200 px-1 rounded">
                            {hist.tipo}
                          </span>
                        </p>
                        <p className="text-muted text-xs mt-0.5">
                          {hist.link_ou_local}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1">
                          Status: {hist.status}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* ÁREA DE PENDÊNCIA (Só aparece se selecionar aguardando_docs) */}
            {statusKey === "aguardando_docs" && (
              <div className="p-4 bg-bg border border-border rounded-lg space-y-2 animate-fade-in">
                <label className="text-sm font-bold text">
                  Descreva os documentos pendentes:
                </label>
                <textarea
                  className="input w-full min-h-[100px] text-sm"
                  placeholder="Ex: - RG do cônjuge&#10;- Comprovante de residência atualizado"
                  value={pendenciaTexto}
                  onChange={(e) => setPendenciaTexto(e.target.value)}
                />
                <div className="flex justify-between items-center">
                  <p className="text-xs text">
                    Este texto aparecerá para o assistido na consulta.
                  </p>
                  <button
                    onClick={handleSalvarPendencia}
                    disabled={isUpdating}
                    className="btn btn-sm bg-orange-600 hover:bg-orange-700 text-white border-none"
                  >
                    {isUpdating ? "Salvando..." : "Salvar Descrição"}
                  </button>
                </div>
              </div>
            )}

            <select
              className="input disabled:opacity-70 disabled:cursor-not-allowed border-2 border-primary/20 focus:border-primary focus:ring-4 focus:ring-primary/10 font-medium text-primary-900"
              onChange={(e) => handleStatusChange(e.target.value)}
              value={statusKey}
              // TRAVA: Desabilita se estiver atualizando OU se já estiver finalizado/encaminhado
              disabled={isUpdating || statusKey === "encaminhado_solar"}
            >
              {/* LÓGICA DE EXIBIÇÃO INTELIGENTE: */}

              {/* 1. Se o caso JÁ estiver finalizado, mostra essa opção extra apenas para leitura */}
              {statusKey === "encaminhado_solar" && (
                <option value="encaminhado_solar">
                  ✅ Concluído / Encaminhado
                </option>
              )}

              {/* 2. Opção atual (se automática/não listada nas manuais) */}
              {statusKey !== "encaminhado_solar" &&
                !manualStatusOptions.find((o) => o.value === statusKey) && (
                  <option value={statusKey} disabled>
                    {statusKey.charAt(0).toUpperCase() +
                      statusKey.slice(1).replace(/_/g, " ")}{" "}
                    (Atual)
                  </option>
                )}

              {/* 3. Opções manuais permitidas */}
              {manualStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* Aviso visual extra */}
            {statusKey === "encaminhado_solar" && (
              <p className="text-xs text-green-600 mt-1">
                * Caso finalizado via integração Solar.
              </p>
            )}

            {isUpdating && (
              <p className="text-xs text-muted">Atualizando status...</p>
            )}
          </div>
          {/* --- ZONA DE FINALIZAÇÃO DO ESTAGIÁRIO --- */}
          <div className="mt-8 pt-8 border-t border-soft">
            <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
              <CheckCircle className="text-green-500" />
              Finalização e Encaminhamento (Solar)
            </h2>

            {caso.status === "encaminhado_solar" ? (
              // SE JÁ ESTIVER FINALIZADO, MOSTRA OS DADOS
              <div className="bg-green-500/10 border border-green-500/30 p-6 rounded-xl space-y-6">
                <div className="flex items-center justify-between gap-2 text-muted font-bold">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={20} /> CASO CONCLUÍDO E ENCAMINHADO
                  </div>
                  {user?.cargo === "admin" && (
                    <button
                      type="button"
                      onClick={handleReverterFinalizacao}
                      disabled={isReverting}
                      className="btn btn-danger btn-sm flex items-center gap-2"
                    >
                      <RefreshCw size={14} />
                      {isReverting ? "Revertendo..." : "Reverter"}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs text-muted uppercase font-bold">
                      Número
                    </label>
                    <p className="text-lg font-mono text-muted">
                      {caso.numero_solar}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-muted uppercase font-bold">
                      Número do Processo (TJ)
                    </label>
                    <p className="text-lg font-mono text-muted">
                      {caso.numero_processo}
                    </p>
                  </div>
                </div>
                {caso.url_capa_processual && (
                  <div>
                    <a
                      href={caso.url_capa_processual}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline flex items-center gap-2"
                    >
                      <FileText size={16} /> Ver Capa Processual Anexada
                    </a>
                  </div>
                )}
              </div>
            ) : (
              // SE NÃO ESTIVER FINALIZADO, MOSTRA O FORMULÁRIO
              <form
                onSubmit={handleFinalizarCaso}
                className="bg-surface border border-soft p-6 rounded-xl space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* INPUT NÚMERO PROCESSO */}
                  <div>
                    <label className="block text-sm font-medium text-muted mb-1">
                      Número do Processo (PJE/TJ)
                    </label>
                    <input
                      type="text"
                      value={numProcesso}
                      onChange={(e) => setNumProcesso(e.target.value)}
                      placeholder="Ex: 8000..."
                      className="w-full bg-app border border-soft rounded-lg p-3 text-muted focus:ring-2 focus:ring-primary outline-none"
                      required
                    />
                  </div>
                </div>

                {/* UPLOAD CAPA */}
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">
                    Anexar Capa Processual (PDF)
                  </label>
                  <div className="border-2 border-dashed border-soft rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-white/5 transition-colors cursor-pointer relative">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setArquivoCapa(e.target.files[0])}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      required
                    />
                    <Upload className="text-muted mb-2" size={24} />
                    {arquivoCapa ? (
                      <span className="text-primary font-medium">
                        {arquivoCapa.name}
                      </span>
                    ) : (
                      <span className="text-muted text-sm">
                        Clique ou arraste o PDF da capa aqui
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={enviandoFinalizacao}
                  className="btn btn-primary w-full py-3 mt-4 flex items-center justify-center gap-2"
                >
                  {enviandoFinalizacao
                    ? "Processando..."
                    : "Concluir Caso e Enviar ao Cidadão"}
                </button>
              </form>
            )}
          </div>
        </section>
      </div>

      {/* MODAL DE MOTIVO DE ARQUIVAMENTO */}
      {archiveModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4 animate-fade-in">
          <div className="bg-surface border border-soft p-6 rounded-2xl shadow-xl max-w-md w-full space-y-4">
            <div className="flex items-center gap-3 text-amber-500">
              <Archive size={24} />
              <h3 className="text-xl font-bold text-main">Arquivar Caso</h3>
            </div>
            
            <p className="text-muted text-sm">
              O caso será movido para o "Arquivo Morto" e sairá da lista principal. 
              Justifique esta ação:
            </p>

            <textarea
              className="input min-h-[100px] resize-none"
              placeholder="Ex: Dados inconsistentes, assistido desistiu, duplicidade..."
              value={archiveReason}
              onChange={(e) => setArchiveReason(e.target.value)}
              autoFocus
            />

            <div className="flex gap-3 pt-2">
              <button onClick={() => setArchiveModalOpen(false)} className="btn btn-ghost flex-1 border border-soft">
                Cancelar
              </button>
              <button onClick={confirmArchive} className="btn btn-secondary flex-1 bg-amber-500 hover:bg-amber-600 text-white border-amber-500">
                Confirmar Arquivamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
