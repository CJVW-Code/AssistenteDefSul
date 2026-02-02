// Arquivo: frontend-defensor/src/components/Casos.jsx

import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";
import { Eye, Search } from "lucide-react";
import { API_BASE } from "../../../utils/apiBase";

const statusStyles = {
  recebido: "bg-amber-100 text-amber-800 border-amber-200",
  em_analise: "bg-sky-100 text-sky-800 border-sky-200",
  aguardando_docs: "bg-purple-100 text-purple-800 border-purple-200",
  reuniao_agendada: "bg-purple-100 text-purple-800 border-purple-200",
  reuniao_online_agendada: "bg-blue-100 text-blue-800 border-blue-200",
  encaminhado_solar: "bg-emerald-100 text-emerald-800 border-emerald-200",
  default: "bg-slate-100 text-slate-700 border-slate-200",
};

const normalizeStatus = (value) => (value || "recebido").toLowerCase();

export const Casos = () => {
  const [casos, setCasos] = useState([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuth();

  useEffect(() => {
    const fetchCasos = async () => {
      try {
        const response = await fetch(`${API_BASE}/casos`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error("Falha ao buscar os casos.");
        }
        const data = await response.json();
        setCasos(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchCasos();
    }
  }, [token]);

  // Filtro de busca
  const casosFiltrados = casos.filter((caso) => {
    const termo = busca.toLowerCase();
    return (
      caso.nome_assistido?.toLowerCase().includes(termo) ||
      caso.protocolo?.toLowerCase().includes(termo) ||
      caso.cpf_assistido?.includes(termo) ||
      (caso.numero_solar && String(caso.numero_solar).includes(termo))
    );
  });

  if (loading) {
    return (
      <div className="card text-center text-muted">
        Carregando listagem de casos...
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
      <section className="card space-y-2 border-l-4 border-l-primary/70">
        <p className="text-sm text-muted uppercase tracking-[0.3em]">
          Protocolo digital
        </p>
        <h1 className="heading-1">Todos os casos recebidos</h1>
        <p className="text-muted">
          Consulte rapidamente o status dos atendimentos enviados pelo portal do
          cidadão e avance as tratativas.
        </p>
      </section>

      <section className="card p-0 overflow-hidden">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-soft px-6 py-4">
          <div className="flex-1">
            <h2 className="heading-2">Listagem oficial</h2>
            <p className="text-sm text-muted">
              {casos.length} registros importados do Assistente Def Sul.
            </p>
          </div>

          {/* CAMPO DE BUSCA */}
          <div className="relative w-full md:w-72">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              size={18}
            />
            <input
              type="text"
              placeholder="Buscar nome, CPF, protocolo ou Solar..."
              className="input pl-10 py-2 text-sm"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table text-sm">
            <thead className="">
              <tr className="text-muted uppercase text-xs tracking-wide">
                <th className="px-4 py-3">Protocolo</th>
                <th className="px-4 py-3">Nome do cidadão</th>
                <th className="px-4 py-3">Data de abertura</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {casosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center p-8 text-muted">
                    {casos.length === 0
                      ? "Nenhum caso encontrado."
                      : "Nenhum resultado para a busca."}
                  </td>
                </tr>
              ) : (
                casosFiltrados.map((caso) => {
                  const statusKey = normalizeStatus(caso.status);
                  const badgeStyle =
                    statusStyles[statusKey] || statusStyles.default;
                  return (
                    <tr
                      key={caso.id}
                      className="border-t border-soft hover:bg-slate-100 dark:hover:bg-slate-400/60 transition"
                    >
                      <td className="p-4 font-mono text-xs text-muted">
                        <div>{caso.protocolo}</div>
                        {caso.numero_solar && (
                          <div className="text-primary font-semibold mt-1">
                            Solar: {caso.numero_solar}
                          </div>
                        )}
                      </td>
                      <td className="p-4 font-medium">{caso.nome_assistido}</td>
                      <td className="p-4 text-muted">
                        {new Date(caso.created_at).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="p-4">
                        <span className={`badge capitalize ${badgeStyle}`}>
                          {statusKey.replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <Link
                          to={`/painel/casos/${caso.id}`}
                          className="inline-flex items-center gap-2 text-primary hover:text-primary-600 font-medium"
                          title="Ver detalhes"
                        >
                          <Eye size={18} />
                          Ver detalhes
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
