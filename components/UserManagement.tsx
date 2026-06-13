import React from 'react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { Role, User } from '../types';
import { TrashIcon } from './Icons';
import { formatCPF, formatName } from '../utils/formatters';
import ConfirmModal from './ConfirmModal';
import { loadJsPDF } from '../utils/scriptLoader';

const UserManagement: React.FC = () => {
  const { users, updateUserRole, deleteUser } = useData();
  const { currentUser } = useAuth();
  const [modalConfig, setModalConfig] = React.useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'danger' | 'info' | 'success';
    alertOnly: boolean;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    alertOnly: false
  });

  const closeModal = () => setModalConfig(prev => ({ ...prev, isOpen: false }));

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
    if (user.role === Role.ADMIN) {
      setModalConfig({
        isOpen: true,
        title: "Ação Negada",
        message: "Não é possível excluir o usuário administrador.",
        type: 'danger',
        alertOnly: true
      });
      return;
    }

    setModalConfig({
      isOpen: true,
      title: "Excluir Usuário?",
      message: `Tem certeza que deseja excluir o usuário ${user.name}? Esta ação não pode ser desfeita.`,
      type: 'danger',
      alertOnly: false,
      onConfirm: async () => {
        try {
          await deleteUser(user.id);
        } catch (error) {
          console.error("Erro ao excluir usuário:", error);
        }
      }
    });
  };

  const handleExportPDF = async () => {
    try {
      await loadJsPDF();
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
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      alert("Ocorreu um erro ao gerar o PDF. Verifique sua conexão.");
    }
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
    <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Gerenciamento de Usuários</h2>
          <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border border-indigo-100 shadow-sm">
            {users.length} Usuários
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportPDF} className="px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white bg-red-500 hover:bg-red-600 rounded-xl shadow-sm transition-all active:scale-95">
            PDF
          </button>
          <button onClick={handleExportExcel} className="px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl shadow-sm transition-all active:scale-95">
            Excel
          </button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-gray-100">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50/50">
            <tr>
              <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome</th>
              <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">CPF</th>
              <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Casa</th>
              <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Perfil</th>
              <th scope="col" className="relative px-6 py-4">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-50">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{formatName(user.name)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium tabular-nums">{formatCPF(user.cpf)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-bold">{user.houseNumber}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                    disabled={user.role === Role.ADMIN}
                    className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 rounded-xl disabled:bg-gray-100 disabled:cursor-not-allowed bg-white text-gray-900 font-bold transition-all shadow-sm"
                  >
                    <option value={Role.PROPRIETARIO}>Proprietário</option>
                    <option value={Role.INQUILINO}>Inquilino</option>
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
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-95 duration-200 disabled:text-gray-200 disabled:bg-transparent disabled:cursor-not-allowed"
                    title="Excluir Usuário"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={modalConfig.isOpen}
        onClose={closeModal}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        alertOnly={modalConfig.alertOnly}
        onConfirm={modalConfig.onConfirm}
      />
    </div>
  );
};

export default UserManagement;
