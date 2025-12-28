'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Save, Loader2, ArrowLeft, Search, DollarSign } from 'lucide-react';
import Link from 'next/link';

interface CatalogItem {
    id: number;
    Figura: string;
    "Básico (R$)": number;
    "Premium (R$)": number;
}

export default function NewSalePage() {
    const router = useRouter();
    const [items, setItems] = useState<CatalogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Form
    const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
    const [cliente, setCliente] = useState('');
    const [canal, setCanal] = useState('Whatsapp');
    const [valorFinal, setValorFinal] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchCatalog(search);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchCatalog = async (query = '') => {
        setLoading(true);
        try {
            const url = query ? `/api/admin/catalog-prices?search=${encodeURIComponent(query)}` : '/api/admin/catalog-prices';
            const res = await fetch(url);
            const data = await res.json();
            if (res.ok) setItems(data);
        } catch (err) {
            toast.error('Erro ao carregar catálogo');
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (item: CatalogItem) => {
        setSelectedItem(item);
        setValorFinal(item['Básico (R$)']?.toString() || '0');
        setSearch(''); // Limpa busca para focar no form
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItem) {
            toast.error('Selecione uma figura');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch('/api/admin/sales', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    figura_id: selectedItem.id,
                    cliente_nome: cliente,
                    canal_venda: canal,
                    valor_venda_final: parseFloat(valorFinal)
                }),
            });

            if (!res.ok) throw new Error('Erro ao registrar');

            toast.success('Venda registrada com sucesso!');
            router.push('/admin/sales');
        } catch (err) {
            toast.error('Erro ao salvar venda');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredItems = items;

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/admin/sales" className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-3xl font-bold">Nova Venda</h1>
                </div>

                <div className="grid gap-8">

                    {/* Seleção de Figura */}
                    {!selectedItem ? (
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Search size={20} className="text-orange-500" /> 1. Selecione a Figura
                            </h2>
                            <input
                                autoFocus
                                type="text"
                                placeholder="Buscar..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 outline-none focus:border-orange-500 mb-4"
                            />

                            <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
                                {loading && <div className="text-center p-4">Carregando...</div>}
                                {filteredItems.slice(0, 20).map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => handleSelect(item)}
                                        className="w-full text-left p-3 rounded-lg hover:bg-zinc-800 flex justify-between items-center group transition-colors"
                                    >
                                        <span className="font-medium">{item.Figura}</span>
                                        <span className="text-zinc-500 text-sm group-hover:text-green-400 font-mono">
                                            R$ {item['Básico (R$)']}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        // Formulário de Venda
                        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">

                            {/* Figura Selecionada */}
                            <div className="flex justify-between items-center p-4 bg-zinc-950/50 rounded-lg border border-zinc-800 shadow-inner">
                                <div>
                                    <div className="text-xs text-zinc-500 mb-1">Figura Selecionada</div>
                                    <div className="font-bold text-lg text-orange-500">{selectedItem.Figura}</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedItem(null)}
                                    className="text-sm text-orange-500 hover:text-orange-400"
                                >
                                    Trocar
                                </button>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-1">Cliente</label>
                                    <input
                                        required
                                        value={cliente}
                                        onChange={e => setCliente(e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 outline-none focus:border-orange-500"
                                        placeholder="Nome do Cliente"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-zinc-400 mb-1">Canal</label>
                                    <select
                                        value={canal}
                                        onChange={e => setCanal(e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 outline-none focus:border-orange-500 text-white"
                                    >
                                        <option>Whatsapp</option>
                                        <option>Instagram</option>
                                        <option>Indicação</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-zinc-400 mb-1">Valor Final da Venda (R$)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500" size={18} />
                                    <input
                                        type="number" step="0.01" required
                                        value={valorFinal}
                                        onChange={e => setValorFinal(e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 pl-10 outline-none focus:border-green-500 text-lg font-bold text-green-400"
                                    />
                                </div>
                            </div>

                            <button
                                disabled={submitting}
                                className="w-full bg-green-600 hover:bg-green-700 font-bold py-4 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                {submitting ? <Loader2 className="animate-spin" /> : 'Confirmar Venda'}
                            </button>
                        </form>
                    )}

                </div>
            </div>
        </div>
    );
}
