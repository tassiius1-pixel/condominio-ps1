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

      // Feedback via Toast handled by DataContext
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
      // Error Toast handled by DataContext (if implemented there or add one here if generic)
      // DataContext deleteUser has error toast, so we just log.
    }
  };

  const handleExportPDF = () => {
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text('Relatório de Usuários', 14, 22);
    doc.setFontSize(11);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);

    const rows = users.map(user => [
      formatName(user.name),
      formatCPF(user.cpf),
      user.houseNumber.toString(),
      user.role.charAt(0).toUpperCase() + user.role.slice(1)
    ]);

    doc.autoTable({
      startY: 40,
      head: [['Nome', 'CPF', 'Casa', 'Perfil']],
      body: rows,
    });

    doc.save('relatorio_usuarios.pdf');
  };

  const handleExportExcel = () => {
    const headers = ["Nome", "CPF", "Casa", "Perfil"];
    const rows = users.map(user => [
      `"${formatName(user.name)}"`,
      `"${formatCPF(user.cpf)}"`,
      user.houseNumber,
      user.role
    ].join(','));

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "relatorio_usuarios.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-800">Gerenciamento de Usuários</h2>
          <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold border border-blue-100 shadow-sm">
            Total: {users.length}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportPDF} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md shadow-sm transition-colors">
            PDF
          </button>
          <button onClick={handleExportExcel} className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md shadow-sm transition-colors">
            Excel
          </button>
        </div>
      </div>
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
