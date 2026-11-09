'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    Printer,
    FileText,
    Search,
    RotateCcw,
    Sparkles,
    CheckCircle2,
    Truck,
    Package,
    ShieldAlert,
    User,
    Building2,
    Hash,
    MapPin,
    Phone,
    DollarSign,
    Layers,
    AlertCircle,
    ChevronDown,
    Download,
    Award,
    Wrench,
    Clock,
    Palette
} from 'lucide-react';
import { toast } from 'sonner';
import { ShippingLabel, ShippingLabelData } from '@/components/Shipping/ShippingLabel';
import { CertificateCard, CertificateData } from '@/components/Documents/CertificateCard';
import { ServiceOrderCard, ServiceOrderData } from '@/components/Documents/ServiceOrderCard';
import { PackagingGuideModal } from '@/components/Shipping/PackagingGuideModal';
import { generateMockChaveNFe } from '@/lib/barcode128';

const DEFAULT_EMITENTE = {
    razao: 'FRANGA TOYS',
    cnpj: '67.566.499/0001-70',
    uf: 'SP',
    ie: '160422603112'
};

function getNowDateStrings() {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');

    return {
        emissao: `${mm}/${yyyy}`,
        dataHora: `${dd}/${mm}/${yyyy} ${hh}:${min}`
    };
}

const getStatusBadge = (status: string) => {
    switch (status) {
        case 'Pronto p/ Entrega':
            return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400';
        case 'Pintura Secagem':
            return 'bg-purple-500/15 border-purple-500/30 text-purple-400';
        case 'Lavagem e Cura':
            return 'bg-blue-500/15 border-blue-500/30 text-blue-400';
        case 'Imprimindo':
            return 'bg-orange-500/15 border-orange-500/30 text-orange-400';
        case 'Fila de Impressão':
            return 'bg-zinc-800 border-zinc-700 text-zinc-300';
        case 'Aguardando Pagamento':
            return 'bg-amber-500/15 border-amber-500/30 text-amber-400';
        case 'Concluída':
            return 'bg-zinc-800 border-zinc-700 text-zinc-500 line-through';
        default:
            return 'bg-zinc-800 border-zinc-700 text-zinc-300';
    }
};

function EtiquetasContent() {
    const searchParams = useSearchParams();
    const vendaIdParam = searchParams.get('vendaId');
    const dates = getNowDateStrings();

    // Seleção de Documento Ativo (Etiqueta, Certificado ou OS)
    const [activeDocument, setActiveDocument] = useState<'etiqueta' | 'certificado' | 'os'>('etiqueta');
    const [isPackagingGuideOpen, setIsPackagingGuideOpen] = useState(false);

    // Estado principal da etiqueta de envio
    const [labelData, setLabelData] = useState<ShippingLabelData>({
        chaveAcesso: generateMockChaveNFe({ uf: 'SP', cnpj: DEFAULT_EMITENTE.cnpj }),
        protocoloAutorizacao: '135264727467603',
        dataHoraAutorizacao: dates.dataHora,

        emitenteRazao: DEFAULT_EMITENTE.razao,
        emitenteCnpj: DEFAULT_EMITENTE.cnpj,
        emitenteUf: DEFAULT_EMITENTE.uf,
        emitenteIe: DEFAULT_EMITENTE.ie,

        serie: '1',
        numeroNFe: '11',
        dataEmissao: dates.emissao,
        tipoOperacao: '1',

        destinatarioNome: 'Lielso Bryan Pereira de Assis',
        destinatarioCpfCnpj: '028.297.531-43',
        destinatarioIe: 'N/I',
        destinatarioEndereco: 'Quadra 12 Módulo 7, 1 - Mestre D\'Armas Planaltin',
        destinatarioCep: '73401-098',
        destinatarioCidade: 'Brasília',
        destinatarioUf: 'DF',
        destinatarioTelefone: '(61) 98877-6655',

        valorTotal: 75.00,
        pedidoNumero: '1024',
        itensResumo: '1x Figura Personalizada Franga Toys',
        observacoesEntrega: 'Entrega direta pela loja - Cuidado ao manusear',
        showExtrasLoja: true
    });

    // Estado do Certificado de Autenticidade (Design Luxo Colecionador 10x15cm)
    const [certificateData, setCertificateData] = useState<CertificateData>({
        id: '1024',
        accessToken: null,
        figuraNome: 'Figura Personalizada Franga Toys',
        figuraImagem: null,
        studioNome: 'Franga Toys Studio',
        clienteNome: 'Lielso Bryan Pereira de Assis',
        alturaCm: '25',
        dataVenda: new Date().toISOString(),
        acabamento: 'Pintura de Estúdio Manual',
        pintorNome: 'Rodrigo C. Sposito',
        resinaTipo: 'Acqua Art 3D Cure 8K'
    });

    // Estado da Ordem de Serviço (Ficha Técnica de Bancada)
    const [serviceOrderData, setServiceOrderData] = useState<ServiceOrderData>({
        id: '1024',
        checkoutId: 'VENDA_1024',
        clienteNome: 'Lielso Bryan Pereira de Assis',
        clienteTelefone: '(61) 98877-6655',
        clienteCidadeUf: 'Brasília/DF',
        figuraNome: 'Figura Personalizada Franga Toys',
        figuraCodigo: 'FIG1024',
        figuraImagem: null,
        studioNome: 'Franga Toys Studio',
        alturaCm: '25',
        resinaKg: '0.350',
        horasImpressao: '7.5',
        horasPintura: '4.0',
        quantidade: 1,
        observacao: 'Entrega direta pela loja - Cuidado ao manusear',
        vendedorNome: 'Ateliê',
        pintorNome: 'Rodrigo C. Sposito',
        dataVenda: new Date().toISOString(),
        metodoEntrega: 'entrega_propria',
        valorTotal: 75.00
    });

    // Estados de busca de vendas do sistema
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);
    const [includeCompleted, setIncludeCompleted] = useState(false);

    // Busca rápida das vendas mais recentes ao carregar ou carrega venda via URL (?vendaId=...)
    useEffect(() => {
        if (vendaIdParam) {
            fetch(`/api/admin/shipping/sales?q=${encodeURIComponent(vendaIdParam)}&includeCompleted=true&limit=5`)
                .then(r => (r.ok ? r.json() : null))
                .then(data => {
                    if (data?.sales?.length > 0) {
                        const target = data.sales.find((s: any) => String(s.id) === String(vendaIdParam)) || data.sales[0];
                        handleSelectSale(target);
                    }
                })
                .catch(err => console.error(err));
        }
        fetchRecentSales('', includeCompleted);
    }, [vendaIdParam, includeCompleted]);

    const fetchRecentSales = async (term: string, showCompleted: boolean) => {
        try {
            setIsSearching(true);
            const res = await fetch(`/api/admin/shipping/sales?q=${encodeURIComponent(term)}&includeCompleted=${showCompleted ? 'true' : 'false'}&limit=20`);
            if (res.ok) {
                const json = await res.json();
                setSearchResults(json.sales || []);
            }
        } catch (err) {
            console.error('Erro ao buscar vendas:', err);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSearchQuery(val);
        fetchRecentSales(val, includeCompleted);
    };

    // Preenche todos os documentos automaticamente a partir da venda selecionada
    const handleSelectSale = (sale: any) => {
        setSelectedSaleId(sale.id);

        const client = sale.cliente || {};
        const fullAddress = [
            client.logradouro,
            client.numero ? `nº ${client.numero}` : '',
            client.complemento,
            client.bairro ? `Bairro ${client.bairro}` : ''
        ].filter(Boolean).join(', ');

        const now = new Date();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yyyy = now.getFullYear();

        const chaveFinal = sale.chave_nfe || generateMockChaveNFe({
            uf: client.uf || 'SP',
            cnpj: DEFAULT_EMITENTE.cnpj,
            numeroNFe: sale.id
        });

        // 1. Atualiza Etiqueta de Envio
        setLabelData(prev => ({
            ...prev,
            chaveAcesso: chaveFinal,
            numeroNFe: sale.id,
            dataEmissao: `${mm}/${yyyy}`,
            destinatarioNome: client.nome || 'Cliente',
            destinatarioCpfCnpj: client.cpf || '',
            destinatarioEndereco: fullAddress || 'Endereço a confirmar',
            destinatarioCep: client.cep || '',
            destinatarioCidade: client.cidade || '',
            destinatarioUf: client.uf || 'SP',
            destinatarioTelefone: client.telefone || '',
            valorTotal: sale.valor_total || 0,
            pedidoNumero: sale.id,
            itensResumo: `${sale.quantidade || 1}x ${sale.figura_nome}${sale.observacao ? ` (${sale.observacao})` : ''}`,
            observacoesEntrega: `Entrega da Loja • Pedido #${sale.id}`
        }));

        // 2. Atualiza Certificado de Autenticidade
        setCertificateData(prev => ({
            ...prev,
            id: sale.id,
            accessToken: sale.access_token || null,
            figuraNome: sale.figura_nome,
            figuraImagem: sale.figura_imagem || null,
            studioNome: sale.studio_nome || 'Franga Toys Studio',
            clienteNome: client.nome || 'Colecionador Franga Toys',
            alturaCm: sale.altura_cm || null,
            dataVenda: sale.data_venda,
            acabamento: 'Pintura de Estúdio Manual',
            pintorNome: sale.pintor_nome || 'Rodrigo C. Sposito',
            resinaTipo: 'Acqua Art 3D Cure 8K',
            showPhoto: Boolean(sale.figura_imagem)
        }));

        // 3. Atualiza Ordem de Serviço da Bancada
        setServiceOrderData({
            id: sale.id,
            checkoutId: sale.checkout_id,
            clienteNome: client.nome || 'Cliente',
            clienteTelefone: client.telefone || '',
            clienteCidadeUf: `${client.cidade || ''}/${client.uf || 'SP'}`,
            figuraNome: sale.figura_nome,
            figuraCodigo: sale.figura_codigo || `FIG${sale.id}`,
            figuraImagem: sale.figura_imagem || null,
            studioNome: sale.studio_nome || 'Franga Toys',
            alturaCm: sale.altura_cm || null,
            resinaKg: sale.resina_kg || null,
            horasImpressao: sale.horas_impressao || null,
            horasPintura: sale.horas_pintura || null,
            quantidade: sale.quantidade || 1,
            observacao: sale.observacao || '',
            vendedorNome: sale.vendedor || 'Ateliê',
            pintorNome: sale.pintor_nome || 'Ateliê',
            dataVenda: sale.data_venda,
            metodoEntrega: sale.metodo_entrega || 'entrega_propria',
            valorTotal: sale.valor_total || 0
        });

        toast.success(`Pedido #${sale.id} carregado (Etiqueta, Certificado e OS prontos)!`, {
            icon: <CheckCircle2 size={16} className="text-emerald-500" />
        });
    };

    // Consulta de CEP via ViaCEP para preenchimento ágil
    const handleCepLookup = async (cepInput: string) => {
        const clean = cepInput.replace(/\D/g, '');
        setLabelData(prev => ({ ...prev, destinatarioCep: cepInput }));

        if (clean.length === 8) {
            try {
                const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
                if (res.ok) {
                    const data = await res.json();
                    if (!data.erro) {
                        setLabelData(prev => ({
                            ...prev,
                            destinatarioEndereco: `${data.logradouro || ''}, , ${data.bairro || ''}`,
                            destinatarioCidade: data.localidade || prev.destinatarioCidade,
                            destinatarioUf: data.uf || prev.destinatarioUf
                        }));
                        toast.info(`Endereço localizado: ${data.localidade} - ${data.uf}`);
                    }
                }
            } catch (err) {
                console.error('Erro ao consultar ViaCEP:', err);
            }
        }
    };

    // Gerador de Chave de Acesso simulada / controle interno
    const handleGenerateNewKey = () => {
        const newKey = generateMockChaveNFe({
            uf: labelData.destinatarioUf || 'SP',
            cnpj: labelData.emitenteCnpj,
            numeroNFe: Number(labelData.numeroNFe) || 1
        });
        setLabelData(prev => ({ ...prev, chaveAcesso: newKey }));
        toast.success('Nova chave de 44 dígitos e código de barras gerados!');
    };

    // Disparar Impressão Térmica ou Colorida do Documento Ativo
    const handlePrint = () => {
        window.print();
    };

    return (
        <div>
            {/* Elemento que será renderizado exclusivamente durante a impressão (@media print) */}
            <div className="printable-document-active hidden print:block">
                {activeDocument === 'etiqueta' && (
                    <ShippingLabel data={labelData} id="shipping-thermal-label-print" />
                )}
                {activeDocument === 'certificado' && (
                    <CertificateCard data={certificateData} id="certificate-card-print" />
                )}
                {activeDocument === 'os' && (
                    <ServiceOrderCard data={serviceOrderData} id="service-order-card-print" />
                )}
            </div>

            {/* Interface interativa visível apenas na tela (oculta na impressão) */}
            <div className="print:hidden space-y-6">
                {/* Cabeçalho da Página */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--card-bg)] border border-[var(--card-border)] p-6 rounded-2xl shadow-sm">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-orange-500/10 border border-orange-500/20 text-orange-500 rounded-xl">
                            <Printer size={26} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-black tracking-tight text-[var(--foreground)] flex items-center gap-2">
                                Central de Expedição & Impressão
                                <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                    3 Documentos Integrados
                                </span>
                            </h1>
                            <p className="text-xs md:text-sm text-[var(--text-muted)] font-medium mt-0.5">
                                Geração de Etiqueta Térmica 100x150, Certificado de Autenticidade e Ordem de Serviço da bancada.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={() => setIsPackagingGuideOpen(true)}
                        className="px-4 py-3 font-bold uppercase text-xs tracking-wider rounded-xl transition-all border border-[var(--input-border)] bg-[var(--input-bg)] hover:bg-[var(--card-border)] text-[var(--foreground)] flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
                    >
                        <Package size={16} className="text-orange-500" />
                        <span className="hidden sm:inline">Checklist de Embalagem</span>
                        <span className="sm:hidden">Embalagem</span>
                    </button>

                    <button
                        type="button"
                        onClick={handlePrint}
                        className={`px-5 py-3 font-black uppercase text-xs tracking-wider rounded-xl transition-all shadow-lg active:scale-95 flex items-center gap-2 cursor-pointer ${
                            activeDocument === 'certificado'
                                ? 'bg-amber-500 hover:bg-amber-600 text-black shadow-amber-500/20'
                                : activeDocument === 'os'
                                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
                                : 'bg-orange-500 hover:bg-orange-600 text-black shadow-orange-500/20'
                        }`}
                    >
                        <Printer size={16} />
                        <span>
                            {activeDocument === 'etiqueta' && 'Imprimir Etiqueta Térmica'}
                            {activeDocument === 'certificado' && 'Imprimir Certificado (10x15)'}
                            {activeDocument === 'os' && 'Imprimir Ordem de Serviço'}
                        </span>
                    </button>
                </div>
            </div>

            {/* SELETOR DE ABAS DE DOCUMENTOS */}
            <div className="flex items-center gap-2 p-1.5 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl overflow-x-auto">
                <button
                    type="button"
                    onClick={() => setActiveDocument('etiqueta')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
                        activeDocument === 'etiqueta'
                            ? 'bg-orange-500 text-black shadow-md shadow-orange-500/20'
                            : 'text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--input-bg)]'
                    }`}
                >
                    <Printer size={15} />
                    <span>1. Etiqueta Térmica de Envio</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveDocument('certificado')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
                        activeDocument === 'certificado'
                            ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                            : 'text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--input-bg)]'
                    }`}
                >
                    <Award size={15} />
                    <span>2. Certificado de Autenticidade (Colecionador)</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveDocument('os')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
                        activeDocument === 'os'
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                            : 'text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--input-bg)]'
                    }`}
                >
                    <Layers size={15} />
                    <span>3. Ordem de Serviço (Bancada)</span>
                </button>
            </div>

            {/* Grid Principal: Painel de Controle à esquerda vs. Preview à direita */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* PAINEL DE CONTROLE (COLUNA ESQUERDA) */}
                <div className="lg:col-span-7 space-y-6">

                    {/* Card de Seleção de Venda */}
                    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-3 flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                                <Search size={15} className="text-orange-500" />
                                <span className="text-xs font-black uppercase tracking-wider text-[var(--foreground)]">
                                    Venda Selecionada para Expedição
                                </span>
                                <span className="text-[10px] text-[var(--text-muted)] font-bold">
                                    ({searchResults.length} {includeCompleted ? 'pedidos no total' : 'em andamento'})
                                </span>
                            </div>

                            <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-[var(--text-muted)] hover:text-[var(--foreground)] font-bold select-none">
                                <input
                                    type="checkbox"
                                    checked={includeCompleted}
                                    onChange={e => setIncludeCompleted(e.target.checked)}
                                    className="w-3.5 h-3.5 rounded text-orange-500 focus:ring-orange-500"
                                />
                                <span>Incluir finalizados</span>
                            </label>
                        </div>

                        {/* Campo de Busca Rápida */}
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={handleSearchChange}
                                placeholder="Buscar por cliente, pedido #, telefone ou checkout..."
                                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[var(--foreground)] placeholder-[var(--text-muted)] focus:outline-none focus:border-orange-500 transition-colors"
                            />
                        </div>

                        {/* Lista de Vendas Recentes / Resultados */}
                        <div className="max-h-52 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                            {isSearching ? (
                                <div className="text-center py-4 text-xs text-[var(--text-muted)]">
                                    Buscando vendas em andamento...
                                </div>
                            ) : searchResults.length === 0 ? (
                                <div className="text-center py-4 text-xs text-[var(--text-muted)]">
                                    Nenhuma venda pendente encontrada.
                                </div>
                            ) : (
                                searchResults.map((sale) => (
                                    <button
                                        key={sale.id}
                                        type="button"
                                        onClick={() => handleSelectSale(sale)}
                                        className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-3 text-xs cursor-pointer ${
                                            selectedSaleId === sale.id
                                                ? 'bg-orange-500/10 border-orange-500/50 shadow-sm'
                                                : 'bg-[var(--input-bg)] border-[var(--input-border)] hover:border-orange-500/30'
                                        }`}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="font-black text-[var(--foreground)] truncate">
                                                    #{sale.id} • {sale.cliente.nome}
                                                </span>
                                                <span className={`text-[8px] uppercase px-1.5 py-0.5 rounded font-black border ${getStatusBadge(sale.status)}`}>
                                                    {sale.status}
                                                </span>
                                                <span className="text-[8px] uppercase px-1.5 py-0.5 rounded font-bold bg-zinc-800 text-zinc-300">
                                                    {sale.metodo_entrega === 'retirada' ? 'Retirada' : 'Entrega'}
                                                </span>
                                            </div>
                                            <div className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">
                                                {sale.figura_nome} • {sale.cliente.cidade || 'Cidade N/I'}/{sale.cliente.uf || 'SP'}
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className="font-black text-emerald-400 block">
                                                R$ {Number(sale.valor_total || 0).toFixed(2)}
                                            </span>
                                            <span className="text-[9px] text-[var(--text-muted)]">
                                                {sale.data_venda ? new Date(sale.data_venda).toLocaleDateString('pt-BR') : ''}
                                            </span>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* FORMULÁRIO ESPECÍFICO DO DOCUMENTO ATIVO */}
                    {activeDocument === 'etiqueta' && (
                        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-5 shadow-sm space-y-5">
                            <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-3">
                                <span className="text-xs font-black uppercase tracking-wider text-[var(--foreground)] flex items-center gap-2">
                                    <FileText size={15} className="text-orange-500" />
                                    Dados da Etiqueta Térmica de Envio
                                </span>
                                <button
                                    type="button"
                                    onClick={handleGenerateNewKey}
                                    className="text-[10px] font-black uppercase tracking-wider text-orange-400 hover:text-orange-300 flex items-center gap-1 cursor-pointer"
                                    title="Gera nova chave com dígito verificador e código de barras"
                                >
                                    <Sparkles size={12} />
                                    <span>Regerar Chave 44d</span>
                                </button>
                            </div>

                            {/* Chave de Acesso */}
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-1">
                                        Chave de Acesso (44 dígitos numéricos)
                                    </label>
                                    <input
                                        type="text"
                                        value={labelData.chaveAcesso}
                                        onChange={e => setLabelData({ ...labelData, chaveAcesso: e.target.value.replace(/\D/g, '').slice(0, 44) })}
                                        placeholder="3526..."
                                        className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3.5 py-2 text-xs font-mono text-[var(--foreground)] focus:outline-none focus:border-orange-500 transition-colors"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-1">
                                            Protocolo Autorização
                                        </label>
                                        <input
                                            type="text"
                                            value={labelData.protocoloAutorizacao || ''}
                                            onChange={e => setLabelData({ ...labelData, protocoloAutorizacao: e.target.value })}
                                            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--foreground)] focus:outline-none focus:border-orange-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-1">
                                            Data / Hora Autorização
                                        </label>
                                        <input
                                            type="text"
                                            value={labelData.dataHoraAutorizacao || ''}
                                            onChange={e => setLabelData({ ...labelData, dataHoraAutorizacao: e.target.value })}
                                            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--foreground)] focus:outline-none focus:border-orange-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-1">
                                            Série / Nº Nota
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={labelData.serie}
                                                onChange={e => setLabelData({ ...labelData, serie: e.target.value })}
                                                placeholder="Série"
                                                className="w-16 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-2 py-2 text-xs font-mono text-[var(--foreground)] text-center focus:outline-none focus:border-orange-500"
                                            />
                                            <input
                                                type="text"
                                                value={labelData.numeroNFe}
                                                onChange={e => setLabelData({ ...labelData, numeroNFe: e.target.value })}
                                                placeholder="Nº"
                                                className="flex-1 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--foreground)] focus:outline-none focus:border-orange-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Emitente */}
                            <div className="space-y-3 pt-2 border-t border-[var(--card-border)]">
                                <span className="text-[11px] font-black uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                                    <Building2 size={13} /> Dados do Emitente (Sua Loja)
                                </span>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-1">
                                            Nome Fantasia / Razão Social
                                        </label>
                                        <input
                                            type="text"
                                            value={labelData.emitenteRazao}
                                            onChange={e => setLabelData({ ...labelData, emitenteRazao: e.target.value })}
                                            placeholder="FRANGA TOYS"
                                            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 py-2 text-xs font-bold text-[var(--foreground)] focus:outline-none focus:border-orange-500"
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="col-span-2">
                                            <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-1">
                                                CNPJ
                                            </label>
                                            <input
                                                type="text"
                                                value={labelData.emitenteCnpj}
                                                onChange={e => setLabelData({ ...labelData, emitenteCnpj: e.target.value })}
                                                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--foreground)] focus:outline-none focus:border-orange-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-1">
                                                UF
                                            </label>
                                            <input
                                                type="text"
                                                maxLength={2}
                                                value={labelData.emitenteUf}
                                                onChange={e => setLabelData({ ...labelData, emitenteUf: e.target.value.toUpperCase() })}
                                                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-2 py-2 text-xs font-mono text-center text-[var(--foreground)] focus:outline-none focus:border-orange-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Destinatário */}
                            <div className="space-y-3 pt-2 border-t border-[var(--card-border)]">
                                <span className="text-[11px] font-black uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                                    <User size={13} /> Dados do Destinatário
                                </span>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-1">
                                            Nome Completo
                                        </label>
                                        <input
                                            type="text"
                                            value={labelData.destinatarioNome}
                                            onChange={e => setLabelData({ ...labelData, destinatarioNome: e.target.value })}
                                            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 py-2 text-xs text-[var(--foreground)] focus:outline-none focus:border-orange-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-1">
                                            CPF / CNPJ
                                        </label>
                                        <input
                                            type="text"
                                            value={labelData.destinatarioCpfCnpj}
                                            onChange={e => setLabelData({ ...labelData, destinatarioCpfCnpj: e.target.value })}
                                            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--foreground)] focus:outline-none focus:border-orange-500"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-1">
                                            CEP
                                        </label>
                                        <input
                                            type="text"
                                            value={labelData.destinatarioCep}
                                            onChange={e => handleCepLookup(e.target.value)}
                                            placeholder="00000-000"
                                            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--foreground)] focus:outline-none focus:border-orange-500"
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-1">
                                            Endereço Completo
                                        </label>
                                        <input
                                            type="text"
                                            value={labelData.destinatarioEndereco}
                                            onChange={e => setLabelData({ ...labelData, destinatarioEndereco: e.target.value })}
                                            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 py-2 text-xs text-[var(--foreground)] focus:outline-none focus:border-orange-500"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="sm:col-span-2">
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-1">
                                            Cidade
                                        </label>
                                        <input
                                            type="text"
                                            value={labelData.destinatarioCidade}
                                            onChange={e => setLabelData({ ...labelData, destinatarioCidade: e.target.value })}
                                            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 py-2 text-xs text-[var(--foreground)] focus:outline-none focus:border-orange-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-1">
                                            UF
                                        </label>
                                        <input
                                            type="text"
                                            maxLength={2}
                                            value={labelData.destinatarioUf}
                                            onChange={e => setLabelData({ ...labelData, destinatarioUf: e.target.value.toUpperCase() })}
                                            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 py-2 text-xs font-mono text-center text-[var(--foreground)] focus:outline-none focus:border-orange-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Entrega Própria da Loja */}
                            <div className="space-y-3 pt-2 border-t border-[var(--card-border)]">
                                <span className="text-[11px] font-black uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                                    <Truck size={13} /> Detalhes da Entrega da Loja
                                </span>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-1">
                                            Valor Total (R$)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={labelData.valorTotal}
                                            onChange={e => setLabelData({ ...labelData, valorTotal: parseFloat(e.target.value) || 0 })}
                                            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--foreground)] focus:outline-none focus:border-orange-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-1">
                                            Telefone / WhatsApp
                                        </label>
                                        <input
                                            type="text"
                                            value={labelData.destinatarioTelefone || ''}
                                            onChange={e => setLabelData({ ...labelData, destinatarioTelefone: e.target.value })}
                                            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--foreground)] focus:outline-none focus:border-orange-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-1">
                                        Conteúdo / Peças
                                    </label>
                                    <input
                                        type="text"
                                        value={labelData.itensResumo || ''}
                                        onChange={e => setLabelData({ ...labelData, itensResumo: e.target.value })}
                                        className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 py-2 text-xs text-[var(--foreground)] focus:outline-none focus:border-orange-500"
                                    />
                                </div>

                                <div className="flex items-center gap-3 pt-1">
                                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[var(--foreground)]">
                                        <input
                                            type="checkbox"
                                            checked={labelData.showExtrasLoja !== false}
                                            onChange={e => setLabelData({ ...labelData, showExtrasLoja: e.target.checked })}
                                            className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500"
                                        />
                                        <span>Exibir rodapé de Entrega da Loja e Alerta de Peça Frágil</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* FORMULÁRIO DO CERTIFICADO DE AUTENTICIDADE */}
                    {activeDocument === 'certificado' && (
                        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-5 shadow-sm space-y-4">
                            <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-3">
                                <span className="text-xs font-black uppercase tracking-wider text-[var(--foreground)] flex items-center gap-2">
                                    <Award size={15} className="text-amber-500" />
                                    Dados do Certificado de Autenticidade (10x15cm)
                                </span>
                                <span className="text-[10px] font-mono text-amber-500 font-bold">
                                    #FT-{String(certificateData.id).padStart(6, '0')}
                                </span>
                            </div>

                            {/* Tema e Estilo Visual do Card */}
                            <div className="bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl p-3 space-y-2">
                                <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">
                                    Tema do Card de Colecionador (10x15cm)
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setCertificateData({ ...certificateData, theme: 'light' })}
                                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                                            (certificateData.theme || 'light') === 'light'
                                                ? 'bg-[#fcfbf9] text-stone-900 border-amber-600 shadow-xs ring-2 ring-amber-500/20'
                                                : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:text-white'
                                        }`}
                                    >
                                        <Sparkles size={13} className="text-amber-600" />
                                        <span>Clássico Marfim & Ouro</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCertificateData({ ...certificateData, theme: 'dark' })}
                                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                                            certificateData.theme === 'dark'
                                                ? 'bg-zinc-950 text-[#f5d77f] border-[#d4af37] shadow-xs ring-2 ring-[#d4af37]/30'
                                                : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:text-white'
                                        }`}
                                    >
                                        <Sparkles size={13} className="text-[#d4af37]" />
                                        <span>Obsidian Noir & Ouro</span>
                                    </button>
                                </div>

                                {certificateData.figuraImagem && (
                                    <div className="pt-2 flex items-center gap-2 border-t border-[var(--card-border)]">
                                        <label className="flex items-center gap-2 text-xs font-bold text-[var(--foreground)] cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={certificateData.showPhoto || false}
                                                onChange={e => setCertificateData({ ...certificateData, showPhoto: e.target.checked })}
                                                className="w-3.5 h-3.5 rounded text-amber-500 focus:ring-amber-500"
                                            />
                                            <span>Incluir miniatura da peça no certificado</span>
                                        </label>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-1">
                                        Nome da Obra
                                    </label>
                                    <input
                                        type="text"
                                        value={certificateData.figuraNome}
                                        onChange={e => setCertificateData({ ...certificateData, figuraNome: e.target.value })}
                                        className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 py-2 text-xs font-bold text-[var(--foreground)] focus:outline-none focus:border-amber-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-1">
                                        Estúdio de Modelagem
                                    </label>
                                    <input
                                        type="text"
                                        value={certificateData.studioNome || ''}
                                        onChange={e => setCertificateData({ ...certificateData, studioNome: e.target.value })}
                                        className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 py-2 text-xs text-[var(--foreground)] focus:outline-none focus:border-amber-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-1">
                                        Nome do Colecionador / Proprietário
                                    </label>
                                    <input
                                        type="text"
                                        value={certificateData.clienteNome}
                                        onChange={e => setCertificateData({ ...certificateData, clienteNome: e.target.value })}
                                        className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 py-2 text-xs text-[var(--foreground)] focus:outline-none focus:border-amber-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-1">
                                        Altura / Escala
                                    </label>
                                    <input
                                        type="text"
                                        value={certificateData.alturaCm || ''}
                                        onChange={e => setCertificateData({ ...certificateData, alturaCm: e.target.value })}
                                        placeholder="Ex: 28"
                                        className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 py-2 text-xs text-[var(--foreground)] focus:outline-none focus:border-amber-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-1">
                                        Tipo de Resina
                                    </label>
                                    <input
                                        type="text"
                                        value={certificateData.resinaTipo || 'Acqua Art 3D Cure 8K'}
                                        onChange={e => setCertificateData({ ...certificateData, resinaTipo: e.target.value })}
                                        className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 py-2 text-xs text-[var(--foreground)] focus:outline-none focus:border-amber-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-1">
                                        Acabamento da Peça
                                    </label>
                                    <input
                                        type="text"
                                        value={certificateData.acabamento || ''}
                                        onChange={e => setCertificateData({ ...certificateData, acabamento: e.target.value })}
                                        placeholder="Ex: Pintura de Estúdio Manual"
                                        className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 py-2 text-xs text-[var(--foreground)] focus:outline-none focus:border-amber-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-1">
                                        Artista / Pintor Responsável
                                    </label>
                                    <input
                                        type="text"
                                        value={certificateData.pintorNome || ''}
                                        onChange={e => setCertificateData({ ...certificateData, pintorNome: e.target.value })}
                                        placeholder="Ex: Rodrigo C. Sposito"
                                        className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 py-2 text-xs text-[var(--foreground)] focus:outline-none focus:border-amber-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-1">
                                        Número de Série
                                    </label>
                                    <input
                                        type="text"
                                        value={certificateData.id}
                                        onChange={e => setCertificateData({ ...certificateData, id: e.target.value })}
                                        className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--foreground)] focus:outline-none focus:border-amber-500"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* FORMULÁRIO DA ORDEM DE SERVIÇO */}
                    {activeDocument === 'os' && (
                        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-5 shadow-sm space-y-4">
                            <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-3">
                                <span className="text-xs font-black uppercase tracking-wider text-[var(--foreground)] flex items-center gap-2">
                                    <Wrench size={15} className="text-blue-500" />
                                    Ficha Técnica da Ordem de Serviço de Bancada
                                </span>
                                <span className="text-[10px] font-mono text-blue-400 font-bold">
                                    OS #{serviceOrderData.id}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-1">
                                        Peso Resina (kg)
                                    </label>
                                    <input
                                        type="text"
                                        value={serviceOrderData.resinaKg || ''}
                                        onChange={e => setServiceOrderData({ ...serviceOrderData, resinaKg: e.target.value })}
                                        placeholder="0.350"
                                        className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--foreground)] focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-1">
                                        Horas Impressão
                                    </label>
                                    <input
                                        type="text"
                                        value={serviceOrderData.horasImpressao || ''}
                                        onChange={e => setServiceOrderData({ ...serviceOrderData, horasImpressao: e.target.value })}
                                        placeholder="8.5"
                                        className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--foreground)] focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-1">
                                        Pintor da Bancada
                                    </label>
                                    <input
                                        type="text"
                                        value={serviceOrderData.pintorNome || ''}
                                        onChange={e => setServiceOrderData({ ...serviceOrderData, pintorNome: e.target.value })}
                                        className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 py-2 text-xs text-[var(--foreground)] focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] mb-1">
                                    Observações Especiais de Produção
                                </label>
                                <textarea
                                    rows={2}
                                    value={serviceOrderData.observacao || ''}
                                    onChange={e => setServiceOrderData({ ...serviceOrderData, observacao: e.target.value })}
                                    placeholder="Ex: Cuidado com a mecha de cabelo fina..."
                                    className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 py-2 text-xs text-[var(--foreground)] focus:outline-none focus:border-blue-500 resize-none"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* PREVIEW DO DOCUMENTO ATIVO (COLUNA DIREITA) */}
                <div className="lg:col-span-5 sticky top-6 space-y-4">
                    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-black uppercase tracking-wider text-[var(--foreground)] flex items-center gap-2">
                                {activeDocument === 'etiqueta' && <Printer size={15} className="text-orange-500" />}
                                {activeDocument === 'certificado' && <Award size={15} className="text-amber-500" />}
                                {activeDocument === 'os' && <Layers size={15} className="text-blue-500" />}
                                Preview:{' '}
                                {activeDocument === 'etiqueta' && 'Etiqueta Térmica (100x150mm)'}
                                {activeDocument === 'certificado' && 'Certificado Colecionador (10x15cm)'}
                                {activeDocument === 'os' && 'Ordem de Serviço (100x150mm)'}
                            </span>
                            <span className="text-[10px] font-mono text-[var(--text-muted)]">
                                100 x 150 mm
                            </span>
                        </div>

                        {/* Área do Preview com fundo neutro */}
                        <div className="p-4 bg-zinc-950/80 rounded-2xl flex items-center justify-center overflow-x-auto border border-zinc-800/80 shadow-inner">
                            <div className="shadow-2xl rounded-sm overflow-hidden border border-zinc-300">
                                {activeDocument === 'etiqueta' && (
                                    <ShippingLabel data={labelData} id="shipping-thermal-label-preview" />
                                )}
                                {activeDocument === 'certificado' && (
                                    <CertificateCard data={certificateData} id="certificate-card-preview" />
                                )}
                                {activeDocument === 'os' && (
                                    <ServiceOrderCard data={serviceOrderData} id="service-order-preview" />
                                )}
                            </div>
                        </div>

                        {/* Botões de Ação */}
                        <div className="space-y-2 pt-2">
                            <button
                                type="button"
                                onClick={handlePrint}
                                className={`w-full py-3.5 font-black uppercase text-xs tracking-widest rounded-xl transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2 cursor-pointer ${
                                    activeDocument === 'certificado'
                                        ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-amber-500/20'
                                        : activeDocument === 'os'
                                        ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-blue-600/20'
                                        : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black shadow-orange-500/20'
                                }`}
                            >
                                <Printer size={17} />
                                <span>
                                    {activeDocument === 'etiqueta' && 'Imprimir Etiqueta na Térmica'}
                                    {activeDocument === 'certificado' && 'Imprimir Certificado (10x15cm Colorido)'}
                                    {activeDocument === 'os' && 'Imprimir Ordem de Serviço'}
                                </span>
                            </button>

                            <p className="text-[10px] text-center text-[var(--text-muted)] font-medium">
                                💡 Dica: Para o Certificado em papel cartão/couché, selecione sua impressora comum colorida e configure o tamanho como <strong>100 x 150 mm (4x6 polegadas)</strong>.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
                {/* Modal de Guia de Embalagem & Fornecedores de Adesivos */}
                <PackagingGuideModal
                    isOpen={isPackagingGuideOpen}
                    onClose={() => setIsPackagingGuideOpen(false)}
                />
            </div>
        </div>
    );
}

export default function EtiquetasPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-[var(--text-muted)] text-xs font-bold">Carregando Central de Expedição...</div>}>
            <EtiquetasContent />
        </Suspense>
    );
}
