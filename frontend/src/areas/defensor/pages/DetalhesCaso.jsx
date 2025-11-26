import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ChevronLeft, Download, FileText, Mic } from "lucide-react";
import { API_BASE } from "../../../utils/apiBase";

const statusOptions = [
  { value: "recebido", label: "Recebido" },
  { value: "em_analise", label: "Em análise" },
  { value: "aguardando_docs", label: "Aguardando documentos" },
  { value: "finalizado", label: "Finalizado" },
];

const statusBadges = {
  recebido: "bg-amber-100 text-amber-800 border-amber-200",
  em_analise: "bg-sky-100 text-sky-800 border-sky-200",
  aguardando_docs: "bg-purple-100 text-purple-800 border-purple-200",
  finalizado: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

export const DetalhesCaso = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const [caso, setCaso] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const fetchDetalhes = async () => {
      try {
        const response = await fetch(`${API_BASE}/casos/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Falha ao carregar o caso.");
        const data = await response.json();
        setCaso(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchDetalhes();
  }, [id, token]);

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
      alert(error.message);
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
  const badgeClass =
    statusBadges[statusKey] || "bg-slate-100 text-slate-700 border-slate-200";

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
        <div className="card space-y-2 lg:w-80">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">Status atual</p>
            <span className={`badge capitalize ${badgeClass}`}>
              {statusKey.replace("_", " ")}
            </span>
          </div>
          <select
            className="input"
            onChange={(e) => handleStatusChange(e.target.value)}
            value={statusKey}
            disabled={isUpdating}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {isUpdating && (
            <p className="text-xs text-muted">Atualizando status...</p>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-6 lg:col-span-2">
          <div className="card space-y-4">
            <h2 className="heading-2">Dados do assistido</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs text-muted uppercase tracking-wide">
                  Nome completo
                </p>
                <p className="font-semibold">{caso.nome_assistido}</p>
              </div>
              <div>
                <p className="text-xs text-muted uppercase tracking-wide">
                  CPF
                </p>
                <p className="font-semibold">{caso.cpf_assistido || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted uppercase tracking-wide">
                  Telefone
                </p>
                <p className="font-semibold">
                  {caso.telefone_assistido || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted uppercase tracking-wide">
                  Tipo de ação
                </p>
                <p className="font-semibold">
                  {caso.tipo_acao?.replace("_", " ") || "—"}
                </p>
              </div>
            </div>
          </div>

          <div className="card space-y-4">
            <div className="flex items-center gap-3">
              <FileText className="text-primary" />
              <h2 className="heading-2">Relato do caso</h2>
            </div>
            <p className="text-muted whitespace-pre-wrap">
              {caso.relato_texto || "Nenhum relato textual fornecido."}
            </p>
          </div>
        </section>

        <section className="space-y-6">
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
                  Baixar petição gerada
                </a>
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
        </section>
      </div>

      <section className="card space-y-4">
        <h2 className="heading-2">Rascunho da petição inicial</h2>
        <div className="rounded-2xl border border-dashed border-soft bg-slate-900 text-slate-100 dark:bg-slate-100 dark:text-slate-900 p-5 max-h-[480px] overflow-y-auto text-sm">
          {caso.peticao_inicial_rascunho ||
            "Rascunho não disponível ou ainda não gerado."}
        </div>
      </section>
    </div>
  );
};
