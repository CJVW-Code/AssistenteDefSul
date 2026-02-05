import React from "react";
import { Routes, Route, Link, Outlet } from "react-router-dom";
import { ThemeToggle } from "../../../components/ThemeToggle";
import { motion } from "framer-motion";

import { LogIn } from "lucide-react";
import { ConfirmModal } from "../../../components/ui/ConfirmModal";
import { ToastContainer } from "../../../components/ui/ToastContainer";

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
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex  items-center gap-2 bg-green-500/10 px-4 py-2 rounded-full border border-green-500/30"
          >
            <span className="w-3 h-3 bg-green-400  rounded-full"></span>
            <p className="font-semibold  text-primary">
              Defensoria Pública do Estado da Bahia
            </p>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-3xl sm:text-4xl font-bold tracking-tight"
          >
            Assistente Def Sul
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-muted max-w-2xl mx-auto"
          >
            Olá! Sou o Assistente Def Sul e estou aqui para te ajudar a
            registrar sua solicitação.
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="text-muted max-w-2xl mx-auto"
          >
            Este serviço é totalmente gratuito, garantindo seu acesso à justiça
            conforme assegura o Art. 5º da Constituição Federal.
          </motion.p>
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
      <ConfirmModal />
      <ToastContainer />
    </div>
  );
};
