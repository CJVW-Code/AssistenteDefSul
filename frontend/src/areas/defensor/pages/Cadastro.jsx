// Arquivo: frontend-defensor/src/components/Cadastro.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus, Shield } from "lucide-react";

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

    // Validação de email no frontend para feedback rápido
    if (!email.endsWith("@defensoria.ba.def.br")) {
      setError("Apenas emails @defensoria.ba.def.br são permitidos.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/defensores/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome, email, senha }),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setSuccess(
        "Cadastro realizado com sucesso! Você será redirecionado para o login."
      );
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center bg-[#00330f] justify-center p-4 ">
      <div className="w-full max-w-md">
        <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-8 h-8 text-amber-500" />
            <h1 className="text-2xl font-bold">Cadastro de Defensor</h1>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Nome Completo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              className="w-full px-4 py-3 bg-slate-600 rounded-lg"
            />
            <input
              type="email"
              placeholder="Email Institucional"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-slate-600 rounded-lg"
            />
            <input
              type="password"
              placeholder="Senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              className="w-full px-4 py-3 bg-slate-600 rounded-lg"
            />

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}
            {success && (
              <p className="text-green-400 text-sm text-center">{success}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#d15600] hover:bg-[#632500] disabled:bg-slate-600 px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
            >
              <UserPlus className="inline mr-2" />
              {loading ? "Cadastrando..." : "Criar Conta"}
            </button>
            <p className="text-center text-sm text-white">
              Já tem uma conta?{" "}
              <Link
                to="/login"
                className="font-semibold text-amber-500 hover:underline"
              >
                Faça o login
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};
