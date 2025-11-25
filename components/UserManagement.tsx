import React from 'react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { Role, User } from '../types';
import { TrashIcon } from './Icons';
import { formatCPF, formatName } from '../utils/formatters';

const UserManagement: React.FC = () => {
  const { users, updateUserRole, deleteUser } = useData();
  const { currentUser } = useAuth();

  if (currentUser?.role !== Role.ADMIN && currentUser?.role !== Role.SINDICO && currentUser?.role !== Role.SUBSINDICO) {
    // Note: SINDICO/SUBSINDICO shouldn't see this page per requirements, but if they somehow do, we block.
    // Actually requirements say: "sindico - acesso igual de admin (porém sem acesso aos usuários)"
    // So only Role.ADMIN should see this. The check below is correct.
    return <p>Acesso negado.</p>;
  }

  // Double check: SINDICO/SUBSINDICO should NOT be here.
  if (currentUser?.role !== Role.ADMIN) {
    return <p>Acesso negado.</p>;
  }

  const handleRoleChange = (userId: string, newRole: Role) => {
    updateUserRole(userId, newRole);
  };

  const handleDeleteUser = async (user: User) => {
    try {
      if (user.role === Role.ADMIN) {
        alert("Não é possível excluir o usuário administrador.");
        return;
      }

      if (!window.confirm(`Tem certeza que deseja excluir o usuário ${user.name}?`)) {
        return;
      }

      // 🔥 Correção: garantir await + tratamento correto de erro
      await deleteUser(user.id);

      alert("Usuário excluído com sucesso.");
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
      alert("Ocorreu um erro ao excluir o usuário.");
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Gerenciamento de Usuários</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CPF</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Casa</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Perfil</th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map(user => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatName(user.name)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCPF(user.cpf)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.houseNumber}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                    disabled={user.role === Role.ADMIN}
                    className="block w-full pl-3 pr-10 py-1 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md disabled:bg-gray-200 disabled:cursor-not-allowed bg-white text-gray-900"
                  >
                    <option value={Role.MORADOR}>Morador</option>
                    <option value={Role.GESTAO}>Gestão</option>
                    <option value={Role.SINDICO}>Síndico</option>
                    <option value={Role.SUBSINDICO}>Subsíndico</option>
                    {/* ADMIN removed to prevent promotion */}
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleDeleteUser(user)}
                    disabled={user.role === Role.ADMIN}
                    className="text-red-600 hover:text-red-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;
