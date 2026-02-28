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

    if (loading) return (
        <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
            <Loader2 className="animate-spin text-orange-500 w-10 h-10" />
        </div>
    );

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-8 transition-colors duration-300">
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center gap-4 mb-10">
                    <Link href="/admin" className="p-2 bg-[var(--card-bg)] border border-[var(--card-border)] hover:bg-[var(--input-bg)] rounded-xl transition-all shadow-sm text-[var(--text-muted)] hover:text-orange-500">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight">Configurações de Preço</h1>
                        <p className="text-[var(--text-muted)] font-medium text-sm">Ajuste os multiplicadores e custos operacionais.</p>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-8">

                    {/* Custos Base */}
                    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-8 shadow-[var(--shadow-md)]">
                        <h2 className="text-xl font-black mb-6 flex items-center gap-3 tracking-tight">
                            <DollarSign className="text-orange-500" size={24} /> Custos Base
                        </h2>
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Resina (R$/Kg)</label>
                                <input
                                    type="number" step="0.01"
                                    value={formData.custo_resina_kg}
                                    onChange={e => handleChange('custo_resina_kg', e.target.value)}
                                    className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl p-3.5 outline-none focus:border-orange-500 font-bold transition-all shadow-sm text-[var(--foreground)]"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-xs font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Estoque Resina (Kg)</label>
                                <input
                                    type="number" step="0.01"
                                    value={formData.estoque_resina_kg}
                                    onChange={e => handleChange('estoque_resina_kg', e.target.value)}
                                    className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl p-3.5 outline-none focus:border-orange-500 font-bold transition-all shadow-sm text-[var(--foreground)]"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-xs font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Hora Impressão (R$/h)</label>
                                <input
                                    type="number" step="0.01"
                                    value={formData.custo_h_impressao}
                                    onChange={e => handleChange('custo_h_impressao', e.target.value)}
                                    className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl p-3.5 outline-none focus:border-orange-500 font-bold transition-all shadow-sm text-[var(--foreground)]"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-xs font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Hora Pintura (R$/h)</label>
                                <input
                                    type="number" step="0.01"
                                    value={formData.custo_h_pintura}
                                    onChange={e => handleChange('custo_h_pintura', e.target.value)}
                                    className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl p-3.5 outline-none focus:border-orange-500 font-bold transition-all shadow-sm text-[var(--foreground)]"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Margens de Lucro */}
                    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-8 shadow-[var(--shadow-md)]">
                        <h2 className="text-xl font-black mb-6 flex items-center gap-3 tracking-tight">
                            <Percent className="text-orange-500" size={24} /> Margens de Lucro
                        </h2>
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Margem Básica (Multiplicador)</label>
                                <input
                                    type="number" step="0.01"
                                    value={formData.margem_basica}
                                    onChange={e => handleChange('margem_basica', e.target.value)}
                                    className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl p-3.5 outline-none focus:border-orange-500 font-bold transition-all shadow-sm text-[var(--foreground)]"
                                />
                                <p className="text-[10px] text-[var(--text-muted)] font-medium ml-1">Ex: 1.4 = 40% de lucro final</p>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-xs font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Margem Premium (Multiplicador)</label>
                                <input
                                    type="number" step="0.01"
                                    value={formData.margem_premium}
                                    onChange={e => handleChange('margem_premium', e.target.value)}
                                    className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl p-3.5 outline-none focus:border-orange-500 font-bold transition-all shadow-sm text-[var(--foreground)]"
                                />
                                <p className="text-[10px] text-[var(--text-muted)] font-medium ml-1">Ex: 1.8 = 80% de lucro final</p>
                            </div>
                        </div>
                    </div>

                    <button
                        disabled={saving}
                        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black py-5 rounded-2xl transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98] flex items-center justify-center gap-3 text-lg"
                    >
                        {saving ? <Loader2 className="animate-spin" /> : <><Save size={24} /> SALVAR ALTERAÇÕES</>}
                    </button>
                </form>
            </div>
        </div>
    );
}
