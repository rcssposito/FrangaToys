'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2, KanbanSquare, Package, Clock, Paintbrush, CheckCircle2, Factory, Layers, Truck, FileText, DollarSign, ExternalLink, MessageCircle, Receipt, X, Download, Check, Maximize2, Camera, Search, CheckSquare, Square, ListChecks, Trash2, Plus } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePermission } from '@/hooks/usePermission';

export interface WipPhoto {
    id: string;
    url: string;
    file_id?: string;
    caption?: string;
    created_at: string;
}

export interface ChecklistItem {
    id: string;
    label: string;
    done: boolean;
}

const DEFAULT_CHECKLIST_STEPS = [
    { id: 'suportes', label: 'Suportes removidos' },
    { id: 'cura', label: 'Cura UV finalizada' },
    { id: 'primer', label: 'Lixamento & Primer' },
    { id: 'pintura', label: 'Pintura & Detalhes' },
    { id: 'verniz', label: 'Verniz & Montagem' }
];

interface Sale {
    id: number;
    data_venda: string;
    cliente_nome: string;
    cliente_contato: string;
    cliente_id?: number;
    status: string;
    quantidade: number;
    pintura_freelancer?: boolean;
    pintor_nome?: string | null;
    valor_pago_pintor?: number;
    horas_pintura?: number;
    valor_estimado_pintor?: number;
    observacao?: string;
    vendedor?: string;
    vendedor_nome?: string;
    access_token?: string;
    checkout_id?: string;
    figuras: {
        nome: string;
        imagem_url: string;
        studios: { nome: string } | { nome: string }[];
        figuras_meta?: { horas_pintura?: number; resina_kg?: number } | { horas_pintura?: number; resina_kg?: number }[];
    };
    metodo_entrega?: string;
    valor_venda_final?: number;
    status_pagamento?: string;
    valor_pago_parcial?: number;
    checklist?: ChecklistItem[];
    wip_fotos?: WipPhoto[];
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
    const { user, hasRole } = usePermission();
    const canSeeValues = hasRole('finance');
    const isPainter = hasRole('painter') || hasRole('admin');
    const currentUserName = user?.nome || user?.email || '';
    
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

    // Search and Quick Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFilter, setSelectedFilter] = useState<'all' | 'my_paintings' | 'available_paintings' | 'urgent' | 'retirada' | 'correios'>('all');

    // Checklist expanded card state
    const [expandedChecklistSaleId, setExpandedChecklistSaleId] = useState<number | null>(null);

    // WIP Photos modal states
    const [wipModalSale, setWipModalSale] = useState<Sale | null>(null);
    const [isUploadingWip, setIsUploadingWip] = useState(false);
    const [wipCaption, setWipCaption] = useState('');

    // Expanded image modal state
    const [expandedImage, setExpandedImage] = useState<{
        url: string;
        title: string;
        studio?: string;
        horasPintura?: number;
        valorPintura?: number;
    } | null>(null);

    // Close modals on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setExpandedImage(null);
                setWipModalSale(null);
                setExpandedChecklistSaleId(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

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

    const handleAssignPainter = async (saleId: number) => {
        try {
            const painterName = user?.nome || user?.email || 'Bianca M';
            const res = await fetch('/api/admin/kanban', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: saleId,
                    action: 'assign_painter',
                    pintor_nome: painterName
                })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Erro ao assumir pintura');
            }
            const data = await res.json();
            toast.success('Pintura assumida com sucesso!');
            setSales(prev => prev.map(s => {
                if (s.id === saleId) {
                    return {
                        ...s,
                        pintor_nome: painterName,
                        pintura_freelancer: true,
                        valor_pago_pintor: data.sale?.valor_pago_pintor || s.valor_estimado_pintor || 0
                    };
                }
                return s;
            }));
        } catch (err: any) {
            toast.error(err.message || 'Erro ao assumir pintura');
        }
    };

    const handleReleasePainter = async (saleId: number) => {
        if (!confirm('Deseja realmente desvincular a pintura desta peça?')) return;
        try {
            const res = await fetch('/api/admin/kanban', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: saleId,
                    action: 'release_painter'
                })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Erro ao liberar pintura');
            }
            toast.success('Pintura liberada!');
            setSales(prev => prev.map(s => {
                if (s.id === saleId) {
                    return {
                        ...s,
                        pintor_nome: null,
                        pintura_freelancer: false,
                        valor_pago_pintor: 0
                    };
                }
                return s;
            }));
        } catch (err: any) {
            toast.error(err.message || 'Erro ao liberar pintura');
        }
    };

    const handleToggleChecklistItem = async (saleId: number, stepId: string) => {
        const sale = sales.find(s => s.id === saleId);
        if (!sale) return;

        const existingChecklist = Array.isArray(sale.checklist) ? [...sale.checklist] : [];
        const itemIndex = existingChecklist.findIndex(i => i.id === stepId);
        
        let updatedChecklist: ChecklistItem[];
        if (itemIndex >= 0) {
            updatedChecklist = existingChecklist.map((item, idx) => 
                idx === itemIndex ? { ...item, done: !item.done } : item
            );
        } else {
            const def = DEFAULT_CHECKLIST_STEPS.find(s => s.id === stepId);
            updatedChecklist = [
                ...existingChecklist,
                { id: stepId, label: def?.label || stepId, done: true }
            ];
        }

        // Optimistic update
        setSales(prev => prev.map(s => s.id === saleId ? { ...s, checklist: updatedChecklist } : s));

        try {
            const res = await fetch('/api/admin/kanban', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: saleId, checklist: updatedChecklist })
            });
            if (!res.ok) throw new Error();
        } catch (err) {
            toast.error('Erro ao atualizar etapa de produção');
            fetchTasks();
        }
    };

    const handleUploadWipPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !wipModalSale) return;

        setIsUploadingWip(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('saleId', String(wipModalSale.id));
            if (wipCaption) formData.append('caption', wipCaption);

            const res = await fetch('/api/admin/kanban/wip', {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Falha no upload da foto');
            }

            const data = await res.json();
            toast.success('Foto dos bastidores enviada!');
            setWipCaption('');
            
            const updatedWip = data.wip_fotos;
            setSales(prev => prev.map(s => s.id === wipModalSale.id ? { ...s, wip_fotos: updatedWip } : s));
            setWipModalSale(prev => prev ? { ...prev, wip_fotos: updatedWip } : null);
        } catch (err: any) {
            toast.error(err.message || 'Erro ao enviar foto');
        } finally {
            setIsUploadingWip(false);
            e.target.value = '';
        }
    };

    const handleDeleteWipPhoto = async (photoId: string) => {
        if (!wipModalSale || !confirm('Deseja excluir esta foto dos bastidores?')) return;
        try {
            const res = await fetch('/api/admin/kanban/wip', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ saleId: wipModalSale.id, photoId })
            });

            if (!res.ok) throw new Error();
            const data = await res.json();
            toast.success('Foto removida!');
            const updatedWip = data.wip_fotos;
            setSales(prev => prev.map(s => s.id === wipModalSale.id ? { ...s, wip_fotos: updatedWip } : s));
            setWipModalSale(prev => prev ? { ...prev, wip_fotos: updatedWip } : null);
        } catch (err) {
            toast.error('Erro ao excluir foto');
        }
    };

    const myPaintings = sales.filter(s => {
        if (!s.pintor_nome) return false;
        const p = s.pintor_nome.toLowerCase();
        const u = currentUserName.toLowerCase();
        return p === u || (u && (p.includes(u) || u.includes(p)));
    });
    const myPaintingsCount = myPaintings.length;
    const myPaintingsTotal = myPaintings.reduce((sum, s) => sum + (Number(s.valor_pago_pintor) || Number(s.valor_estimado_pintor) || 0), 0);

    const filteredSales = sales.filter(task => {
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            const clienteMatch = (task.cliente_nome || '').toLowerCase().includes(q);
            const figuraMatch = (task.figuras?.nome || '').toLowerCase().includes(q);
            const contatoMatch = (task.cliente_contato || '').includes(q);
            const studioName = Array.isArray(task.figuras?.studios) 
                ? task.figuras.studios[0]?.nome 
                : task.figuras?.studios?.nome;
            const studioMatch = (studioName || '').toLowerCase().includes(q);
            const vendedorMatch = (task.vendedor_nome || task.vendedor || '').toLowerCase().includes(q);
            const pintorMatch = (task.pintor_nome || '').toLowerCase().includes(q);

            if (!clienteMatch && !figuraMatch && !contatoMatch && !studioMatch && !vendedorMatch && !pintorMatch) {
                return false;
            }
        }

        if (selectedFilter === 'my_paintings') {
            if (!task.pintor_nome) return false;
            const p = task.pintor_nome.toLowerCase();
            const u = currentUserName.toLowerCase();
            return p === u || (u && (p.includes(u) || u.includes(p)));
        }

        if (selectedFilter === 'available_paintings') {
            return !task.pintor_nome;
        }

        if (selectedFilter === 'urgent') {
            if (!task.data_venda) return false;
            const dataVenda = new Date(task.data_venda);
            const deadlineDate = new Date(dataVenda);
            deadlineDate.setDate(deadlineDate.getDate() + 45);
            const today = new Date();
            const diffDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            return diffDays <= 7;
        }

        if (selectedFilter === 'retirada') {
            return task.metodo_entrega === 'retirada';
        }

        if (selectedFilter === 'correios') {
            return task.metodo_entrega === 'envio';
        }

        return true;
    });

    return (
        <div className="min-h-screen bg-black text-white p-4 md:p-8 flex flex-col transition-colors duration-300 relative overflow-hidden">
            {/* Background UV/Water Blobs for Scifi Theme */}
            <div className="absolute inset-0 pointer-events-none opacity-20 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[150px] mix-blend-screen" />
                <div className="absolute top-[40%] right-[-10%] w-[30%] h-[30%] bg-indigo-500 rounded-full blur-[150px] mix-blend-screen" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
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

                {isPainter && (
                    <div className="flex items-center gap-3.5 bg-purple-950/40 border border-purple-500/30 px-5 py-3 rounded-2xl backdrop-blur-md shadow-lg shadow-purple-950/20 self-start md:self-auto">
                        <div className="p-2.5 bg-purple-500/20 text-purple-400 rounded-xl border border-purple-500/30">
                            <Paintbrush size={22} />
                        </div>
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-wider text-purple-300">Minhas Pinturas Ativas</div>
                            <div className="text-sm font-black text-white flex items-center gap-2">
                                <span>{myPaintingsCount} {myPaintingsCount === 1 ? 'peça' : 'peças'}</span>
                                <span className="text-zinc-500">•</span>
                                <span className="text-emerald-400">R$ {myPaintingsTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} a receber</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Search and Quick Filters Toolbar */}
            <div className="relative z-10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-6 bg-zinc-950/80 border border-zinc-900 rounded-2xl p-3 backdrop-blur-md shadow-xl">
                {/* Search Input */}
                <div className="relative flex-1 max-w-md">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Buscar por cliente, figura, estúdio, telefone..."
                        className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl pl-10 pr-9 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-blue-500/70 transition-all font-medium"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                        >
                            <X size={13} />
                        </button>
                    )}
                </div>

                {/* Filter Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
                    <button
                        type="button"
                        onClick={() => setSelectedFilter('all')}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0 ${
                            selectedFilter === 'all'
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-850'
                        }`}
                    >
                        Todos ({sales.length})
                    </button>

                    {isPainter && (
                        <button
                            type="button"
                            onClick={() => setSelectedFilter('my_paintings')}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 ${
                                selectedFilter === 'my_paintings'
                                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                                    : 'bg-purple-950/40 text-purple-300 border border-purple-500/20 hover:bg-purple-900/40'
                            }`}
                        >
                            <Paintbrush size={11} />
                            Minhas Pinturas ({myPaintingsCount})
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => setSelectedFilter('available_paintings')}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0 ${
                            selectedFilter === 'available_paintings'
                                ? 'bg-zinc-100 text-black shadow-md'
                                : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-850'
                        }`}
                    >
                        Pinturas Disponíveis
                    </button>

                    <button
                        type="button"
                        onClick={() => setSelectedFilter('urgent')}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0 ${
                            selectedFilter === 'urgent'
                                ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                                : 'bg-red-950/40 text-red-400 border border-red-500/20 hover:bg-red-900/40'
                        }`}
                    >
                        ⚠️ Urgentes
                    </button>

                    <button
                        type="button"
                        onClick={() => setSelectedFilter('retirada')}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0 ${
                            selectedFilter === 'retirada'
                                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                                : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-850'
                        }`}
                    >
                        Retirada
                    </button>

                    <button
                        type="button"
                        onClick={() => setSelectedFilter('correios')}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0 ${
                            selectedFilter === 'correios'
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                                : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-850'
                        }`}
                    >
                        Correios
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="relative z-10 flex-1 flex items-center justify-center p-12">
                    <Loader2 className="animate-spin text-blue-500 w-12 h-12 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                </div>
            ) : (
                <div className="relative z-10 flex-1 flex gap-5 overflow-x-auto pb-6 custom-scrollbar pr-4">
                    {COLUMNS.map((col) => {
                        const columnTasks = filteredSales.filter(s => s.status === col.id || (!s.status && col.id === 'Aguardando Pagamento'));

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
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (task.figuras?.imagem_url) {
                                                                        const studioName = Array.isArray(task.figuras.studios)
                                                                            ? task.figuras.studios[0]?.nome
                                                                            : task.figuras.studios?.nome;
                                                                        setExpandedImage({
                                                                            url: task.figuras.imagem_url,
                                                                            title: task.figuras?.nome || 'Figura',
                                                                            studio: studioName,
                                                                            horasPintura: Number(task.horas_pintura) || 0,
                                                                            valorPintura: Number(task.valor_pago_pintor) || Number(task.valor_estimado_pintor) || 0
                                                                        });
                                                                    }
                                                                }}
                                                                className={`text-left text-[13px] font-black text-white leading-snug tracking-tight mb-2 transition-all cursor-pointer hover:underline flex items-center justify-between gap-1.5 w-full group/name ${accent.titleHover}`}
                                                                title="Clique para expandir a imagem da figura"
                                                            >
                                                                <span className="truncate">{task.figuras?.nome || 'Item Desconhecido'}</span>
                                                                {task.figuras?.imagem_url && (
                                                                    <Maximize2 size={12} className="text-zinc-500 group-hover/name:text-white shrink-0 opacity-70 group-hover/name:opacity-100 transition-all" />
                                                                )}
                                                            </button>
                                                            
                                                            <div className="text-[11.5px] text-zinc-400 font-semibold flex items-center gap-1.5">
                                                                <span className="text-[8px] font-black uppercase tracking-wider text-zinc-500">Cliente</span>
                                                                <span className="text-zinc-200 font-black tracking-tight">{task.cliente_nome}</span>
                                                            </div>

                                                            {/* Pintura info e ação rápida */}
                                                            {(() => {
                                                                const valorPintura = Number(task.valor_pago_pintor) || Number(task.valor_estimado_pintor) || 0;
                                                                const horasPintura = Number(task.horas_pintura) || 0;
                                                                const hasPainter = Boolean(task.pintor_nome);
                                                                const isAssignedToMe = Boolean(
                                                                    hasPainter && currentUserName && (
                                                                        task.pintor_nome?.toLowerCase() === currentUserName.toLowerCase() ||
                                                                        currentUserName.toLowerCase().includes(task.pintor_nome!.toLowerCase()) ||
                                                                        task.pintor_nome!.toLowerCase().includes(currentUserName.toLowerCase())
                                                                    )
                                                                );

                                                                if (hasPainter) {
                                                                    return (
                                                                        <div className="flex items-center justify-between gap-1.5 mt-2.5 pt-2 border-t border-zinc-800/60">
                                                                            <div className="flex items-center gap-1.5 text-[9px] font-black text-purple-300 bg-purple-950/60 border border-purple-500/30 px-2 py-1 rounded-lg backdrop-blur-sm shadow-inner">
                                                                                <Paintbrush size={10} className="text-purple-400 shrink-0" />
                                                                                <span className="truncate max-w-[110px]">@{task.pintor_nome}</span>
                                                                                {valorPintura > 0 && (
                                                                                    <span className="text-emerald-400 font-bold ml-0.5">R$ {valorPintura.toFixed(2)}</span>
                                                                                )}
                                                                            </div>
                                                                            {(isAssignedToMe || hasRole('admin')) && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleReleasePainter(task.id);
                                                                                    }}
                                                                                    title="Liberar pintura desta peça"
                                                                                    className="text-[8px] font-bold text-zinc-500 hover:text-red-400 hover:underline transition-colors px-1 py-0.5"
                                                                                >
                                                                                    Liberar
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                }

                                                                return (
                                                                    <div className="flex items-center justify-between gap-1.5 mt-2.5 pt-2 border-t border-zinc-800/60">
                                                                        <div className="flex items-center gap-1 text-[9px] font-black text-zinc-400">
                                                                            <Paintbrush size={10} className="text-zinc-500 shrink-0" />
                                                                            {valorPintura > 0 ? (
                                                                                <span>Pintura: <strong className="text-emerald-400 font-black">R$ {valorPintura.toFixed(2)}</strong> {horasPintura > 0 && <span className="text-zinc-500 font-normal">({horasPintura}h)</span>}</span>
                                                                            ) : (
                                                                                <span className="text-zinc-500">Pintura s/ horas</span>
                                                                            )}
                                                                        </div>
                                                                        {isPainter && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleAssignPainter(task.id);
                                                                                }}
                                                                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-200 active:scale-95 shadow-md shadow-purple-900/30 hover:shadow-purple-700/50 shrink-0"
                                                                                title="Assumir a pintura desta peça para mim"
                                                                            >
                                                                                <Paintbrush size={9} />
                                                                                Puxar p/ mim
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })()}

                                                            {/* Checklist de Produção */}
                                                            {(() => {
                                                                const checklist = Array.isArray(task.checklist) ? task.checklist : [];
                                                                const doneCount = DEFAULT_CHECKLIST_STEPS.filter(def => checklist.find(c => c.id === def.id)?.done).length;
                                                                const isExpanded = expandedChecklistSaleId === task.id;
                                                                const pct = Math.round((doneCount / DEFAULT_CHECKLIST_STEPS.length) * 100);

                                                                return (
                                                                    <div className="mt-2.5 pt-2 border-t border-zinc-800/60">
                                                                        <div 
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setExpandedChecklistSaleId(isExpanded ? null : task.id);
                                                                            }}
                                                                            className="flex items-center justify-between gap-2 cursor-pointer group/chk select-none"
                                                                            title="Clique para ver ou marcar etapas de produção"
                                                                        >
                                                                            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-zinc-400 group-hover/chk:text-white transition-colors">
                                                                                <ListChecks size={11} className={doneCount === 5 ? "text-emerald-400" : "text-blue-400"} />
                                                                                <span>Etapas: <strong className={doneCount === 5 ? "text-emerald-400" : "text-zinc-200"}>{doneCount}/5</strong></span>
                                                                            </div>
                                                                            <div className="flex-1 max-w-[85px] h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                                                <div 
                                                                                    className={`h-full transition-all duration-300 ${doneCount === 5 ? "bg-emerald-400" : "bg-gradient-to-r from-blue-500 to-indigo-500"}`} 
                                                                                    style={{ width: `${pct}%` }} 
                                                                                />
                                                                            </div>
                                                                            <span className="text-[8px] font-bold text-zinc-500 group-hover/chk:text-zinc-300">
                                                                                {isExpanded ? '▲' : '▼'}
                                                                            </span>
                                                                        </div>

                                                                        {isExpanded && (
                                                                            <div 
                                                                                onClick={e => e.stopPropagation()}
                                                                                className="mt-2 p-2 bg-zinc-900/95 border border-zinc-800 rounded-xl space-y-1 shadow-xl animate-in fade-in duration-150"
                                                                            >
                                                                                {DEFAULT_CHECKLIST_STEPS.map(step => {
                                                                                    const isDone = checklist.find(c => c.id === step.id)?.done || false;
                                                                                    return (
                                                                                        <button
                                                                                            key={step.id}
                                                                                            type="button"
                                                                                            onClick={() => handleToggleChecklistItem(task.id, step.id)}
                                                                                            className={`w-full flex items-center gap-2 p-1.5 rounded-lg text-left text-[9px] font-bold transition-all ${
                                                                                                isDone 
                                                                                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                                                                                    : "hover:bg-zinc-800/80 text-zinc-400"
                                                                                            }`}
                                                                                        >
                                                                                            {isDone ? (
                                                                                                <CheckSquare size={12} className="text-emerald-400 shrink-0" />
                                                                                            ) : (
                                                                                                <Square size={12} className="text-zinc-600 shrink-0" />
                                                                                            )}
                                                                                            <span className={isDone ? "line-through opacity-85" : ""}>{step.label}</span>
                                                                                        </button>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })()}
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
                                                        {/* Botão Fotos dos Bastidores / WIP */}
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setWipModalSale(task);
                                                            }}
                                                            title={`Fotos dos Bastidores / WIP (${(task.wip_fotos || []).length} fotos)`}
                                                            className={`w-9 h-9 rounded-lg transition-all duration-200 active:scale-90 flex items-center justify-center relative ${
                                                                (task.wip_fotos && task.wip_fotos.length > 0)
                                                                    ? "text-amber-400 bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 hover:shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                                                                    : "text-zinc-400 hover:text-amber-400 bg-zinc-900/60 hover:bg-amber-500/10 border border-zinc-800/80 hover:border-amber-500/30"
                                                            }`}
                                                        >
                                                            <Camera size={13} />
                                                            {(task.wip_fotos && task.wip_fotos.length > 0) && (
                                                                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 text-black text-[8px] font-black rounded-full flex items-center justify-center shadow-sm">
                                                                    {task.wip_fotos.length}
                                                                </span>
                                                            )}
                                                        </button>
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

            {/* Modal de Imagem Expandida (Lightbox) */}
            {expandedImage && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200"
                    onClick={() => setExpandedImage(null)}
                >
                    <div 
                        className="relative max-w-4xl w-full bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl shadow-black/90 flex flex-col md:flex-row max-h-[90vh]"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button
                            onClick={() => setExpandedImage(null)}
                            className="absolute top-4 right-4 z-20 w-10 h-10 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-300 hover:text-white rounded-full flex items-center justify-center transition-all backdrop-blur-md shadow-lg"
                            title="Fechar (Esc)"
                        >
                            <X size={18} />
                        </button>

                        {/* Imagem em destaque */}
                        <div className="flex-1 bg-zinc-900/40 flex items-center justify-center p-4 md:p-6 overflow-hidden min-h-[300px] md:min-h-[500px]">
                            <img
                                src={expandedImage.url.split('?')[0]}
                                alt={expandedImage.title}
                                className="max-h-[60vh] md:max-h-[78vh] w-auto max-w-full object-contain rounded-2xl shadow-xl transition-all"
                            />
                        </div>

                        {/* Painel lateral de detalhes */}
                        <div className="w-full md:w-80 p-6 flex flex-col justify-between border-t md:border-t-0 md:border-l border-zinc-850 bg-zinc-950">
                            <div className="space-y-4">
                                {expandedImage.studio && (
                                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-md inline-block">
                                        {expandedImage.studio}
                                    </span>
                                )}

                                <h3 className="text-xl font-black text-white leading-tight">
                                    {expandedImage.title}
                                </h3>

                                {(expandedImage.valorPintura !== undefined && expandedImage.valorPintura > 0) && (
                                    <div className="p-3.5 bg-purple-950/40 border border-purple-500/30 rounded-2xl">
                                        <div className="flex items-center gap-2 text-[10px] font-black text-purple-300 uppercase tracking-wider mb-1">
                                            <Paintbrush size={13} className="text-purple-400" />
                                            Remuneração da Pintura
                                        </div>
                                        <div className="text-lg font-black text-emerald-400">
                                            R$ {expandedImage.valorPintura.toFixed(2)}
                                            {expandedImage.horasPintura && expandedImage.horasPintura > 0 && (
                                                <span className="text-xs font-normal text-zinc-400 ml-1.5">({expandedImage.horasPintura}h)</span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="pt-6 mt-4 border-t border-zinc-900 flex flex-col gap-2">
                                <a
                                    href={expandedImage.url.split('?')[0]}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-full bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all border border-zinc-800 text-center"
                                >
                                    <ExternalLink size={14} />
                                    Abrir Imagem em Alta Resolução
                                </a>
                                <button
                                    type="button"
                                    onClick={() => setExpandedImage(null)}
                                    className="w-full bg-zinc-950 hover:bg-zinc-900 text-zinc-400 font-bold py-2 px-4 rounded-xl text-xs transition-all text-center"
                                >
                                    Fechar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Fotos dos Bastidores (WIP) */}
            {wipModalSale && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200"
                    onClick={() => setWipModalSale(null)}
                >
                    <div 
                        className="relative max-w-2xl w-full bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl shadow-black/90 flex flex-col max-h-[90vh]"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-zinc-850 flex items-center justify-between bg-zinc-900/40">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                                    <Camera size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-white flex items-center gap-2">
                                        Fotos de Produção (Bastidores)
                                    </h3>
                                    <p className="text-xs text-zinc-400">
                                        {wipModalSale.figuras?.nome || 'Figura'} • <span className="text-zinc-300 font-semibold">{wipModalSale.cliente_nome}</span>
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setWipModalSale(null)}
                                className="w-9 h-9 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-300 hover:text-white rounded-full flex items-center justify-center transition-all"
                                title="Fechar (Esc)"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Banner Informativo */}
                        <div className="px-6 py-2.5 bg-cyan-950/20 border-b border-cyan-500/20 flex items-center gap-2.5 text-[11px] text-cyan-300">
                            <span className="shrink-0 text-base">📸</span>
                            <span>Estas fotos ficam visíveis instantaneamente para o cliente na página pública de rastreio da encomenda dele.</span>
                        </div>

                        {/* Upload Form */}
                        <div className="p-6 border-b border-zinc-850 bg-zinc-950 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                            <input
                                type="text"
                                placeholder="Legenda opcional (ex: Primer aplicado, olhos pintados...)"
                                value={wipCaption}
                                onChange={e => setWipCaption(e.target.value)}
                                className="flex-1 bg-zinc-900 border border-zinc-800 text-xs text-white px-3.5 py-2.5 rounded-xl placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500 transition-colors"
                            />
                            <label className={`cursor-pointer shrink-0 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all border ${
                                isUploadingWip 
                                    ? 'bg-zinc-900 border-zinc-800 text-zinc-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border-cyan-500/40 shadow-lg shadow-cyan-500/20 hover:scale-[1.02] active:scale-[0.98]'
                            }`}>
                                {isUploadingWip ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        <Plus size={14} />
                                        Adicionar Foto
                                    </>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    disabled={isUploadingWip}
                                    onChange={handleUploadWipPhoto}
                                    className="hidden"
                                />
                            </label>
                        </div>

                        {/* Gallery / Photos List */}
                        <div className="p-6 overflow-y-auto max-h-[420px] custom-scrollbar">
                            {(!wipModalSale.wip_fotos || wipModalSale.wip_fotos.length === 0) ? (
                                <div className="py-12 text-center flex flex-col items-center justify-center gap-3">
                                    <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600">
                                        <Camera size={26} />
                                    </div>
                                    <p className="text-sm font-semibold text-zinc-400">Nenhuma foto de bastidores ainda</p>
                                    <p className="text-xs text-zinc-500 max-w-sm">
                                        Envie fotos do processo de cura, lixamento, primer ou pintura. O cliente vai adorar acompanhar a produção!
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {wipModalSale.wip_fotos.map((photo) => (
                                        <div 
                                            key={photo.id}
                                            className="group relative aspect-square rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900 shadow-md flex flex-col justify-end"
                                        >
                                            <img
                                                src={photo.url}
                                                alt={photo.caption || 'Foto WIP'}
                                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                            {/* Gradient overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-80 group-hover:opacity-95 transition-opacity" />

                                            {/* Actions on hover */}
                                            <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                <a
                                                    href={photo.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="p-1.5 bg-black/70 hover:bg-black text-zinc-300 hover:text-white rounded-lg border border-white/10 backdrop-blur-md transition-colors"
                                                    title="Ver original"
                                                >
                                                    <ExternalLink size={12} />
                                                </a>
                                                <button
                                                    onClick={() => handleDeleteWipPhoto(photo.id)}
                                                    className="p-1.5 bg-red-950/80 hover:bg-red-900 text-red-300 hover:text-red-100 rounded-lg border border-red-500/30 backdrop-blur-md transition-colors"
                                                    title="Excluir foto"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>

                                            {/* Caption & Date */}
                                            <div className="relative z-10 p-2.5 text-left">
                                                {photo.caption && (
                                                    <p className="text-[11px] font-medium text-white line-clamp-2 mb-0.5 drop-shadow-sm">
                                                        {photo.caption}
                                                    </p>
                                                )}
                                                <p className="text-[9px] text-zinc-400">
                                                    {new Date(photo.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-zinc-850 bg-zinc-900/30 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setWipModalSale(null)}
                                className="bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white font-bold py-2 px-5 rounded-xl text-xs transition-all border border-zinc-800"
                            >
                                Concluir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
