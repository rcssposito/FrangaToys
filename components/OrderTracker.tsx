
'use client';

import { clsx } from 'clsx';
import { Check, Clock, Box, Paintbrush, Truck, Zap, Activity, ListChecks, Sparkles } from 'lucide-react';

export interface ChecklistItem {
    id: string;
    label: string;
    done: boolean;
}

interface OrderTrackerProps {
    status: string;
    checklist?: ChecklistItem[];
}

const STAGES = [
    { id: 'Aguardando Pagamento', label: 'Pagamento', icon: Clock },
    { id: 'Fila de Impressão', label: 'Na Fila', icon: Zap },
    { id: 'Imprimindo', label: 'Impressão', icon: Activity },
    { id: 'Lavagem e Cura', label: 'Polimento', icon: Box, hasChecklist: true },
    { id: 'Pintura Secagem', label: 'Pintura', icon: Paintbrush, hasChecklist: true },
    { id: 'Pronto p/ Entrega', label: 'Envio', icon: Truck },
];

const DEFAULT_STEPS = [
    { id: 'suportes', label: 'Suportes removidos', phase: 'Polimento' },
    { id: 'cura', label: 'Cura UV finalizada', phase: 'Polimento' },
    { id: 'primer', label: 'Lixamento & Primer', phase: 'Polimento' },
    { id: 'pintura', label: 'Pintura & Detalhes', phase: 'Pintura' },
    { id: 'verniz', label: 'Verniz & Montagem', phase: 'Pintura' }
];

export function OrderTracker({ status, checklist }: OrderTrackerProps) {
    // Encontrar o índice do status atual
    const currentIdx = STAGES.findIndex(s => s.id === status);
    const isCompleted = status === 'Concluída';
    const isReadyOrDone = status === 'Pronto p/ Entrega' || isCompleted;

    // Se não encontrar (status legado ou erro), assume o primeiro
    const activeIdx = currentIdx === -1 ? (isCompleted ? STAGES.length - 1 : 0) : currentIdx;

    // Normalizar itens do checklist
    const mergedChecklist = DEFAULT_STEPS.map((def) => {
        const found = checklist?.find(c => c.id === def.id);
        return {
            ...def,
            done: isReadyOrDone || (found ? Boolean(found.done) : false)
        };
    });

    const completedCount = mergedChecklist.filter(s => s.done).length;
    const totalSteps = mergedChecklist.length;
    const checklistPercent = Math.round((completedCount / totalSteps) * 100);

    // Progresso dinâmico na barra de conexão:
    // Quando estiver nas fases de produção (Lavagem e Cura ou Pintura Secagem),
    // o avanço de cada etapa de checklist move a barra visualmente
    let stepOffset = 0;
    if (activeIdx === 3) {
        // Fase 3: Lavagem e Cura (passos 0, 1 e 2)
        const polimentoDone = [mergedChecklist[0].done, mergedChecklist[1].done, mergedChecklist[2].done].filter(Boolean).length;
        stepOffset = (polimentoDone / 3) * (1 / (STAGES.length - 1)) * 100 * 0.75;
    } else if (activeIdx === 4) {
        // Fase 4: Pintura Secagem (passos 3 e 4)
        const pinturaDone = [mergedChecklist[3].done, mergedChecklist[4].done].filter(Boolean).length;
        stepOffset = (pinturaDone / 2) * (1 / (STAGES.length - 1)) * 100 * 0.75;
    }

    const calculatedProgressWidth = isCompleted 
        ? 100 
        : Math.min(100, Math.max(0, (activeIdx / (STAGES.length - 1)) * 100 + stepOffset));

    // Determina se devemos exibir o bloco detalhado de etapas do ateliê
    const showChecklistSection = activeIdx >= 2 || completedCount > 0 || (checklist && checklist.length > 0);

    return (
        <div className="w-full py-6">
            {/* Macro Timeline */}
            <div className="relative flex justify-between items-start">
                {/* Linha de Conexão (Fundo) */}
                <div className="absolute top-5 left-0 w-full h-0.5 bg-zinc-800 -z-0" />

                {/* Linha de Conexão (Progresso Ativo com Gradiente) */}
                <div
                    className="absolute top-5 left-0 h-0.5 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 transition-all duration-700 shadow-[0_0_12px_rgba(249,115,22,0.6)] -z-0"
                    style={{ width: `${calculatedProgressWidth}%` }}
                />

                {STAGES.map((stage, idx) => {
                    const isPassed = idx < activeIdx || isCompleted;
                    const isActive = idx === activeIdx && !isCompleted;
                    const Icon = stage.icon;

                    // Badges de sub-etapas para Polimento e Pintura
                    let stageSubInfo = null;
                    if (stage.id === 'Lavagem e Cura') {
                        const count = [mergedChecklist[0].done, mergedChecklist[1].done, mergedChecklist[2].done].filter(Boolean).length;
                        stageSubInfo = `${count}/3 etapas`;
                    } else if (stage.id === 'Pintura Secagem') {
                        const count = [mergedChecklist[3].done, mergedChecklist[4].done].filter(Boolean).length;
                        stageSubInfo = `${count}/2 etapas`;
                    }

                    return (
                        <div key={stage.id} className="relative z-10 flex flex-col items-center gap-2.5">
                            {/* Círculo do Stage */}
                            <div className={clsx(
                                "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border-2 relative",
                                isPassed ? "bg-orange-500 border-orange-500 text-black shadow-[0_0_18px_rgba(249,115,22,0.55)] scale-100" :
                                    isActive ? "bg-black border-orange-500 text-orange-500 animate-pulse shadow-[0_0_22px_rgba(249,115,22,0.45)] scale-105" :
                                        "bg-zinc-950 border-zinc-800 text-zinc-600"
                            )}>
                                {isPassed ? <Check size={20} strokeWidth={3} /> : <Icon size={18} />}

                                {/* Micro indicador se tiver checklist associado e estiver ativo */}
                                {stage.hasChecklist && (isActive || isPassed) && (
                                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-black flex items-center justify-center text-[8px] text-black font-black">
                                        ✓
                                    </span>
                                )}
                            </div>

                            {/* Label */}
                            <div className="flex flex-col items-center">
                                <span className={clsx(
                                    "text-[9px] font-black uppercase tracking-widest text-center",
                                    isPassed || isActive ? "text-white" : "text-zinc-700"
                                )}>
                                    {stage.label}
                                </span>
                                
                                {isActive ? (
                                    <span className="text-[7.5px] font-black text-orange-500 uppercase animate-bounce mt-1 tracking-tighter">
                                        Fase Atual
                                    </span>
                                ) : (stageSubInfo && (isPassed || activeIdx >= idx)) ? (
                                    <span className="text-[7.5px] font-bold text-zinc-500 uppercase mt-0.5 tracking-tight">
                                        {stageSubInfo}
                                    </span>
                                ) : null}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Sub-etapas de Produção no Ateliê (Checklist) */}
            {showChecklistSection && (
                <div className="mt-8 pt-6 border-t border-zinc-800/80 bg-zinc-950/40 rounded-2xl p-4 sm:p-5 border border-zinc-850/60">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                                <ListChecks size={16} />
                            </div>
                            <div>
                                <span className="text-xs font-black uppercase tracking-wider text-zinc-200 flex items-center gap-1.5">
                                    Etapas Artesanais no Ateliê
                                </span>
                                <p className="text-[10px] text-zinc-500 font-medium">
                                    Acompanhamento fino do processo manual em nossa oficina
                                </p>
                            </div>
                        </div>

                        {/* Barra de progresso do checklist */}
                        <div className="flex items-center gap-2.5 self-start sm:self-auto bg-zinc-900/80 px-3 py-1.5 rounded-xl border border-zinc-800">
                            <div className="w-20 sm:w-28 h-2 bg-zinc-800 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-orange-500 to-emerald-500 transition-all duration-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                                    style={{ width: `${checklistPercent}%` }}
                                />
                            </div>
                            <span className="text-[11px] font-bold text-zinc-300 font-mono">
                                {completedCount}/{totalSteps} ({checklistPercent}%)
                            </span>
                        </div>
                    </div>

                    {/* Stepper dos 5 itens de check */}
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                        {mergedChecklist.map((step, idx) => {
                            // Encontrar o primeiro que não está pronto como 'atual' caso esteja em produção
                            const isFirstPending = !step.done && (idx === 0 || mergedChecklist[idx - 1].done);
                            const isCurrent = (activeIdx >= 2 && !isReadyOrDone && isFirstPending);

                            return (
                                <div 
                                    key={step.id}
                                    className={clsx(
                                        "flex sm:flex-col items-center sm:items-start gap-2.5 p-3 rounded-xl border transition-all",
                                        step.done 
                                            ? "bg-emerald-500/5 border-emerald-500/25 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.06)]"
                                            : isCurrent
                                                ? "bg-orange-500/10 border-orange-500/40 text-orange-200 shadow-[0_0_20px_rgba(249,115,22,0.12)] ring-1 ring-orange-500/30"
                                                : "bg-zinc-900/40 border-zinc-850/80 text-zinc-600"
                                    )}
                                >
                                    <div className="flex items-center gap-2 sm:w-full justify-between">
                                        <div className={clsx(
                                            "w-6 h-6 rounded-full flex items-center justify-center text-[10.5px] font-bold shrink-0 transition-all",
                                            step.done 
                                                ? "bg-emerald-500 text-black font-black shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                                : isCurrent
                                                    ? "bg-orange-500 text-black font-black animate-pulse shadow-[0_0_12px_rgba(249,115,22,0.6)]"
                                                    : "bg-zinc-800 text-zinc-500"
                                        )}>
                                            {step.done ? <Check size={13} strokeWidth={3.5} /> : idx + 1}
                                        </div>

                                        <span className={clsx(
                                            "text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border",
                                            step.done 
                                                ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                                                : isCurrent
                                                    ? "text-orange-400 bg-orange-500/20 border-orange-500/30 animate-pulse"
                                                    : "text-zinc-600 bg-zinc-900 border-zinc-800"
                                        )}>
                                            {step.done ? 'Concluído' : isCurrent ? 'Em oficina' : step.phase}
                                        </span>
                                    </div>

                                    <div className="flex flex-col min-w-0">
                                        <span className={clsx(
                                            "text-[11.5px] font-bold leading-tight",
                                            step.done ? "text-zinc-200" : isCurrent ? "text-white font-black" : "text-zinc-500"
                                        )}>
                                            {step.label}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {isCompleted && (
                <div className="mt-8 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                    <p className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center justify-center gap-2">
                        <Sparkles size={15} /> Pedido Concluído e Entregue
                    </p>
                </div>
            )}
        </div>
    );
}
