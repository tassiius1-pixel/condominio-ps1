import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { isValidCPF } from "../utils/cpfValidator";
import { formatCPF, formatName } from "../utils/formatters";

interface RegisterProps {
  onSwitchToLogin: () => void;
}

const Register: React.FC<RegisterProps> = ({ onSwitchToLogin }) => {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    cpf: "",
    houseNumber: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'cpf') {
      formattedValue = formatCPF(value);
    }

    setFormData((prev) => ({ ...prev, [name]: formattedValue }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setMessage("");
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'name') {
      setFormData(prev => ({ ...prev, name: formatName(value) }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = "Informe o nome completo.";
    if (!formData.username.trim()) {
      newErrors.username = "Informe o nome de usuário.";
    } else {
      if (/\s/.test(formData.username)) {
        newErrors.username = "O nome de usuário não pode conter espaços.";
      } else if (/[A-Z]/.test(formData.username)) {
        newErrors.username = "O nome de usuário deve conter apenas letras minúsculas.";
      } else if (/[^a-z0-9_]/.test(formData.username)) {
        newErrors.username = "O nome de usuário não pode conter acentos ou caracteres especiais.";
      }
    }

    if (!isValidCPF(formData.cpf)) newErrors.cpf = "CPF inválido.";

    if (!formData.houseNumber.trim())
      newErrors.houseNumber = "Informe o número da casa.";
    else if (isNaN(Number(formData.houseNumber)))
      newErrors.houseNumber = "Número da casa inválido.";

    if (formData.password.length < 6)
      newErrors.password = "A senha deve ter ao menos 6 caracteres.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    if (!validate()) {
      setLoading(false);
      return;
    }

    try {
      const result = await register({
        name: formData.name,
        username: formData.username,
        cpf: formData.cpf,
        houseNumber: parseInt(formData.houseNumber, 10),
        password: formData.password,
        email: "",
      });

      if (result.success) {
        setMessage("Cadastro realizado com sucesso!");
        setTimeout(() => {
          onSwitchToLogin();
        }, 1500);
      } else {
        setMessage(result.message || "Erro ao cadastrar. Verifique os dados.");
      }
    } catch (err) {
      setMessage("Ocorreu um erro ao tentar cadastrar.");
    } finally {
      setLoading(false);
    }
  };

  const logoURL = "/favicon.png";

  const inputClass = "w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white/50 focus:bg-white outline-none shadow-sm text-sm";

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4">
      {/* Animated Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200/40 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/40 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="w-full max-w-md glass rounded-3xl shadow-2xl overflow-hidden relative z-10 animate-scale-in">
        <div className="p-8 sm:p-10">
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 bg-white rounded-2xl shadow-lg flex items-center justify-center mb-5 overflow-hidden p-3 hover-lift">
              <img
                src={logoURL}
                alt="Condomínio Porto Seguro 1"
                className="w-full h-full object-contain"
              />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 text-center tracking-tight">Criar Conta</h2>
            <p className="text-gray-500 text-center mt-2 font-medium">Condomínio Porto Seguro 1</p>
          </div>

          {message && (
            <div className={`mb-5 p-4 border-l-4 text-sm rounded-xl animate-fade-in ${message.includes("sucesso")
              ? "bg-green-50/80 border-green-500 text-green-700"
              : "bg-red-50/80 border-red-500 text-red-700"
              }`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">
                Nome Completo
              </label>
              <input
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                className={inputClass}
                placeholder="Seu nome completo"
                onBlur={handleBlur}
              />
              {errors.name && <p className="mt-1 text-xs text-red-600 font-medium ml-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">
                Nome de Usuário
              </label>
              <span className="text-[10px] text-gray-400 block mb-1 ml-1 font-medium">
                (Apenas letras minúsculas e números. Sem espaços ou acentos.)
              </span>
              <input
                name="username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                className={inputClass}
                placeholder="Escolha um nome de usuário"
              />
              {errors.username && <p className="mt-1 text-xs text-red-600 font-medium ml-1">{errors.username}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">
                  CPF
                </label>
                <input
                  name="cpf"
                  type="text"
                  value={formData.cpf}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="000.000.000-00"
                />
                {errors.cpf && <p className="mt-1 text-xs text-red-600 font-medium ml-1">{errors.cpf}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">
                  Nº Casa
                </label>
                <input
                  name="houseNumber"
                  type="text"
                  value={formData.houseNumber}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="Ex: 101"
                />
                {errors.houseNumber && <p className="mt-1 text-xs text-red-600 font-medium ml-1">{errors.houseNumber}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">
                Senha
              </label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  className={`${inputClass} pr-12`}
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" y1="2" x2="22" y2="22" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-600 font-medium ml-1">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all hover-lift active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-4"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Cadastrando...
                </span>
              ) : "Cadastrar"}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 font-medium">
              Já tem uma conta?{" "}
              <button
                onClick={onSwitchToLogin}
                className="font-bold text-indigo-600 hover:text-indigo-800 transition-colors ml-1"
              >
                Faça login
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
    </div>
  );
};

export default Register;
