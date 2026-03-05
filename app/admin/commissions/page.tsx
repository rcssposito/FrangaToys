'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { usePermission } from '@/hooks/usePermission';
import { Loader2, DollarSign, Calendar, Search, Filter, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';

export default function CommissionsPage() {
    const { user, hasRole } = usePermission();
    const [loading, setLoading] = useState(true);
    const [sales, setSales] = useState<any[]>([]);
    const [vendedores, setVendedores] = useState<any[]>([]);
    const [vendedorId, setVendedorId] = useState<string>('all');
    const [expandedVendedor, setExpandedVendedor] = useState<string | null>(null);

    // Filter states
    const [month, setMonth] = useState<string>(new Date().getMonth().toString());
    const [year, setYear] = useState<string>(new Date().getFullYear().toString());

    useEffect(() => {
        if (hasRole('admin') || hasRole('finance')) {
            fetchVendedores();
            fetchCommissions();
        } else if (user?.email) {
            setVendedorId(user.email);
            fetchCommissions(user.email);
        }
    }, [user, month, year]);

    const fetchVendedores = async () => {
        try {
            const res = await fetch('/api/admin/users');
            if (res.ok) {
                const data = await res.json();
                setVendedores(data);
            }
        } catch (err) {
            console.error('Erro ao buscar vendedores:', err);
        }
    };

    const fetchCommissions = async (forcedVendedorQuery?: string) => {
        setLoading(true);
        try {
            // Buscando os dados pelo endpoint /api/admin/sales
            // A API já retorna todas, nós filtraremos no frontend para facilitar,
            // ou poderíamos criar um endpoint específico
            const res = await fetch('/api/admin/sales');
            const data = await res.json();

            if (res.ok) {
                let filtered = data.filter((s: any) => {
                    // Filtrar por data
                    const d = new Date(s.data_venda);
                    const isSameMonth = d.getMonth().toString() === month && d.getFullYear().toString() === year;
                    return isSameMonth;
                });

                const vQuery = forcedVendedorQuery || vendedorId;
                if (vQuery && vQuery !== 'all') {
                    filtered = filtered.filter((s: any) => s.vendedor === vQuery);
                }

                setSales(filtered);
            } else {
                toast.error('Erro ao buscar vendas para comissão');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const months = [
        { value: '0', label: 'Janeiro' },
        { value: '1', label: 'Fevereiro' },
        { value: '2', label: 'Março' },
        { value: '3', label: 'Abril' },
        { value: '4', label: 'Maio' },
        { value: '5', label: 'Junho' },
        { value: '6', label: 'Julho' },
        { value: '7', label: 'Agosto' },
        { value: '8', label: 'Setembro' },
        { value: '9', label: 'Outubro' },
        { value: '10', label: 'Novembro' },
        { value: '11', label: 'Dezembro' },
    ];

    // Agrupar por Vendedor
    const commissionsBySeller = sales.reduce((acc: any, sale: any) => {
        const vendorKey = sale.vendedor || 'Desconhecido';
        if (!acc[vendorKey]) {
            acc[vendorKey] = {
                nome: sale.vendedor_nome || vendorKey,
                totalVendas: 0,
                totalBruto: 0,
                totalComissao: 0,
                totalPintura: 0,
                vendas: []
            };
        }

        const valorRealVenda = (sale.valor_venda_final || 0);

        acc[vendorKey].totalVendas += 1;
        acc[vendorKey].totalBruto += valorRealVenda;
        acc[vendorKey].totalComissao += (sale.comissao_vendedor || 0);

        // Se este vendador foi o pintor freelancer nesta venda, ele recebe o valor da pintura
        // (Isso assume que o nome ou email do pintor bate com o vendedor_nome ou email atual)
        if (sale.pintura_freelancer && sale.pintor_nome &&
            (sale.pintor_nome === vendorKey || sale.pintor_nome === sale.vendedor_nome)) {
            // Em tese precisaríamos da matemática do freelancer, 
            // no momento vamos inferir que o lucro tem uma dedução, 
            // mas o ideal é a API salvar 'valor_pago_pintor' na venda.
            // Para simplificar agora, se a venda marcou pintura_freelancer e o pintor é ele,
            // poderíamos somar um valor_pintura se existisse.
            // Para o MVP vou criar a UI focada na comissao_vendedor que já existe.
        }

        acc[vendorKey].vendas.push({
            id: sale.id,
            data: sale.data_venda,
            cliente: sale.cliente_nome || 'Não informado',
            produto: sale.figuras?.nome || `Item ID: ${sale.figura_id}`,
            valor: valorRealVenda,
            comissao: sale.comissao_vendedor || 0,
            status: sale.status_pagamento || sale.status
        });

        return acc;
    }, {});


    if (!hasRole('admin') && !hasRole('finance') && !user) {
        return <div className="p-8">Acesso Negado</div>;
    }

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-[var(--foreground)] tracking-tight flex items-center gap-3">
                        <DollarSign size={28} className="text-emerald-500" />
                        Acertos & Comissões
                    </h1>
                    <p className="text-[var(--text-muted)] mt-1 font-medium">Calcule e visualize os repasses do mês.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 bg-[var(--card-bg)] p-2 rounded-xl border border-[var(--card-border)] shadow-sm">
                    {(hasRole('admin') || hasRole('finance')) && vendedores.length > 0 && (
                        <select
                            value={vendedorId}
                            onChange={(e) => {
                                setVendedorId(e.target.value);
                            }}
                            className="bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--foreground)] text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2 outline-none font-medium"
                        >
                            <option value="all">Todos Vendedores</option>
                            {vendedores.map(v => (
                                <option key={v.email} value={v.email}>{v.nome || v.email}</option>
                            ))}
                        </select>
                    )}

                    <select
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className="bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--foreground)] text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2 outline-none font-medium"
                    >
                        {months.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                    </select>

                    <select
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className="bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--foreground)] text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2 outline-none font-medium"
                    >
                        <option value="2024">2024</option>
                        <option value="2025">2025</option>
                        <option value="2026">2026</option>
                    </select>

                    <button
                        onClick={() => fetchCommissions()}
                        className="bg-[var(--input-bg)] hover:bg-[var(--card-border)] text-[var(--foreground)] p-2 rounded-lg transition-colors border border-[var(--card-border)] disabled:opacity-50"
                        title="Filtrar"
                    >
                        <Filter size={18} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <Loader2 className="animate-spin text-emerald-500" size={32} />
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.keys(commissionsBySeller).length === 0 ? (
                        <div className="text-center py-20 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl">
                            <Calendar size={48} className="mx-auto text-[var(--text-muted)] opacity-50 mb-4" />
                            <p className="text-[var(--text-muted)] font-medium">Nenhuma venda comissionada neste período.</p>
                        </div>
                    ) : (
                        Object.entries(commissionsBySeller).map(([email, data]: any) => (
                            <div key={email} className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl overflow-hidden shadow-sm transition-all">
                                {/* Header / Summary */}
                                <div
                                    onClick={() => setExpandedVendedor(expandedVendedor === email ? null : email)}
                                    className="p-6 cursor-pointer hover:bg-[var(--input-bg)] transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black text-xl border border-emerald-500/20">
                                            {data.nome.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-[var(--foreground)]">{data.nome}</h3>
                                            <p className="text-xs font-medium text-[var(--text-muted)]">{data.totalVendas} vendas registradas</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-6">
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Vendido Bruto</span>
                                            <span className="text-sm font-semibold text-[var(--foreground)]">R$ {data.totalBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="w-px h-8 bg-[var(--card-border)] hidden md:block"></div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">Comissão a Pagar</span>
                                            <span className="text-2xl font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                                                R$ {data.totalComissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        <div className="text-[var(--text-muted)] ml-2">
                                            {expandedVendedor === email ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                        </div>
                                    </div>
                                </div>

                                {/* Detailed List */}
                                {expandedVendedor === email && (
                                    <div className="border-t border-[var(--card-border)] bg-[var(--background)]/50 p-6">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm whitespace-nowrap">
                                                <thead className="text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)] border-b border-[var(--card-border)]">
                                                    <tr>
                                                        <th className="pb-3 px-4">Data</th>
                                                        <th className="pb-3 px-4">Cliente</th>
                                                        <th className="pb-3 px-4">Produto</th>
                                                        <th className="pb-3 px-4">Status Pag.</th>
                                                        <th className="pb-3 px-4 text-right">Valor Venda</th>
                                                        <th className="pb-3 px-4 text-right text-emerald-500">Comissão</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-[var(--card-border)]">
                                                    {data.vendas.map((venda: any) => (
                                                        <tr key={venda.id} className="hover:bg-[var(--input-bg)]/50 transition-colors">
                                                            <td className="py-3 px-4 font-medium text-[var(--text-muted)]">{new Date(venda.data).toLocaleDateString('pt-BR')}</td>
                                                            <td className="py-3 px-4 font-bold text-[var(--foreground)]">{venda.cliente}</td>
                                                            <td className="py-3 px-4 font-medium text-[var(--foreground)]">{venda.produto}</td>
                                                            <td className="py-3 px-4">
                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${venda.status === 'Pago' ? 'bg-emerald-500/10 text-emerald-500' :
                                                                        venda.status === 'Pendente/Incompleto' ? 'bg-amber-500/10 text-amber-500' :
                                                                            'bg-zinc-500/10 text-zinc-400'
                                                                    }`}>
                                                                    {venda.status}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-4 text-right font-semibold text-[var(--foreground)]">R$ {venda.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                                            <td className="py-3 px-4 text-right font-black text-emerald-400">R$ {venda.comissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
