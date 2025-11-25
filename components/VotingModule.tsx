import React, { useState } from 'react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { Role, Voting, VotingOption } from '../types';
import { TrashIcon, PlusIcon, CheckIcon, UploadIcon, XIcon, ChevronLeftIcon } from './Icons';
import { fileToBase64 } from '../utils/fileUtils';

interface VotingModuleProps {
    setView?: (view: any) => void;
}

const VotingModule: React.FC<VotingModuleProps> = ({ setView }) => {
    const { votings, addVoting, vote, addToast } = useData();
    const { currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState<'active' | 'history' | 'create'>('active');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // Create Voting State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');

    React.useEffect(() => {
        const draft = localStorage.getItem('draft_voting');
        if (draft) {
            try {
                const { title, description } = JSON.parse(draft);
                setTitle(title);
                setDescription(description);
                setActiveTab('create');
                localStorage.removeItem('draft_voting');
            } catch (e) {
                console.error('Error parsing draft voting', e);
            }
        }
    }, []);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [allowMultiple, setAllowMultiple] = useState(false);
    const [options, setOptions] = useState<Array<{ text: string; imageUrl?: string }>>([
        { text: '' },
        { text: '' }
    ]);

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

        const votingOptions: VotingOption[] = options.map((opt, index) => ({
            id: `opt-${Date.now()}-${index}`,
            text: opt.text,
            imageUrl: opt.imageUrl,
        }));

        await addVoting({
            title,
            description,
            startDate,
            endDate,
            options: votingOptions,
            allowMultipleChoices: allowMultiple,
            createdBy: currentUser?.id || 'unknown',
        });

        // Reset form
        setTitle('');
        setDescription('');
        setStartDate('');
        setEndDate('');
        setAllowMultiple(false);
        setOptions([{ text: '' }, { text: '' }]);
        setActiveTab('active');
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
        // Clear selection
        setSelectedOptions(prev => {
            const newState = { ...prev };
            delete newState[votingId];
            return newState;
        });
    };

    const getVotingStatus = (voting: Voting) => {
        const now = new Date();
        const start = new Date(voting.startDate);
        const end = new Date(voting.endDate);

        // Adjust end date to be end of day
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

        return voting.options.map(opt => ({
            ...opt,
            count: counts[opt.id],
            percentage: totalVotes === 0 ? 0 : Math.round((counts[opt.id] / totalVotes) * 100)
        }));
    };

    const renderVotingCard = (voting: Voting) => {
        const status = getVotingStatus(voting);
        const hasVoted = voting.votes.some(v => v.houseNumber === currentUser?.houseNumber);
        const results = calculateResults(voting);
        const isAdmin = [Role.ADMIN, Role.GESTAO, Role.SINDICO, Role.SUBSINDICO].includes(currentUser?.role || Role.MORADOR);

        return (
            <div key={voting.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">{voting.title}</h3>
                        <p className="text-sm text-gray-500">{voting.description}</p>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-bold uppercase ${status === 'active' ? 'bg-green-100 text-green-700' :
                        status === 'future' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                        }`}>
                        {status === 'active' ? 'Em Andamento' : status === 'future' ? 'Agendada' : 'Encerrada'}
                    </div>
                </div>

                <div className="text-xs text-gray-400">
                    Período: {new Date(voting.startDate).toLocaleDateString()} até {new Date(voting.endDate).toLocaleDateString()}
                </div>

                {/* Voting Area */}
                {status === 'active' && !hasVoted && (
                    <div className="space-y-3 mt-4 border-t border-gray-100 pt-4">
                        <p className="text-sm font-semibold text-gray-700">
                            Vote agora ({voting.allowMultipleChoices ? 'Múltipla escolha' : 'Escolha única'}):
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {voting.options.map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => handleToggleOption(voting.id, opt.id, voting.allowMultipleChoices)}
                                    className={`relative text-left p-3 rounded-lg border transition ${selectedOptions[voting.id]?.includes(opt.id)
                                        ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-200'
                                        : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                        }`}
                                >
                                    {opt.imageUrl && (
                                        <div
                                            className="mb-2 rounded-lg overflow-hidden cursor-pointer group relative"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedImage(opt.imageUrl!);
                                            }}
                                        >
                                            <img
                                                src={opt.imageUrl}
                                                alt={opt.text}
                                                className="w-full h-32 object-cover transition-transform group-hover:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity flex items-center justify-center">
                                                <span className="text-white text-xs opacity-0 group-hover:opacity-100 bg-black bg-opacity-50 px-2 py-1 rounded">
                                                    Clique para ampliar
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-start">
                                        <span className={`font-medium ${selectedOptions[voting.id]?.includes(opt.id) ? 'text-blue-700' : 'text-gray-700'}`}>
                                            {opt.text}
                                        </span>
                                        {selectedOptions[voting.id]?.includes(opt.id) && (
                                            <CheckIcon className="w-5 h-5 text-blue-600 flex-shrink-0 ml-2" />
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => handleSubmitVote(voting.id)}
                            className="w-full mt-2 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
                        >
                            Confirmar Voto
                        </button>
                    </div>
                )}

                {/* Results Area */}
                {(hasVoted || status === 'closed' || isAdmin) && (
                    <div className="space-y-3 mt-4 border-t border-gray-100 pt-4">
                        <p className="text-sm font-semibold text-gray-700">Resultados Parciais:</p>
                        <div className="space-y-3">
                            {results.map(res => (
                                <div key={res.id} className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        {res.imageUrl && (
                                            <img
                                                src={res.imageUrl}
                                                alt={res.text}
                                                className="w-12 h-12 object-cover rounded cursor-pointer hover:opacity-80 transition"
                                                onClick={() => setSelectedImage(res.imageUrl!)}
                                            />
                                        )}
                                        <div className="flex-1">
                                            <div className="flex justify-between text-xs text-gray-600">
                                                <span>{res.text}</span>
                                                <span>{res.count} votos ({res.percentage}%)</span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden mt-1">
                                                <div
                                                    className="bg-blue-500 h-full rounded-full transition-all duration-500"
                                                    style={{ width: `${res.percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {hasVoted && status === 'active' && (
                            <p className="text-xs text-center text-green-600 font-medium mt-2">
                                Voto registrado!
                            </p>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const activeVotings = votings.filter(v => getVotingStatus(v) === 'active' || getVotingStatus(v) === 'future');
    const pastVotings = votings.filter(v => getVotingStatus(v) === 'closed');

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <button onClick={() => setView && setView('notices')} className="md:hidden p-1 text-gray-500 hover:text-gray-700">
                        <ChevronLeftIcon className="w-6 h-6" />
                    </button>
                    <h2 className="text-2xl font-bold text-gray-800">Votações</h2>
                </div>
            </div>

            {/* Header Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('active')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'active' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Votações Ativas
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'history' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Histórico
                </button>
                {[Role.ADMIN, Role.GESTAO, Role.SINDICO, Role.SUBSINDICO].includes(currentUser?.role || Role.MORADOR) && (
                    <button
                        onClick={() => setActiveTab('create')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'create' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Nova Votação
                    </button>
                )}
            </div>

            {/* Content */}
            {activeTab === 'active' && (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {activeVotings.length === 0 ? (
                        <p className="text-gray-500 col-span-full text-center py-10">Nenhuma votação ativa no momento.</p>
                    ) : (
                        activeVotings.map(renderVotingCard)
                    )}
                </div>
            )}

            {activeTab === 'history' && (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {pastVotings.length === 0 ? (
                        <p className="text-gray-500 col-span-full text-center py-10">Nenhuma votação encerrada.</p>
                    ) : (
                        pastVotings.map(renderVotingCard)
                    )}
                </div>
            )}

            {activeTab === 'create' && (
                <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-6">Criar Nova Votação</h2>
                    <form onSubmit={handleCreateVoting} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Ex: Escolha da cor da fachada"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                rows={3}
                                placeholder="Detalhes sobre a votação..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Início</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fim</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="allowMultiple"
                                checked={allowMultiple}
                                onChange={e => setAllowMultiple(e.target.checked)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="allowMultiple" className="text-sm text-gray-700">Permitir seleção de múltiplas opções</label>
                        </div>

                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-gray-700">Opções de Voto</label>
                            {options.map((opt, index) => (
                                <div key={index} className="border border-gray-200 rounded-lg p-3 space-y-2">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={opt.text}
                                            onChange={e => handleOptionChange(index, e.target.value)}
                                            className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder={`Opção ${index + 1}`}
                                            required
                                        />
                                        {options.length > 2 && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveOption(index)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                            >
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Image Upload */}
                                    <div>
                                        {opt.imageUrl ? (
                                            <div className="relative">
                                                <img src={opt.imageUrl} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveOptionImage(index)}
                                                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                                >
                                                    <XIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition">
                                                <UploadIcon className="w-5 h-5 text-gray-400" />
                                                <span className="text-sm text-gray-500">Adicionar imagem (opcional)</span>
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
                            ))}
                            <button
                                type="button"
                                onClick={handleAddOption}
                                className="flex items-center gap-1 text-sm text-blue-600 font-medium hover:text-blue-700"
                            >
                                <PlusIcon className="w-4 h-4" /> Adicionar Opção
                            </button>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition shadow-sm"
                            >
                                Criar Votação
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Image Lightbox Modal */}
            {selectedImage && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
                    onClick={() => setSelectedImage(null)}
                >
                    <button
                        onClick={() => setSelectedImage(null)}
                        className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-gray-100 transition"
                    >
                        <XIcon className="w-6 h-6 text-gray-800" />
                    </button>
                    <img
                        src={selectedImage}
                        alt="Ampliação"
                        className="max-w-full max-h-full object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
};

export default VotingModule;
