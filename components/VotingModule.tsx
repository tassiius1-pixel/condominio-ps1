import React, { useState, useEffect } from 'react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { Role, Voting, VotingOption, Status } from '../types';
import { TrashIcon, PlusIcon, CheckIcon, UploadIcon, XIcon, ChevronLeftIcon, BarChartIcon } from './Icons';
import { fileToBase64 } from '../utils/fileUtils';

interface VotingModuleProps {
    setView?: (view: any) => void;
}

const VotingModule: React.FC<VotingModuleProps> = ({ setView }) => {
    const { votings, addVoting, vote, addToast, updateRequestStatus, deleteVoting } = useData();
    const { currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState<'active' | 'history' | 'create'>('active');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // Create Voting State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [originRequestId, setOriginRequestId] = useState<string | null>(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [allowMultiple, setAllowMultiple] = useState(false);
    const [options, setOptions] = useState<Array<{ text: string; imageUrl?: string }>>([
        { text: '' },
        { text: '' }
    ]);

    useEffect(() => {
        const draft = localStorage.getItem('draft_voting');
        if (draft) {
            try {
                const { title, description, requestId } = JSON.parse(draft);
                setTitle(title);
                setDescription(description);
                if (requestId) setOriginRequestId(requestId);
                setActiveTab('create');
                localStorage.removeItem('draft_voting');
            } catch (e) {
                console.error('Error parsing draft voting', e);
            }
        }
    }, []);

    const handleAddOption = () => {
        setOptions([...options, { text: '' }]);
    };

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index].text = value;
        setOptions(newOptions);
    };

    const handleOptionImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const base64 = await fileToBase64(e.target.files[0]);
            const newOptions = [...options];
            newOptions[index].imageUrl = base64;
            setOptions(newOptions);
        }
    };

    const handleRemoveOptionImage = (index: number) => {
        const newOptions = [...options];
        delete newOptions[index].imageUrl;
        setOptions(newOptions);
    };

    const handleRemoveOption = (index: number) => {
        const newOptions = options.filter((_, i) => i !== index);
        setOptions(newOptions);
    };

    const handleCreateVoting = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !startDate || !endDate || options.some(o => !o.text.trim())) {
            addToast('Preencha todos os campos obrigatórios.', 'error');
            return;
        }

        const votingOptions: VotingOption[] = options.map((opt, index) => {
            const option: VotingOption = {
                id: `opt-${Date.now()}-${index}`,
                text: opt.text,
            };
            if (opt.imageUrl) {
                option.imageUrl = opt.imageUrl;
            }
            return option;
        });

        await addVoting({
            title,
            description,
            startDate,
            endDate,
            options: votingOptions,
            allowMultipleChoices: allowMultiple,
            createdBy: currentUser?.id || 'unknown',
        });

        if (originRequestId) {
            await updateRequestStatus(originRequestId, Status.EM_VOTACAO, 'Sugestão colocada em votação.', currentUser?.id);
            setOriginRequestId(null);
        }

        // Reset form
        setTitle('');
        setDescription('');
        setStartDate('');
        setEndDate('');
        setAllowMultiple(false);
        setOptions([{ text: '' }, { text: '' }]);
        setActiveTab('active');
        // addToast is handled by DataContext
    };

    const handleDeleteVoting = async (id: string) => {
        if (window.confirm("Tem certeza que deseja excluir esta votação?")) {
            await deleteVoting(id);
            // addToast is handled by DataContext
        }
    };

    // Voting Logic
    const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});

    const handleToggleOption = (votingId: string, optionId: string, allowMultiple: boolean) => {
        setSelectedOptions(prev => {
            const current = prev[votingId] || [];
            if (allowMultiple) {
                if (current.includes(optionId)) {
                    return { ...prev, [votingId]: current.filter(id => id !== optionId) };
                } else {
                    return { ...prev, [votingId]: [...current, optionId] };
                }
            } else {
                return { ...prev, [votingId]: [optionId] };
            }
        });
    };

    const handleSubmitVote = async (votingId: string) => {
        if (!currentUser) return;

        const choices = selectedOptions[votingId];
        if (!choices || choices.length === 0) {
            addToast('Selecione pelo menos uma opção.', 'info');
            return;
        }
        await vote(votingId, choices, currentUser);
        setSelectedOptions(prev => {
            const newState = { ...prev };
            delete newState[votingId];
            return newState;
        });
        // addToast is handled by the context
    };

    const getVotingStatus = (voting: Voting) => {
        const now = new Date();
        const start = new Date(voting.startDate);
        const end = new Date(voting.endDate);
        end.setHours(23, 59, 59, 999);

        if (now < start) return 'future';
        if (now > end) return 'closed';
        return 'active';
    };

    const calculateResults = (voting: Voting) => {
        const totalVotes = voting.votes.length;
        const counts: Record<string, number> = {};

        voting.options.forEach(opt => counts[opt.id] = 0);

        voting.votes.forEach(vote => {
            vote.optionIds.forEach(optId => {
                counts[optId] = (counts[optId] || 0) + 1;
            });
        });

        // Determine max votes to highlight winner
        const maxVotes = Math.max(...Object.values(counts));

        return voting.options.map(opt => ({
            ...opt,
            count: counts[opt.id],
            percentage: totalVotes === 0 ? 0 : Math.round((counts[opt.id] / totalVotes) * 100),
            isWinner: totalVotes > 0 && counts[opt.id] === maxVotes && counts[opt.id] > 0
        })).sort((a, b) => b.count - a.count); // Sort by most voted
    };

    const renderVotingCard = (voting: Voting) => {
        const status = getVotingStatus(voting);
        const hasVoted = voting.votes.some(v => v.houseNumber === currentUser?.houseNumber);
        const results = calculateResults(voting);
        const isAdmin = [Role.ADMIN, Role.GESTAO, Role.SINDICO, Role.SUBSINDICO].includes(currentUser?.role || Role.MORADOR);
        const canDelete = currentUser?.role === Role.ADMIN;
        const showResults = hasVoted || status === 'closed' || isAdmin;

        return (
            <div key={voting.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 group">
                {/* Header Gradient */}
                <div className={`h-1.5 w-full ${status === 'active' ? 'bg-gradient-to-r from-indigo-500 to-purple-500' :
                    status === 'future' ? 'bg-gradient-to-r from-yellow-400 to-orange-400' :
                        'bg-gray-200'
                    }`} />

                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-lg font-bold text-gray-800 leading-tight">{voting.title}</h3>
                                {canDelete && (
                                    <button
                                        onClick={() => handleDeleteVoting(voting.id)}
                                        className="text-gray-300 hover:text-red-500 transition p-1 rounded-full hover:bg-red-50 opacity-0 group-hover:opacity-100"
                                        title="Excluir Votação"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <p className="text-sm text-gray-500 line-clamp-2">{voting.description}</p>
                        </div>
                        <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${status === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                            status === 'future' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                'bg-gray-100 text-gray-600 border-gray-200'
                            }`}>
                            {status === 'active' ? 'Destaque' : status === 'future' ? 'Agendada' : 'Finalizada'}
                        </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-400 mb-6">
                        <span className="flex items-center gap-1">
                            <BarChartIcon className="w-3.5 h-3.5" />
                            {voting.votes.length} voto(s)
                        </span>
                        <span>•</span>
                        <span>Até {new Date(voting.endDate).toLocaleDateString('pt-BR')}</span>
                    </div>

                    {/* Voting Area */}
                    {status === 'active' && !hasVoted && (
                        <div className="space-y-3 animate-fade-in-up">
                            <p className="text-sm font-semibold text-gray-700 block mb-2">
                                Escolha sua opção ({voting.allowMultipleChoices ? 'Múltipla' : 'Única'}):
                            </p>
                            <div className="grid grid-cols-1 gap-3">
                                {voting.options.map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => handleToggleOption(voting.id, opt.id, voting.allowMultipleChoices)}
                                        className={`relative text-left p-3 rounded-xl border-2 transition-all flex items-center justify-between group/opt ${selectedOptions[voting.id]?.includes(opt.id)
                                            ? 'bg-indigo-50 border-indigo-500 shadow-md'
                                            : 'bg-white border-gray-100 hover:border-indigo-200 hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {opt.imageUrl && (
                                                <img
                                                    src={opt.imageUrl}
                                                    alt="Opção"
                                                    className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedImage(opt.imageUrl!);
                                                    }}
                                                />
                                            )}
                                            <span className={`font-medium ${selectedOptions[voting.id]?.includes(opt.id) ? 'text-indigo-900' : 'text-gray-700'}`}>
                                                {opt.text}
                                            </span>
                                        </div>
                                        {selectedOptions[voting.id]?.includes(opt.id) && (
                                            <CheckIcon className="w-5 h-5 text-indigo-600 animate-scale-in" />
                                        )}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => handleSubmitVote(voting.id)}
                                className="w-full mt-4 bg-indigo-600 text-white py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition shadow-md hover:shadow-lg transform active:scale-95"
                            >
                                Confirmar Voto
                            </button>
                        </div>
                    )}

                    {/* Results Area (Visual Charts) */}
                    {showResults && (
                        <div className="space-y-4 mt-2 animate-fade-in">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Resultados</h4>
                                {hasVoted && status === 'active' && (
                                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                                        Votado
                                    </span>
                                )}
                            </div>
                            <div className="space-y-3">
                                {results.map((res, idx) => (
                                    <div key={res.id} className="relative">
                                        <div className="flex justify-between text-xs font-medium text-gray-700 mb-1 z-10 relative">
                                            <span className="flex items-center gap-1">
                                                {idx + 1}. {res.text}
                                                {res.isWinner && <span className="text-yellow-500">👑</span>}
                                            </span>
                                            <span>{res.percentage}%</span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ease-out ${res.isWinner ? 'bg-green-500' : 'bg-indigo-400'}`}
                                                style={{ width: `${res.percentage}%` }}
                                            />
                                        </div>
                                        <div className="text-[10px] text-gray-400 mt-0.5 text-right">
                                            {res.count} voto(s)
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const activeVotings = votings.filter(v => getVotingStatus(v) === 'active' || getVotingStatus(v) === 'future');
    const pastVotings = votings.filter(v => getVotingStatus(v) === 'closed');

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex items-center gap-3 md:hidden">
                <button onClick={() => setView && setView('home')} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition">
                    <ChevronLeftIcon className="w-6 h-6" />
                </button>
                <h2 className="text-2xl font-bold text-gray-900">Votações</h2>
            </div>

            <div className="hidden md:flex justify-between items-end border-b border-gray-200 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Votações e Enquetes</h1>
                    <p className="text-gray-500 text-sm mt-1">Participe das decisões do condomínio.</p>
                </div>
            </div>

            {/* Navigation & Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'active' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Em Aberto
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'history' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Histórico
                    </button>
                    {[Role.ADMIN, Role.GESTAO, Role.SINDICO, Role.SUBSINDICO].includes(currentUser?.role || Role.MORADOR) && (
                        <button
                            onClick={() => setActiveTab('create')}
                            className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'create' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Nova +
                        </button>
                    )}
                </div>
            </div>

            {/* Content Area */}
            {activeTab === 'active' && (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {activeVotings.length === 0 ? (
                        <div className="col-span-full py-16 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                <BarChartIcon className="w-8 h-8 text-gray-300" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">Nenhuma votação ativa</h3>
                            <p className="text-gray-500 text-sm mt-1">Todas as decisões estão em dia.</p>
                        </div>
                    ) : (
                        activeVotings.map(renderVotingCard)
                    )}
                </div>
            )}

            {activeTab === 'history' && (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 opacity-90">
                    {pastVotings.length === 0 ? (
                        <div className="col-span-full py-16 text-center text-gray-500">
                            Nenhuma votação antiga encontrada.
                        </div>
                    ) : (
                        pastVotings.map(renderVotingCard)
                    )}
                </div>
            )}

            {activeTab === 'create' && (
                <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="bg-gray-50 border-b border-gray-100 px-8 py-6">
                        <h2 className="text-xl font-bold text-gray-900">Nova Votação</h2>
                        <p className="text-sm text-gray-500 mt-1">Crie uma nova pauta para os moradores decidirem.</p>
                    </div>

                    <form onSubmit={handleCreateVoting} className="p-8 space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Título da Pauta</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                                    placeholder="Ex: Aprovação da Reforma da Fachada"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição Detalhada</label>
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition resize-none"
                                    rows={4}
                                    placeholder="Explique os detalhes, custos e impactos..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Data de Início</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Data de Término</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={e => setEndDate(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <input
                                    type="checkbox"
                                    id="allowMultiple"
                                    checked={allowMultiple}
                                    onChange={e => setAllowMultiple(e.target.checked)}
                                    className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                />
                                <label htmlFor="allowMultiple" className="text-sm font-medium text-gray-800 cursor-pointer select-none">
                                    Permitir que moradores escolham múltiplas opções
                                </label>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-gray-100">
                            <label className="block text-sm font-bold text-gray-900">Opções de Resposta</label>
                            {options.map((opt, index) => (
                                <div key={index} className="flex gap-3 items-start animate-fade-in">
                                    <div className="flex-1 space-y-2">
                                        <input
                                            type="text"
                                            value={opt.text}
                                            onChange={e => handleOptionChange(index, e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder={`Opção ${index + 1}`}
                                            required
                                        />
                                        {/* Image Upload Compact */}
                                        <div className="flex items-center gap-2">
                                            {opt.imageUrl ? (
                                                <div className="flex items-center gap-2 bg-green-50 px-2 py-1 rounded text-xs text-green-700 border border-green-200">
                                                    <CheckIcon className="w-3 h-3" /> Imagem anexada
                                                    <button type="button" onClick={() => handleRemoveOptionImage(index)} className="hover:text-red-600 ml-1">
                                                        <XIcon className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <label className="cursor-pointer text-xs text-indigo-600 hover:underline flex items-center gap-1">
                                                    <UploadIcon className="w-3 h-3" /> Adicionar imagem
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={e => handleOptionImageUpload(index, e)}
                                                        className="hidden"
                                                    />
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                    {options.length > 2 && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveOption(index)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition mt-0.5"
                                            title="Remover opção"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={handleAddOption}
                                className="flex items-center gap-1.5 text-sm text-indigo-600 font-bold hover:text-indigo-700 px-2 py-1 rounded hover:bg-indigo-50 w-fit transition"
                            >
                                <PlusIcon className="w-4 h-4" /> Adicionar Outra Opção
                            </button>
                        </div>

                        <div className="pt-6 flex gap-4">
                            <button
                                type="button"
                                onClick={() => setActiveTab('active')}
                                className="flex-1 px-4 py-3 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="flex-1 px-4 py-3 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-md hover:shadow-lg transition transform active:scale-95"
                            >
                                Publicar Votação
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Image Lightbox Modal */}
            {selectedImage && (
                <div
                    className="fixed inset-0 bg-black/95 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"
                    onClick={() => setSelectedImage(null)}
                >
                    <button
                        onClick={() => setSelectedImage(null)}
                        className="absolute top-4 right-4 p-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition"
                    >
                        <XIcon className="w-8 h-8" />
                    </button>
                    <img
                        src={selectedImage}
                        alt="Ampliação"
                        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
};

export default VotingModule;
