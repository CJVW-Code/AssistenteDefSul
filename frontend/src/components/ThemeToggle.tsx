import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../theme/useTheme";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className="btn btn-secondary"
      onClick={toggleTheme}
      aria-pressed={isDark}
      title={isDark ? "Alternar para tema claro" : "Alternar para tema escuro"}
    >
      {isDark ? (
        <>
          <Sun size={16} />
          Tema claro
        </>
      ) : (
        <>
          <Moon size={16} />
          Tema escuro
        </>
      )}
    </button>
  );
}

