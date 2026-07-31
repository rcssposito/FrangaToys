'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2, KanbanSquare, Package, Clock, Paintbrush, CheckCircle2, Factory, Layers, Truck, FileText, DollarSign, ExternalLink, MessageCircle, Receipt, X, Download, Check } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePermission } from '@/hooks/usePermission';

interface Sale {
    id: number;
    data_venda: string;
    cliente_nome: string;
    cliente_contato: string;
    cliente_id?: number;
    status: string;
    quantidade: number;
    pintura_freelancer?: boolean;
    observacao?: string;
    vendedor?: string;
    vendedor_nome?: string;
    access_token?: string;
    checkout_id?: string;
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

const COLUMN_ACCENTS: Record<string, { border: string; glow: string; text: string; bg: string; titleHover: string }> = {
    'Aguardando Pagamento': {
        border: 'hover:border-yellow-500/50',
        glow: 'hover:shadow-[0_0_35px_rgba(234,179,8,0.22)]',
        text: 'text-yellow-400',
        bg: 'bg-yellow-500/10',
        titleHover: 'group-hover:text-yellow-400'
    },
    'Fila de Impressão': {
        border: 'hover:border-zinc-500/50',
        glow: 'hover:shadow-[0_0_35px_rgba(161,161,170,0.18)]',
        text: 'text-zinc-400',
        bg: 'bg-zinc-800/10',
        titleHover: 'group-hover:text-zinc-300'
    },
    'Imprimindo': {
        border: 'hover:border-orange-500/50',
        glow: 'hover:shadow-[0_0_35px_rgba(249,115,22,0.22)]',
        text: 'text-orange-400',
        bg: 'bg-orange-500/10',
        titleHover: 'group-hover:text-orange-400'
    },
    'Lavagem e Cura': {
        border: 'hover:border-blue-500/50',
        glow: 'hover:shadow-[0_0_35px_rgba(59,130,246,0.22)]',
        text: 'text-blue-400',
        bg: 'bg-blue-500/10',
        titleHover: 'group-hover:text-blue-400'
    },
    'Pintura Secagem': {
        border: 'hover:border-purple-500/50',
        glow: 'hover:shadow-[0_0_35px_rgba(168,85,247,0.22)]',
        text: 'text-purple-400',
        bg: 'bg-purple-500/10',
        titleHover: 'group-hover:text-purple-400'
    },
    'Pronto p/ Entrega': {
        border: 'hover:border-emerald-500/50',
        glow: 'hover:shadow-[0_0_35px_rgba(16,185,129,0.22)]',
        text: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        titleHover: 'group-hover:text-emerald-400'
    }
};

export default function KanbanPage() {
    const [sales, setSales] = useState<Sale[]>([]);
    const [draggedSaleId, setDraggedSaleId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const { hasRole } = usePermission();
    const canSeeValues = hasRole('finance');
    
    // States for inline partial payment editing
    const [editingSaleId, setEditingSaleId] = useState<number | null>(null);
    const [inputValorParcial, setInputValorParcial] = useState<string>('');

    // NF-e modal states
    const [isNfeModalOpen, setIsNfeModalOpen] = useState(false);
    const [selectedNfeSale, setSelectedNfeSale] = useState<Sale | null>(null);
    const [isFetchingCustomer, setIsFetchingCustomer] = useState(false);
    const [isSavingNfe, setIsSavingNfe] = useState(false);

    // Customer billing info states for the modal
    const [nfeCustomerNome, setNfeCustomerNome] = useState('');
    const [nfeCustomerCpf, setNfeCustomerCpf] = useState('');
    const [nfeCustomerCep, setNfeCustomerCep] = useState('');
    const [nfeCustomerLogradouro, setNfeCustomerLogradouro] = useState('');
    const [nfeCustomerNumero, setNfeCustomerNumero] = useState('');
    const [nfeCustomerBairro, setNfeCustomerBairro] = useState('');
    const [nfeCustomerCidade, setNfeCustomerCidade] = useState('');
    const [nfeCustomerUf, setNfeCustomerUf] = useState('');
    const [nfeClienteId, setNfeClienteId] = useState<number | null>(null);
    const [isManualNfe, setIsManualNfe] = useState(false);
    const [manualNfeKey, setManualNfeKey] = useState('');
    const [nfeNumber, setNfeNumber] = useState<number | string>(2);
    const [nfeNumberAlreadyAssigned, setNfeNumberAlreadyAssigned] = useState(false);

    // Auto-fill address details based on CEP in NF-e modal
    useEffect(() => {
        const cleanCep = nfeCustomerCep.replace(/\D/g, '');
        if (cleanCep.length === 8) {
            fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
                .then(res => res.json())
                .then(data => {
                    if (data && !data.erro) {
                        setNfeCustomerLogradouro(data.logradouro || '');
                        setNfeCustomerBairro(data.bairro || '');
                        setNfeCustomerCidade(data.localidade || '');
                        setNfeCustomerUf(data.uf || '');
                    }
                })
                .catch(err => console.error('Erro ao buscar CEP:', err));
        }
    }, [nfeCustomerCep]);

    const handleNfeCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length <= 11) {
            value = value
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        } else {
            value = value.substring(0, 14)
                .replace(/^(\d{2})(\d)/, '$1.$2')
                .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
                .replace(/\.(\d{3})(\d)/, '.$1/$2')
                .replace(/(\d{4})(\d)/, '$1-$2');
        }
        setNfeCustomerCpf(value);
    };

    const handleNfeCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 5) {
            value = value.replace(/^(\d{5})(\d)/, '$1-$2');
        }
        setNfeCustomerCep(value.substring(0, 9));
    };

    const handleOpenNfeModal = async (sale: Sale) => {
        setSelectedNfeSale(sale);
        setIsNfeModalOpen(true);
        setIsFetchingCustomer(true);

        // Reset values
        setNfeCustomerNome(sale.cliente_nome || '');
        setNfeCustomerCpf('');
        setNfeCustomerCep('');
        setNfeCustomerLogradouro('');
        setNfeCustomerNumero('');
        setNfeCustomerBairro('');
        setNfeCustomerCidade('');
        setNfeCustomerUf('');
        setNfeClienteId(sale.cliente_id || null);
        setIsManualNfe(false);
        setManualNfeKey('');
        setNfeNumber(2);
        setNfeNumberAlreadyAssigned(false);

        try {
            const nextRes = await fetch(`/api/admin/sales/nfe/xml?checkout_id=${sale.checkout_id || ''}`);
            if (nextRes.ok) {
                const nextData = await nextRes.json();
                setNfeNumber(nextData.nextNfeNumber || 2);
                setNfeNumberAlreadyAssigned(!!nextData.alreadyAssigned);
            }
        } catch (err) {
            console.error('Erro ao buscar próximo número sequencial da NFe:', err);
        }

        if (sale.cliente_id) {
            try {
                const res = await fetch(`/api/admin/customers?id=${sale.cliente_id}`);
                if (res.ok) {
                    const data = await res.json();
                    setNfeCustomerNome(data.nome || sale.cliente_nome || '');
                    setNfeCustomerCpf(data.cpf || '');
                    setNfeCustomerCep(data.cep || '');
                    setNfeCustomerLogradouro(data.logradouro || '');
                    setNfeCustomerNumero(data.numero || '');
                    setNfeCustomerBairro(data.bairro || '');
                    setNfeCustomerCidade(data.cidade || '');
                    setNfeCustomerUf(data.uf || '');
                }
            } catch (err) {
                console.error('Erro ao buscar dados cadastrais do cliente:', err);
                toast.error('Não foi possível carregar os dados cadastrais do cliente.');
            } finally {
                setIsFetchingCustomer(false);
            }
        } else {
            setIsFetchingCustomer(false);
        }
    };

    const handleDownloadXml = async () => {
        if (!selectedNfeSale) return;
        
        const cleanCpf = nfeCustomerCpf.replace(/\D/g, '');
        if (cleanCpf.length !== 11 && cleanCpf.length !== 14) {
            toast.error('Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido para o XML.');
            return;
        }

        if (!nfeCustomerCep || !nfeCustomerLogradouro || !nfeCustomerNumero || !nfeCustomerBairro || !nfeCustomerCidade || !nfeCustomerUf) {
            toast.error('Todos os campos de endereço são obrigatórios para gerar o XML.');
            return;
        }

        try {
            if (nfeClienteId) {
                await fetch('/api/admin/customers', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: nfeClienteId,
                        nome: nfeCustomerNome,
                        cpf: nfeCustomerCpf,
                        cep: nfeCustomerCep,
                        logradouro: nfeCustomerLogradouro,
                        numero: nfeCustomerNumero,
                        bairro: nfeCustomerBairro,
                        cidade: nfeCustomerCidade,
                        uf: nfeCustomerUf
                    })
                });
            }

            const bodyPayload = {
                checkout_id: selectedNfeSale.checkout_id,
                sale_id: selectedNfeSale.id,
                nome: nfeCustomerNome,
                cpf: nfeCustomerCpf,
                cep: nfeCustomerCep,
                logradouro: nfeCustomerLogradouro,
                numero: nfeCustomerNumero,
                bairro: nfeCustomerBairro,
                cidade: nfeCustomerCidade,
                uf: nfeCustomerUf,
                numero_nfe: Number(nfeNumber)
            };

            const res = await fetch('/api/admin/sales/nfe/xml', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyPayload)
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Erro ao gerar arquivo XML.');
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `NFe-${nfeNumber}.xml`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            toast.success('Arquivo XML gerado e baixado! Agora importe-o no emissor do SEBRAE.');
        } catch (err: any) {
            console.error('XML download error:', err);
            toast.error(err.message || 'Falha ao baixar arquivo XML.');
        }
    };

    const handleSaveAndEmitNfe = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedNfeSale || isSavingNfe) return;

        setIsSavingNfe(true);

        try {
            if (isManualNfe) {
                const cleanKey = manualNfeKey.replace(/\D/g, '');
                if (cleanKey.length !== 44) {
                    toast.error('A chave de acesso da NF-e deve conter exatamente 44 dígitos.');
                    setIsSavingNfe(false);
                    return;
                }

                const bodyPayload = selectedNfeSale.checkout_id 
                    ? { checkout_id: selectedNfeSale.checkout_id, manual_key: cleanKey } 
                    : { sale_id: selectedNfeSale.id, manual_key: cleanKey };

                const nfeRes = await fetch('/api/admin/sales/nfe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bodyPayload)
                });

                const nfeData = await nfeRes.json();
                if (!nfeRes.ok) {
                    throw new Error(nfeData.error || 'Erro ao registrar chave NF-e manualmente');
                }

                toast.success('Chave NF-e registrada com sucesso!');
                setIsNfeModalOpen(false);
                fetchTasks();
                return;
            }

            // Validations for auto emission
            const cleanCpf = nfeCustomerCpf.replace(/\D/g, '');
            if (cleanCpf.length !== 11 && cleanCpf.length !== 14) {
                toast.error('Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.');
                setIsSavingNfe(false);
                return;
            }

            if (!nfeCustomerCep || !nfeCustomerLogradouro || !nfeCustomerNumero || !nfeCustomerBairro || !nfeCustomerCidade || !nfeCustomerUf) {
                toast.error('Todos os campos de endereço são obrigatórios para emissão de nota fiscal.');
                setIsSavingNfe(false);
                return;
            }

            // 1. Salvar dados do cliente se tiver cliente_id
            if (nfeClienteId) {
                const patchRes = await fetch('/api/admin/customers', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: nfeClienteId,
                        nome: nfeCustomerNome,
                        cpf: nfeCustomerCpf,
                        cep: nfeCustomerCep,
                        logradouro: nfeCustomerLogradouro,
                        numero: nfeCustomerNumero,
                        bairro: nfeCustomerBairro,
                        cidade: nfeCustomerCidade,
                        uf: nfeCustomerUf
                    })
                });

                if (!patchRes.ok) {
                    throw new Error('Falha ao atualizar dados cadastrais do cliente no banco de dados.');
                }
            }

            // 2. Emitir NF-e
            const bodyPayload = selectedNfeSale.checkout_id 
                ? { checkout_id: selectedNfeSale.checkout_id } 
                : { sale_id: selectedNfeSale.id };

            const nfeRes = await fetch('/api/admin/sales/nfe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyPayload)
            });

            const nfeData = await nfeRes.json();
            if (!nfeRes.ok) {
                throw new Error(nfeData.error || 'Erro ao emitir Nota Fiscal na SEFAZ');
            }

            toast.success(`NF-e emitida com sucesso! Chave: ${nfeData.chave.substring(0, 15)}...`);
            setIsNfeModalOpen(false);
            
            // Recarregar tarefas para atualizar observações
            fetchTasks();

        } catch (err: any) {
            console.error('NFe save/emit error:', err);
            toast.error(err.message || 'Falha ao salvar dados ou emitir Nota Fiscal.');
        } finally {
            setIsSavingNfe(false);
        }
    };

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
        setDraggedSaleId(saleId);
        e.dataTransfer.setData('text/plain', saleId.toString());
        setTimeout(() => {
            const target = e.target as HTMLElement;
            target.classList.add('opacity-40', 'scale-95', 'rotate-2');
        }, 0);
    };

    const handleDragEnd = (e: React.DragEvent) => {
        setDraggedSaleId(null);
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
        const dataTransferId = e.dataTransfer.getData('text/plain');
        const saleId = (dataTransferId && dataTransferId !== 'drag') ? dataTransferId : (draggedSaleId ? draggedSaleId.toString() : '');
        
        // Reset state
        setDraggedSaleId(null);
        
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
                    const primeiroNome = task.cliente_nome ? task.cliente_nome.trim().split(' ')[0] : 'Cliente';
                    if (toStatus === 'Fila de Impressão') msg = `Olá, ${primeiroNome}! Seu ${task.figuras.nome} acabou de entrar na nossa fila de impressão! 🚀`;
                    else if (toStatus === 'Imprimindo') msg = `Olá, ${primeiroNome}! Nossas máquinas já começaram a imprimir o seu ${task.figuras.nome}! 🏭`;
                    else if (toStatus === 'Lavagem e Cura') msg = `A impressão concluiu, ${primeiroNome}! Seu ${task.figuras.nome} agora está no pós processamento. 💧`;
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
                                    {canSeeValues && (
                                        <div className="flex items-center justify-between mt-1 px-1">
                                            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Total Fila:</span>
                                            <span className="text-[11px] font-black text-emerald-400">
                                                R$ {columnTasks.reduce((sum, t) => sum + (Number(t.valor_venda_final) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    )}
                                </div>
<div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[calc(100vh-280px)] custom-scrollbar">
                                    {columnTasks.length === 0 && (
                                        <div className="text-center p-8 border-2 border-dashed border-zinc-800 rounded-2xl text-zinc-600 text-sm font-black uppercase tracking-widest">
                                            Vazio
                                        </div>
                                    )}

                                    {columnTasks.map(task => {
                                        const accent = COLUMN_ACCENTS[col.id] || {
                                            border: 'hover:border-blue-500/40',
                                            glow: 'hover:shadow-[0_0_35px_rgba(59,130,246,0.22)]',
                                            text: 'text-blue-400',
                                            bg: 'bg-blue-500/10',
                                            titleHover: 'group-hover:text-blue-400'
                                        };

                                        return (
                                            <div
                                                key={task.id}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, task.id)}
                                                onDragEnd={handleDragEnd}
                                                className={`bg-zinc-950/50 backdrop-blur-lg border border-zinc-900/80 rounded-2xl p-3.5 cursor-grab active:cursor-grabbing select-none transition-all duration-500 ease-out group relative shadow-xl overflow-hidden min-h-[245px] flex flex-col justify-between hover:-translate-y-1.5 ${accent.border} ${accent.glow}`}
                                            >
                                                {/* Full-bleed Product Image Background */}
                                                {task.figuras?.imagem_url && (
                                                    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none">
                                                        <img
                                                            src={task.figuras.imagem_url}
                                                            alt=""
                                                            draggable={false}
                                                            className="w-full h-full object-cover opacity-55 group-hover:opacity-75 group-hover:scale-110 transition-all duration-700 ease-out"
                                                        />
                                                        {/* Sophisticated dual overlays for depth and contrast */}
                                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_15%,rgba(9,9,11,0.85)_95%)]" />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-black/35" />
                                                    </div>
                                                )}

                                                {/* Elegant shimmer reflection card effect */}
                                                <div className="absolute inset-0 z-20 pointer-events-none bg-[linear-gradient(110deg,transparent_35%,rgba(255,255,255,0.06)_45%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.06)_55%,transparent_65%)] -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />

                                                {/* Top row: tags and deadline */}
                                                <div className="relative z-10 flex items-center justify-between gap-2">
                                                    {/* Seller and Delivery tags */}
                                                    <div className="flex flex-wrap gap-1.5">
                                                        <span className="text-[8px] font-black uppercase tracking-wider bg-zinc-900/80 text-zinc-300 border border-zinc-800/80 px-1.5 py-0.5 rounded-md backdrop-blur-sm shadow-sm">
                                                            {(() => {
                                                                const raw = task.vendedor_nome || task.vendedor?.split('@')[0] || 'Ateliê';
                                                                return raw.toLowerCase().includes('rodrigo') ? '@frangatoys' : raw;
                                                            })()}
                                                        </span>
                                                        {task.metodo_entrega && (
                                                            <span className="text-[8px] font-black uppercase tracking-wider bg-zinc-900/80 text-zinc-400 px-1.5 py-0.5 rounded-md border border-zinc-800/80 backdrop-blur-sm shadow-sm">
                                                                {task.metodo_entrega === 'envio' ? 'Correios' : 'Retirada'}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Deadline badge */}
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
                                                        
                                                        let badgeClass = 'bg-zinc-900/60 border-zinc-800 text-zinc-400';
                                                        let label = `${diffDays}d (${formattedDeadline})`;
                                                        
                                                        if (diffDays < 0) {
                                                            badgeClass = 'bg-red-500/20 border-red-500/30 text-red-400 font-bold shadow-[0_0_10px_rgba(239,68,68,0.15)]';
                                                            label = `Atrasado ${Math.abs(diffDays)}d (${formattedDeadline})`;
                                                        } else if (diffDays <= 7) {
                                                            badgeClass = 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400 font-bold animate-pulse shadow-[0_0_10px_rgba(234,179,8,0.15)]';
                                                            label = `Urgente: ${diffDays}d (${formattedDeadline})`;
                                                        } else if (diffDays <= 15) {
                                                            badgeClass = 'bg-orange-500/20 border-orange-500/30 text-orange-400';
                                                            label = `${diffDays}d (${formattedDeadline})`;
                                                        }
                                                        
                                                        return (
                                                            <span 
                                                                className={`text-[8px] font-black px-1.5 py-0.5 rounded-md border backdrop-blur-sm shadow-inner flex items-center gap-1 ${badgeClass}`}
                                                                title={`Prazo limite de entrega (45 dias): ${deadlineDate.toLocaleDateString('pt-BR')}`}
                                                            >
                                                                <span className="w-1 h-1 rounded-full bg-current animate-pulse shrink-0" />
                                                                {label}
                                                            </span>
                                                        );
                                                    })()}
                                                </div>

                                                {/* Content & Action vertical stack layout */}
                                                <div className="relative z-10 mt-3 flex-1 flex gap-3 items-stretch">
                                                    {/* Left side: Product & Client info and optional Observation */}
                                                    <div className="flex-1 flex flex-col justify-end min-w-0 gap-2">
                                                        {/* Product & Client info on glass panel */}
                                                        <div className="bg-zinc-950/70 backdrop-blur-md border border-zinc-900/60 rounded-xl p-3 shadow-md group-hover:bg-zinc-950/85 group-hover:border-zinc-800/85 transition-all duration-300">
                                                            <h4 className={`text-[13px] font-black text-white leading-snug tracking-tight mb-2 transition-colors ${accent.titleHover}`}>
                                                                {task.figuras?.nome || 'Item Desconhecido'}
                                                            </h4>
                                                            
                                                            <div className="text-[11.5px] text-zinc-400 font-semibold flex items-center gap-1.5">
                                                                <span className="text-[8px] font-black uppercase tracking-wider text-zinc-500">Cliente</span>
                                                                <span className="text-zinc-200 font-black tracking-tight">{task.cliente_nome}</span>
                                                            </div>

                                                            {task.pintura_freelancer && (
                                                                <span className="inline-flex items-center gap-1 text-[8px] font-black px-1.5 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded text-purple-400 mt-2 w-fit shadow-inner">
                                                                    <Paintbrush size={8} className="shrink-0" /> PINTURA TERCEIRIZADA
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Observation block at the bottom */}
                                                        {task.observacao && (
                                                            <div className="w-full text-[9.5px] text-blue-300/90 italic px-2.5 py-1.5 bg-blue-950/40 backdrop-blur-md border border-blue-500/20 border-l-2 border-blue-500 rounded-lg font-medium shadow-inner break-all">
                                                                "{task.observacao}"
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Right side: Action buttons stacked vertically */}
                                                    <div className="flex flex-col gap-1.5 justify-start shrink-0 z-20">
                                                        <Link
                                                            href={`/os/${task.id}`}
                                                            target="_blank"
                                                            title="Ordem de Serviço (OS)"
                                                            className="w-9 h-9 text-zinc-400 hover:text-blue-400 bg-zinc-900/60 hover:bg-blue-500/10 border border-zinc-800/80 hover:border-blue-500/30 rounded-lg transition-all duration-200 active:scale-90 flex items-center justify-center hover:shadow-[0_0_10px_rgba(59,130,246,0.2)]"
                                                        >
                                                            <FileText size={13} />
                                                        </Link>
                                                        <Link
                                                            href={`/certificado/${task.access_token || task.id}`}
                                                            target="_blank"
                                                            title="Certificado de Autenticidade"
                                                            className="w-9 h-9 text-zinc-400 hover:text-emerald-400 bg-zinc-900/60 hover:bg-emerald-500/10 border border-zinc-800/80 hover:border-emerald-500/30 rounded-lg transition-all duration-200 active:scale-90 flex items-center justify-center hover:shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                                                        >
                                                            <CheckCircle2 size={13} />
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
                                                            title="Copiar Link de Rastreio"
                                                            className="w-9 h-9 text-zinc-400 hover:text-orange-450 bg-zinc-900/60 hover:bg-orange-500/10 border border-zinc-800/80 hover:border-orange-500/30 rounded-lg transition-all duration-200 active:scale-90 flex items-center justify-center hover:shadow-[0_0_10px_rgba(249,115,22,0.2)]"
                                                        >
                                                            <ExternalLink size={13} />
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
                                                                const primeiroNome = task.cliente_nome ? task.cliente_nome.trim().split(' ')[0] : 'Cliente';
                                                                const msg = `Olá, ${primeiroNome}!\n\nAcompanhe o status da produção ou realize o pagamento do seu pedido pelo nosso link exclusivo:\n👉 ${link}\n\n(No link você acompanha se a peça está imprimindo, em pintura ou enviada, e também pode efetuar o pagamento via PIX ou Cartão). Qualquer dúvida, estou por aqui!`;
                                                                
                                                                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                                                                const baseUrl = isMobile ? 'https://api.whatsapp.com/send' : 'https://web.whatsapp.com/send';
                                                                const waLink = `${baseUrl}?phone=55${cleanPhone}&text=${encodeURIComponent(msg)}`;
                                                                window.open(waLink, '_blank');
                                                            }}
                                                            title="Enviar Rastreio via WhatsApp"
                                                            className="w-9 h-9 text-zinc-400 hover:text-green-400 bg-zinc-900/60 hover:bg-green-500/10 border border-zinc-800/80 hover:border-green-500/30 rounded-lg transition-all duration-200 active:scale-90 flex items-center justify-center hover:shadow-[0_0_10px_rgba(34,197,94,0.2)]"
                                                        >
                                                            <MessageCircle size={13} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenNfeModal(task)}
                                                            title="Emitir Nota Fiscal (NF-e)"
                                                            className="w-9 h-9 text-zinc-400 hover:text-purple-400 bg-zinc-900/60 hover:bg-purple-500/10 border border-zinc-800/80 hover:border-purple-500/30 rounded-lg transition-all duration-200 active:scale-90 flex items-center justify-center hover:shadow-[0_0_10px_rgba(168,85,247,0.2)]"
                                                        >
                                                            <Receipt size={13} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Pronto p/ Entrega CTAs */}
                                                {col.id === 'Pronto p/ Entrega' && (
                                                    <div className="relative z-10 flex flex-col gap-1.5 mt-3">
                                                        <button
                                                            onClick={() => {
                                                                const clientWhatsApp = (task.cliente_contato || '').replace(/\D/g, '');
                                                                if (!clientWhatsApp || clientWhatsApp.length < 10) {
                                                                    toast.error('Cliente sem WhatsApp cadastrado');
                                                                    return;
                                                                }
                                                                const entregaStr = task.metodo_entrega === 'envio' ? 'postagem' : 'retirada';
                                                                const emojis = String.fromCodePoint(0x1F423, 0x2728, 0x1F680);
                                                                const primeiroNome = task.cliente_nome ? task.cliente_nome.trim().split(' ')[0] : 'Cliente';
                                                                const msg = `Olá, ${primeiroNome}!\nSeu ${task.figuras.nome} ficou pronto e já está pronto para ${entregaStr}!\nQualquer dúvida, estou por aqui! ${emojis}`;
                                                                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                                                                const baseUrl = isMobile ? 'https://api.whatsapp.com/send' : 'https://web.whatsapp.com/send';
                                                                const waLink = `${baseUrl}?phone=55${clientWhatsApp}&text=${encodeURIComponent(msg)}`;
                                                                window.open(waLink, '_blank');
                                                            }}
                                                            className="w-full bg-emerald-500 hover:bg-emerald-450 text-black text-[9px] font-black py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] active:scale-95 uppercase tracking-widest"
                                                        >
                                                            <MessageCircle size={11} /> Notificar Cliente
                                                        </button>

                                                        <button
                                                            onClick={() => markAsCompleted(task.id)}
                                                            className="w-full bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 text-[9px] font-black py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all border border-zinc-800 active:scale-95 uppercase tracking-widest"
                                                        >
                                                            <Truck size={11} /> Finalizar Entrega
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Barra de utilidades na base do cartão */}
                                                <div className="relative z-10 border-t border-zinc-900/60 bg-zinc-950/80 backdrop-blur-lg px-3.5 py-2 flex items-center justify-center gap-2.5 -mx-3.5 -mb-3.5 mt-3.5 rounded-b-2xl">
                                                    <span className="text-[9px] font-black px-1.5 py-0.5 bg-zinc-900 border border-zinc-850 rounded text-zinc-400 shadow-inner">
                                                        {task.quantidade}x
                                                    </span>
                                                    {canSeeValues && task.valor_venda_final !== undefined && (
                                                        <span className="text-[9px] font-black px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-emerald-400">
                                                            R$ {Number(task.valor_venda_final).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </span>
                                                    )}
                                                    
                                                    {canSeeValues && editingSaleId === task.id ? (
                                                        <div className="flex items-center gap-1 bg-zinc-900 px-1 border border-zinc-800 rounded">
                                                            <span className="text-[8px] font-black text-zinc-500">R$</span>
                                                            <input
                                                                type="text"
                                                                value={inputValorParcial}
                                                                onChange={(e) => setInputValorParcial(e.target.value)}
                                                                className="bg-transparent text-[9px] font-black text-blue-450 outline-none w-10"
                                                                autoFocus
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') savePartialPayment(task.id, task.valor_venda_final);
                                                                    if (e.key === 'Escape') setEditingSaleId(null);
                                                                }}
                                                            />
                                                            <button
                                                                onClick={() => savePartialPayment(task.id, task.valor_venda_final)}
                                                                className="px-1 bg-emerald-600 text-black text-[8px] font-black rounded"
                                                            >
                                                                OK
                                                            </button>
                                                        </div>
                                                    ) : canSeeValues ? (
                                                        <button
                                                            onClick={() => {
                                                                setEditingSaleId(task.id);
                                                                setInputValorParcial(task.valor_pago_parcial !== undefined && task.valor_pago_parcial !== null ? String(task.valor_pago_parcial) : '');
                                                            }}
                                                            className={`flex items-center gap-1 text-[8px] font-black px-1.5 py-0.5 rounded border transition-all active:scale-95 ${
                                                                task.status_pagamento === 'Pago'
                                                                ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.1)] hover:bg-emerald-500/25'
                                                                : task.status_pagamento === 'Parcial'
                                                                ? 'bg-blue-500/15 border-blue-500/25 text-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.1)] hover:bg-blue-500/25'
                                                                : 'bg-yellow-500/15 border-yellow-500/25 text-yellow-400 shadow-[0_0_8px_rgba(234,179,8,0.1)] hover:bg-yellow-500/25'
                                                            }`}
                                                            title="Editar pagamento/sinal"
                                                        >
                                                            <div className={`w-1 h-1 rounded-full ${
                                                                task.status_pagamento === 'Pago'
                                                                ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]'
                                                                : task.status_pagamento === 'Parcial'
                                                                ? 'bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.5)]'
                                                                : 'bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.5)]'
                                                            }`} />
                                                            {task.status_pagamento === 'Pago' ? 'PAGO' : task.status_pagamento === 'Parcial' ? 'PARCIAL' : 'PENDENTE'}
                                                        </button>
                                                    ) : (
                                                        <span
                                                            className={`flex items-center gap-1 text-[8px] font-black px-1.5 py-0.5 rounded border ${
                                                                task.status_pagamento === 'Pago'
                                                                ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.1)]'
                                                                : task.status_pagamento === 'Parcial'
                                                                ? 'bg-blue-500/15 border-blue-500/25 text-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.1)]'
                                                                : 'bg-yellow-500/15 border-yellow-500/25 text-yellow-400 shadow-[0_0_8px_rgba(234,179,8,0.1)]'
                                                            }`}
                                                        >
                                                            <div className={`w-1 h-1 rounded-full ${
                                                                task.status_pagamento === 'Pago'
                                                                ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]'
                                                                : task.status_pagamento === 'Parcial'
                                                                ? 'bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.5)]'
                                                                : 'bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.5)]'
                                                            }`} />
                                                            {task.status_pagamento === 'Pago' ? 'PAGO' : task.status_pagamento === 'Parcial' ? 'PARCIAL' : 'PENDENTE'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal de Emissão de NF-e */}
            {isNfeModalOpen && selectedNfeSale && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-zinc-950 border border-zinc-800 w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl relative animate-in zoom-in-95 duration-200 text-left">
                        <button 
                            onClick={() => setIsNfeModalOpen(false)}
                            className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors"
                        >
                            <X size={24} />
                        </button>

                        <div className="mb-6">
                            <div className="w-12 h-12 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-center text-purple-500 mb-4 shadow-inner">
                                <Receipt size={24} />
                            </div>
                            <h2 className="text-2xl font-black tracking-tighter uppercase italic text-white">Dados de <span className="text-purple-500">Faturamento</span></h2>
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1">Preencha ou revise as informações antes de emitir a NF-e</p>
                        </div>

                        {isFetchingCustomer ? (
                            <div className="py-12 flex flex-col items-center justify-center gap-4">
                                <Loader2 className="animate-spin text-purple-500" size={32} />
                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Buscando cadastro do cliente...</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSaveAndEmitNfe} className="space-y-5">
                                <div className="flex items-center gap-2 mb-2 p-3 bg-zinc-900/50 border border-zinc-850 rounded-xl">
                                    <input
                                        type="checkbox"
                                        id="isManualNfe"
                                        checked={isManualNfe}
                                        onChange={(e) => setIsManualNfe(e.target.checked)}
                                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-purple-600 focus:ring-purple-500/20"
                                    />
                                    <label htmlFor="isManualNfe" className="text-[10px] font-black text-zinc-300 uppercase tracking-widest cursor-pointer select-none">
                                        Registrar chave da NF-e manualmente (Bypass API)
                                    </label>
                                </div>

                                {isManualNfe ? (
                                    <div className="space-y-2">
                                        <label className="block text-[10px] text-zinc-500 uppercase font-black mb-1.5 tracking-widest pl-1">Chave de Acesso da NF-e (44 dígitos)</label>
                                        <input
                                            type="text"
                                            required
                                            maxLength={44}
                                            value={manualNfeKey}
                                            onChange={e => setManualNfeKey(e.target.value.replace(/\D/g, ''))}
                                            placeholder="44 dígitos numéricos"
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 outline-none focus:border-purple-500 text-xs font-mono font-bold transition-all text-zinc-200"
                                        />
                                        <p className="text-[9px] text-zinc-500 mt-1.5 pl-1 leading-normal">Insira a chave de acesso da nota que você emitiu diretamente no portal nacional da SEFAZ ou MEI.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="col-span-2">
                                                <label className="block text-[10px] text-zinc-500 uppercase font-black mb-1.5 tracking-widest pl-1">Nome do Cliente</label>
                                                <input
                                                    type="text"
                                                    required={!isManualNfe}
                                                    value={nfeCustomerNome}
                                                    onChange={e => setNfeCustomerNome(e.target.value)}
                                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 outline-none focus:border-purple-500 text-xs font-bold transition-all text-zinc-200"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] text-zinc-500 uppercase font-black mb-1.5 tracking-widest pl-1">Número da NF-e</label>
                                                <input
                                                    type="number"
                                                    disabled
                                                    value={nfeNumber}
                                                    className="w-full bg-zinc-900/50 border border-zinc-850 text-zinc-400 rounded-xl p-3 outline-none text-xs font-bold text-center cursor-not-allowed"
                                                />
                                                <p className="text-[8px] text-zinc-500 mt-1 pl-1 font-semibold leading-tight">
                                                    {nfeNumberAlreadyAssigned 
                                                        ? "✓ Reservado para este checkout" 
                                                        : "⚡ Gerado automaticamente"}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] text-zinc-500 uppercase font-black mb-1.5 tracking-widest pl-1">CPF ou CNPJ</label>
                                                <input
                                                    type="text"
                                                    required={!isManualNfe}
                                                    value={nfeCustomerCpf}
                                                    onChange={handleNfeCpfChange}
                                                    placeholder="Ex: 000.000.000-00"
                                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 outline-none focus:border-purple-500 text-xs font-bold transition-all text-zinc-200"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] text-zinc-500 uppercase font-black mb-1.5 tracking-widest pl-1">CEP</label>
                                                <input
                                                    type="text"
                                                    required={!isManualNfe}
                                                    value={nfeCustomerCep}
                                                    onChange={handleNfeCepChange}
                                                    placeholder="Ex: 00000-000"
                                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 outline-none focus:border-purple-500 text-xs font-bold transition-all text-zinc-200"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-4 gap-4">
                                            <div className="col-span-3">
                                                <label className="block text-[10px] text-zinc-500 uppercase font-black mb-1.5 tracking-widest pl-1">Logradouro</label>
                                                <input
                                                    type="text"
                                                    required={!isManualNfe}
                                                    value={nfeCustomerLogradouro}
                                                    onChange={e => setNfeCustomerLogradouro(e.target.value)}
                                                    placeholder="Ex: Rua das Flores"
                                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 outline-none focus:border-purple-500 text-xs font-bold transition-all text-zinc-200"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] text-zinc-500 uppercase font-black mb-1.5 tracking-widest pl-1">Número</label>
                                                <input
                                                    type="text"
                                                    required={!isManualNfe}
                                                    value={nfeCustomerNumero}
                                                    onChange={e => setNfeCustomerNumero(e.target.value)}
                                                    placeholder="Ex: 123"
                                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 outline-none focus:border-purple-500 text-xs font-bold transition-all text-zinc-200 text-center"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] text-zinc-500 uppercase font-black mb-1.5 tracking-widest pl-1">Bairro</label>
                                            <input
                                                type="text"
                                                required={!isManualNfe}
                                                value={nfeCustomerBairro}
                                                onChange={e => setNfeCustomerBairro(e.target.value)}
                                                placeholder="Ex: Centro"
                                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 outline-none focus:border-purple-500 text-xs font-bold transition-all text-zinc-200"
                                            />
                                        </div>

                                        <div className="grid grid-cols-4 gap-4">
                                            <div className="col-span-3">
                                                <label className="block text-[10px] text-zinc-500 uppercase font-black mb-1.5 tracking-widest pl-1">Cidade</label>
                                                <input
                                                    type="text"
                                                    required={!isManualNfe}
                                                    value={nfeCustomerCidade}
                                                    onChange={e => setNfeCustomerCidade(e.target.value)}
                                                    placeholder="Ex: São Paulo"
                                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 outline-none focus:border-purple-500 text-xs font-bold transition-all text-zinc-200"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] text-zinc-500 uppercase font-black mb-1.5 tracking-widest pl-1">UF</label>
                                                <input
                                                    type="text"
                                                    required={!isManualNfe}
                                                    value={nfeCustomerUf}
                                                    onChange={e => setNfeCustomerUf(e.target.value.toUpperCase())}
                                                    maxLength={2}
                                                    placeholder="SP"
                                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 outline-none focus:border-purple-500 text-xs font-bold transition-all text-zinc-200 text-center"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-2 flex flex-col gap-2">
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setIsNfeModalOpen(false)}
                                            className="flex-1 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 font-black py-3.5 rounded-xl border border-zinc-800 transition-all active:scale-[0.98] uppercase text-[10px] tracking-widest text-center"
                                        >
                                            Cancelar
                                        </button>
                                        {isManualNfe ? (
                                            <button
                                                type="submit"
                                                disabled={isSavingNfe}
                                                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-black py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 uppercase text-[10px] tracking-widest shadow-lg shadow-purple-500/20"
                                            >
                                                {isSavingNfe ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                                Salvar Chave
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={handleDownloadXml}
                                                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-black py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] uppercase text-[10px] tracking-widest shadow-lg shadow-blue-500/20"
                                            >
                                                <Download size={16} />
                                                Gerar XML
                                            </button>
                                        )}
                                    </div>
                                    {!isManualNfe && (
                                        <button
                                            type="submit"
                                            disabled={isSavingNfe}
                                            className="w-full bg-purple-500/10 hover:bg-purple-500 text-purple-400 hover:text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 uppercase text-[10px] tracking-widest shadow-lg border border-purple-500/20 hover:border-purple-500 transition-all"
                                        >
                                            {isSavingNfe ? <Loader2 size={16} className="animate-spin" /> : <Receipt size={16} />}
                                            Emitir Automático (UniNFe)
                                        </button>
                                    )}
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
