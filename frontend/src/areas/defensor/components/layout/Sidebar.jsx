import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, FolderKanban } from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/painel" },
  { icon: FolderKanban, label: "Casos", path: "/painel/casos" },
];

export const Sidebar = () => {
  return (
    <>
      <aside className="hidden lg:flex w-72 bg-surface/90 border-r border-soft backdrop-blur flex-col text-slate-900 dark:text-white">
        <div className="px-6 py-7 border-b border-soft">
          <p className="text-xs uppercase text-muted tracking-[0.45em]">
            Assistente
          </p>
          <p className="text-2xl font-semibold mt-2">Def Sul</p>
          <p className="text-sm text-muted mt-1">Painel do Defensor</p>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.path}
              end={item.path === "/painel"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-all ${
                  isActive
                    ? "bg-primary text-white shadow-lg"
                    : "text-muted hover:bg-primary/10 hover:text-primary"
                }`
              }
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-6 py-6 border-t border-soft text-sm text-muted">
          <p>Precisa de ajuda?</p>
          <p className="font-semibold text-slate-900 dark:text-white">
            suporte@defsul.app
          </p>
        </div>
      </aside>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface/95 border-t border-soft backdrop-blur px-2 py-2 flex items-center justify-around z-40">
        {navItems.map((item) => (
          <NavLink
            key={`mobile-${item.label}`}
            to={item.path}
            end={item.path === "/painel"}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-xs font-medium ${
                isActive ? "text-primary" : "text-muted"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={`h-10 w-10 rounded-2xl flex items-center justify-center ${
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "bg-slate-100 dark:bg-slate-800"
                  }`}
                >
                  <item.icon size={18} />
                </div>
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </>
  );
};
