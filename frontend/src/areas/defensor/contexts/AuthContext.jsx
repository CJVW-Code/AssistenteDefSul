import React, { createContext, useState, useContext, useEffect } from "react";
import { API_BASE } from '../../../utils/apiBase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Tenta pegar o token salvo no armazenamento local do navegador
  const [token, setToken] = useState(localStorage.getItem("defensorToken"));

  const login = async (email, senha) => {
    try {
      const response = await fetch(`${API_BASE}/defensores/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });
      const contentType = response.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");
      const data = isJson
        ? await response.json()
        : { error: await response.text() };

      if (!response.ok) {
        throw new Error(data.error || "Falha na requisiÃ§Ã£o");
      }

      setToken(data.token);
      localStorage.setItem("defensorToken", data.token);
      return true;
    } catch (error) {
      console.error("Erro no login:", error);
      throw error; // Joga o erro para o componente de Login tratar
    }
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem("defensorToken");
  };

  const value = { token, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook customizado para facilitar o uso do contexto
export const useAuth = () => {
  return useContext(AuthContext);
};
