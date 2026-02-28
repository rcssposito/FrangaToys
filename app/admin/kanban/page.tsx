'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2, KanbanSquare, Package, Clock, Paintbrush, CheckCircle2, Factory, Layers, Truck, FileText } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePermission } from '@/hooks/usePermission';

interface Sale {
    id: number;
    data_venda: string;
    cliente_nome: string;
    status: string;
    quantidade: number;
    pintura_freelancer?: boolean;
    observacao?: string;
    vendedor?: string;
    vendedor_nome?: string;
    figuras: {
        nome: string;
        imagem_url: string;
        studios: { nome: string } | { nome: string }[];
    };
}

const COLUMNS = [
    { id: 'Fila de Impressão', title: 'Fila de Impressão', icon: Layers, color: 'border-[var(--card-border)] bg-[var(--card-bg)]/50', text: 'text-[var(--text-muted)]' },
    { id: 'Imprimindo', title: 'Imprimindo', icon: Factory, color: 'border-orange-500/30 bg-orange-500/10', text: 'text-orange-500' },
    { id: 'Lavagem e Cura', title: 'Cura e Limpeza', icon: Clock, color: 'border-blue-500/30 bg-blue-500/10', text: 'text-blue-500' },
    { id: 'Pintura Secagem', title: 'Pintura', icon: Paintbrush, color: 'border-fuchsia-500/30 bg-fuchsia-500/10', text: 'text-fuchsia-500' },
    { id: 'Pronto p/ Entrega', title: 'Pronto p/ Entrega', icon: CheckCircle2, color: 'border-emerald-500/30 bg-emerald-500/10', text: 'text-[var(--accent-emerald)]' }
];

export default function KanbanPage() {
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const { hasRole } = usePermission();

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            const res = await fetch('/api/admin/kanban');
            const data = await res.json();
            if (res.ok) setSales(data);
        } catch (err) {
            toast.error('Erro ao carregar fila de produção');
        } finally {
            setLoading(false);
        }
    };

    const handleDragStart = (e: React.DragEvent, saleId: number) => {
        e.dataTransfer.setData('saleId', saleId.toString());
        setTimeout(() => {
            (e.target as HTMLElement).classList.add('opacity-40', 'scale-95', 'rotate-2');
        }, 0);
    };

    const handleDragEnd = (e: React.DragEvent) => {
        (e.target as HTMLElement).classList.remove('opacity-40', 'scale-95', 'rotate-2');
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.currentTarget.classList.add('bg-orange-500/5', 'border-orange-500/20');
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.currentTarget.classList.remove('bg-orange-500/5', 'border-orange-500/20');
    };

    const handleDrop = async (e: React.DragEvent, toStatus: string) => {
        e.preventDefault();
        e.currentTarget.classList.remove('bg-orange-500/5', 'border-orange-500/20');
        const saleId = e.dataTransfer.getData('saleId');
        if (!saleId) return;

        const previousSales = [...sales];
        setSales(prev => prev.map(s => s.id.toString() === saleId ? { ...s, status: toStatus } : s));

        try {
            const res = await fetch('/api/admin/kanban', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: Number(saleId), status: toStatus })
            });
            if (!res.ok) throw new Error('Failed');
        } catch (err) {
            toast.error('Erro ao atualizar status logístico');
            setSales(previousSales);
        }
    };

    const markAsCompleted = async (saleId: number) => {
        if (!confirm('Deseja dar saída nesta venda? Ela sairá do Kanban permanentemente.')) return;

        try {
            const res = await fetch('/api/admin/kanban', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: saleId, status: 'Concluída' })
            });
            if (res.ok) {
                toast.success('Pedido Concluído e Entregue!');
                setSales(prev => prev.filter(s => s.id !== saleId));
            } else {
                throw new Error();
            }
        } catch (err) {
            toast.error('Erro ao concluir pedido.');
        }
    };

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-4 md:p-8 flex flex-col transition-colors duration-300">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3.5 bg-orange-500/10 text-orange-500 rounded-2xl shadow-sm border border-orange-500/20">
                    <KanbanSquare size={32} />
                </div>
                <div>
                    <h1 className="text-3xl font-black tracking-tight">Kanban de Produção</h1>
                    <p className="text-[var(--text-muted)] text-sm font-medium mt-1">Arraste os cards para atualizar o status de impressão e acabamento.</p>
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center p-12">
                    <Loader2 className="animate-spin text-orange-500 w-8 h-8" />
                </div>
            ) : (
                <div className="flex-1 flex gap-5 overflow-x-auto pb-6 custom-scrollbar pr-4">
                    {COLUMNS.map((col) => {
                        const columnTasks = sales.filter(s => s.status === col.id || (!s.status && col.id === 'Fila de Impressão'));

                        return (
                            <div
                                key={col.id}
                                className={`flex-shrink-0 w-[320px] flex flex-col rounded-2xl border ${col.color} transition-all duration-300 shadow-sm`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, col.id)}
                            >
                                <div className="p-5 border-b border-inherit bg-white/5 backdrop-blur-sm flex items-center justify-between">
                                    <div className={`flex items-center gap-3 font-black uppercase text-[11px] tracking-widest ${col.text}`}>
                                        <col.icon size={20} className="opacity-80" />
                                        <span>{col.title}</span>
                                    </div>
                                    <span className="bg-[var(--card-bg)] px-2.5 py-1 rounded-full text-[11px] font-black text-[var(--text-muted)] border border-[var(--card-border)] shadow-sm">
                                        {columnTasks.length}
                                    </span>
                                </div>

                                <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-280px)] custom-scrollbar">
                                    {columnTasks.length === 0 && (
                                        <div className="text-center p-8 border-2 border-dashed border-[var(--card-border)] rounded-2xl text-[var(--text-muted)]/40 text-sm font-black uppercase tracking-widest">
                                            Vazio
                                        </div>
                                    )}

                                    {columnTasks.map(task => (
                                        <div
                                            key={task.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, task.id)}
                                            onDragEnd={handleDragEnd}
                                            className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 cursor-grab active:cursor-grabbing hover:border-orange-500/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 group relative shadow-sm"
                                        >
                                            <div className="flex gap-4">
                                                <div className="w-14 h-14 rounded-lg bg-[var(--input-bg)] border border-[var(--card-border)] flex-shrink-0 overflow-hidden relative shadow-inner">
                                                    {task.figuras?.imagem_url ? (
                                                        <img
                                                            src={task.figuras.imagem_url}
                                                            alt={task.figuras.nome || 'Figura'}
                                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]/30">
                                                            <Package size={20} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[15px] font-black text-[var(--foreground)] truncate leading-tight tracking-tight mb-1" title={task.figuras?.nome}>
                                                        {task.figuras?.nome || 'Item Desconhecido'}
                                                    </div>
                                                    <div className="text-xs text-[var(--text-muted)] truncate font-medium">
                                                        Cliente: <span className="text-[var(--foreground)] font-bold">{task.cliente_nome}</span>
                                                    </div>
                                                    <div className="text-[10px] text-[var(--text-muted)]/70 mt-1.5 uppercase font-black tracking-wider">
                                                        Vendedor: <span className="text-orange-500/70">{task.vendedor_nome || task.vendedor?.split('@')[0] || 'Franguinha'}</span>
                                                    </div>
                                                </div>
                                                <Link
                                                    href={`/api/admin/kanban/os/${task.id}`}
                                                    target="_blank"
                                                    title="Imprimir Ordem de Serviço (OS)"
                                                    className="p-2 h-fit bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-orange-500 border border-[var(--card-border)] hover:border-orange-500/30 rounded-lg transition-all shadow-sm"
                                                >
                                                    <FileText size={18} />
                                                </Link>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-[var(--card-border)]/50">
                                                <span className="text-[10px] font-black px-2.5 py-1 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-md text-[var(--foreground)] shadow-sm">
                                                    QTD: {task.quantidade}x
                                                </span>
                                                {task.pintura_freelancer && (
                                                    <span className="flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-md text-fuchsia-500 shadow-sm" title="Exige pintura terceirizada">
                                                        <Paintbrush size={10} /> TERCEIRIZADO
                                                    </span>
                                                )}
                                                {task.observacao && (
                                                    <div className="w-full text-xs text-orange-500 italic line-clamp-2 mt-2 px-3 py-2 bg-orange-500/5 border-l-4 border-orange-500/40 rounded-r-md font-medium">
                                                        "{task.observacao}"
                                                    </div>
                                                )}
                                            </div>

                                            {col.id === 'Pronto p/ Entrega' && (
                                                <button
                                                    onClick={() => markAsCompleted(task.id)}
                                                    className="w-full mt-4 bg-[var(--accent-emerald)] hover:bg-emerald-600 text-white text-xs font-black py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                                                >
                                                    <Truck size={16} /> FINALIZAR ENTREGA
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
}
