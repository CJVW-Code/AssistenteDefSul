import React from "react";
import { Routes, Route, Link, Outlet } from "react-router-dom";
import { ThemeToggle } from "../../../components/ThemeToggle";

import { LogIn } from "lucide-react";
export const LayoutCidadao = () => {
  return (
    <div className="min-h-screen flex flex-col bg-app relative">
      <header className="sticky top-0 z-50 w-full flex flex-wrap items-center justify-between p-4 md:px-8 gap-3 bg-app/70 backdrop-blur-lg border-b border-white/10 shadow-lg">
        <div className="flex items-center ">
          <ThemeToggle />
        </div>
        <div className="flex items-center">
          <Link to="/painel" className="btn btn-secondary">
            <LogIn size={16} />
            Painel do Defensor
          </Link>
        </div>
      </header>
      <main className="flex-grow flex-wrap container mx-auto md:py-8 space-y-12">
        <header className="container p-4 md:p-6 text-center justify-between space-y-2">
          <div className="inline-flex  items-center gap-2 bg-green-500/10 px-4 py-2 rounded-full border border-green-500/30">
            <span className="w-3 h-3 bg-green-400  rounded-full"></span>
            <p className="font-semibold  text-green-400">
              Defensoria Pública do Estado da Bahia
            </p>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Assistente Def Sul
          </h1>
          <p className="text-muted max-w-2xl mx-auto">
            Olá! Eu sou o Assistente Def Sul e vou te ajudar a registrar seu
            caso
          </p>
          <p className="text-muted max-w-2xl mx-auto">
            Nosso serviço é totalmente gratuito, garantindo seu acesso à justiça
            de forma gratuita conforme o Art.5º da constituição Federal.
          </p>
        </header>
        <Outlet />{" "}
        {/* O conteúdo da página (ex: PaginaInicialCidadao) será renderizado aqui */}
      </main>
      <footer className="w-full text-center  p-4 mt-4 border-t bg-surface border-soft">
        <p className="text-xs text-muted">
          &copy; {new Date().getFullYear()} Desenvolvido pela 14ª Regional -
          Teixeira de Freitas
        </p>
      </footer>
    </div>
  );
};
