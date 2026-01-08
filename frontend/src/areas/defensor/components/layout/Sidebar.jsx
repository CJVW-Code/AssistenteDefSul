import React from "react";
import { Link, NavLink, useLocation } from "react-router-dom"; // ADICIONADO: Link e useLocation
import { useAuth } from "../../contexts/AuthContext";
import {
  LayoutDashboard,
  FolderKanban,
  UserPlus,
  LogOut,
  Search,
} from "lucide-react";

export const Sidebar = () => {
  const location = useLocation(); // AGORA FUNCIONA (Importado acima)
  const auth = useAuth();
  const { logout, user } = auth || {};

  // Proteção contra falha no contexto
  if (!auth) return null;

  // Lógica de Cargos
  const userCargo = user?.cargo || "estagiario";
  const isAdmin = userCargo === "admin";
  const isRecepcao = userCargo === "recepcao";
  // Defensor e Estagiário têm permissões similares de visualização
  const isJuridico = ["admin", "defensor", "estagiario"].includes(userCargo);

  const isActive = (path) => {
    return location.pathname === path
      ? "bg-primary text-white"
      : "text-muted hover:bg-white/5 hover:text-white";
  };

  const navLinkClass = (path) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${isActive(
      path
    )}`;

  // Estilo do Mobile (Reaproveitado para manter limpo)
  const mobileLinkClass = ({ isActive }) =>
    `flex flex-col items-center gap-1 text-xs font-medium ${
      isActive ? "text-primary" : "text-muted"
    }`;

  const mobileIconClass = (isActive) =>
    `h-10 w-10 rounded-2xl flex items-center justify-center ${
      isActive ? "bg-primary/15 text-primary" : ""
    }`;

  return (
    <>
      {/* --- DESKTOP SIDEBAR --- */}
      <aside className="hidden lg:flex w-72 bg-surface/90 border-r border-soft backdrop-blur flex-col">
        <div className="px-6 py-7 border-b border-soft">
          <p className="text-xs uppercase text-muted tracking-[0.45em]">
            Assistente
          </p>
          <p className="text-2xl font-semibold mt-2">Def Sul</p>
          <p className="text-sm text-muted mt-1">Painel do Defensor</p>
          {/* Badge do Cargo */}
          <div className="mt-2">
            <span className="text-xs font-bold uppercase bg-primary/20 text-primary px-2 py-1 rounded">
              {userCargo}
            </span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {/* DASHBOARD (Jurídico apenas) */}
          {isJuridico && (
            <Link to="/painel" className={navLinkClass("/painel")}>
              <LayoutDashboard size={20} />
              Dashboard
            </Link>
          )}

          {/* MENU RECEPÇÃO */}
          {(isRecepcao || isAdmin) && (
            <Link
              to="/painel/recepcao"
              className={navLinkClass("/painel/recepcao")}
            >
              <Search size={20} />
              Atendimento / Reset
            </Link>
          )}

          {/* MENU CASOS (Jurídico apenas) */}
          {isJuridico && (
            <Link to="/painel/casos" className={navLinkClass("/painel/casos")}>
              <FolderKanban size={20} />
              Casos e Triagem
            </Link>
          )}

          {/* MENU ADMIN */}
          {isAdmin && (
            <Link // Alterado rota para refletir a nova página
              to="/painel/equipe"
              className={navLinkClass("/painel/equipe")}
            >
              <UserPlus size={20} />
              Gerenciar Equipe
            </Link>
          )}
        </nav>

        <div className="px-6 py-6 border-t border-soft text-sm text-muted">
          <button
            onClick={logout}
            className="flex items-center gap-3 mb-4 text-red-400 hover:text-red-300 w-full text-left"
          >
            <LogOut size={20} /> Sair
          </button>
          <p>Precisa de ajuda?</p>
          <p className="font-semibold ">suporte@defsul.app</p>
        </div>
      </aside>

      {/* --- MOBILE NAVBAR (FUNDO DA TELA - DINÂMICO) --- */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface/95 border-t border-soft backdrop-blur px-2 py-2 flex items-center justify-around z-40">
        {/* DASHBOARD MOBILE */}
        {isJuridico && (
          <NavLink to="/painel" end className={mobileLinkClass}>
            {({ isActive }) => (
              <>
                <div className={mobileIconClass(isActive)}>
                  <LayoutDashboard size={20} />
                </div>
                Dash
              </>
            )}
          </NavLink>
        )}

        {/* RECEPÇÃO MOBILE */}
        {(isRecepcao || isAdmin) && (
          <NavLink to="/painel/recepcao" className={mobileLinkClass}>
            {({ isActive }) => (
              <>
                <div className={mobileIconClass(isActive)}>
                  <Search size={20} />
                </div>
                Busca
              </>
            )}
          </NavLink>
        )}

        {/* CASOS MOBILE */}
        {isJuridico && (
          <NavLink to="/painel/casos" className={mobileLinkClass}>
            {({ isActive }) => (
              <>
                <div className={mobileIconClass(isActive)}>
                  <FolderKanban size={20} />
                </div>
                Casos
              </>
            )}
          </NavLink>
        )}

        {/* ADMIN MOBILE */}
        {isAdmin && (
          <NavLink to="/painel/equipe" className={mobileLinkClass}>
            {({ isActive }) => (
              <>
                <div className={mobileIconClass(isActive)}>
                  <UserPlus size={20} />
                </div>
                Equipe
              </>
            )}
          </NavLink>
        )}

        {/* LOGOUT MOBILE */}
        <button
          onClick={logout}
          className="flex flex-col items-center gap-1 text-xs font-medium text-red-400"
        >
          <div className="h-10 w-10 rounded-2xl flex items-center justify-center hover:bg-red-500/10">
            <LogOut size={20} />
          </div>
          Sair
        </button>
      </nav>
    </>
  );
};
