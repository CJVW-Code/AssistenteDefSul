// Arquivo: frontend-defensor/src/components/Cadastro.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus, Shield } from "lucide-react";
import { API_BASE } from "../../../utils/apiBase";

export const Cadastro = () => {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email.endsWith("@defensoria.ba.def.br")) {
      setError("Apenas emails @defensoria.ba.def.br são permitidos.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/defensores/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, senha }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setSuccess(
        "Cadastro realizado com sucesso! Você será redirecionado para o login."
      );
      setTimeout(() => navigate("/painel/login"), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-app flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl grid gap-8 md:grid-cols-2 items-center">
        <div className="hidden md:flex card bg-gradient-to-br from-secondary to-amber-600 text-slate-900 h-full">
          <div className="space-y-4">
            <Shield className="w-10 h-10" />
            <h1 className="heading-1">Cadastro de defensor</h1>
            <p>
              Solicite seu acesso ao painel do Assistente Def Sul e
              sincronize os atendimentos com a Defensoria Pública.
            </p>
            <p className="text-sm font-semibold">
              Necessário email @defensoria.ba.def.br
            </p>
          </div>
        </div>

        <div className="card space-y-6">
          <div className="flex items-center gap-3">
            <UserPlus className="text-primary" />
            <div>
              <p className="text-xs uppercase text-muted tracking-[0.3em]">
                Novo acesso
              </p>
              <h2 className="heading-2">Solicitar cadastro</h2>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted">
                Nome completo
              </label>
              <input
                type="text"
                placeholder="Digite seu nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                className="input"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted">
                Email institucional
              </label>
              <input
                type="email"
                placeholder="seu.nome@defensoria.ba.def.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted">Senha</label>
              <input
                type="password"
                placeholder="Crie uma senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                className="input"
              />
            </div>

            {error && (
              <p className="alert alert-error">
                {error}
              </p>
            )}
            {success && (
              <p className="alert alert-success">
                {success}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full text-base"
            >
              <UserPlus size={18} />
              {loading ? "Cadastrando..." : "Criar conta"}
            </button>
          </form>
          <p className="text-sm text-muted text-center">
            Já tem uma conta?{" "}
            <Link to="/painel/login" className="link font-semibold">
              Faça o login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
