'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Tag, Calendar, Activity, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Cupom {
    id: string;
    codigo: string;
    tipo: 'porcentagem' | 'fixo';
    valor: number;
    usos_restantes: number | null;
    data_validade: string | null;
    valor_minimo: number | null;
    desconto_maximo: number | null;
    ativo: boolean;
    criado_em: string;
    serie_id?: number | null;
    series?: { nome: string } | null;
    figuras_permitidas?: number[] | null;
}

export default function AdminCouponsPage() {
    const [cupons, setCupons] = useState<Cupom[]>([]);
    const [series, setSeries] = useState<{ id: number; nome: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCupom, setEditingCupom] = useState<Cupom | null>(null);
    const [saving, setSaving] = useState(false);

    // Form states
    const [codigo, setCodigo] = useState('');
    const [tipo, setTipo] = useState<'porcentagem' | 'fixo'>('porcentagem');
    const [valor, setValor] = useState('');
    const [usosRestantes, setUsosRestantes] = useState('');
    const [dataValidade, setDataValidade] = useState('');
    const [valorMinimo, setValorMinimo] = useState('');
    const [descontoMaximo, setDescontoMaximo] = useState('');
    const [serieId, setSerieId] = useState('');
    const [ativo, setAtivo] = useState(true);

    // Figures restrictions states
    const [figurasPermitidas, setFigurasPermitidas] = useState<number[]>([]);
    const [figurasPermitidasObj, setFigurasPermitidasObj] = useState<any[]>([]);
    const [searchFigQuery, setSearchFigQuery] = useState('');
    const [searchFigResults, setSearchFigResults] = useState<any[]>([]);

    const router = useRouter();

    const fetchCupons = async () => {
        try {
            const res = await fetch('/api/admin/coupons');
            if (!res.ok) throw new Error('Falha ao carregar cupons');
            const data = await res.json();
            setCupons(data);
        } catch (error) {
            console.error(error);
            toast.error('Erro ao buscar cupons');
        } finally {
            setLoading(false);
        }
    };

    const fetchSeries = async () => {
        try {
            const res = await fetch('/api/admin/series');
            if (res.ok) {
                const data = await res.json();
                setSeries(data);
            }
        } catch (error) {
            console.error('Erro ao buscar séries:', error);
        }
    };

    const handleSearchFigures = async (q: string) => {
        if (!q.trim()) {
            setSearchFigResults([]);
            return;
        }
        try {
            const res = await fetch(`/api/admin/figures?search=${encodeURIComponent(q)}&limit=10`);
            if (res.ok) {
                const data = await res.json();
                setSearchFigResults(data.items || []);
            }
        } catch (err) {
            console.error('Erro ao buscar figuras:', err);
        }
    };

    useEffect(() => {
        fetchCupons();
        fetchSeries();
    }, []);

    const fetchFigurasPermitidasDetails = async (ids: number[]) => {
        if (!ids || ids.length === 0) return [];
        try {
            const { data, error } = await supabase
                .from('figuras')
                .select(`
                    id,
                    nome,
                    series ( nome ),
                    categorias:series ( categorias ( nome ) )
                `)
                .in('id', ids);

            if (error) {
                console.error("Error fetching figures details:", error);
                return [];
            }
            return (data || []).map((f: any) => {
                const series = Array.isArray(f.series) ? f.series[0] : f.series;
                const catArr = Array.isArray(f.categorias) ? f.categorias : [f.categorias].filter(Boolean);
                const catObj = catArr[0]?.categorias;
                const cat = Array.isArray(catObj) ? catObj[0] : catObj;

                return {
                    id: f.id,
                    nome: f.nome,
                    serie: series?.nome || 'Sem Série',
                    categoria: cat?.nome || 'Outros'
                };
            });
        } catch (err) {
            console.error(err);
            return [];
        }
    };

    const openModal = async (cupom?: Cupom) => {
        setSearchFigQuery('');
        setSearchFigResults([]);

        if (cupom) {
            setEditingCupom(cupom);
            setCodigo(cupom.codigo);
            setTipo(cupom.tipo);
            setValor(cupom.valor.toString());
            setUsosRestantes(cupom.usos_restantes ? cupom.usos_restantes.toString() : '');
            setDataValidade(cupom.data_validade ? new Date(cupom.data_validade).toISOString().slice(0, 16) : '');
            setValorMinimo(cupom.valor_minimo ? cupom.valor_minimo.toString() : '');
            setDescontoMaximo(cupom.desconto_maximo ? cupom.desconto_maximo.toString() : '');
            setSerieId(cupom.serie_id ? cupom.serie_id.toString() : '');
            setAtivo(cupom.ativo);

            const pIds = cupom.figuras_permitidas || [];
            setFigurasPermitidas(pIds);
            if (pIds.length > 0) {
                const details = await fetchFigurasPermitidasDetails(pIds);
                setFigurasPermitidasObj(details);
            } else {
                setFigurasPermitidasObj([]);
            }
        } else {
            setEditingCupom(null);
            setCodigo('');
            setTipo('porcentagem');
            setValor('');
            setUsosRestantes('');
            setDataValidade('');
            setValorMinimo('');
            setDescontoMaximo('');
            setSerieId('');
            setAtivo(true);
            setFigurasPermitidas([]);
            setFigurasPermitidasObj([]);
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        
        try {
            const payload = {
                codigo,
                tipo,
                valor: Number(valor),
                usos_restantes: usosRestantes ? Number(usosRestantes) : null,
                data_validade: dataValidade ? new Date(dataValidade).toISOString() : null,
                valor_minimo: valorMinimo ? Number(valorMinimo) : null,
                desconto_maximo: descontoMaximo ? Number(descontoMaximo) : null,
                serie_id: serieId ? Number(serieId) : null,
                figuras_permitidas: figurasPermitidas.length > 0 ? figurasPermitidas : null,
                ativo
            };

            const url = editingCupom ? `/api/admin/coupons/${editingCupom.id}` : '/api/admin/coupons';
            const method = editingCupom ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            toast.success(editingCupom ? 'Cupom atualizado!' : 'Cupom criado!');
            setIsModalOpen(false);
            fetchCupons();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este cupom?')) return;
        
        try {
            const res = await fetch(`/api/admin/coupons/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Falha ao excluir');
            toast.success('Cupom excluído');
            fetchCupons();
        } catch (error: any) {
            toast.error('Erro ao excluir cupom');
        }
    };

    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-white uppercase tracking-tighter">
                        Cupons de Desconto
                    </h1>
                    <p className="text-sm font-bold text-zinc-500 tracking-widest uppercase mt-2">
                        Gerencie códigos promocionais e descontos
                    </p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_0_20px_rgba(37,99,235,0.2)]"
                >
                    <Plus size={18} /> Novo Cupom
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 size={40} className="animate-spin text-blue-500" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {cupons.length === 0 ? (
                        <div className="col-span-full py-20 flex flex-col items-center justify-center text-zinc-500 bg-zinc-900/50 rounded-3xl border border-zinc-800 border-dashed">
                            <Tag size={48} className="mb-4 opacity-20" />
                            <p className="font-bold tracking-widest uppercase text-sm">Nenhum cupom cadastrado</p>
                        </div>
                    ) : (
                        cupons.map(cupom => (
                            <div key={cupom.id} className={`bg-zinc-900 border ${cupom.ativo ? 'border-zinc-800' : 'border-red-900/50'} rounded-3xl p-6 relative group flex flex-col gap-4 overflow-hidden`}>
                                {/* Background Badge */}
                                <div className="absolute -top-10 -right-10 opacity-[0.03] transform rotate-12 pointer-events-none">
                                    <Tag size={120} />
                                </div>

                                <div className="flex justify-between items-start z-10">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-2xl font-black text-white tracking-tighter uppercase">{cupom.codigo}</h3>
                                            <span className={`px-2 py-0.5 rounded-sm text-[9px] font-black uppercase tracking-widest ${cupom.ativo ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                                {cupom.ativo ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </div>
                                        <p className="text-zinc-400 font-medium text-xs">
                                            {cupom.tipo === 'porcentagem' ? `${cupom.valor}% de desconto` : `R$ ${cupom.valor.toFixed(2)} de desconto`}
                                            {cupom.series?.nome && (
                                                <span className="block mt-1 text-blue-400 font-bold">
                                                    Série: {cupom.series.nome}
                                                </span>
                                            )}
                                            {cupom.figuras_permitidas && cupom.figuras_permitidas.length > 0 && (
                                                <span className="block mt-1 text-orange-400 font-bold">
                                                    Seleção: {cupom.figuras_permitidas.length} figuras
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openModal(cupom)} className="p-2 bg-zinc-800 hover:bg-blue-600 rounded-xl text-zinc-400 hover:text-white transition-all">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(cupom.id)} className="p-2 bg-zinc-800 hover:bg-red-600 rounded-xl text-zinc-400 hover:text-white transition-all">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mt-auto z-10 pt-4 border-t border-zinc-800/50">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest flex items-center gap-1">
                                            <Activity size={10} /> Usos
                                        </span>
                                        <span className="text-sm font-bold text-zinc-300">
                                            {cupom.usos_restantes !== null ? `${cupom.usos_restantes} restantes` : 'Ilimitado'}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest flex items-center gap-1">
                                            <Calendar size={10} /> Validade
                                        </span>
                                        <span className="text-sm font-bold text-zinc-300">
                                            {cupom.data_validade ? formatDate(cupom.data_validade) : 'Sem validade'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#09090b] border border-zinc-800 rounded-[2rem] w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-black/20">
                            <h2 className="text-xl font-black text-white uppercase tracking-tighter">
                                {editingCupom ? 'Editar Cupom' : 'Novo Cupom'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-500 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-6 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-6">
                            {/* Seção 1: Informações Básicas (Código, Tipo, Valor) */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Código do Cupom</label>
                                    <input
                                        required
                                        type="text"
                                        value={codigo}
                                        onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                                        placeholder="Ex: PROMO10"
                                        className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-2xl px-5 py-4 outline-none focus:border-blue-500 transition-all font-bold placeholder-zinc-700 uppercase"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Tipo de Desconto</label>
                                    <select
                                        value={tipo}
                                        onChange={(e) => setTipo(e.target.value as any)}
                                        className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-2xl px-5 py-4 outline-none focus:border-blue-500 transition-all font-bold appearance-none cursor-pointer"
                                    >
                                        <option value="porcentagem">Porcentagem (%)</option>
                                        <option value="fixo">Valor Fixo (R$)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Valor</label>
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={valor}
                                        onChange={(e) => setValor(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-2xl px-5 py-4 outline-none focus:border-blue-500 transition-all font-bold placeholder-zinc-700"
                                    />
                                </div>
                            </div>

                            {/* Seção 2: Usos e Validade */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Limite de Usos</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={usosRestantes}
                                        onChange={(e) => setUsosRestantes(e.target.value)}
                                        placeholder="Ilimitado"
                                        className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-2xl px-5 py-4 outline-none focus:border-blue-500 transition-all font-bold placeholder-zinc-700"
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Validade (Opcional)</label>
                                    <input
                                        type="datetime-local"
                                        value={dataValidade}
                                        onChange={(e) => setDataValidade(e.target.value)}
                                        className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-2xl px-5 py-4 outline-none focus:border-blue-500 transition-all font-bold text-sm [color-scheme:dark]"
                                    />
                                </div>
                            </div>

                            {/* Seção 3: Valores Condicionais */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Valor Mínimo do Carrinho (Opcional)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={valorMinimo}
                                        onChange={(e) => setValorMinimo(e.target.value)}
                                        placeholder="Ex: R$ 100.00"
                                        className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-2xl px-5 py-4 outline-none focus:border-blue-500 transition-all font-bold placeholder-zinc-700"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Teto Máximo de Desconto (Opcional)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={descontoMaximo}
                                        onChange={(e) => setDescontoMaximo(e.target.value)}
                                        placeholder="Ex: R$ 50.00"
                                        disabled={tipo !== 'porcentagem'}
                                        className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-2xl px-5 py-4 outline-none focus:border-blue-500 transition-all font-bold placeholder-zinc-700 disabled:opacity-50"
                                    />
                                </div>
                            </div>

                            {/* Seção 3: Restrições (Série e Figuras) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Restrição de Série</label>
                                    <select
                                        value={serieId}
                                        onChange={(e) => setSerieId(e.target.value)}
                                        className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-2xl px-5 py-4 outline-none focus:border-blue-500 transition-all font-bold appearance-none cursor-pointer"
                                    >
                                        <option value="">Qualquer Série (Sem restrição)</option>
                                        {series.map(s => (
                                            <option key={s.id} value={s.id}>{s.nome}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2 relative">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Restringir a Figuras Específicas (Opcional)</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Digite o nome da figura..."
                                            value={searchFigQuery}
                                            onChange={(e) => {
                                                setSearchFigQuery(e.target.value);
                                                handleSearchFigures(e.target.value);
                                            }}
                                            className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-2xl px-5 py-4 outline-none focus:border-blue-500 transition-all font-bold placeholder-zinc-700"
                                        />
                                        {searchFigResults.length > 0 && (
                                            <div className="absolute left-0 right-0 top-full mt-2 bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl z-[60] max-h-48 overflow-y-auto">
                                                {searchFigResults.map((fig: any) => (
                                                    <button
                                                        key={fig.id}
                                                        type="button"
                                                        onClick={() => {
                                                            if (!figurasPermitidas.includes(fig.id)) {
                                                                setFigurasPermitidas([...figurasPermitidas, fig.id]);
                                                                setFigurasPermitidasObj([...figurasPermitidasObj, fig]);
                                                            }
                                                            setSearchFigQuery('');
                                                            setSearchFigResults([]);
                                                        }}
                                                        className="w-full text-left px-4 py-3 hover:bg-zinc-900 text-sm font-bold text-white transition-colors border-b border-zinc-900 last:border-0"
                                                    >
                                                        {fig.nome} ({fig.categoria} - {fig.serie})
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Seção 4: Lista de Figuras Selecionadas & Status Ativo */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start pt-2">
                                <div>
                                    {figurasPermitidasObj.length > 0 ? (
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Figuras Selecionadas ({figurasPermitidasObj.length})</label>
                                            <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto custom-scrollbar pr-1">
                                                {figurasPermitidasObj.map((fig: any) => (
                                                    <div key={fig.id} className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-full text-xs font-black text-blue-400">
                                                        <span>{fig.nome}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setFigurasPermitidas(figurasPermitidas.filter(id => id !== fig.id));
                                                                setFigurasPermitidasObj(figurasPermitidasObj.filter(f => f.id !== fig.id));
                                                            }}
                                                            className="hover:text-red-400 transition-colors p-0.5 rounded-full hover:bg-red-500/10"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-full flex items-center justify-center p-4 border border-zinc-800 border-dashed rounded-2xl text-zinc-600 text-[11px] font-bold uppercase tracking-wider select-none min-h-[58px]">
                                            Nenhuma figura selecionada
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-3 p-4 bg-zinc-900 border border-zinc-800 rounded-2xl cursor-pointer hover:border-zinc-700 transition-colors" onClick={() => setAtivo(!ativo)}>
                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${ativo ? 'bg-blue-600 border-blue-500' : 'bg-black border-zinc-700'}`}>
                                        {ativo && <Check size={14} className="text-white" />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">Cupom Ativo</p>
                                        <p className="text-[10px] font-medium text-zinc-500">Permitir que clientes utilizem este cupom</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3 border-t border-zinc-800">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-4 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-colors flex justify-center items-center gap-2"
                                >
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : (editingCupom ? 'Atualizar' : 'Criar Cupom')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
