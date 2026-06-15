import React from 'react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { Role, User } from '../types';
import { TrashIcon, ChevronLeftIcon } from './Icons';
import { formatCPF, formatName } from '../utils/formatters';
import ConfirmModal from './ConfirmModal';
import { loadJsPDF } from '../utils/scriptLoader';

interface UserManagementProps {
  setView?: (view: any) => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ setView }) => {
  const { users, updateUserRole, deleteUser, approveUser } = useData();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = React.useState<'active' | 'pending'>('active');

  const activeUsers = React.useMemo(() => users.filter(u => u.isApproved), [users]);
  const pendingUsers = React.useMemo(() => users.filter(u => !u.isApproved), [users]);
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

      const rows = activeUsers.map(user => [
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
    const rows = activeUsers.map(user => [
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
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-gray-200 pb-5">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {setView && (
            <button
              onClick={() => setView('home')}
              className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors active:scale-95 touch-active shrink-0"
              title="Voltar para o Início"
            >
              <ChevronLeftIcon className="w-6 h-6" />
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
              Gerenciamento de Usuários
              <span className="bg-indigo-50 text-indigo-700 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider border border-indigo-100 shadow-sm shrink-0">
                {activeUsers.length} Moradores
              </span>
            </h1>
            <p className="text-gray-500 text-[10px] md:text-sm mt-1 font-semibold leading-tight">
              Gerencie os perfis de acesso, casas e permissões de todos os usuários do aplicativo.
            </p>
          </div>
        </div>
        <div className="flex gap-2 self-start md:self-auto">
          <button onClick={handleExportPDF} className="px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white bg-red-500 hover:bg-red-600 rounded-xl shadow-sm transition-all active:scale-95">
            PDF
          </button>
          <button onClick={handleExportExcel} className="px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl shadow-sm transition-all active:scale-95">
            Excel
          </button>
        </div>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-gray-100">
        {/* Abas de Navegação */}
        <div className="flex border-b border-gray-250 mb-6 gap-2">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2.5 border-b-2 font-black text-xs uppercase tracking-wider transition-all ${
              activeTab === 'active'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            Moradores Ativos ({activeUsers.length})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2.5 border-b-2 font-black text-xs uppercase tracking-wider transition-all relative ${
              activeTab === 'pending'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            Solicitações Pendentes ({pendingUsers.length})
            {pendingUsers.length > 0 && (
              <span className="absolute -top-1 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-black text-white animate-pulse">
                {pendingUsers.length}
              </span>
            )}
          </button>
        </div>

        {/* Visualização Mobile: Cards empilhados */}
        <div className="md:hidden space-y-4">
          {activeTab === 'active' ? (
            activeUsers.map(user => (
              <div
                key={user.id}
                className="p-5 rounded-2xl border border-gray-200 bg-white shadow-sm flex flex-col gap-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-base font-black text-gray-900">
                      {formatName(user.name)}
                    </div>
                    <div className="flex gap-3 text-xs text-gray-500 mt-1 font-medium">
                      <span>Casa: <strong className="text-gray-900">{user.houseNumber}</strong></span>
                      <span className="text-gray-300">|</span>
                      <span className="font-mono">{formatCPF(user.cpf)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteUser(user)}
                    disabled={user.role === Role.ADMIN}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-95 disabled:text-gray-200 disabled:bg-transparent disabled:cursor-not-allowed shrink-0"
                    title="Excluir Usuário"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex flex-col gap-1.5 pt-2 border-t border-gray-100">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    Perfil de Acesso
                  </label>
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                    disabled={user.role === Role.ADMIN}
                    className="block w-full px-3.5 py-2.5 text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 rounded-xl disabled:bg-gray-100 disabled:cursor-not-allowed bg-white text-gray-900 font-bold transition-all shadow-sm"
                  >
                    <option value={Role.PROPRIETARIO}>Proprietário</option>
                    <option value={Role.INQUILINO}>Inquilino</option>
                    <option value={Role.GESTAO}>Gestão</option>
                    <option value={Role.SINDICO}>Síndico</option>
                    <option value={Role.SUBSINDICO}>Subsíndico</option>
                  </select>
                </div>
              </div>
            ))
          ) : pendingUsers.length === 0 ? (
            <p className="text-center py-6 text-sm text-gray-500 font-medium">Nenhuma solicitação pendente.</p>
          ) : (
            pendingUsers.map(user => (
              <div
                key={user.id}
                className="p-5 rounded-2xl border border-gray-200 bg-white shadow-sm flex flex-col gap-3.5 hover:shadow-md transition-shadow animate-fade-in"
              >
                <div>
                  <div className="text-base font-black text-gray-900">
                    {formatName(user.name)}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2.5 text-xs text-gray-555 font-semibold">
                    <div>Casa: <strong className="text-gray-900">{user.houseNumber}</strong></div>
                    <div className="col-span-2 font-mono text-gray-500 mt-1">CPF: {formatCPF(user.cpf)}</div>
                    {user.phone && <div className="col-span-2 text-gray-500">Celular: {user.phone}</div>}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 pt-2 border-t border-gray-100">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    Vínculo / Perfil de Acesso
                  </label>
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                    className="block w-full px-3.5 py-2.5 text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 rounded-xl bg-white text-gray-900 font-bold transition-all shadow-sm"
                  >
                    <option value={Role.PROPRIETARIO}>Proprietário</option>
                    <option value={Role.INQUILINO}>Inquilino</option>
                    <option value={Role.GESTAO}>Gestão</option>
                    <option value={Role.SINDICO}>Síndico</option>
                    <option value={Role.SUBSINDICO}>Subsíndico</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => approveUser(user.id)}
                    className="flex-1 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-100 active:scale-95 transition-all text-center"
                  >
                    Aprovar
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user)}
                    className="flex-1 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-bold text-xs active:scale-95 transition-all text-center"
                  >
                    Recusar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Visualização Desktop: Tabela clássica completa */}
        <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-100">
          {activeTab === 'active' ? (
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
                {activeUsers.map(user => (
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
          ) : pendingUsers.length === 0 ? (
            <p className="text-center py-12 text-sm text-gray-500 font-medium">Nenhuma solicitação pendente.</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50/50">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome</th>
                  <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">CPF</th>
                  <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Casa</th>
                  <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Vínculo</th>
                  <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Celular</th>
                  <th scope="col" className="relative px-6 py-4">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {pendingUsers.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{formatName(user.name)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium tabular-nums">{formatCPF(user.cpf)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-bold">{user.houseNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                        className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 rounded-xl bg-white text-gray-900 font-bold transition-all shadow-sm"
                      >
                        <option value={Role.PROPRIETARIO}>Proprietário</option>
                        <option value={Role.INQUILINO}>Inquilino</option>
                        <option value={Role.GESTAO}>Gestão</option>
                        <option value={Role.SINDICO}>Síndico</option>
                        <option value={Role.SUBSINDICO}>Subsíndico</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">{user.phone || "-"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      <button
                        onClick={() => approveUser(user.id)}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-sm hover:shadow active:scale-95 transition-all"
                      >
                        Aprovar
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="px-4 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold text-xs active:scale-95 transition-all"
                      >
                        Recusar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
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
