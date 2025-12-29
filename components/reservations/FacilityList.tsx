import React from 'react';
import { Reservation, Role } from '../../types';
import { ChevronLeftIcon, TrashIcon } from '../Icons';

interface FacilityProps {
    area: 'churrasco1' | 'churrasco2' | 'salao_festas';
    label: string;
    icon: React.FC<{ className?: string }>;
    colorClass: string;
    btnColorClass: string;
    isReserved: boolean;
    isDisabled: boolean;
    onReserve: (area: any) => void;
}

const FacilityCard: React.FC<FacilityProps> = ({
    area,
    label,
    icon: Icon,
    colorClass,
    btnColorClass,
    isReserved,
    isDisabled,
    onReserve
}) => (
    <div className={`relative overflow-hidden rounded-xl border transition-all duration-300 ${isReserved ? 'bg-gray-50 border-gray-200 opacity-75' : 'bg-white border-gray-200 hover:shadow-md hover:border-gray-300'}`}>
        <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <h4 className="text-sm font-bold text-gray-900">{label}</h4>
                    <p className="text-xs text-gray-500">
                        {isReserved ? 'Indisponível' : 'Disponível'}
                    </p>
                </div>
            </div>

            {!isReserved && !isDisabled && (
                <button
                    onClick={() => onReserve(area)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors ${btnColorClass}`}
                >
                    Reservar
                </button>
            )}

            {isReserved && (
                <span className="px-2 py-1 bg-gray-200 text-gray-500 text-[10px] font-bold uppercase rounded">
                    Ocupado
                </span>
            )}
        </div>
        {/* Progress Bar Style Indicator */}
        <div className={`h-1 w-full ${isReserved ? 'bg-gray-300' : (area === 'salao_festas' ? 'bg-purple-500' : 'bg-orange-500')}`}></div>
    </div>
);

interface FacilityListProps {
    selectedDate: Date | null;
    dateReservations: Reservation[]; // Should be pre-filtered for the selected date
    currentUser: any;
    onReserve: (area: 'churrasco1' | 'churrasco2' | 'salao_festas') => void;
    onCancel: (reservation: Reservation) => void;
    isDateDisabled: (date: Date, type: 'churrasco' | 'salao') => boolean;
}

const FacilityList: React.FC<FacilityListProps> = ({
    selectedDate,
    dateReservations,
    currentUser,
    onReserve,
    onCancel,
    isDateDisabled
}) => {
    // Helper to check if current user has booked specific types for this date
    // Note: This logic was inside FacilityCard calls in Reservations.tsx
    const userHasSalao = dateReservations.some(r => r.houseNumber === currentUser?.houseNumber && r.area === 'salao_festas');
    const userHasChurrasco = dateReservations.some(r => r.houseNumber === currentUser?.houseNumber && r.area.includes('churrasco'));

    return (
        <div className="space-y-6">
            {/* Selected Date Info */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden sticky top-6">
                <div className="p-6 border-b border-gray-100 bg-gray-50/30">
                    <h3 className="text-lg font-bold text-gray-900">
                        {selectedDate ? (
                            selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
                        ) : (
                            <span className="text-gray-400">Selecione uma data</span>
                        )}
                    </h3>
                    {selectedDate && (
                        <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wide">
                            Status e Disponibilidade
                        </p>
                    )}
                </div>

                <div className="p-6 space-y-4">
                    {!selectedDate ? (
                        <div className="text-center py-10">
                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <ChevronLeftIcon className="w-6 h-6 text-blue-300 rotate-90 md:rotate-0" />
                            </div>
                            <p className="text-sm text-gray-500">
                                Clique em um dia no calendário para ver os detalhes.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Facilities List */}
                            <div className="space-y-3">
                                <FacilityCard
                                    area="salao_festas"
                                    label="Salão de Festas"
                                    icon={(props: any) => <div {...props}>🎉</div>}
                                    colorClass="bg-purple-100 text-purple-600"
                                    btnColorClass="bg-purple-600 text-white hover:bg-purple-700"
                                    isReserved={dateReservations.some(r => r.area === 'salao_festas')}
                                    isDisabled={isDateDisabled(selectedDate, 'salao') || userHasChurrasco}
                                    onReserve={onReserve}
                                />

                                <FacilityCard
                                    area="churrasco1"
                                    label="Churrasqueira 1"
                                    icon={(props: any) => <div {...props}>🍖</div>}
                                    colorClass="bg-orange-100 text-orange-600"
                                    btnColorClass="bg-orange-600 text-white hover:bg-orange-700"
                                    isReserved={dateReservations.some(r => r.area === 'churrasco1')}
                                    isDisabled={isDateDisabled(selectedDate, 'churrasco') || userHasSalao}
                                    onReserve={onReserve}
                                />

                                <FacilityCard
                                    area="churrasco2"
                                    label="Churrasqueira 2"
                                    icon={(props: any) => <div {...props}>🔥</div>}
                                    colorClass="bg-amber-100 text-amber-600"
                                    btnColorClass="bg-amber-500 text-white hover:bg-amber-600"
                                    isReserved={dateReservations.some(r => r.area === 'churrasco2')}
                                    isDisabled={isDateDisabled(selectedDate, 'churrasco') || userHasSalao}
                                    onReserve={onReserve}
                                />
                            </div>

                            {/* Current Reservations List */}
                            {dateReservations.length > 0 && (
                                <div className="pt-6 border-t border-gray-100">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Reservas Confirmadas</h4>
                                    <div className="space-y-2">
                                        {dateReservations.map(res => (
                                            <div key={res.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-8 rounded-full ${res.area === 'salao_festas' ? 'bg-purple-500' :
                                                        res.area === 'churrasco1' ? 'bg-orange-500' : 'bg-amber-400'
                                                        }`}></div>
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-700">
                                                            Casa {res.houseNumber}
                                                        </p>
                                                        <p className="text-[10px] text-gray-500">
                                                            {res.userName.split(' ')[0]} • {res.area === 'salao_festas' ? 'Salão' : res.area === 'churrasco1' ? 'Churrasq. 1' : 'Churrasq. 2'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {(currentUser?.id === res.userId || [Role.ADMIN, Role.SINDICO, Role.SUBSINDICO].includes(currentUser?.role || Role.MORADOR)) && (
                                                    <button
                                                        onClick={() => onCancel(res)}
                                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                                        title="Cancelar Reserva"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Rules Card */}
            <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
                <h4 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                    <span className="text-lg">ℹ️</span> Regras Importantes
                </h4>
                <ul className="text-xs text-blue-800 space-y-2 leading-relaxed">
                    <li className="flex gap-2">
                        <span className="font-bold">•</span>
                        <span><strong>Churrasqueiras:</strong> Antecedência máx. de 15 dias.</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="font-bold">•</span>
                        <span><strong>Salão de Festas:</strong> Antecedência máx. de 6 meses.</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="font-bold">•</span>
                        <span><strong>Exclusividade:</strong> Não é permitido reservar Salão e Churrasqueira no mesmo dia.</span>
                    </li>
                    {(currentUser?.role === Role.ADMIN || currentUser?.role === Role.SINDICO) && (
                        <li className="flex gap-2 text-red-600 font-bold mt-2 pt-2 border-t border-blue-200">
                            <span>•</span>
                            <span>ADMIN/SÍNDICO: Acesso irrestrito a datas e casas.</span>
                        </li>
                    )}
                </ul>
            </div>
        </div>
    );
};

export default FacilityList;
