import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { XIcon } from "./Icons";

interface LoginProps {
  onSwitchToRegister: () => void;
}

const Login: React.FC<LoginProps> = ({ onSwitchToRegister }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const ok = await login(username, password);
      if (!ok) {
        setError("Usuário ou senha inválidos.");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError("Usuário ou senha incorretos.");
      } else if (err.code === 'auth/too-many-requests') {
        setError("Muitas tentativas falhas. Tente novamente mais tarde.");
      } else {
        setError("Ocorreu um erro ao tentar fazer login. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  const logoURL = "https://hjrhipbzuzkxrzlffwlb.supabase.co/storage/v1/object/public/logotipos/WhatsApp%20Image%202025-11-17%20at%2011.06.58.jpeg";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-24 h-24 bg-white rounded-full shadow-md flex items-center justify-center mb-4 overflow-hidden p-2">
              <img
                src={logoURL}
                alt="Condomínio Porto Seguro 1"
                className="w-full h-full object-contain"
              />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 text-center">Bem-vindo</h2>
            <p className="text-gray-500 text-center mt-2">Condomínio Porto Seguro 1</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Usuário
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-gray-50 focus:bg-white"
                placeholder="Digite seu usuário"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-gray-50 focus:bg-white"
                placeholder="Digite sua senha"
                required
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                Esqueci minha senha
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Ainda não tem acesso?{" "}
              <button
                onClick={onSwitchToRegister}
                className="font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Criar conta
              </button>
            </p>
          </div>
        </div>
        <div className="bg-gray-50 px-8 py-4 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} Condomínio Porto Seguro 1. Todos os direitos reservados.
          </p>
        </div>
      </div>

      {showForgotModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 relative animate-fade-in">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <XIcon className="w-5 h-5" />
            </button>

            <div className="text-center">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔑</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Recuperação de Senha</h3>
              <p className="text-sm text-gray-600 mb-6">
                Como o sistema utiliza identificação interna, a redefinição de senha deve ser solicitada diretamente à administração.
              </p>
              <p className="text-sm font-medium text-indigo-800 bg-indigo-50 p-3 rounded-lg">
                Entre em contato com o síndico ou gestão para solicitar o reset.
              </p>
              <button
                onClick={() => setShowForgotModal(false)}
                className="mt-6 w-full py-2 bg-gray-100 text-gray-800 rounded-lg font-medium hover:bg-gray-200 transition"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
