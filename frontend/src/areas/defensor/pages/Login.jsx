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
      try {
        await login(email, senha);
        navigate("/painel"); // Redireciona para o Dashboard do Defensor
      } catch (err) {}
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center bg-[#00330f] justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800/50 p-8 rounded-2xl border border-green-800">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-8 h-8 text-amber-500" />
            <h1 className="text-2xl font-bold">Painel do Defensor</h1>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
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
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#d15600] hover:bg-[#632500] disabled:bg-slate-600 px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <LogIn className="inline mr-2" />
              {loading ? "Entrando..." : "Entrar"}
            </button>
            <p className="text-center text-sm text-white">
              Não tem uma conta?
              <Link
                to="/cadastro"
                className="font-semibold text-amber-500 hover:underline"
              >
                Cadastre-se
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};
