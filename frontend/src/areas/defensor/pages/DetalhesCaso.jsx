import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ChevronLeft, Download, FileText, Mic } from "lucide-react";

export const DetalhesCaso = () => {
  const { id } = useParams(); // Pega o ID da URL
  const { token } = useAuth();
  const [caso, setCaso] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  useEffect(() => {
    const fetchDetalhes = async () => {
      try {
        const API_BASE =
          import.meta.env.VITE_API_URL || "http://localhost:8001/api";
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

  // Lógica para atualizar o status (a ser implementada)
  const handleStatusChange = async (novoStatus) => {
    if (!novoStatus || novoStatus === caso.status) return;

    setIsUpdating(true);
    try {
      const API_BASE =
        import.meta.env.VITE_API_URL || "http://localhost:8001/api";
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
      // Atualiza o estado local para refletir a mudança na UI instantaneamente
      setCaso(casoAtualizado);
      alert("Status atualizado com sucesso!"); // Feedback simples para o usuário
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading)
    return <p className="text-center p-8">Carregando detalhes do caso...</p>;
  if (!caso) return <p className="text-center p-8">Caso não encontrado.</p>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <Link
        to="/"
        className="flex items-center gap-2 text-slate-900 hover:text-slate-900 mb-6"
      >
        <ChevronLeft size={20} /> Voltar para o Dashboard
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coluna Principal */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-800/30 p-6 rounded-xl border border-green-500">
            <h2 className="text-2xl font-bold mb-4 text-[#e3ddff]">
              Detalhes do Assistido
            </h2>
            <p className="text-amber-400 ">
              <strong className="text-white">Nome:</strong>{" "}
              {caso.nome_assistido}
            </p>
            <p className="text-amber-400">
              <strong className="text-white">CPF:</strong> {caso.cpf_assistido}
            </p>
            <p className="text-amber-400">
              <strong className="text-white">Telefone:</strong>{" "}
              {caso.telefone_assistido}
            </p>
            <p className="text-amber-400">
              <strong className="text-white">Tipo de Ação:</strong>{" "}
              {caso.tipo_acao}
            </p>
          </div>
          <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-4">
              Relato do Caso
            </h2>
            <p className="whitespace-pre-wrap text-[#e3ddff]">
              {caso.relato_texto || "Nenhum relato textual fornecido."}
            </p>
          </div>
        </div>
        <div className="bg-slate-900/50 p-6 rounded-xl border border-blue-700">
          <h2 className="text-xl font-bold text-amber-400 mb-2">
            Resumo da IA
          </h2>
          <p className="text-white">
            {caso.resumo_ia || "Resumo não disponível."}
          </p>
        </div>
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
          <h2 className="text-xl text-white font-bold mb-4">Status do Caso</h2>
          <select
            onChange={(e) => handleStatusChange(e.target.value)}
            value={caso.status} // 'value' em vez de 'defaultValue' para controlar o estado
            disabled={isUpdating}
            className="w-full p-2 bg-slate-700 rounded-lg disabled:opacity-50"
          >
            <option value="recebido">Recebido</option>
            <option value="em analise">Em Análise</option>
            <option value="aguardando_docs">Aguardando Documentos</option>
            <option value="finalizado">Finalizado</option>
          </select>
        </div>
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
          <h2 className="text-xl text-white font-bold mb-4">
            Documentos e Anexos
          </h2>
          <div className="space-y-3">
            {caso.url_documento_gerado && (
              <a
                href={caso.url_documento_gerado}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-amber-600/80 hover:bg-amber-600 rounded-lg font-semibold"
              >
                <Download size={20} /> Baixar Petição Gerada
              </a>
            )}
            {caso.url_audio && (
              <a
                href={caso.url_audio}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-slate-700 text-white hover:bg-slate-600 rounded-lg"
              >
                <Mic size={20} /> Ouvir Áudio
              </a>
            )}
            {caso.urls_documentos?.map((url, index) => (
              <a
                key={index}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-slate-700 text-white hover:bg-slate-600 rounded-lg"
              >
                <FileText size={20} /> Ver Documento {index + 1}
              </a>
            ))}
          </div>
        </div>
        {/* Coluna Lateral */}
        <div className="space-y-6">
          <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
            <h2 className="text-2xl text-white font-bold mb-4">
              Rascunho da Petição Inicial (Gerado por IA)
            </h2>
            {/* Usamos <pre> para manter a formatação do texto gerado pela IA */}
            <pre className="whitespace-pre-wrap text-sm font-mono bg-slate-900 text-white p-4 rounded-md overflow-x-auto">
              {caso.peticao_inicial_rascunho ||
                "Rascunho não disponível ou não gerado."}
            </pre>
            {/* Futuramente, adicionar um botão de "Editar" aqui */}
          </div>
        </div>
      </div>
    </div>
  );
};
