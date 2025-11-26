import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Shield, LogIn } from "lucide-react";

export const Login = () => {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, senha);
      navigate("/painel");
    } catch (err) {
      setError(err.message || "Não foi possível acessar o painel.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-app flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl grid gap-8 md:grid-cols-2 items-center">
        <div className="hidden md:flex card bg-gradient-to-br from-primary to-primary-600 text-white h-full">
          <div className="space-y-4">
            <Shield className="w-10 h-10" />
            <h1 className="heading-1">Painel do Defensor</h1>
            <p className="text-white/80">
              Acesse o painel exclusivo para acompanhar casos submetidos via
              Assistente Def Sul, solicitar documentos e gerar minutas com o
              mesmo visual do nosso novo portal.
            </p>
            <p className="text-sm text-white/70">
              Suporte: suporte@defsul.app
            </p>
          </div>
        </div>

        <div className="card space-y-6">
          <div className="flex items-center gap-3">
            <Shield className="text-primary" />
            <div>
              <p className="text-xs uppercase text-muted tracking-[0.3em]">
                Acesso seguro
              </p>
              <h2 className="heading-2">Entrar no painel</h2>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="Digite sua senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                className="input"
              />
            </div>
            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl p-3">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full text-base"
            >
              <LogIn size={18} />
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
          <p className="text-sm text-muted text-center">
            Não tem uma conta?{" "}
            <Link to="/painel/cadastro" className="link font-semibold">
              Solicite cadastro
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
