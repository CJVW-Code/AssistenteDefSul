import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";
import {
  FileText,
  Clock,
  Inbox,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { jwtDecode } from "jwt-decode";
import { API_BASE } from "../../../utils/apiBase";

const statusStyles = {
  recebido: "bg-amber-100 text-amber-800 border-amber-200",
  em_analise: "bg-sky-100 text-sky-800 border-sky-200",
  aguardando_docs: "bg-purple-100 text-purple-800 border-purple-200",
  finalizado: "bg-emerald-100 text-emerald-800 border-emerald-200",
  default: "bg-slate-100 text-slate-700 border-slate-200",
};

const normalizeStatus = (status) =>
  (status || "recebido").toLowerCase().trim();

const summaryFilters = {
  ativos: (caso) => normalizeStatus(caso.status) !== "finalizado",
  em_analise: (caso) => normalizeStatus(caso.status) === "em_analise",
  aguardando_docs: (caso) =>
    normalizeStatus(caso.status) === "aguardando_docs",
  finalizado: (caso) => normalizeStatus(caso.status) === "finalizado",
};

const summaryFilterLabels = {
  ativos: "casos ativos",
  em_analise: "casos em análise",
  aguardando_docs: "casos aguardando documentos",
  finalizado: "casos finalizados",
};

export const Dashboard = () => {
  const [casos, setCasos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuth();
  const [defensor, setDefensor] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);

  useEffect(() => {
    if (token) {
      const decoded = jwtDecode(token);
      setDefensor(decoded);
    }
  }, [token]);

  useEffect(() => {
    const fetchCasos = async () => {
      try {
        const response = await fetch(`${API_BASE}/casos`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) throw new Error("Falha ao buscar os casos.");
        const data = await response.json();
        setCasos(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchCasos();
  }, [token]);

  const resumo = useMemo(() => {
    const total = casos.length;
    const finalizados = casos.filter(
      (caso) => normalizeStatus(caso.status) === "finalizado"
    ).length;
    const aguardandoDocs = casos.filter(
      (caso) => normalizeStatus(caso.status) === "aguardando_docs"
    ).length;
    const emAnalise = casos.filter(
      (caso) => normalizeStatus(caso.status) === "em_analise"
    ).length;
    const ativos = total - finalizados;
    return { total, finalizados, aguardandoDocs, emAnalise, ativos };
  }, [casos]);

  const filteredCasos = useMemo(() => {
    if (!statusFilter || !summaryFilters[statusFilter]) {
      return casos;
    }
    return casos.filter(summaryFilters[statusFilter]);
  }, [casos, statusFilter]);

  const casosRecentes = useMemo(
    () => filteredCasos.slice(0, 6),
    [filteredCasos]
  );
  const ultimaAtualizacao = casos[0]?.created_at
    ? new Date(casos[0].created_at).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const handleSummaryClick = (key) => {
    setStatusFilter((previous) => (previous === key ? null : key));
  };

  if (loading) {
    return (
      <div className="card text-center text-muted">
        Carregando painel do defensor...
      </div>
    );
  }

  if (error) {
    return (
      <div className="card border-l-4 border-l-red-500 text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24">
      <section
        className="card text-white shadow-lg border-none relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-600) 60%, #0b67a3 100%)",
        }}
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-white/70">
              Painel atualizado
            </p>
            <h1 className="heading-hero mt-2">
              Olá, Dr(a). {defensor?.nome || "Defensor"}
            </h1>
            <p className="text-white/80 max-w-2xl mt-2">
              Acompanhe os casos recebidos pelo Assistente Def Sul,
              identifique pendências de documentos e avance nos atendimentos
              com conforto visual inspirado pelo nosso novo design system.
            </p>
          </div>
          <Link
            to="/painel/casos"
            className="btn btn-ghost border border-white/40 text-white bg-white/10 hover:bg-white/20"
          >
            Ver todos os casos
          </Link>
        </div>
        {ultimaAtualizacao && (
          <p className="text-xs text-white/70 mt-4">
            Última atualização recebida em {ultimaAtualizacao}
          </p>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            key: "ativos",
            label: "Casos ativos",
            value: resumo.ativos,
            helper: `${resumo.total} recebidos no total.`,
            icon: Inbox,
            accent: "text-primary",
          },
          {
            key: "em_analise",
            label: "Em análise",
            value: resumo.emAnalise,
            helper: "Casos aguardando movimentação.",
            icon: Clock,
            accent: "text-sky-500",
          },
          {
            key: "aguardando_docs",
            label: "Aguardando docs",
            value: resumo.aguardandoDocs,
            helper: "Solicite complemento ao cidadão.",
            icon: AlertTriangle,
            accent: "text-purple-500",
          },
          {
            key: "finalizado",
            label: "Finalizados",
            value: resumo.finalizados,
            helper: "Casos concluídos.",
            icon: CheckCircle2,
            accent: "text-emerald-500",
          },
        ].map(({ key, label, value, helper, icon: Icon, accent }) => {
          const active = statusFilter === key;
          return (
            <button
              type="button"
              key={key}
              onClick={() => handleSummaryClick(key)}
              aria-pressed={active}
              className={`card text-left transition-all border-l-4 ${
                active
                  ? "border-l-primary shadow-xl ring-2 ring-primary/30 translate-y-[-2px]"
                  : "border-l-transparent hover:border-l-primary/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted">{label}</p>
                  <p className="text-3xl font-semibold">{value}</p>
                </div>
                <Icon className={accent} />
              </div>
              <p className="text-sm text-muted mt-2">{helper}</p>
              <span
                className={`mt-4 inline-flex items-center text-xs font-semibold ${
                  active ? "text-primary" : "text-muted"
                }`}
              >
                {active ? "Filtro aplicado" : "Clique para filtrar"}
              </span>
            </button>
          );
        })}
      </section>

      <section className="card p-0 overflow-hidden">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-soft px-6 py-4">
          <div>
            <h2 className="heading-2 text-primary">Casos mais recentes</h2>
            <p className="text-sm text-muted">
              Últimos atendimentos enviados pelo portal do cidadão.
            </p>
            {statusFilter && (
              <p className="text-sm text-primary mt-1 flex items-center gap-2">
                Mostrando apenas {summaryFilterLabels[statusFilter]}.
                <button
                  type="button"
                  onClick={() => setStatusFilter(null)}
                  className="underline text-xs font-semibold"
                >
                  Limpar filtro
                </button>
              </p>
            )}
          </div>
          <Link to="/painel/casos" className="btn btn-secondary text-sm">
            Gerenciar todos
          </Link>
        </div>

        {casos.length === 0 ? (
          <div className="p-6 text-muted text-center">
            Nenhum caso pendente no momento.
          </div>
        ) : (
          <ul className="divide-y divide-soft">
            {casosRecentes.map((caso) => {
              const statusKey = normalizeStatus(caso.status);
              const badgeStyle =
                statusStyles[statusKey] || statusStyles.default;
              return (
                <li key={caso.id}>
                  <Link
                    to={`/painel/casos/${caso.id}`}
                    className="block px-6 py-4 hover:bg-slate-100 dark:hover:bg-slate-900 transition"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                          <FileText size={20} />
                        </div>
                        <div>
                          <p className="heading-3 text-slate-800 dark:text-slate-200">{caso.nome_assistido}</p>
                          <p className="text-sm text-muted">
                            Protocolo: {caso.protocolo}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3 md:items-center">
                        <span className={`badge ${badgeStyle}`}>
                          {statusKey.replace("_", " ")}
                        </span>
                        <div className="flex items-center gap-2 text-sm text-muted">
                          <Clock size={16} />
                          {new Date(caso.created_at).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};
