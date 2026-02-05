import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Importando Contextos
import { AuthProvider, useAuth } from "./areas/defensor/contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import { ConfirmProvider } from "./contexts/ConfirmContext";

// Importando Componentes UI Globais
import { ToastContainer } from "./components/ui/ToastContainer";
import { ConfirmModal } from "./components/ui/ConfirmModal";

// Importando Layouts e Páginas
import { LayoutCidadao } from "./areas/cidadao/pages/LayoutCidadao";
import { PaginaInicialCidadao } from "./areas/cidadao/pages/PaginaInicialCidadao";
// REMOVIDO: import { ProtectedRoute } ... (Pois definimos ele logo abaixo)

import { Layout } from "./areas/defensor/components/layout/Layout";
import { Login } from "./areas/defensor/pages/Login";
import { Cadastro } from "./areas/defensor/pages/Cadastro";
import { Dashboard } from "./areas/defensor/pages/Dashboard";
import { Casos } from "./areas/defensor/pages/Casos";
import { DetalhesCaso } from "./areas/defensor/pages/DetalhesCaso";
import { CasosArquivados } from "./areas/defensor/pages/CasosArquivados";
import { PainelRecepcao } from "./areas/defensor/pages/PainelRecepcao";
import { GerenciarEquipe } from "./areas/defensor/pages/GerenciarEquipe";

// --- COMPONENTES DE SEGURANÇA ---

// 1. Protege rotas para usuários NÃO logados
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center text-primary">
        Carregando...
      </div>
    );

  // Se não tem usuário, manda pro login
  if (!user) return <Navigate to="/painel/login" />;

  return children;
};

// 2. Protege rotas exclusivas para ADMIN 🛡️
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return null;

  // Se não for admin, chuta de volta para o painel inicial
  if (user?.cargo !== "admin") {
    return <Navigate to="/painel" />;
  }

  return children;
};

// 3. Protege rotas da RECEPÇÃO (Admin também acessa) 🔍
const RecepcaoRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return null;

  // Se não for recepção nem admin, bloqueia
  if (user?.cargo !== "recepcao" && user?.cargo !== "admin") {
    return <Navigate to="/painel" />;
  }

  return children;
};

// 4. Protege rotas de DEFENSOR/ESTAGIÁRIO (Bloqueia Recepção) 🚫
const DefensorRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return null;

  // Se for recepção, redireciona para o painel específico deles
  if (user?.cargo === "recepcao") {
    return <Navigate to="/painel/recepcao" />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ConfirmProvider>
            {/* Componentes Globais de UI */}
            <ToastContainer />
            <ConfirmModal />

            <Routes>
              {/* GRUPO DE ROTAS DO CIDADÃO */}
              <Route element={<LayoutCidadao />}>
                <Route path="/" element={<PaginaInicialCidadao />} />
              </Route>

              {/* ROTA DE LOGIN DO DEFENSOR (Pública) */}
              <Route path="/painel/login" element={<Login />} />

              {/* --- ÁREA RESTRITA (PROTEGIDA) --- */}
              {/* Envolvemos o Layout com o ProtectedRoute */}
              <Route
                path="/painel"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                {/* Rota Padrão (Dashboard) - AGORA PROTEGIDA CONTRA RECEPÇÃO */}
                <Route
                  index
                  element={
                    <DefensorRoute>
                      <Dashboard />
                    </DefensorRoute>
                  }
                />

                {/* Rotas Comuns - AGORA PROTEGIDAS CONTRA RECEPÇÃO */}
                <Route
                  path="casos"
                  element={
                    <DefensorRoute>
                      <Casos />
                    </DefensorRoute>
                  }
                />
                <Route
                  path="casos/arquivados"
                  element={
                    <DefensorRoute>
                      <CasosArquivados />
                    </DefensorRoute>
                  }
                />
                <Route
                  path="casos/:id"
                  element={
                    <DefensorRoute>
                      <DetalhesCaso />
                    </DefensorRoute>
                  }
                />

                {/* Rota Protegida da Recepção */}
                <Route
                  path="recepcao"
                  element={
                    <RecepcaoRoute>
                      <PainelRecepcao />
                    </RecepcaoRoute>
                  }
                />

                {/* Rota de Gestão de Equipe (Admin) */}
                <Route
                  path="equipe"
                  element={
                    <AdminRoute>
                      <GerenciarEquipe />
                    </AdminRoute>
                  }
                />

                {/* --- ROTA BLINDADA DO ADMIN (CADASTRO) --- */}
                {/* Só o Admin entra aqui */}
                <Route
                  path="cadastro"
                  element={
                    <AdminRoute>
                      <Cadastro />
                    </AdminRoute>
                  }
                />
              </Route>

              {/* Redirecionamento para evitar erros 404 */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </ConfirmProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
