import React, { createContext, useState, useContext, useEffect } from "react";
import { API_BASE } from "../../../utils/apiBase";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("defensorToken"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedUser = localStorage.getItem("defensorUser");
      const storedToken = localStorage.getItem("defensorToken");

      if (storedToken && storedUser) {
        try {
          // PROTEÇÃO: Verifica se não é "undefined" texto
          if (storedUser !== "undefined" && storedUser !== "null") {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
          } else {
            // Se tiver lixo, limpa
            localStorage.removeItem("defensorUser");
            localStorage.removeItem("defensorToken");
          }
        } catch (e) {
          console.error("Erro crítico ao ler usuário:", e);
          // Se der erro no JSON, limpa tudo para não travar o app
          localStorage.removeItem("defensorUser");
          localStorage.removeItem("defensorToken");
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, senha) => {
    try {
      const response = await fetch(`${API_BASE}/defensores/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro no login");
      }

      const data = await response.json();
      const userObj = data.defensor;

      localStorage.setItem("defensorToken", data.token);
      localStorage.setItem("defensorUser", JSON.stringify(userObj));

      setToken(data.token);
      setUser(userObj);

      return true;
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("defensorToken");
    localStorage.removeItem("defensorUser");
    setToken(null);
    setUser(null);
    // Redirecionamento seguro
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
