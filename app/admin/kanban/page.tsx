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
    figuras: {
        nome: string;
        imagem_url: string;
        studios: { nome: string } | { nome: string }[];
    };
}

const COLUMNS = [
    { id: 'Fila de Impressão', title: 'Fila de Impressão', icon: Layers, color: 'border-zinc-700 bg-zinc-900', text: 'text-zinc-400' },
    { id: 'Imprimindo', title: 'Imprimindo', icon: Factory, color: 'border-orange-500/30 bg-orange-500/5', text: 'text-orange-400' },
    { id: 'Lavagem e Cura', title: 'Cura e Limpeza', icon: Clock, color: 'border-blue-500/30 bg-blue-500/5', text: 'text-blue-400' },
    { id: 'Pintura Secagem', title: 'Pintura', icon: Paintbrush, color: 'border-fuchsia-500/30 bg-fuchsia-500/5', text: 'text-fuchsia-400' },
    { id: 'Pronto p/ Entrega', title: 'Pronto p/ Entrega', icon: CheckCircle2, color: 'border-emerald-500/30 bg-emerald-500/5', text: 'text-emerald-400' }
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
        // Optional: styling while dragging
        setTimeout(() => {
            (e.target as HTMLElement).classList.add('opacity-50', 'scale-95');
        }, 0);
    };

    const handleDragEnd = (e: React.DragEvent) => {
        (e.target as HTMLElement).classList.remove('opacity-50', 'scale-95');
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Necessary for drop to work
        e.currentTarget.classList.add('bg-zinc-800/50');
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.currentTarget.classList.remove('bg-zinc-800/50');
    };

    const handleDrop = async (e: React.DragEvent, toStatus: string) => {
        e.preventDefault();
        e.currentTarget.classList.remove('bg-zinc-800/50');
        const saleId = e.dataTransfer.getData('saleId');
        if (!saleId) return;

        // Optimistic Update
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
            setSales(previousSales); // Revert
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
        <div className="min-h-screen bg-black text-white p-4 md:p-8 flex flex-col">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl">
                    <KanbanSquare size={28} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Kanban de Produção</h1>
                    <p className="text-zinc-400 text-sm mt-1">Arraste os cards para atualizar o status de impressão e acabamento das vendas abertas.</p>
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center p-12">
                    <Loader2 className="animate-spin text-orange-500 w-8 h-8" />
                </div>
            ) : (
                <div className="flex-1 flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                    {COLUMNS.map((col) => {
                        const columnTasks = sales.filter(s => s.status === col.id || (!s.status && col.id === 'Fila de Impressão'));

                        return (
                            <div
                                key={col.id}
                                className={`flex-shrink-0 w-[300px] flex flex-col rounded-xl border ${col.color} transition-colors duration-200`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, col.id)}
                            >
                                <div className="p-4 border-b border-inherit bg-black/20 flex items-center justify-between">
                                    <div className={`flex items-center gap-2 font-bold ${col.text}`}>
                                        <col.icon size={18} />
                                        <span>{col.title}</span>
                                    </div>
                                    <span className="bg-zinc-950 px-2 py-0.5 rounded text-xs font-mono font-bold text-zinc-400 border border-zinc-800">
                                        {columnTasks.length}
                                    </span>
                                </div>

                                <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                                    {columnTasks.length === 0 && (
                                        <div className="text-center p-4 border border-dashed border-zinc-800 rounded-lg text-zinc-500 text-sm font-medium">
                                            Vazio
                                        </div>
                                    )}

                                    {columnTasks.map(task => (
                                        <div
                                            key={task.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, task.id)}
                                            onDragEnd={handleDragEnd}
                                            className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-zinc-700 hover:shadow-lg transition-all"
                                        >
                                            <div className="flex gap-3 mb-2">
                                                <div className="w-12 h-12 rounded bg-zinc-900 border border-zinc-800 flex-shrink-0 overflow-hidden relative">
                                                    {task.figuras?.imagem_url ? (
                                                        <img
                                                            src={task.figuras.imagem_url}
                                                            alt={task.figuras.nome || 'Figura'}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-zinc-700">
                                                            <Package size={16} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-bold text-zinc-200 truncate" title={task.figuras?.nome}>
                                                        {task.figuras?.nome || 'Item Desconhecido'}
                                                    </div>
                                                    <div className="text-xs text-zinc-500 truncate" title={task.cliente_nome}>
                                                        Cliente: <span className="text-zinc-300 font-medium">{task.cliente_nome}</span>
                                                    </div>
                                                </div>
                                                <Link
                                                    href={`/api/admin/kanban/os/${task.id}`}
                                                    target="_blank"
                                                    title="Imprimir Ordem de Serviço (OS)"
                                                    className="p-1.5 hover:bg-zinc-800 text-zinc-500 hover:text-orange-500 rounded transition-colors"
                                                >
                                                    <FileText size={18} />
                                                </Link>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-zinc-800/50">
                                                <span className="text-[10px] font-bold px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-zinc-400">
                                                    Qtd: {task.quantidade}x
                                                </span>
                                                {task.pintura_freelancer && (
                                                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded text-fuchsia-400" title="Exige pintura terceirizada">
                                                        <Paintbrush size={10} /> Ext.
                                                    </span>
                                                )}
                                                {task.observacao && (
                                                    <div className="w-full text-xs text-orange-400 italic line-clamp-2 mt-1 px-2 border-l-2 border-orange-500/30">
                                                        "{task.observacao}"
                                                    </div>
                                                )}
                                            </div>

                                            {col.id === 'Pronto p/ Entrega' && (
                                                <button
                                                    onClick={() => markAsCompleted(task.id)}
                                                    className="w-full mt-3 bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold py-2 rounded flex items-center justify-center gap-2 transition-colors"
                                                >
                                                    <Truck size={14} /> Finalizar Entrega
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
