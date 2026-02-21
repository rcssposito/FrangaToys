'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Save, Loader2, ArrowLeft, DollarSign, Percent } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        custo_h_impressao: 0,
        custo_h_pintura: 0,
        custo_resina_kg: 0,
        estoque_resina_kg: 0,
        margem_basica: 0,
        margem_premium: 0
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/admin/settings');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setFormData(data);
        } catch (err) {
            toast.error('Erro ao carregar configurações');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success('Configurações salvas!');
            setFormData(data);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
    };

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" /></div>;

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/admin" className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-3xl font-bold">Configurações de Preço</h1>
                </div>

                <form onSubmit={handleSave} className="space-y-6">

                    {/* Custos Base */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <DollarSign className="text-green-500" size={20} /> Custos Base
                        </h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="block text-sm text-zinc-400 mb-1">Resina (R$/Kg)</label>
                                <input
                                    type="number" step="0.01"
                                    value={formData.custo_resina_kg}
                                    onChange={e => handleChange('custo_resina_kg', e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 outline-none focus:border-green-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-zinc-400 mb-1">Estoque Resina (Kg)</label>
                                <input
                                    type="number" step="0.01"
                                    value={formData.estoque_resina_kg}
                                    onChange={e => handleChange('estoque_resina_kg', e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 outline-none focus:border-green-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-zinc-400 mb-1">Hora Impressão (R$/h)</label>
                                <input
                                    type="number" step="0.01"
                                    value={formData.custo_h_impressao}
                                    onChange={e => handleChange('custo_h_impressao', e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 outline-none focus:border-green-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-zinc-400 mb-1">Hora Pintura (R$/h)</label>
                                <input
                                    type="number" step="0.01"
                                    value={formData.custo_h_pintura}
                                    onChange={e => handleChange('custo_h_pintura', e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 outline-none focus:border-green-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Margens de Lucro */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <Percent className="text-blue-500" size={20} /> Margens de Lucro (Multiplicador)
                        </h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="block text-sm text-zinc-400 mb-1">Margem Básica (Ex: 1.4 = 40%)</label>
                                <input
                                    type="number" step="0.01"
                                    value={formData.margem_basica}
                                    onChange={e => handleChange('margem_basica', e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-zinc-400 mb-1">Margem Premium (Ex: 1.7 = 70%)</label>
                                <input
                                    type="number" step="0.01"
                                    value={formData.margem_premium}
                                    onChange={e => handleChange('margem_premium', e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        disabled={saving}
                        className="w-full bg-orange-600 hover:bg-orange-700 font-bold py-4 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        {saving ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Salvar Alterações</>}
                    </button>
                </form>
            </div>
        </div>
    );
}
