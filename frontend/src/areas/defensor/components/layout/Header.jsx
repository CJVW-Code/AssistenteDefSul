import React from "react";
import { useAuth } from "../../contexts/AuthContext";
import { jwtDecode } from "jwt-decode";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";

export const Header = () => {
  const { token, logout } = useAuth();
  const defensor = token ? jwtDecode(token) : null;

  return (
    <header className="flex justify-between items-center p-6 bg-slate-900 border-b border-green-800">
      <Link
        to="/"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
      >
        <ExternalLink size={16} />
        Ver Portal do Cidadão
      </Link>
      <div className="flex items-center gap-4">
        <span className="font-semibold text-[#dae2db]">
          Dr(a). {defensor?.nome || "Defensor"}
        </span>
        <button
          onClick={logout}
          className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-semibold"
        >
          Sair
        </button>
      </div>
    </header>
  );
};
