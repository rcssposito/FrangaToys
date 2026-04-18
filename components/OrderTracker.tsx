
'use client';

import { clsx } from 'clsx';
import { Check, Clock, Box, Paintbrush, Truck, Zap, Activity } from 'lucide-react';

interface OrderTrackerProps {
    status: string;
}

const STAGES = [
    { id: 'Aguardando Pagamento', label: 'Pagamento', icon: Clock },
    { id: 'Fila de Impressão', label: 'Na Fila', icon: Zap },
    { id: 'Imprimindo', label: 'Impressão', icon: Activity },
    { id: 'Lavagem e Cura', label: 'Cura', icon: Box },
    { id: 'Pintura Secagem', label: 'Pintura', icon: Paintbrush },
    { id: 'Pronto p/ Entrega', label: 'Envio', icon: Truck },
];

export function OrderTracker({ status }: OrderTrackerProps) {
    // Encontrar o índice do status atual
    const currentIdx = STAGES.findIndex(s => s.id === status);
    const isCompleted = status === 'Concluída';

    // Se não encontrar (status legado ou erro), assume o primeiro
    const activeIdx = currentIdx === -1 ? (isCompleted ? STAGES.length - 1 : 0) : currentIdx;

    return (
        <div className="w-full py-8">
            <div className="relative flex justify-between items-start">
                {/* Linha de Conexão (Fundo) */}
                <div className="absolute top-5 left-0 w-full h-0.5 bg-zinc-800 -z-0" />

                {/* Linha de Conexão (Progresso Ativo) */}
                <div
                    className="absolute top-5 left-0 h-0.5 bg-orange-500 transition-all duration-700 -z-0"
                    style={{ width: `${(activeIdx / (STAGES.length - 1)) * 100}%` }}
                />

                {STAGES.map((stage, idx) => {
                    const isPassed = idx < activeIdx || isCompleted;
                    const isActive = idx === activeIdx && !isCompleted;
                    const Icon = stage.icon;

                    return (
                        <div key={stage.id} className="relative z-10 flex flex-col items-center gap-3">
                            {/* Círculo do Stage */}
                            <div className={clsx(
                                "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border-2",
                                isPassed ? "bg-orange-500 border-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.5)]" :
                                    isActive ? "bg-black border-orange-500 text-orange-500 animate-pulse shadow-[0_0_20px_rgba(249,115,22,0.3)]" :
                                        "bg-zinc-950 border-zinc-800 text-zinc-600"
                            )}>
                                {isPassed ? <Check size={20} strokeWidth={3} /> : <Icon size={18} />}
                            </div>

                            {/* Label */}
                            <div className="flex flex-col items-center">
                                <span className={clsx(
                                    "text-[9px] font-black uppercase tracking-widest text-center",
                                    isPassed || isActive ? "text-white" : "text-zinc-700"
                                )}>
                                    {stage.label}
                                </span>
                                {isActive && (
                                    <span className="text-[7px] font-black text-orange-500 uppercase animate-bounce mt-1 tracking-tighter">
                                        Fase Atual
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {isCompleted && (
                <div className="mt-8 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                    <p className="text-xs font-black text-emerald-500 uppercase tracking-widest flex items-center justify-center gap-2">
                        <Check size={14} /> Pedido Concluído e Entregue
                    </p>
                </div>
            )}
        </div>
    );
}
