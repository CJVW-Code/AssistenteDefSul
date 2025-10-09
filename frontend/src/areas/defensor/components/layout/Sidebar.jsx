import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  Calendar,
  Settings,
  BarChart,
} from "lucide-react";

export const Sidebar = () => {
  // CORREÇÃO: Adicionamos o prefixo '/painel' em todas as rotas
  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/painel" },
    { icon: FolderKanban, label: "Casos", path: "/painel/casos" },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col border-r border-green-800">
      <div className="p-6 text-2xl font-bold border-b border-green-800">
        Assistente Def Sul
      </div>
      <nav className="flex-grow p-4">
        <ul>
          {navItems.map((item) => (
            <li key={item.label}>
              <NavLink
                to={item.path}
                // Adicionamos 'end' para o Dashboard para ele não ficar ativo em outras páginas
                end={item.path === "/painel"}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors mb-2 ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`
                }
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};
