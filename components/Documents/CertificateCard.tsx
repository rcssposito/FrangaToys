'use client';

import React from 'react';
import { ShieldCheck, Award, Sparkles, CheckCircle2 } from 'lucide-react';

export interface CertificateData {
    id: number | string;
    accessToken?: string | null;
    figuraNome: string;
    figuraImagem?: string | null;
    studioNome?: string;
    clienteNome: string;
    alturaCm?: number | string | null;
    dataVenda: string;
    acabamento?: string;
    pintorNome?: string;
    resinaTipo?: string;
    siteUrl?: string;
    theme?: 'light' | 'dark';
    showPhoto?: boolean;
}

interface CertificateCardProps {
    data: CertificateData;
    id?: string;
    scale?: number;
}

export const CertificateCard: React.FC<CertificateCardProps> = ({
    data,
    id = 'certificate-card-print',
    scale = 1
}) => {
    const isDark = data.theme === 'dark';
    const formattedId = String(data.id).padStart(6, '0');
    const verifyToken = data.accessToken || data.id;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://frangatoys.com.br';
    const verifyUrl = `${origin}/verificar/${verifyToken}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(verifyUrl)}`;

    const dateFormatted = (() => {
        try {
            const d = new Date(data.dataVenda);
            return d.toLocaleDateString('pt-BR');
        } catch {
            return new Date().toLocaleDateString('pt-BR');
        }
    })();

    return (
        <div
            id={id}
            className={`certificate-card-wrapper box-border select-none relative overflow-hidden font-serif ${
                isDark ? 'bg-[#121214] text-[#f4efe6]' : 'bg-[#fcfbf9] text-[#1c1917]'
            }`}
            style={{
                width: '100mm',
                height: '150mm',
                maxWidth: '100mm',
                maxHeight: '150mm',
                padding: '4mm',
                backgroundColor: isDark ? '#121214' : '#fcfbf9',
                color: isDark ? '#f4efe6' : '#1c1917',
                transform: scale !== 1 ? `scale(${scale})` : undefined,
                transformOrigin: 'top left',
            }}
        >
            {/* Moldura Externa Dupla Clássica (Ouro Nobre) */}
            <div
                className={`w-full h-full border-[1.5px] p-1 relative flex flex-col justify-between box-border shadow-sm ${
                    isDark
                        ? 'border-[#d4af37]/80 bg-[#161619]'
                        : 'border-[#92400e]/80 bg-[#fffdfa]'
                }`}
            >
                {/* Moldura Interna com cantos ornamentais */}
                <div
                    className={`w-full h-full border-[0.8px] p-2 flex flex-col justify-between relative ${
                        isDark
                            ? 'border-[#d4af37]/40 bg-gradient-to-b from-[#d4af37]/[0.03] via-transparent to-[#d4af37]/[0.04]'
                            : 'border-[#b45309]/30 bg-gradient-to-b from-[#f59e0b]/[0.03] via-transparent to-[#f59e0b]/[0.04]'
                    }`}
                >
                    {/* Cantoneiras ornamentais nos 4 cantos */}
                    <div className={`absolute top-1 left-1 w-2.5 h-2.5 border-t-[1.5px] border-l-[1.5px] ${isDark ? 'border-[#d4af37]' : 'border-[#92400e]'}`} />
                    <div className={`absolute top-1 right-1 w-2.5 h-2.5 border-t-[1.5px] border-r-[1.5px] ${isDark ? 'border-[#d4af37]' : 'border-[#92400e]'}`} />
                    <div className={`absolute bottom-1 left-1 w-2.5 h-2.5 border-b-[1.5px] border-l-[1.5px] ${isDark ? 'border-[#d4af37]' : 'border-[#92400e]'}`} />
                    <div className={`absolute bottom-1 right-1 w-2.5 h-2.5 border-b-[1.5px] border-r-[1.5px] ${isDark ? 'border-[#d4af37]' : 'border-[#92400e]'}`} />

                    {/* 1. CABEÇALHO */}
                    <div className="text-center pt-0.5">
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                            <span className={`h-[1px] w-6 ${isDark ? 'bg-[#d4af37]/50' : 'bg-[#92400e]/50'}`} />
                            <span className={`text-[6.5pt] font-sans font-black tracking-[0.25em] uppercase ${isDark ? 'text-[#f5d77f]' : 'text-[#78350f]'}`}>
                                FRANGA TOYS ATELIÊ 3D
                            </span>
                            <span className={`h-[1px] w-6 ${isDark ? 'bg-[#d4af37]/50' : 'bg-[#92400e]/50'}`} />
                        </div>

                        <h1 className={`text-[12pt] font-black tracking-wider uppercase m-0 leading-tight ${isDark ? 'text-[#fff8e7]' : 'text-[#1c1917]'}`}>
                            Certificado de Autenticidade
                        </h1>
                        <div className={`text-[5.5pt] font-sans font-extrabold uppercase tracking-[0.2em] mt-0.5 ${isDark ? 'text-[#d4af37]' : 'text-[#b45309]'}`}>
                            Série Limitada • Colecionável de Galeria
                        </div>
                    </div>

                    {/* 2. DECLARAÇÃO */}
                    <div className="text-center px-1 my-0.5">
                        <p className={`text-[6pt] leading-tight font-sans italic ${isDark ? 'text-zinc-400' : 'text-stone-600'}`}>
                            Certificamos que esta escultura colecionável é autêntica e foi manufaturada sob rigoroso
                            processo artesanal, impressa em resina fotopolimerizável 8K e pintada individualmente à mão.
                        </p>
                    </div>

                    {/* 3. DADOS PRINCIPAIS DA OBRA (CARD EM DESTAQUE) */}
                    <div
                        className={`border rounded-md p-2 space-y-1 my-0.5 ${
                            isDark
                                ? 'bg-zinc-900/60 border-[#d4af37]/25'
                                : 'bg-[#fefce8]/40 border-[#b45309]/20'
                        }`}
                    >
                        {/* Nome da Obra + Foto (se ativa) */}
                        <div className="flex items-center gap-2 border-b border-amber-500/20 pb-1">
                            {data.showPhoto && data.figuraImagem && (
                                <div className="w-[18mm] h-[18mm] rounded border border-amber-500/30 overflow-hidden shrink-0 bg-black/40">
                                    <img
                                        src={data.figuraImagem}
                                        alt={data.figuraNome}
                                        className="w-full h-full object-cover object-center"
                                    />
                                </div>
                            )}
                            <div className="flex-1 text-center">
                                <span className={`text-[5pt] font-sans font-black uppercase tracking-widest block ${isDark ? 'text-[#d4af37]' : 'text-[#78350f]'}`}>
                                    Obra Colecionável
                                </span>
                                <span className={`text-[9.5pt] font-black tracking-tight leading-tight block ${isDark ? 'text-[#ffffff]' : 'text-[#1c1917]'}`}>
                                    {data.figuraNome}
                                </span>
                                {data.studioNome && (
                                    <span className={`text-[5.5pt] font-sans font-bold uppercase tracking-wider block mt-0.5 ${isDark ? 'text-zinc-400' : 'text-stone-600'}`}>
                                        Estúdio: {data.studioNome}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Proprietário e Especificações */}
                        <div className="grid grid-cols-2 gap-1.5 pt-0.5 text-[6.2pt] font-sans">
                            <div>
                                <span className={`text-[5pt] font-bold uppercase tracking-wider block ${isDark ? 'text-zinc-500' : 'text-stone-500'}`}>
                                    Proprietário Oficial:
                                </span>
                                <span className={`font-black truncate block ${isDark ? 'text-zinc-100' : 'text-stone-900'}`}>
                                    {data.clienteNome || 'Colecionador Franga Toys'}
                                </span>
                            </div>
                            <div>
                                <span className={`text-[5pt] font-bold uppercase tracking-wider block ${isDark ? 'text-zinc-500' : 'text-stone-500'}`}>
                                    Material / Resina:
                                </span>
                                <span className={`font-bold block ${isDark ? 'text-zinc-200' : 'text-stone-800'}`}>
                                    {data.resinaTipo || 'Acqua Art 3D Cure 8K'}
                                </span>
                            </div>
                            <div>
                                <span className={`text-[5pt] font-bold uppercase tracking-wider block ${isDark ? 'text-zinc-500' : 'text-stone-500'}`}>
                                    Escala / Altura:
                                </span>
                                <span className={`font-bold block ${isDark ? 'text-zinc-200' : 'text-stone-800'}`}>
                                    {data.alturaCm ? `${data.alturaCm} cm` : 'Proporcional 1:10'}
                                </span>
                            </div>
                            <div>
                                <span className={`text-[5pt] font-bold uppercase tracking-wider block ${isDark ? 'text-zinc-500' : 'text-stone-500'}`}>
                                    Acabamento:
                                </span>
                                <span className={`font-bold block ${isDark ? 'text-zinc-200' : 'text-stone-800'}`}>
                                    {data.acabamento || 'Pintura de Estúdio Manual'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 4. RODAPÉ COM QR CODE, SELO E ASSINATURA */}
                    <div className={`pt-1 border-t flex items-end justify-between gap-2 ${isDark ? 'border-[#d4af37]/25' : 'border-[#b45309]/20'}`}>
                        {/* QR Code de Autenticidade */}
                        <div className="flex flex-col items-center shrink-0">
                            <div className="p-1 bg-white border border-amber-600/30 rounded shadow-xs">
                                <img
                                    src={qrCodeUrl}
                                    alt="QR Autenticidade"
                                    className="w-[19mm] h-[19mm] block"
                                />
                            </div>
                            <span className={`text-[4.8pt] font-sans font-black tracking-widest uppercase mt-0.5 ${isDark ? 'text-[#f5d77f]' : 'text-[#78350f]'}`}>
                                Autenticidade Online
                            </span>
                        </div>

                        {/* Informações Centrais de Série e Data */}
                        <div className="flex-1 text-center font-sans space-y-0.5">
                            <div>
                                <span className={`text-[4.8pt] font-bold uppercase tracking-widest block ${isDark ? 'text-zinc-500' : 'text-stone-500'}`}>
                                    Número de Série Único
                                </span>
                                <span className={`font-mono font-black text-[9pt] tracking-wider ${isDark ? 'text-[#f5d77f]' : 'text-[#92400e]'}`}>
                                    #FT-{formattedId}
                                </span>
                            </div>
                            <div>
                                <span className={`text-[4.8pt] font-bold uppercase tracking-widest block ${isDark ? 'text-zinc-500' : 'text-stone-500'}`}>
                                    Data de Conclusão
                                </span>
                                <span className={`text-[6pt] font-bold ${isDark ? 'text-zinc-300' : 'text-stone-700'}`}>
                                    {dateFormatted}
                                </span>
                            </div>
                            <div className="pt-0.5">
                                <span className={`text-[5pt] uppercase tracking-widest font-mono font-bold ${
                                    isDark ? 'text-[#d4af37]/80' : 'text-[#92400e]/80'
                                }`}>
                                    EDIÇÃO COLECIONADOR
                                </span>
                            </div>
                        </div>

                        {/* Campo de Assinatura do Artista */}
                        <div className="flex flex-col items-center shrink-0 text-center font-sans w-[28mm]">
                            <div className={`w-full border-b pb-0.5 mb-0.5 ${isDark ? 'border-zinc-500' : 'border-stone-800/60'}`}>
                                <span className={`text-[7pt] font-serif italic font-bold ${isDark ? 'text-zinc-200' : 'text-stone-800'}`}>
                                    {data.pintorNome || 'Rodrigo C. Sposito'}
                                </span>
                            </div>
                            <span className={`text-[4.8pt] font-black uppercase tracking-widest block ${isDark ? 'text-zinc-400' : 'text-stone-600'}`}>
                                Artista Responsável
                            </span>
                            <span className={`text-[4.2pt] uppercase tracking-wider block ${isDark ? 'text-zinc-500' : 'text-stone-400'}`}>
                                Ateliê Franga Toys
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
