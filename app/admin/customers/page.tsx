'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    Users, 
    Search, 
    ShoppingBag, 
    DollarSign, 
    Calendar, 
    ArrowRight, 
    MessageCircle, 
    Instagram as InstagramIcon,
    Loader2,
    UserPlus,
    Filter,
    MoreHorizontal,
    TrendingUp,
    Clock,
    Award,
    Edit2,
    X as CloseIcon,
    Save,
    Copy,
    Check
} from 'lucide-react';
import { toast } from 'sonner';
import { usePermission } from '@/hooks/usePermission';

interface Customer {
    id: string;
    nome: string;
    telefone: string;
    instagram?: string;
    notas?: string;
    data_cadastro: string;
    total_pedidos?: number;
    total_gasto?: number;
    ultima_venda_em?: string;
}

export default function CustomersPage() {
    const { hasRole } = usePermission();
    const router = useRouter();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'vips' | 'inactives' | 'new'>('all');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isCopying, setIsCopying] = useState(false);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/customers?q=${encodeURIComponent(search)}`);
            const data = await res.json();
            
            if (res.ok && Array.isArray(data)) {
                setCustomers(data);
            } else {
                setCustomers([]);
                if (data.error) toast.error(data.error);
            }
        } catch (err) {
            toast.error('Erro ao carregar clientes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchCustomers();
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const handleUpdateCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCustomer || isUpdating) return;

        setIsUpdating(true);
        try {
            const res = await fetch('/api/admin/customers', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(selectedCustomer)
            });

            if (!res.ok) throw new Error('Erro ao atualizar');

            toast.success('Cliente atualizado com sucesso!');
            setIsEditModalOpen(false);
            fetchCustomers();
        } catch (err: any) {
            toast.error(err.message || 'Erro ao atualizar cliente');
        } finally {
            setIsUpdating(false);
        }
    };

    // Cálculos de Métricas em Tempo Real - Protegidos contra erros de tipo
    const customersArray = Array.isArray(customers) ? customers : [];
    const totalCustomers = customersArray.length;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const newCustomersThisMonth = customersArray.filter(c => {
        const regDate = new Date(c.data_cadastro);
        return regDate.getMonth() === currentMonth && regDate.getFullYear() === currentYear;
    }).length;

    const topCustomer = [...customersArray].sort((a,b) => (b.total_gasto || 0) - (a.total_gasto || 0))[0];

    const handleCopyList = async () => {
        if (filteredCustomers.length === 0 || isCopying) return;
        
        setIsCopying(true);
        try {
            const listText = filteredCustomers
                .map(c => `${c.nome} - ${c.telefone}`)
                .join('\n');
            
            await navigator.clipboard.writeText(listText);
            toast.success(`${filteredCustomers.length} contatos copiados para a área de transferência!`);
            
            setTimeout(() => {
                setIsCopying(false);
            }, 3000);
        } catch (err) {
            toast.error('Erro ao copiar contatos');
            setIsCopying(false);
        }
    };

    const filteredCustomers = customersArray.filter(c => {
        if (activeFilter === 'all') return true;
        if (activeFilter === 'vips') return (c.total_gasto || 0) > 500;
        if (activeFilter === 'new') {
            const regDate = new Date(c.data_cadastro);
            return regDate.getMonth() === currentMonth && regDate.getFullYear() === currentYear;
        }
        if (activeFilter === 'inactives') {
            if (!c.ultima_venda_em) return true;
            const lastSale = new Date(c.ultima_venda_em);
            const sixtyDaysAgo = new Date();
            sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
            return lastSale < sixtyDaysAgo;
        }
        return true;
    });

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl md:text-4xl font-black tracking-tighter flex items-center gap-3">
                        <div className="p-2 bg-orange-500 rounded-xl text-white shadow-lg shadow-orange-500/20">
                            <Users size={28} strokeWidth={2.5} />
                        </div>
                        CRM DE <span className="text-orange-500">CLIENTES</span>
                    </h1>
                    <p className="text-zinc-500 text-xs font-black uppercase tracking-widest pl-1 opacity-70">
                        Gestão de relacionamento e fidelidade Franga Toys
                    </p>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="relative group w-full md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-orange-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar nome ou WhatsApp..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-black border border-zinc-800 rounded-2xl py-3.5 pl-12 pr-6 outline-none focus:border-orange-500 w-full text-sm font-medium transition-all shadow-inner"
                        />
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 bg-zinc-900/10 p-3 rounded-3xl border border-zinc-800/50">
                    <button 
                        onClick={() => setActiveFilter('all')}
                        className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${activeFilter === 'all' ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-transparent border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                    >
                        Todos
                    </button>
                    <button 
                        onClick={() => setActiveFilter('vips')}
                        className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-2 ${activeFilter === 'vips' ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-transparent border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                    >
                        <Award size={14} /> VIPs (LTV &gt; 500)
                    </button>
                    <button 
                        onClick={() => setActiveFilter('inactives')}
                        className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-2 ${activeFilter === 'inactives' ? 'bg-zinc-200 border-zinc-200 text-black shadow-lg shadow-white/20' : 'bg-transparent border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                    >
                        <Clock size={14} /> Inativos (+60 dias)
                    </button>
                    <button 
                        onClick={() => setActiveFilter('new')}
                        className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-2 ${activeFilter === 'new' ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-transparent border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                    >
                        <UserPlus size={14} /> Novos (Este Mês)
                    </button>

                    <div className="flex-1" />

                    <button 
                        onClick={handleCopyList}
                        disabled={filteredCustomers.length === 0}
                        className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-2 ${isCopying ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 active:scale-95 disabled:opacity-50'}`}
                    >
                        {isCopying ? <Check size={14} /> : <Copy size={14} />}
                        {isCopying ? 'Contatos Copiados' : `Copiar ${filteredCustomers.length} Contatos para WhatsApp`}
                    </button>
                </div>

            {/* Loyalty Quick Stats (Placeholders for now) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-zinc-900/30 border border-zinc-800 p-6 rounded-3xl space-y-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform">
                        <TrendingUp size={80} />
                    </div>
                    <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 w-fit">
                        <Award size={20} />
                    </div>
                    <div>
                        <p className="text-3xl font-black tracking-tight">{customers.length}</p>
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1">Clientes Cadastrados</p>
                    </div>
                </div>
                
                <div className="bg-zinc-900/30 border border-zinc-800 p-6 rounded-3xl space-y-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform text-blue-500">
                        <Clock size={80} />
                    </div>
                    <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 w-fit">
                        <Calendar size={20} />
                    </div>
                    <div>
                        <p className="text-3xl font-black tracking-tight">{newCustomersThisMonth}</p>
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1">Registrados em {new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date())}</p>
                    </div>
                </div>

                <div className="bg-zinc-900/30 border border-zinc-800 p-6 rounded-3xl space-y-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform text-orange-500">
                        <ShoppingBag size={80} />
                    </div>
                    <div className="p-2 bg-orange-500/10 border border-orange-500/20 rounded-xl text-orange-400 w-fit">
                        <Award size={20} />
                    </div>
                    <div>
                        <p className="text-xl font-black tracking-tight truncate max-w-[200px]">
                            {topCustomer?.nome || 'Iniciando...'}
                        </p>
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1">Maior Fidelidade (LTV)</p>
                    </div>
                </div>
            </div>

            {/* Customers List */}
            <div className="bg-zinc-900/20 border border-zinc-800 rounded-[2rem] overflow-hidden backdrop-blur-sm shadow-2xl">
                {loading ? (
                    <div className="p-20 flex flex-col items-center justify-center gap-4">
                        <Loader2 className="animate-spin text-orange-500" size={40} />
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-600">Sincronizando Base de Dados...</p>
                    </div>
                ) : filteredCustomers.length === 0 ? (
                    <div className="p-20 text-center space-y-4">
                        <Users size={60} className="mx-auto text-zinc-800" />
                        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Nenhum cliente encontrado com esses critérios.</p>
                        {activeFilter !== 'all' && (
                            <button onClick={() => setActiveFilter('all')} className="text-orange-500 text-[10px] font-black uppercase tracking-widest hover:underline">Limpar Filtros</button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-zinc-800/50 bg-black/40">
                                    <th className="px-8 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Cliente / Contato</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] hidden md:table-cell">Redes Sociais</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] hidden md:table-cell">Última Compra</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] hidden md:table-cell">Total Gasto (LTV)</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/30">
                                {filteredCustomers.map((customer) => (
                                    <tr key={customer.id} className="group hover:bg-zinc-800/30 transition-colors">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 font-black text-lg shadow-inner group-hover:border-orange-500/50 transition-colors">
                                                    {customer.nome[0].toUpperCase()}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-zinc-100 group-hover:text-white transition-colors">{customer.nome}</span>
                                                    <a 
                                                        href={`https://wa.me/${customer.telefone.replace(/\D/g, '')}`} 
                                                        target="_blank"
                                                        className="text-[11px] font-mono text-zinc-500 flex items-center gap-1 hover:text-emerald-400 transition-colors"
                                                    >
                                                        <MessageCircle size={12} />
                                                        {customer.telefone}
                                                    </a>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 hidden md:table-cell">
                                            {customer.instagram ? (
                                                <a 
                                                    href={`https://instagram.com/${customer.instagram.replace('@', '')}`}
                                                    target="_blank"
                                                    className="flex items-center gap-2 text-[11px] font-bold text-zinc-400 hover:text-pink-500 transition-colors bg-zinc-900/50 px-3 py-1.5 rounded-lg border border-zinc-800/80 w-fit"
                                                >
                                                    <InstagramIcon size={14} />
                                                    @{customer.instagram.replace('@', '')}
                                                </a>
                                            ) : (
                                                <span className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">Não Vinculado</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-5 hidden md:table-cell">
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-bold text-zinc-400">
                                                    {customer.ultima_venda_em ? new Date(customer.ultima_venda_em).toLocaleDateString('pt-BR') : 'Nenhuma'}
                                                </span>
                                                <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">
                                                    {customer.total_pedidos || 0} Pedidos
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 hidden md:table-cell">
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-bold text-emerald-500">R$ {(customer.total_gasto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">Ticket Acumulado</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => router.push(`/admin/sales?cliente_id=${customer.id}`)}
                                                    className="px-4 py-2 bg-zinc-900 hover:bg-orange-500 text-zinc-500 hover:text-white rounded-xl border border-zinc-800 transition-all active:scale-95 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                                                    title="Ver Vendas"
                                                >
                                                    <ShoppingBag size={14} />
                                                    Vendas
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        setSelectedCustomer(customer);
                                                        setIsEditModalOpen(true);
                                                    }}
                                                    className="p-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-white rounded-xl border border-zinc-800 transition-all active:scale-95"
                                                    title="Editar Cliente"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Edit Customer Modal */}
            {isEditModalOpen && selectedCustomer && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-zinc-950 border border-zinc-800 w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
                        <button 
                            onClick={() => setIsEditModalOpen(false)}
                            className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors"
                        >
                            <CloseIcon size={24} />
                        </button>

                        <div className="mb-8">
                            <h2 className="text-2xl font-black tracking-tighter uppercase italic">Editar <span className="text-orange-500">Perfil</span></h2>
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Atualize os dados e notas do cliente</p>
                        </div>

                        <form onSubmit={handleUpdateCustomer} className="space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] text-zinc-500 uppercase font-black mb-1.5 tracking-widest pl-1">Nome Completo</label>
                                    <input
                                        type="text"
                                        required
                                        value={selectedCustomer.nome}
                                        onChange={e => setSelectedCustomer({ ...selectedCustomer, nome: e.target.value })}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 outline-none focus:border-orange-500 text-sm font-bold transition-all text-zinc-200"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] text-zinc-500 uppercase font-black mb-1.5 tracking-widest pl-1">WhatsApp</label>
                                        <input
                                            type="text"
                                            required
                                            value={selectedCustomer.telefone}
                                            onChange={e => setSelectedCustomer({ ...selectedCustomer, telefone: e.target.value })}
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 outline-none focus:border-orange-500 text-sm font-bold transition-all text-zinc-200"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-zinc-500 uppercase font-black mb-1.5 tracking-widest pl-1">Instagram (@)</label>
                                        <input
                                            type="text"
                                            value={selectedCustomer.instagram || ''}
                                            onChange={e => setSelectedCustomer({ ...selectedCustomer, instagram: e.target.value })}
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 outline-none focus:border-orange-500 text-sm font-bold transition-all text-zinc-200"
                                            placeholder="ex: afkak_oficial"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] text-zinc-500 uppercase font-black mb-1.5 tracking-widest pl-1">Notas e Observações</label>
                                    <textarea
                                        value={selectedCustomer.notas || ''}
                                        onChange={e => setSelectedCustomer({ ...selectedCustomer, notas: e.target.value })}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 outline-none focus:border-orange-500 text-sm font-medium transition-all text-zinc-200 h-24 resize-none"
                                        placeholder="Preferências, feedbacks ou avisos importantes..."
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isUpdating}
                                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-widest shadow-lg shadow-orange-500/20"
                            >
                                {isUpdating ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                Salvar Alterações
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
