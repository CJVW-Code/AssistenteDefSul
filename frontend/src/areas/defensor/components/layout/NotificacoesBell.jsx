import React, { useState, useEffect, useRef } from "react";
import { Bell, Check, FileText, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { API_BASE } from "../../../../utils/apiBase";
import { useAuth } from "../../contexts/AuthContext";

export const NotificacoesBell = () => {
  const { token } = useAuth();
  const [notificacoes, setNotificacoes] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Busca notificações a cada 30 segundos
  useEffect(() => {
    const fetchNotificacoes = async () => {
      if (!token) return;
      try {
        const response = await fetch(`${API_BASE}/notificacoes`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setNotificacoes(data);
        }
      } catch (error) {
        console.error("Erro ao buscar notificações", error);
      }
    };

    fetchNotificacoes();
    const interval = setInterval(fetchNotificacoes, 30000); // Polling 30s

    // Fecha dropdown ao clicar fora
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      clearInterval(interval);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [token]);

  const marcarComoLida = async (id) => {
    try {
      await fetch(`${API_BASE}/notificacoes/${id}/lida`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      // Atualiza estado local
      setNotificacoes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, lida: true } : n)),
      );
    } catch (error) {
      console.error("Erro ao marcar como lida", error);
    }
  };

  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-muted hover:text-primary transition-colors rounded-full hover:bg-surface-alt"
      >
        <Bell size={20} />
        {naoLidas > 0 && (
          <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-surface"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-surface border border-soft rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
          <div className="p-3 border-b border-soft bg-surface-alt flex justify-between items-center">
            <h3 className="font-bold text-sm">Notificações</h3>
            <span className="text-xs text-muted">{naoLidas} novas</span>
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {notificacoes.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted">
                Nenhuma notificação.
              </p>
            ) : (
              notificacoes.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3 border-b border-soft hover:bg-app/50 transition-colors flex gap-3 ${
                    !notif.lida ? "bg-primary/5" : ""
                  }`}
                >
                  <div
                    className={`mt-1 ${!notif.lida ? "text-primary" : "text-muted"}`}
                  >
                    {notif.tipo === "reagendamento" ? (
                      <Calendar size={16} />
                    ) : (
                      <FileText size={16} />
                    )}
                  </div>
                  <div className="flex-1">
                    <Link
                      to={`/painel/casos/${notif.caso_id}`}
                      onClick={() => {
                        marcarComoLida(notif.id);
                        setIsOpen(false);
                      }}
                      className="text-sm font-medium hover:text-primary block"
                    >
                      {notif.mensagem}
                    </Link>
                    <p className="text-xs text-muted mt-1">
                      {new Date(notif.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
