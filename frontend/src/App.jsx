import React from "react";
import { Routes, Route } from "react-router-dom";

// Importando os novos Layouts e Páginas
import { LayoutCidadao } from "./areas/cidadao/pages/LayoutCidadao";
import { PaginaInicialCidadao } from "./areas/cidadao/pages/PaginaInicialCidadao";

import { ProtectedRoute } from "./areas/defensor/pages/ProtectedRoute";
import { Layout } from "./areas/defensor/components/layout/Layout";
import { Login } from "./areas/defensor/pages/Login";
import { Cadastro } from "./areas/defensor/pages/Cadastro";
import { Dashboard } from "./areas/defensor/pages/Dashboard";
import { Casos } from "./areas/defensor/pages/Casos";
import { DetalhesCaso } from "./areas/defensor/pages/DetalhesCaso";

function App() {
  return (
    <Routes>
      {/* GRUPO DE ROTAS DO CIDADÃO */}
      <Route element={<LayoutCidadao />}>
        <Route path="/" element={<PaginaInicialCidadao />} />
        {/* Se houver outras páginas públicas, como /sobre, elas entram aqui */}
      </Route>

      {/* GRUPO DE ROTAS DO PAINEL DO DEFENSOR */}
      <Route path="/painel/login" element={<Login />} />
      <Route path="/painel/cadastro" element={<Cadastro />} />

      {/* Rotas Protegidas do Defensor */}
      <Route element={<ProtectedRoute redirectPath="/painel/login" />}>
        <Route path="/painel" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="casos" element={<Casos />} />
          <Route path="casos/:id" element={<DetalhesCaso />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
