'use client';

import React from 'react';
import { Layers, Factory, Clock, Paintbrush, Package, CheckSquare, Wrench } from 'lucide-react';

export interface ServiceOrderData {
    id: number | string;
    checkoutId?: string;
    clienteNome: string;
    clienteTelefone?: string;
    clienteCidadeUf?: string;
    figuraNome: string;
    figuraCodigo?: string | null;
    figuraImagem?: string | null;
    studioNome?: string;
    alturaCm?: number | string | null;
    resinaKg?: number | string | null;
    horasImpressao?: number | string | null;
    horasPintura?: number | string | null;
    quantidade?: number;
    observacao?: string;
    vendedorNome?: string;
    pintorNome?: string;
    dataVenda: string;
    metodoEntrega?: string;
    valorTotal?: number;
}

interface ServiceOrderCardProps {
    data: ServiceOrderData;
    id?: string;
    scale?: number;
}

export const ServiceOrderCard: React.FC<ServiceOrderCardProps> = ({
    data,
    id = 'service-order-card-print',
    scale = 1
}) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://frangatoys.com.br';
    const kanbanUrl = `${origin}/admin/kanban?q=${data.id}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(kanbanUrl)}`;

    const dateFormatted = (() => {
        try {
            const d = new Date(data.dataVenda);
            return d.toLocaleDateString('pt-BR');
        } catch {
            return new Date().toLocaleDateString('pt-BR');
        }
    })();

    const CHECKLIST_ITEMS = [
        'Fatiamento / Suportes',
        'Impressão 3D',
        'Lavagem Ultrassônica',
        'Cura UV',
        'Lixamento / Encaixes',
        'Aplicação de Primer',
        'Pintura & Sombras',
        'Verniz de Proteção',
        'Embalagem & Envio'
    ];

    return (
        <div
            id={id}
            className="service-order-wrapper bg-white text-black font-sans box-border select-none"
            style={{
                width: '100mm',
                height: '150mm',
                maxWidth: '100mm',
                maxHeight: '150mm',
                padding: '2.5mm',
                backgroundColor: '#ffffff',
                color: '#000000',
                transform: scale !== 1 ? `scale(${scale})` : undefined,
                transformOrigin: 'top left',
            }}
        >
            <div className="w-full h-full border-[1.5px] border-black p-1.5 flex flex-col justify-between box-border bg-white text-[7.5pt] leading-tight">

                {/* 1. TOPO: HEADER DA ORDEM DE SERVIÇO */}
                <div className="border-b-[1.5px] border-black pb-1 mb-1">
                    <div className="flex justify-between items-center">
                        <div>
                            <span className="text-[6pt] font-black uppercase tracking-widest text-gray-600 block">
                                ATELIÊ FRANGA TOYS • FICHA TÉCNICA
                            </span>
                            <h1 className="text-[11pt] font-black uppercase tracking-tight m-0 leading-none">
                                ORDEM DE SERVIÇO #{data.id}
                            </h1>
                        </div>
                        <div className="text-right">
                            <span className="text-[6pt] font-mono font-bold block">
                                DATA: {dateFormatted}
                            </span>
                            <span className="text-[6pt] uppercase font-black px-1.5 py-0.5 rounded bg-black text-white mt-0.5 inline-block">
                                {data.metodoEntrega === 'retirada' ? 'RETIRADA' : 'ENVIO'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 2. DADOS DO CLIENTE & VENDEDOR */}
                <div className="border-b border-black/80 pb-1 mb-1 grid grid-cols-2 gap-1 text-[6.5pt]">
                    <div>
                        <span className="font-bold text-gray-600 uppercase block">CLIENTE:</span>
                        <span className="font-black text-black text-[7.5pt] truncate block">
                            {data.clienteNome}
                        </span>
                        {data.clienteTelefone && (
                            <span className="font-mono text-gray-700 block">
                                {data.clienteTelefone}
                            </span>
                        )}
                    </div>
                    <div className="text-right">
                        <span className="font-bold text-gray-600 uppercase block">RESPONSÁVEIS:</span>
                        <span className="font-bold block">
                            Vend: <strong className="text-black">{data.vendedorNome || 'Ateliê'}</strong>
                        </span>
                        <span className="font-bold block">
                            Pintura: <strong className="text-black">{data.pintorNome || 'Ateliê'}</strong>
                        </span>
                    </div>
                </div>

                {/* 3. PEÇA & METADADOS DE PRODUÇÃO */}
                <div className="border-b border-black/80 pb-1 mb-1 flex items-start gap-2">
                    {/* Thumbnail se disponível */}
                    {data.figuraImagem ? (
                        <div className="w-[18mm] h-[18mm] border border-black rounded shrink-0 overflow-hidden bg-gray-50 flex items-center justify-center">
                            <img
                                src={data.figuraImagem}
                                alt="Miniatura"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    ) : (
                        <div className="w-[18mm] h-[18mm] border border-dashed border-gray-400 rounded shrink-0 flex items-center justify-center text-[6pt] text-gray-500 font-bold text-center">
                            3D MODEL
                        </div>
                    )}

                    <div className="flex-1 min-w-0">
                        <span className="text-[6pt] font-bold text-gray-600 uppercase tracking-wider block">
                            {data.studioNome || 'Franga Toys'}
                        </span>
                        <h2 className="text-[8.5pt] font-black text-black leading-tight truncate">
                            {data.quantidade && data.quantidade > 1 ? `${data.quantidade}x ` : ''}
                            {data.figuraNome}
                        </h2>

                        {/* Grid Técnico */}
                        <div className="grid grid-cols-3 gap-1 mt-1 text-[6pt] bg-gray-100 p-1 rounded border border-gray-300">
                            <div>
                                <span className="text-gray-500 block">ALTURA:</span>
                                <strong className="text-black">{data.alturaCm ? `${data.alturaCm}cm` : 'N/I'}</strong>
                            </div>
                            <div>
                                <span className="text-gray-500 block">RESINA:</span>
                                <strong className="text-black">{data.resinaKg ? `${data.resinaKg}kg` : 'N/I'}</strong>
                            </div>
                            <div>
                                <span className="text-gray-500 block">MÁQUINA:</span>
                                <strong className="text-black">{data.horasImpressao ? `${data.horasImpressao}h` : 'N/I'}</strong>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. CHECKLIST DE BANCADA (9 ETAPAS) */}
                <div className="border-b border-black/80 pb-1 mb-1">
                    <span className="text-[6pt] font-black uppercase tracking-wider text-black block mb-0.5">
                        CHECKLIST DE BANCADA:
                    </span>
                    <div className="grid grid-cols-3 gap-y-1 gap-x-1 text-[6pt]">
                        {CHECKLIST_ITEMS.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 border-[1.2px] border-black rounded-[2px] inline-block shrink-0" />
                                <span className="truncate text-gray-800">{item}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 5. OBSERVAÇÕES ESPECIAIS */}
                {data.observacao && (
                    <div className="border-b border-black/80 pb-1 mb-1 text-[6pt]">
                        <span className="font-black uppercase text-black">OBSERVAÇÕES: </span>
                        <span className="italic text-gray-700">{data.observacao}</span>
                    </div>
                )}

                {/* 6. RODAPÉ COM QR CODE DE ACESSO AO KANBAN */}
                <div className="flex items-center justify-between pt-0.5">
                    <div className="text-[5.5pt] text-gray-600 font-mono">
                        <div>Escaneie o QR para abrir no Kanban</div>
                        <div className="font-bold text-black uppercase mt-0.5">
                            Ateliê Franga Toys • Produção & Qualidade
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        <div className="p-0.5 bg-white border border-black rounded">
                            <img
                                src={qrCodeUrl}
                                alt="QR Kanban"
                                className="w-[14mm] h-[14mm] block"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

