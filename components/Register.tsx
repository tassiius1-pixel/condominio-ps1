import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { isValidCPF } from "../utils/cpfValidator";

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setMessage("");
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = "Informe o nome completo.";
    if (!formData.username.trim())
      newErrors.username = "Informe o nome de usuário.";

    if (!isValidCPF(formData.cpf)) newErrors.cpf = "CPF inválido.";

    if (!formData.houseNumber.trim())
      newErrors.houseNumber = "Informe o número da casa.";
    else if (isNaN(Number(formData.houseNumber)))
      newErrors.houseNumber = "Número da casa inválido.";

    if (formData.password.length < 4)
      newErrors.password = "A senha deve ter ao menos 4 caracteres.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (!validate()) return;

    const ok = await register({
      name: formData.name,
      username: formData.username,
      cpf: formData.cpf,
      houseNumber: parseInt(formData.houseNumber, 10),
      password: formData.password,
    });

    if (ok) {
      setMessage("Cadastro realizado com sucesso!");

      // depois de 1.5s, volta pra tela de login
      setTimeout(() => {
        onSwitchToLogin();
      }, 1500);
    } else {
      setMessage("Erro ao cadastrar. Verifique os dados.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-900">
          Cadastro
        </h2>

        {message && (
          <p className="text-sm text-center text-indigo-600">{message}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="name"
              className="text-sm font-medium text-gray-700"
            >
              Nome Completo
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">{errors.name}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="username"
              className="text-sm font-medium text-gray-700"
            >
              Nome de Usuário
            </label>
            <input
              id="username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleChange}
              className="w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {errors.username && (
              <p className="mt-1 text-xs text-red-600">{errors.username}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="cpf"
              className="text-sm font-medium text-gray-700"
            >
              CPF
            </label>
            <input
              id="cpf"
              name="cpf"
              type="text"
              value={formData.cpf}
              onChange={handleChange}
              className="w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {errors.cpf && (
              <p className="mt-1 text-xs text-red-600">{errors.cpf}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="houseNumber"
              className="text-sm font-medium text-gray-700"
            >
              Número da casa
            </label>
            <input
              id="houseNumber"
              name="houseNumber"
              type="text"
              value={formData.houseNumber}
              onChange={handleChange}
              className="w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {errors.houseNumber && (
              <p className="mt-1 text-xs text-red-600">
                {errors.houseNumber}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="text-sm font-medium text-gray-700"
            >
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">
                {errors.password}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-2 mt-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition"
          >
            Cadastrar
          </button>
        </form>

        <p className="text-sm text-center text-gray-600">
          Já tem uma conta?{" "}
          <button
            onClick={onSwitchToLogin}
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            Faça login
          </button>
        </p>
      </div>
    </div>
  );
};

export default Register;
