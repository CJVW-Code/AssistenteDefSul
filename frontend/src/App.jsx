import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Importando Contextos
import { AuthProvider, useAuth } from "./areas/defensor/contexts/AuthContext";

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
import { PainelRecepcao } from "./areas/defensor/pages/PainelRecepcao";

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

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
            {/* Rota Padrão (Dashboard) */}
            <Route index element={<Dashboard />} />

            {/* Rotas Comuns */}
            <Route path="casos" element={<Casos />} />
            <Route path="casos/:id" element={<DetalhesCaso />} />
            <Route path="recepcao" element={<PainelRecepcao />} />

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
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
