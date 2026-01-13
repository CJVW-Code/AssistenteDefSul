import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
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
} from "lucide-react";
import { API_BASE } from "../../../utils/apiBase";
import { useToast } from "../../../contexts/ToastContext";
import { useConfirm } from "../../../contexts/ConfirmContext";

const statusOptions = [
  { value: "recebido", label: "Recebido" },
  { value: "em_analise", label: "Em análise" },
  { value: "aguardando_docs", label: "Pendentes de documentos" },
];

const statusBadges = {
  recebido: "bg-amber-100 text-amber-800 border-amber-200",
  em_analise: "bg-sky-100 text-sky-800 border-sky-200",
  aguardando_docs: "bg-purple-100 text-purple-800 border-purple-200",
  processando: "bg-blue-100 text-blue-800 border-blue-200",
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
  const [isReverting, setIsReverting] = useState(false);
  const [dataAgendamento, setDataAgendamento] = useState("");
  const [linkAgendamento, setLinkAgendamento] = useState("");
  const [isAgendando, setIsAgendando] = useState(false);

  const fetchDetalhes = useCallback(
    async (silent = false) => {
      try {
        const response = await fetch(`${API_BASE}/casos/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Falha ao carregar o caso.");
        const data = await response.json();
        if (data.agendamento_data) {
          // Converte a data UTC do banco para o formato local esperado pelo input datetime-local
          const date = new Date(data.agendamento_data);
          const offset = date.getTimezoneOffset() * 60000;
          const localISOTime = new Date(date.getTime() - offset).toISOString().slice(0, 16);
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
    [id, token]
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
      setFeedbackInitialized(true);
    }
  }, [caso, feedbackInitialized]);

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
        body: JSON.stringify({ status: novoStatus }),
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
        "Excluir Caso"
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
        "Reverter Finalização?"
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
        }
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
          <p className="text-muted text-sm">
            Protocolo {caso.protocolo} • {caso.tipo_acao}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-6 lg:col-span-2">
          <div className="card space-y-4">
            <h2 className="heading-2">Dados do assistido</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {renderDataField("Nome completo", caso.nome_assistido)}
              {renderDataField("CPF", caso.cpf_assistido)}
              {renderDataField("Telefone", caso.telefone_assistido)}
              {renderDataField(
                "Tipo de ação",
                caso.tipo_acao?.replace("_", " ")
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

                  return (
                    <div className="mt-4 space-y-6 border-t border-soft pt-6">
                      {/* Seção do Beneficiário */}
                      <div className="space-y-4">
                        <h3 className="heading-3 text-primary">
                          {isRepresentacao
                            ? "Dados do Beneficiário (Criança/Adolescente)"
                            : "Dados do Autor da Ação"}
                        </h3>
                        <div className="grid gap-4 md:grid-cols-2">
                          {renderDataField("Nome Completo", dados.nome)}
                          {renderDataField("CPF", dados.cpf)}
                          {renderDataField(
                            "Data de Nascimento",
                            dados.assistido_data_nascimento
                          )}
                          {renderDataField(
                            "Nacionalidade",
                            dados.assistido_nacionalidade
                          )}
                          {renderDataField(
                            "Estado Civil",
                            dados.assistido_estado_civil
                          )}
                          {renderDataField(
                            "Endereço Residencial",
                            dados.endereco_assistido
                          )}
                          {renderDataField("Email", dados.email_assistido)}
                          {renderDataField(
                            "Telefone de Contato",
                            dados.telefone
                          )}
                          {renderDataField(
                            "RG",
                            `${dados.assistido_rg_numero || ""} ${
                              dados.assistido_rg_orgao || ""
                            }`.trim()
                          )}
                        </div>
                      </div>

                      {/* Seção do Representante (Condicional) */}
                      {isRepresentacao && (
                        <div className="space-y-4 pt-4 border-t border-soft">
                          <h3 className="heading-3 text-primary">
                            Dados do Representante Legal
                          </h3>
                          <div className="grid gap-4 md:grid-cols-2">
                            {renderDataField(
                              "Nome Completo",
                              dados.representante_nome
                            )}
                            {renderDataField("CPF", dados.representante_cpf)}
                            {renderDataField(
                              "Nacionalidade",
                              dados.representante_nacionalidade
                            )}
                            {renderDataField(
                              "Estado Civil",
                              dados.representante_estado_civil
                            )}
                            {renderDataField(
                              "Profissão",
                              dados.representante_ocupacao
                            )}
                            {renderDataField(
                              "Endereço Residencial",
                              dados.representante_endereco_residencial
                            )}
                            {renderDataField(
                              "Endereço Profissional",
                              dados.representante_endereco_profissional
                            )}
                            {renderDataField(
                              "Email",
                              dados.representante_email
                            )}
                            {renderDataField(
                              "Telefone",
                              dados.representante_telefone
                            )}
                            {renderDataField(
                              "RG",
                              `${dados.representante_rg_numero || ""} ${
                                dados.representante_rg_orgao || ""
                              }`.trim()
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
                            dados.nome_requerido
                          )}
                          {renderDataField("CPF", dados.cpf_requerido)}
                          {renderDataField(
                            "Endereço conhecido",
                            dados.endereco_requerido
                          )}
                          {renderDataField(
                            "Telefone",
                            dados.requerido_telefone
                          )}
                          {renderDataField("Email", dados.requerido_email)}
                          {renderDataField(
                            "Profissão",
                            dados.requerido_ocupacao
                          )}
                          {renderDataField(
                            "Endereço de Trabalho",
                            dados.requerido_endereco_profissional
                          )}
                          {renderDataField(
                            "Dados Adicionais",
                            dados.dados_adicionais_requerido
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
                            dados.valor_mensal_pensao
                          )}
                          {renderDataField(
                            "Dados Bancários para Depósito",
                            dados.dados_bancarios_deposito
                          )}
                          {renderDataField(
                            "Descrição da Guarda",
                            dados.descricao_guarda
                          )}
                          {renderDataField(
                            "Situação Financeira de quem cuida",
                            dados.situacao_financeira_genitora
                          )}
                          {renderDataField(
                            "Requerido tem emprego formal?",
                            dados.requerido_tem_emprego_formal
                          )}
                          {renderDataField(
                            "Nome da Empresa",
                            dados.empregador_requerido_nome
                          )}
                          {renderDataField(
                            "Endereço da Empresa",
                            dados.empregador_requerido_endereco
                          )}
                          {/* Adicionar outros campos específicos da ação, se houver */}
                          {dados.numero_processo_originario &&
                            renderDataField(
                              "Processo Original",
                              dados.numero_processo_originario
                            )}
                          {dados.periodo_debito_execucao &&
                            renderDataField(
                              "Período do Débito",
                              dados.periodo_debito_execucao
                            )}
                          {dados.valor_total_debito_execucao &&
                            renderDataField(
                              "Valor Total do Débito",
                              dados.valor_total_debito_execucao
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
              Espaço para observações internas sobre o caso ou ajustes necessários na minuta.
            </p>
            <textarea
              className="input min-h-[120px] resize-y font-sans"
              placeholder="Digite suas observações aqui..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
            <div className="flex justify-end">
              <button
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
                <h2 className="heading-2 text-red-500">
                  Ações Administrativas
                </h2>
                <button
                  onClick={handleDeleteCaso}
                  disabled={isDeleting}
                  className="btn btn-danger w-fit flex items-center gap-2"
                >
                  <Trash2 size={18} />
                  {isDeleting ? "Excluindo..." : "Excluir Caso"}
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
                <a
                  href={caso.url_documento_gerado}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary w-full justify-start"
                >
                  <Download size={18} />
                  Baixar minuta gerada
                </a>
              )}
              {caso.url_termo_declaracao && (
                <a
                  href={caso.url_termo_declaracao}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary w-full justify-start"
                >
                  <Download size={18} />
                  Baixar Termo de Declaração
                </a>
              )}
              {!caso.url_termo_declaracao && (
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
                caso.urls_documentos.map((url, index) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost border border-soft w-full justify-start"
                  >
                    <FileText size={18} />
                    Documento {index + 1}
                  </a>
                ))
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
              <div className="relative flex items-center gap-2 group z-10">
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
                <HelpCircle size={16} className="text-muted cursor-help" />
                <div
                  className="absolute bottom-full right-0 mb-2 w-72 origin-bottom scale-95 transform-gpu opacity-0 transition-all duration-200 ease-in-out group-hover:scale-100 group-hover:opacity-100"
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

            {/* SEÇÃO DE AGENDAMENTO ONLINE */}
            <div className="card space-y-4 border-t-4 border-t-blue-500">
              <h2 className="heading-2 flex items-center gap-2">
                <Video size={20} className="text-blue-500" />
                Agendamento Online
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted uppercase font-bold">Data e Hora</label>
                  <input
                    type="datetime-local"
                    className="input mt-1"
                    value={dataAgendamento}
                    onChange={(e) => setDataAgendamento(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted uppercase font-bold">Link da Reunião</label>
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
                          caso.agendamento_data
                        ).toLocaleString("pt-BR")}. Acesse pelo link: ${caso.agendamento_link}. Favor confirmar.`
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

            <select
              className="input disabled:opacity-70 disabled:cursor-not-allowed"
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

              {/* 2. Mostra as opções normais (Recebido, Em Análise...) */}
              {statusOptions.map((option) => (
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
                  {/* INPUT NÚMERO SOLAR */}
                  <div>
                    <label className="block text-sm font-medium text-muted mb-1">
                      Número de Atendimento
                    </label>
                    <input
                      type="text"
                      value={numSolar}
                      onChange={(e) => setNumSolar(e.target.value)}
                      placeholder="Ex: 123456"
                      className="w-full bg-app border border-soft rounded-lg p-3 text-muted focus:ring-2 focus:ring-primary outline-none"
                      required
                    />
                  </div>

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
    </div>
  );
};
