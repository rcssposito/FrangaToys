'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2, KanbanSquare, Package, Clock, Paintbrush, CheckCircle2, Factory, Layers, Truck, FileText, DollarSign, ExternalLink, MessageCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePermission } from '@/hooks/usePermission';

interface Sale {
    id: number;
    data_venda: string;
    cliente_nome: string;
    cliente_contato: string;
    status: string;
    quantidade: number;
    pintura_freelancer?: boolean;
    observacao?: string;
    vendedor?: string;
    vendedor_nome?: string;
    access_token?: string;
    figuras: {
        nome: string;
        imagem_url: string;
        studios: { nome: string } | { nome: string }[];
    };
    metodo_entrega?: string;
    valor_venda_final?: number;
    status_pagamento?: string;
    valor_pago_parcial?: number;
}

const COLUMNS = [
    { id: 'Aguardando Pagamento', title: 'Pagamento', icon: DollarSign, color: 'border-yellow-500/40 bg-zinc-950/80', text: 'text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]' },
    { id: 'Fila de Impressão', title: 'Fila de Impressão', icon: Layers, color: 'border-zinc-800 bg-zinc-950/80', text: 'text-zinc-400' },
    { id: 'Imprimindo', title: 'Imprimindo', icon: Factory, color: 'border-orange-500/40 bg-zinc-950/80', text: 'text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]' },
    { id: 'Lavagem e Cura', title: 'Cura e Limpeza', icon: Clock, color: 'border-blue-500/40 bg-zinc-950/80', text: 'text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' },
    { id: 'Pintura Secagem', title: 'Pintura', icon: Paintbrush, color: 'border-purple-500/40 bg-zinc-950/80', text: 'text-purple-500 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]' },
    { id: 'Pronto p/ Entrega', title: 'Pronto p/ Entrega', icon: CheckCircle2, color: 'border-emerald-500/40 bg-zinc-950/80', text: 'text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]' }
];

export default function KanbanPage() {
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const { hasRole } = usePermission();
    
    // States for inline partial payment editing
    const [editingSaleId, setEditingSaleId] = useState<number | null>(null);
    const [inputValorParcial, setInputValorParcial] = useState<string>('');

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            const res = await fetch('/api/admin/kanban');
            const data = await res.json();
            if (res.ok) {
                // Ordenar por data (mais antigos primeiro para produção)
                // Usando fallback para evitar NaN caso a data seja inválida
                // Adicionando desempate por ID para vendas do mesmo dia (já que a hora está zerada no banco)
                const sorted = [...data].sort((a, b) => {
                    const dateA = a.data_venda ? new Date(a.data_venda).getTime() : 0;
                    const dateB = b.data_venda ? new Date(b.data_venda).getTime() : 0;
                    
                    if (dateA !== dateB) {
                        return dateA - dateB; // Mais antigos primeiro
                    }
                    
                    // Se a data for exatamente igual (ex: 2026-05-08 00:00:00), desempata pelo ID (ID menor = mais antigo)
                    return (a.id || 0) - (b.id || 0);
                });
                setSales(sorted);
            }
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
        const prevTask = previousSales.find(s => s.id.toString() === saleId);
        if (prevTask?.status === toStatus) return; // Não faz nada se soltou na mesma coluna

        setSales(prev => prev.map(s => s.id.toString() === saleId ? { ...s, status: toStatus } : s));

        try {
            const res = await fetch('/api/admin/kanban', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: Number(saleId), status: toStatus })
            });
            if (!res.ok) throw new Error('Failed');

            // Find the task to get customer details
            const task = prevTask || previousSales.find(s => s.id.toString() === saleId);
            if (task && prevTask?.status !== toStatus && toStatus !== 'Aguardando Pagamento') {
                const clientWhatsApp = (task.cliente_contato || '').replace(/\D/g, '');
                
                if (clientWhatsApp && clientWhatsApp.length >= 10) {
                    let msg = '';
                    if (toStatus === 'Fila de Impressão') msg = `Olá, ${task.cliente_nome.trim()}! Seu ${task.figuras.nome} acabou de entrar na nossa fila de impressão! 🚀`;
                    else if (toStatus === 'Imprimindo') msg = `Olá, ${task.cliente_nome.trim()}! Nossas máquinas já começaram a imprimir o seu ${task.figuras.nome}! 🏭`;
                    else if (toStatus === 'Lavagem e Cura') msg = `A impressão concluiu, ${task.cliente_nome.trim()}! Seu ${task.figuras.nome} agora está no pós processamento. 💧`;
                    else if (toStatus === 'Pintura Secagem') msg = `Saindo do forno! Seu ${task.figuras.nome} agora está na fase de pintura e acabamento. 🎨`;
                    
                    if (msg) {
                        toast.success(`Movido para ${toStatus}`, {
                            action: {
                                label: 'Avisar Cliente no WhatsApp',
                                onClick: () => {
                                    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                                    const baseUrl = isMobile ? 'https://api.whatsapp.com/send' : 'https://web.whatsapp.com/send';
                                    const waLink = `${baseUrl}?phone=55${clientWhatsApp}&text=${encodeURIComponent(msg)}`;
                                    window.open(waLink, '_blank');
                                }
                            },
                            duration: 8000 // Mantém na tela por 8 segundos
                        });
                    } else {
                        toast.success(`Status atualizado para ${toStatus}`);
                    }
                } else {
                    toast.success(`Status atualizado para ${toStatus}`);
                }
            }
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

    const togglePaymentStatus = async (saleId: number, currentStatus: string | undefined) => {
        const newStatus = currentStatus === 'Pago' ? 'Pendente/Incompleto' : 'Pago';
        
        // Optimistic update
        setSales(prev => prev.map(s => s.id === saleId ? { ...s, status_pagamento: newStatus, valor_pago_parcial: newStatus === 'Pago' ? s.valor_venda_final : 0 } : s));

        try {
            const res = await fetch('/api/admin/kanban', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: saleId, status_pagamento: newStatus })
            });
            if (!res.ok) throw new Error();
            toast.success(`Pagamento atualizado para ${newStatus === 'Pago' ? 'Pago' : 'Pendente'}`);
        } catch (err) {
            toast.error('Erro ao atualizar status de pagamento');
            // Revert state on error
            setSales(prev => prev.map(s => s.id === saleId ? { ...s, status_pagamento: currentStatus } : s));
        }
    };

    const savePartialPayment = async (saleId: number, originalValue: number | undefined) => {
        const val = inputValorParcial.trim() === '' ? 0 : Number(inputValorParcial.replace(',', '.'));
        if (isNaN(val) || val < 0) {
            toast.error('Informe um valor numérico válido.');
            return;
        }

        const total = originalValue || 0;
        let newStatus = 'Pendente/Incompleto';
        if (val >= total) {
            newStatus = 'Pago';
        } else if (val > 0) {
            newStatus = 'Parcial';
        }

        // Optimistic update
        setSales(prev => prev.map(s => s.id === saleId ? { ...s, valor_pago_parcial: val, status_pagamento: newStatus } : s));
        setEditingSaleId(null);

        try {
            const res = await fetch('/api/admin/kanban', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: saleId, valor_pago_parcial: val })
            });
            if (!res.ok) throw new Error();
            toast.success('Valor de pagamento atualizado!');
        } catch (err) {
            toast.error('Erro ao atualizar pagamento parcial');
            fetchTasks();
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-4 md:p-8 flex flex-col transition-colors duration-300 relative overflow-hidden">
            {/* Background UV/Water Blobs for Scifi Theme */}
            <div className="absolute inset-0 pointer-events-none opacity-20 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[150px] mix-blend-screen" />
                <div className="absolute top-[40%] right-[-10%] w-[30%] h-[30%] bg-indigo-500 rounded-full blur-[150px] mix-blend-screen" />
            </div>

            <div className="relative z-10 flex items-center gap-4 mb-8">
                <div className="p-3.5 bg-zinc-900 border border-zinc-800 text-blue-500 rounded-2xl shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                    <KanbanSquare size={32} />
                </div>
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-zinc-100 flex items-center gap-3">
                        Linha de Produção
                        <span className="text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full">Ativa</span>
                    </h1>
                    <p className="text-zinc-500 text-sm font-medium mt-1">Gerencie a logística de impressão, pós-cura e finalização dos modelos no laboratório.</p>
                </div>
            </div>

            {loading ? (
                <div className="relative z-10 flex-1 flex items-center justify-center p-12">
                    <Loader2 className="animate-spin text-blue-500 w-12 h-12 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                </div>
            ) : (
                <div className="relative z-10 flex-1 flex gap-5 overflow-x-auto pb-6 custom-scrollbar pr-4">
                    {COLUMNS.map((col) => {
                        const columnTasks = sales.filter(s => s.status === col.id || (!s.status && col.id === 'Aguardando Pagamento'));

                        return (
                            <div
                                key={col.id}
                                className={`flex-shrink-0 w-[280px] lg:w-[310px] xl:w-[340px] flex flex-col rounded-3xl border backdrop-blur-2xl ${col.color} transition-all duration-300 shadow-xl overflow-hidden`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, col.id)}
                            >
                                <div className="p-4 border-b border-zinc-800/50 bg-zinc-950/50 flex flex-col gap-2 relative">
                                    <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent"></div>
                                    <div className="flex items-center justify-between">
                                        <div className={`flex items-center gap-3 font-black uppercase text-[11px] tracking-widest ${col.text}`}>
                                            <col.icon size={20} />
                                            <span>{col.title}</span>
                                        </div>
                                        <span className="bg-zinc-900 px-3 py-1 rounded-full text-xs font-black text-zinc-400 border border-zinc-800 shadow-inner">
                                            {columnTasks.length}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between mt-1 px-1">
                                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Total Fila:</span>
                                        <span className="text-[11px] font-black text-emerald-400">
                                            R$ {columnTasks.reduce((sum, t) => sum + (Number(t.valor_venda_final) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[calc(100vh-280px)] custom-scrollbar">
                                    {columnTasks.length === 0 && (
                                        <div className="text-center p-8 border-2 border-dashed border-zinc-800 rounded-2xl text-zinc-600 text-sm font-black uppercase tracking-widest">
                                            Vazio
                                        </div>
                                    )}

                                    {columnTasks.map(task => (
                                        <div
                                            key={task.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, task.id)}
                                            onDragEnd={handleDragEnd}
                                            className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/60 rounded-2xl p-2.5 sm:p-3 cursor-grab active:cursor-grabbing hover:border-blue-500/50 hover:bg-zinc-900/80 hover:shadow-[0_0_25px_rgba(59,130,246,0.15)] hover:-translate-y-1 transition-all duration-300 group relative shadow-lg"
                                        >
                                            <div className="flex gap-3">
                                                <div className="w-16 h-16 rounded-xl bg-zinc-950 border border-zinc-800 flex-shrink-0 overflow-hidden relative shadow-inner">
                                                    {task.figuras?.imagem_url ? (
                                                        <img
                                                            src={task.figuras.imagem_url}
                                                            alt={task.figuras.nome || 'Figura'}
                                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-zinc-700">
                                                            <Package size={24} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                    <div className="text-[15px] font-black text-zinc-100 truncate leading-tight tracking-tight mb-1 group-hover:text-blue-400 transition-colors" title={task.figuras?.nome}>
                                                        {task.figuras?.nome || 'Item Desconhecido'}
                                                    </div>
                                                    <div className="text-xs text-zinc-500 truncate font-medium">
                                                        Cliente: <span className="text-zinc-300 font-bold">{task.cliente_nome}</span>
                                                    </div>
                                                    <div className="text-[10px] text-zinc-600 mt-1.5 uppercase font-black tracking-wider">
                                                        Vendedor: <span className="text-blue-500/80">{task.vendedor_nome || task.vendedor?.split('@')[0] || 'Franguinha'}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-2 justify-center">
                                                    <Link
                                                        href={`/os/${task.id}`}
                                                        target="_blank"
                                                        title="Imprimir Ordem de Serviço (OS)"
                                                        className="p-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white border border-blue-500/20 rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center"
                                                    >
                                                        <FileText size={16} />
                                                    </Link>
                                                    <Link
                                                        href={`/certificado/${task.access_token || task.id}`}
                                                        target="_blank"
                                                        title="Imprimir Certificado de Autenticidade"
                                                        className="p-2 bg-zinc-900 text-zinc-500 hover:text-emerald-400 border border-zinc-800 hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center"
                                                    >
                                                        <CheckCircle2 size={16} />
                                                    </Link>
                                                    <button
                                                        onClick={() => {
                                                            const trackingIdentifier = task.access_token || (task.cliente_contato || '').replace(/\D/g, '');
                                                            if (!trackingIdentifier) {
                                                                toast.error('Cliente sem contato ou token cadastrado');
                                                                return;
                                                            }
                                                            const urlBase = window.location.origin;
                                                            const link = `${urlBase}/rastreio/${trackingIdentifier}`;
                                                            navigator.clipboard.writeText(link);
                                                            toast.success('Link de rastreio copiado!');
                                                        }}
                                                        title="Copiar Link de Rastreio para o Cliente"
                                                        className="p-2 bg-zinc-900 text-zinc-500 hover:text-orange-500 border border-zinc-800 hover:border-orange-500/50 hover:bg-orange-500/10 hover:shadow-[0_0_15px_rgba(249,115,22,0.2)] rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center"
                                                    >
                                                        <ExternalLink size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const cleanPhone = (task.cliente_contato || '').replace(/\D/g, '');
                                                            const trackingIdentifier = task.access_token || cleanPhone;
                                                            if (!cleanPhone) {
                                                                toast.error('Cliente sem telefone cadastrado');
                                                                return;
                                                            }
                                                            const urlBase = window.location.origin;
                                                            const link = `${urlBase}/rastreio/${trackingIdentifier}`;
                                                            const msg = `Olá, ${task.cliente_nome.trim()}!\n\nAcompanhe a produção do seu pedido em tempo real diretamente pelo nosso site:\n👉 ${link}\n\n(Lá você consegue ver se a peça está imprimindo, em acabamento, pintura ou se já foi enviada!). Qualquer dúvida, estou por aqui!`;
                                                            
                                                            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                                                            const baseUrl = isMobile ? 'https://api.whatsapp.com/send' : 'https://web.whatsapp.com/send';
                                                            const waLink = `${baseUrl}?phone=55${cleanPhone}&text=${encodeURIComponent(msg)}`;
                                                            window.open(waLink, '_blank');
                                                        }}
                                                        title="Enviar Rastreio via WhatsApp"
                                                        className="p-2 bg-zinc-900 text-zinc-500 hover:text-emerald-500 border border-zinc-800 hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center"
                                                    >
                                                        <MessageCircle size={16} />
                                                    </button>
                                            </div>
                                            </div>

                                            {/* Prazo Limite do Pedido */}
                                            {(() => {
                                                if (!task.data_venda) return null;
                                                const dataVenda = new Date(task.data_venda);
                                                const deadlineDate = new Date(dataVenda);
                                                deadlineDate.setDate(deadlineDate.getDate() + 45);
                                                
                                                const today = new Date();
                                                const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                                                const deadlineDateOnly = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate());
                                                const diffTime = deadlineDateOnly.getTime() - todayDateOnly.getTime();
                                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                                
                                                const formattedDeadline = deadlineDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                                                
                                                let badgeClass = 'bg-zinc-950 border-zinc-800 text-zinc-400';
                                                let label = `Prazo: ${formattedDeadline} (${diffDays}d)`;
                                                
                                                if (diffDays < 0) {
                                                    badgeClass = 'bg-red-500/10 border-red-500/30 text-red-400 font-black';
                                                    label = `Atrasado ${Math.abs(diffDays)}d (${formattedDeadline})`;
                                                } else if (diffDays <= 7) {
                                                    badgeClass = 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400 font-black';
                                                    label = `Urgente: ${diffDays}d (${formattedDeadline})`;
                                                } else if (diffDays <= 15) {
                                                    badgeClass = 'bg-orange-500/10 border-orange-500/30 text-orange-400';
                                                    label = `${diffDays}d restando (${formattedDeadline})`;
                                                } else {
                                                    badgeClass = 'bg-zinc-950/50 border-zinc-800/80 text-zinc-500';
                                                    label = `${diffDays}d restando (${formattedDeadline})`;
                                                }
                                                
                                                return (
                                                    <div className="mt-3 flex items-center">
                                                        <span 
                                                            className={`text-[9px] font-black px-2 py-0.5 rounded border shadow-inner flex items-center gap-1.5 ${badgeClass}`}
                                                            title={`Data limite de entrega (45 dias): ${deadlineDate.toLocaleDateString('pt-BR')}`}
                                                        >
                                                            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shrink-0" />
                                                            {label}
                                                        </span>
                                                    </div>
                                                );
                                            })()}

                                            <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-zinc-800/50">
                                                <span className="text-[10px] font-black px-3 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-300 shadow-inner">
                                                    QTD: {task.quantidade}x
                                                </span>
                                                {task.valor_venda_final !== undefined && (
                                                    <span className="text-[10px] font-black px-3 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-emerald-400 shadow-inner">
                                                        R$ {Number(task.valor_venda_final).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </span>
                                                )}
                                                {editingSaleId === task.id ? (
                                                    <div className="flex items-center gap-1.5 bg-zinc-950 p-1 border border-zinc-800 rounded-lg w-full mt-2 animate-in slide-in-from-top-1 duration-150">
                                                        <span className="text-[9px] font-black text-zinc-500 pl-1">R$</span>
                                                        <input
                                                            type="text"
                                                            value={inputValorParcial}
                                                            onChange={(e) => setInputValorParcial(e.target.value)}
                                                            placeholder="Valor pago"
                                                            className="bg-transparent text-xs font-black text-blue-400 outline-none w-20 py-0.5"
                                                            autoFocus
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') savePartialPayment(task.id, task.valor_venda_final);
                                                                if (e.key === 'Escape') setEditingSaleId(null);
                                                            }}
                                                        />
                                                        <button
                                                            onClick={() => savePartialPayment(task.id, task.valor_venda_final)}
                                                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-black text-[9px] font-black rounded"
                                                        >
                                                            OK
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setInputValorParcial(String(task.valor_venda_final || 0));
                                                                // Use setTimeout to ensure the state update is registered before saving
                                                                setTimeout(() => {
                                                                    savePartialPayment(task.id, task.valor_venda_final);
                                                                }, 0);
                                                            }}
                                                            className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[9px] font-black rounded"
                                                            title="Confirmar pagamento total"
                                                        >
                                                            Quitar
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingSaleId(null)}
                                                            className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-[9px] font-black rounded"
                                                        >
                                                            X
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => {
                                                            setEditingSaleId(task.id);
                                                            setInputValorParcial(task.valor_pago_parcial !== undefined && task.valor_pago_parcial !== null ? String(task.valor_pago_parcial) : '');
                                                        }}
                                                        title="Editar pagamento/sinal"
                                                        className={`flex items-center gap-1.5 text-[10px] font-black px-3 py-1 rounded-lg border transition-all active:scale-95 shadow-sm ${
                                                            task.status_pagamento === 'Pago'
                                                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                                                            : task.status_pagamento === 'Parcial'
                                                            ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20'
                                                            : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/20'
                                                        }`}
                                                    >
                                                        <div className={`w-1.5 h-1.5 rounded-full ${
                                                            task.status_pagamento === 'Pago'
                                                            ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                                                            : task.status_pagamento === 'Parcial'
                                                            ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]'
                                                            : 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]'
                                                        }`} />
                                                        {task.status_pagamento === 'Pago'
                                                            ? 'PAGO'
                                                            : task.status_pagamento === 'Parcial'
                                                            ? `SINAL: R$ ${Number(task.valor_pago_parcial).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                                            : 'PENDENTE'
                                                        }
                                                    </button>
                                                )}
                                                {task.pintura_freelancer && (
                                                    <span className="flex items-center gap-1.5 text-[10px] font-black px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400 shadow-sm" title="Exige pintura terceirizada">
                                                        <Paintbrush size={10} /> TERCEIRIZADA
                                                    </span>
                                                )}
                                                {task.observacao && (
                                                    <div className="w-full text-xs text-blue-400 italic mt-3 px-4 py-3 bg-blue-500/5 border-l-2 border-blue-500/40 rounded-r-xl font-medium shadow-sm">
                                                        "{task.observacao}"
                                                    </div>
                                                )}
                                            </div>

                                            {col.id === 'Pronto p/ Entrega' && (
                                                <div className="flex flex-col gap-2 mt-4">
                                                    <button
                                                        onClick={() => {
                                                            const clientWhatsApp = (task.cliente_contato || '').replace(/\D/g, '');
                                                            if (!clientWhatsApp || clientWhatsApp.length < 10) {
                                                                toast.error('Cliente sem WhatsApp cadastrado');
                                                                return;
                                                            }
                                                            const entregaStr = task.metodo_entrega === 'envio' ? 'postagem' : 'retirada';
                                                            const emojis = String.fromCodePoint(0x1F423, 0x2728, 0x1F680);
                                                            const msg = `Olá, ${task.cliente_nome.trim()}!\nSeu ${task.figuras.nome} ficou pronto e já está pronto para ${entregaStr}!\nQualquer dúvida, estou por aqui! ${emojis}`;
                                                            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                                                            const baseUrl = isMobile ? 'https://api.whatsapp.com/send' : 'https://web.whatsapp.com/send';
                                                            const waLink = `${baseUrl}?phone=55${clientWhatsApp}&text=${encodeURIComponent(msg)}`;
                                                            window.open(waLink, '_blank');
                                                        }}
                                                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-black text-[10px] font-black py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 uppercase tracking-widest"
                                                    >
                                                        <MessageCircle size={14} /> NOTIFICAR CLIENTE
                                                    </button>

                                                    <button
                                                        onClick={() => markAsCompleted(task.id)}
                                                        className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-black py-3 rounded-xl flex items-center justify-center gap-2 transition-all border border-zinc-700 active:scale-95 uppercase tracking-widest"
                                                    >
                                                        <Truck size={14} /> FINALIZAR ENTREGA
                                                    </button>
                                                </div>
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
