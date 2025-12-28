'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, Loader2, ArrowLeft, TrendingUp, Calendar, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface Sale {
    id: number;
    data_venda: string;
    cliente_nome: string;
    valor_venda_final: number;
    lucro_real: number;
    figuras: { nome: string };
}

export default function SalesPage() {
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSales();
    }, []);

    const fetchSales = async () => {
        try {
            const res = await fetch('/api/admin/sales');
            const data = await res.json();
            if (res.ok) setSales(data);
        } catch (err) {
            toast.error('Erro ao carregar vendas');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Tem certeza que deseja excluir este registro de venda?')) return;

        try {
            const res = await fetch('/api/admin/sales', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });

            if (!res.ok) throw new Error('Erro ao excluir');

            toast.success('Venda removida');
            setSales(prev => prev.filter(s => s.id !== id));
        } catch (err) {
            toast.error('Erro ao excluir venda');
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <div className="max-w-5xl mx-auto">

                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/admin" className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
                            <ArrowLeft size={20} />
                        </Link>
                        <h1 className="text-3xl font-bold">Registro de Vendas</h1>
                    </div>

                    <Link href="/admin/sales/new" className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors">
                        <Plus size={20} /> Nova Venda
                    </Link>
                </div>

                {/* Lista */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                    {loading ? (
                        <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-orange-500" /></div>
                    ) : sales.length === 0 ? (
                        <div className="p-12 text-center text-zinc-500">Nenhuma venda registrada ainda.</div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-zinc-950 text-zinc-400 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="p-4">Data</th>
                                    <th className="p-4">Cliente</th>
                                    <th className="p-4">Figura</th>
                                    <th className="p-4 text-right">Valor Venda</th>
                                    <th className="p-4 text-right text-green-500">Lucro Real</th>
                                    <th className="p-4 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800 text-sm">
                                {sales.map(sale => (
                                    <tr key={sale.id} className="hover:bg-zinc-800/50">
                                        <td className="p-4 text-zinc-400 flex items-center gap-2">
                                            <Calendar size={14} />
                                            {new Date(sale.data_venda).toLocaleDateString()}
                                        </td>
                                        <td className="p-4 font-medium">{sale.cliente_nome}</td>
                                        <td className="p-4 text-zinc-300">{sale.figuras?.nome || 'Desconhecida'}</td>
                                        <td className="p-4 text-right">R$ {sale.valor_venda_final.toFixed(2)}</td>
                                        <td className="p-4 text-right text-green-400 font-bold">
                                            <div className="flex items-center justify-end gap-1">
                                                <TrendingUp size={14} />
                                                R$ {sale.lucro_real?.toFixed(2)}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <button
                                                onClick={() => handleDelete(sale.id)}
                                                className="p-2 hover:bg-red-500/20 text-zinc-600 hover:text-red-500 rounded transition-colors"
                                                title="Excluir Venda"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

            </div>
        </div>
    );
}
