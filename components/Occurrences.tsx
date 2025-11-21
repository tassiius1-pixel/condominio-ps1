import React, { useState } from 'react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { Role } from '../types';
import { PlusIcon } from './Icons';

const Occurrences: React.FC = () => {
    const { occurrences, addOccurrence, addToast } = useData();
    const { currentUser } = useAuth();
    const [isFormOpen, setIsFormOpen] = useState(false);

    // Form State
    const [phone, setPhone] = useState('');
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');

    const isAdminOrGestao = currentUser && [Role.ADMIN, Role.GESTAO].includes(currentUser.role);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;

        await addOccurrence({
            authorId: currentUser.id,
            authorName: currentUser.name,
            houseNumber: currentUser.houseNumber,
            phone,
            subject,
            description,
        });

        setIsFormOpen(false);
        setPhone('');
        setSubject('');
        setDescription('');
        addToast('Ocorrência registrada com sucesso!', 'success');
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">Livro de Ocorrências</h2>
                <button
                    onClick={() => setIsFormOpen(!isFormOpen)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm"
                >
                    {isFormOpen ? (
                        <span>Voltar para Lista</span>
                    ) : (
                        <>
                            <PlusIcon className="w-5 h-5" />
                            <span>Nova Ocorrência</span>
                        </>
                    )}
                </button>
            </div>

            {/* Form */}
            {isFormOpen ? (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 animate-slide-in">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Registrar Ocorrência</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                                <input
                                    type="text"
                                    value={currentUser?.name}
                                    disabled
                                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Casa</label>
                                <input
                                    type="text"
                                    value={currentUser?.houseNumber}
                                    disabled
                                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone de Contato *</label>
                            <input
                                type="tel"
                                required
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="(00) 00000-0000"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Assunto *</label>
                            <input
                                type="text"
                                required
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="Ex: Barulho excessivo, Lâmpada queimada..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição Detalhada *</label>
                            <textarea
                                required
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-none"
                            ></textarea>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsFormOpen(false)}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm font-medium"
                            >
                                Registrar
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                /* List for Admin/Gestao OR Message for Residents */
                isAdminOrGestao ? (
                    <div className="space-y-4">
                        {occurrences.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed">
                                <p className="text-gray-500">Nenhuma ocorrência registrada.</p>
                            </div>
                        ) : (
                            occurrences.map((occ) => (
                                <div key={occ.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900">{occ.subject}</h3>
                                            <p className="text-sm text-gray-500">
                                                Registrado por <span className="font-medium text-gray-900">{occ.authorName}</span> (Casa {occ.houseNumber})
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                {new Date(occ.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <div className="bg-gray-100 px-3 py-1 rounded-full text-xs font-medium text-gray-600">
                                            Tel: {occ.phone}
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-gray-700 text-sm leading-relaxed">
                                        {occ.description}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed">
                        <p className="text-gray-500">
                            As ocorrências registradas são enviadas diretamente para a administração e não ficam visíveis publicamente.
                        </p>
                    </div>
                )
            )}
        </div>
    );
};

export default Occurrences;
