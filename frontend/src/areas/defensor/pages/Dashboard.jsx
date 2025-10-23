import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";
import { FileText, Clock } from "lucide-react";
import { jwtDecode } from "jwt-decode";

export const Dashboard = () => {
  const [casos, setCasos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuth();
  const [defensor, setDefensor] = useState(null);

  useEffect(() => {
    if (token) {
      const decoded = jwtDecode(token);
      setDefensor(decoded);
    }
  }, [token]);

  useEffect(() => {
    const fetchCasos = async () => {
      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8001/api";
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

  if (loading) return <p className="text-center p-8">Carregando casos...</p>;
  if (error) return <p className="text-center p-8 text-red-400">{error}</p>;

  return (
    <div className="p-8">
      <div className="p-8">
        <div className="flex justify-between items-center mb-5">
          <div>
            {defensor && (
              <h1 className="text-3xl text-[#dae2db] font-bold">
                Olá, Dr(a). {defensor.nome}
              </h1>
            )}
          </div>
        </div>
      </div>
      <div className="grid gap-4">
        {casos.length === 0 ? (
          <p className="text-[#dae2db]">Nenhum caso pendente no momento.</p>
        ) : (
          casos.map((caso) => (
            <Link to={`/painel/casos/${caso.id}`} key={caso.id}>
              <div className="bg-slate-500/50 p-6 rounded-xl border border-green-800 hover:border-amber-500/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <FileText className="w-6 h-6 text-amber-500" />
                    <div>
                      <h3 className="font-semibold text-[#dae2db]">
                        {caso.nome_assistido}
                      </h3>
                      <p className="text-sm text-[#dae2db]">
                        Protocolo: {caso.protocolo}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[#dae2db] text-sm">
                    <Clock className="w-4 h-4" />
                    <span>{new Date(caso.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

