import React from "react";
import { Routes, Route, Link, Outlet } from "react-router-dom";
import { ThemeToggle } from "../../../components/ThemeToggle";

import { LogIn } from "lucide-react";
export const LayoutCidadao = () => {
  return (
    <div className="min-h-screen flex flex-col bg-app relative">
      <div className="absolute top-6 right-6 flex items-center gap-2">
        <ThemeToggle />
        <Link to="/painel/login" className="btn btn-secondary">
          <LogIn size={16} />
          Painel do Defensor
        </Link>
      </div>
      <main className="flex-grow flex-wrap container mx-auto  p-4 md:p-8 space-y-12">
        <header className="container mx-auto  p-4 md:p-6 text-center justify-between space-y-2">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 px-4 py-2 rounded-full border border-amber-500/30">
            <span className="w-3 h-3 bg-amber-400  rounded-full"></span>
            <p className="font-semibold  text-amber-400">
              Defensoria Pública do Estado da Bahia
            </p>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Assistente Def Sul
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Olá! Eu sou o Assistente Def Sul e vou te ajudar a registrar seu
            caso
          </p>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Nosso serviço é totalmente gratuito, garantindo seu acesso à justiça
            de forma gratuita comforme o Art.5º da constituição Federal.
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
