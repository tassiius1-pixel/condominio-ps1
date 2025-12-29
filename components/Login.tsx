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

  const logoURL = "/favicon.png";

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4">
      {/* Animated Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200/40 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/40 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="w-full max-w-md glass rounded-3xl shadow-2xl overflow-hidden relative z-10 animate-scale-in">
        <div className="p-8 sm:p-10">
          <div className="flex flex-col items-center mb-10">
            <div className="w-24 h-24 bg-white rounded-2xl shadow-lg flex items-center justify-center mb-6 overflow-hidden p-3 hover-lift">
              <img
                src={logoURL}
                alt="Condomínio Porto Seguro 1"
                className="w-full h-full object-contain"
              />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 text-center tracking-tight">Bem-vindo</h2>
            <p className="text-gray-500 text-center mt-2 font-medium">Condomínio Porto Seguro 1</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50/80 border-l-4 border-red-500 text-red-700 text-sm rounded-xl animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">
                Usuário
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white/50 focus:bg-white outline-none shadow-sm"
                placeholder="Seu usuário"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white/50 focus:bg-white outline-none shadow-sm"
                placeholder="••••••••"
                required
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Esqueci minha senha
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all hover-lift active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-4"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Entrando...
                </span>
              ) : "Entrar no App"}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 font-medium">
              Ainda não tem acesso?{" "}
              <button
                onClick={onSwitchToRegister}
                className="font-bold text-indigo-600 hover:text-indigo-800 transition-colors ml-1"
              >
                Criar conta agora
              </button>
            </p>
          </div>
        </div>
        <div className="bg-gray-50/50 px-8 py-5 border-t border-gray-100/50 text-center">
          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">
            © {new Date().getFullYear()} Porto Seguro 1 • Todos os direitos reservados
          </p>
        </div>
      </div>

      {showForgotModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 relative animate-scale-in">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <XIcon className="w-5 h-5" />
            </button>

            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-12">
                <span className="text-3xl">🔑</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 tracking-tight">Recuperação de Senha</h3>
              <p className="text-sm text-gray-600 mb-8 leading-relaxed font-medium">
                Por segurança, a redefinição de senha deve ser solicitada diretamente à administração.
              </p>
              <div className="text-sm font-bold text-indigo-800 bg-indigo-50 p-4 rounded-2xl border border-indigo-100 mb-8">
                Entre em contato com o síndico ou gestão para solicitar o reset.
              </div>
              <button
                onClick={() => setShowForgotModal(false)}
                className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all hover-lift"
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
