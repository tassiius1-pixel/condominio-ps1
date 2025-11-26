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

  const logoURL = "https://hjrhipbzuzkxrzlffwlb.supabase.co/storage/v1/object/public/logotipos/WhatsApp%20Image%202025-11-17%20at%2011.06.58.jpeg";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 bg-white rounded-full shadow-md flex items-center justify-center mb-4 overflow-hidden p-2">
              <img
                src={logoURL}
                alt="Condomínio Porto Seguro 1"
                className="w-full h-full object-contain"
              />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 text-center">Criar Conta</h2>
          </div>

          {message && (
            <div className={`mb-4 p-3 border-l-4 text-sm rounded ${message.includes("sucesso")
              ? "bg-green-50 border-green-500 text-green-700"
              : "bg-red-50 border-red-500 text-red-700"
              }`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome Completo
              </label>
              <input
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-gray-50 focus:bg-white"
                placeholder="Seu nome completo"
                onBlur={handleBlur}
              />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome de Usuário
              </label>
              <span className="text-xs text-gray-500 block mb-1">
                (Use apenas letras minúsculas e números. Sem espaços, acentos ou caracteres especiais.)
              </span>
              <input
                name="username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-gray-50 focus:bg-white"
                placeholder="Escolha um nome de usuário"
              />
              {errors.username && <p className="mt-1 text-xs text-red-600">{errors.username}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CPF
                </label>
                <input
                  name="cpf"
                  type="text"
                  value={formData.cpf}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-gray-50 focus:bg-white"
                  placeholder="000.000.000-00"
                />
                {errors.cpf && <p className="mt-1 text-xs text-red-600">{errors.cpf}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nº Casa
                </label>
                <input
                  name="houseNumber"
                  type="text"
                  value={formData.houseNumber}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-gray-50 focus:bg-white"
                  placeholder="Ex: 101"
                />
                {errors.houseNumber && <p className="mt-1 text-xs text-red-600">{errors.houseNumber}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Senha
              </label>
              <input
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-gray-50 focus:bg-white"
                placeholder="Mínimo 6 caracteres"
              />
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? "Cadastrando..." : "Cadastrar"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Já tem uma conta?{" "}
              <button
                onClick={onSwitchToLogin}
                className="font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Faça login
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
