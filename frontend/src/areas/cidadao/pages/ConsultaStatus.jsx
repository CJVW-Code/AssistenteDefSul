import React, { useState } from "react";
import { motion } from "framer-motion";
import { Search, Hash, KeyRound } from "lucide-react";

// O 'useToast' pode não estar configurado. Se der erro, comente as linhas do toast.
// import { useToast } from '@/components/ui/use-toast';

export const ConsultaStatus = () => {
  // const { toast } = useToast(); // Descomente se o toast estiver configurado

  // 1. Trocamos o estado de 'cpf' para 'protocolo'
  const [protocolo, setProtocolo] = useState("");
  const [chave, setChave] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleConsulta = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    setError(null);

    try {
      // 2. Montamos a URL com 'protocolo' em vez de 'cpf'
      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL
        }/status?protocolo=${protocolo}&chave=${chave}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível consultar o status.");
      }
      setStatus(data.status);
    } catch (err) {
      setError(err.message);
      /*
      toast({
        title: "Erro na consulta",
        description: err.message,
        variant: "destructive"
      });
      */
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800/50 p-6 sm:p-8 rounded-2xl border border-slate-700"
    >
      <form onSubmit={handleConsulta} className="space-y-4">
        {/* 3. Trocamos o input de CPF para Protocolo */}
        <div className="relative">
          <Hash
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Protocolo"
            value={protocolo}
            onChange={(e) => setProtocolo(e.target.value)}
            required
            className="w-full pl-10 pr-4 py-3 bg-slate-700 rounded-lg border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
          />
        </div>
        <div className="relative">
          <KeyRound
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Chave de Acesso"
            value={chave}
            onChange={(e) => setChave(e.target.value)}
            required
            className="w-full pl-10 pr-4 py-3 bg-slate-700 rounded-lg border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <Search className="inline mr-2" />
          {loading ? "Consultando..." : "Consultar Status"}
        </button>
      </form>

      {/* Exibição do resultado */}
      {status && (
        <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
          <p className="text-sm font-semibold text-slate-300">Status Atual:</p>
          <p className="text-xl font-bold capitalize text-green-400">
            {status}
          </p>
        </div>
      )}
      {error && (
        <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-center text-red-400">{error}</p>
        </div>
      )}
    </motion.div>
  );
};
