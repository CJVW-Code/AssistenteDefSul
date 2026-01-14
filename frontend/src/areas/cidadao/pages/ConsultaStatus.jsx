﻿import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Hash,
  KeyRound,
  CheckCircle,
  FileText,
  Clock,
  Video,
  HelpCircle,
} from "lucide-react";
import { API_BASE } from "../../../utils/apiBase";

export const ConsultaStatus = () => {
  const [cpf, setCpf] = useState("");
  const [chave, setChave] = useState("");
  const [caso, setCaso] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleConsulta = async (e) => {
    e.preventDefault();
    setLoading(true);
    setCaso(null); // Limpa a busca anterior
    setError(null);

    const cpfLimpo = cpf.replace(/\D/g, "");
    try {
      const response = await fetch(
        `${API_BASE}/status?cpf=${cpfLimpo}&chave=${chave}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível consultar o status.");
      }

      setCaso(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-app p-6 sm:p-8 rounded-2xl border border-soft"
    >
      <form onSubmit={handleConsulta} className="space-y-4">
        <div className="relative">
          <Hash
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            size={20}
          />
          <input
            type="text"
            placeholder="CPF do Solicitante"
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
            required
            className="w-full pl-10 pr-4 py-3 bg-app rounded-lg border border-soft focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-muted"
          />
        </div>
        <div className="relative">
          <KeyRound
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            size={20}
          />
          <input
            type="text"
            placeholder="Chave de Acesso"
            value={chave}
            onChange={(e) => setChave(e.target.value)}
            required
            className="w-full pl-10 pr-4 py-3 bg-app rounded-lg border border-soft focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-muted"
          />
        </div>

        {/* MENSAGEM DE AJUDA DA CHAVE */}
        <div className="flex items-start gap-2 text-xs text-muted bg-surface p-3 rounded border border-soft">
          <HelpCircle size={16} className="shrink-0 mt-0.5 text-muted" />
          <p>
            Esqueceu a chave? Compareça a uma unidade da defensoria para resetar
            apresentando documentos para comprovação da identidade.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn btn-primary px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <Search className="inline mr-2" />
          {loading ? "Consultando..." : "Consultar Status"}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm text-center">
          {error}
        </div>
      )}

      {caso && (
        <>
          {/* CARD DE AGENDAMENTO ONLINE - PRIORIDADE MÁXIMA */}
          {caso.agendamento_link && (
            <div className="bg-surface/20 border border-border/50 rounded-xl p-6 mt-6 mb-4 ">
              <h3 className="text-xl font-bold text-primary flex items-center gap-2">
                <Video size={20} /> Atendimento Online Agendado
              </h3>
              {caso.agendamento_data && (
                <p className="text-muted mt-2">
                  Data:{" "}
                  <strong className="text-lg">
                    {new Date(caso.agendamento_data).toLocaleString("pt-BR")}
                  </strong>
                </p>
              )}
              <a
                href={caso.agendamento_link}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary w-full mt-4 flex justify-center items-center gap-2"
              >
                ENTRAR NA REUNIÃO AGORA
              </a>
            </div>
          )}

          {caso.status === "encaminhamento solar" ||
          caso.status === "encaminhado_solar" ? (
            // --- TELA DE CASO CONCLUÍDO ---
            <div className="bg-border/10 border border-border/30 rounded-xl p-6 mt-6 animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-primary/50 text-muted p-2 rounded-full">
                  <CheckCircle size={24} />
                </div>
                <h3 className="text-xl font-bold text-muted">
                  Atendimento Concluído!
                </h3>
              </div>

              <p className="text-muted mb-6">
                Seu caso já foi analisado pela Defensoria e o processo foi
                gerado. Abaixo estão os dados do seu processo judicial.
              </p>

              {/* EXIBIÇÃO DOS NÚMEROS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-surface border border-soft p-4 rounded-lg">
                  <label className="text-xs text-muted uppercase font-bold tracking-wider">
                    Número do Processo
                  </label>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-2xl font-mono text-primary select-all">
                      {caso.numero_processo || "Número indisponível"}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        navigator.clipboard.writeText(caso.numero_processo)
                      }
                      className="text-primary hover:text-primary text-sm"
                    >
                      Copiar
                    </button>
                  </div>
                </div>

                <div className="bg-surface border border-soft p-4 rounded-lg">
                  <label className="text-xs text-muted uppercase font-bold tracking-wider">
                    Atendimento Solar
                  </label>
                  <div className="mt-1">
                    <span className="text-xl font-mono text-primary select-all">
                      {caso.numero_solar || "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* BOTÕES DE DOWNLOAD */}
              <div className="space-y-3">
                {caso.url_capa_processual && (
                  <a
                    href={caso.url_capa_processual}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost border border-soft w-full flex items-center justify-center gap-2 py-3 hover:bg-surface"
                  >
                    <FileText size={20} />
                    Baixar Capa do Processo
                  </a>
                )}
              </div>
            </div>
          ) : (
            // --- TELA DE STATUS NORMAL (EM ANÁLISE) ---
            <div className="bg-surface border border-soft rounded-xl p-6 mt-6">
              <h3 className="text-lg font-semibold text-primary mb-2">
                Status Atual
              </h3>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/20 text border border-yellow-500/30">
                <Clock size={16} />
                <span className="font-medium capitalize">
                  {caso.status?.replace("_", " ")}
                </span>
              </div>
              <p className="text-sm text-muted mt-4">
                Estamos analisando suas informações. Por favor, aguarde e
                verifique novamente em breve.
              </p>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
};
