'use client';

import React, { useMemo, useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { encodeCode128 } from '@/lib/barcode128';

export interface ShippingLabelData {
    // Chave e Protocolo
    chaveAcesso: string;
    protocoloAutorizacao?: string;
    dataHoraAutorizacao?: string;

    // Emitente (Franga Toys / Loja)
    emitenteRazao: string;
    emitenteCnpj: string;
    emitenteUf: string;
    emitenteIe: string;

    // Dados Fiscais da Operação
    serie: string | number;
    numeroNFe: string | number;
    dataEmissao: string; // Ex: '11/2026' ou '09/11/2026'
    tipoOperacao: '1' | '0'; // 1 = Saída, 0 = Entrada

    // Destinatário
    destinatarioNome: string;
    destinatarioCpfCnpj: string;
    destinatarioIe?: string;
    destinatarioEndereco: string; // Logradouro, Número, Complemento, Bairro
    destinatarioCep: string;
    destinatarioCidade: string;
    destinatarioUf: string;
    destinatarioTelefone?: string;

    // Totais e Informações Extras de Entrega Própria da Loja
    valorTotal: number;
    pedidoNumero?: string | number;
    itensResumo?: string;
    observacoesEntrega?: string;
    showExtrasLoja?: boolean; // Se true, exibe a barra inferior de entrega própria/frágil
}

interface ShippingLabelProps {
    data: ShippingLabelData;
    id?: string;
    scale?: number; // Para preview reduzido na interface se necessário
}

export const ShippingLabel: React.FC<ShippingLabelProps> = ({ data, id = 'shipping-thermal-label', scale = 1 }) => {
    // Código de barras da chave de acesso
    const cleanChave = (data.chaveAcesso || '').replace(/\D/g, '');
    const barcodeSvgRef = useRef<SVGSVGElement | null>(null);

    useEffect(() => {
        if (barcodeSvgRef.current && cleanChave) {
            try {
                JsBarcode(barcodeSvgRef.current, cleanChave, {
                    format: cleanChave.length === 44 && /^\d+$/.test(cleanChave) ? 'CODE128C' : 'CODE128',
                    width: 1.45,
                    height: 40,
                    displayValue: false,
                    margin: 0,
                    background: '#ffffff',
                    lineColor: '#000000',
                    flat: true
                });
            } catch (e) {
                console.error('Falha ao renderizar JsBarcode:', e);
            }
        }
    }, [cleanChave]);

    const formatCurrency = (val: number) => {
        return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    return (
        <div
            id={id}
            className="shipping-label-wrapper bg-white text-black font-sans box-border select-none"
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
            {/* Borda Externa Principal */}
            <div className="w-full h-full border-[1.5px] border-black flex flex-col justify-between text-[8pt] leading-tight box-border bg-white overflow-hidden">

                {/* 1. TOPO: TÍTULO DANFE SIMPLIFICADO */}
                <div className="border-b-[1.5px] border-black py-1 text-center bg-white">
                    <h1 className="text-[10pt] font-black tracking-wider uppercase m-0 leading-none">
                        DANFE SIMPLIFICADO - ETIQUETA
                    </h1>
                </div>

                {/* 2. CHAVE DE ACESSO COM CÓDIGO DE BARRAS */}
                <div className="border-b-[1.5px] border-black p-1 text-center bg-white">
                    <div className="text-[7pt] font-black uppercase tracking-wider text-left pl-1 mb-0.5">
                        CHAVE DE ACESSO
                    </div>
                    <div className="flex justify-center items-center my-0.5 px-1 overflow-hidden min-h-[38px]">
                        {cleanChave ? (
                            <svg
                                ref={barcodeSvgRef}
                                className="w-full h-[38px] max-h-[40px] block"
                            />
                        ) : (
                            <div className="h-[38px] flex items-center justify-center border border-dashed border-gray-400 text-gray-500 text-[7pt]">
                                Código de Barras (Chave não informada)
                            </div>
                        )}
                    </div>
                    <div className="text-[6.5pt] font-mono font-bold tracking-widest text-center mt-0.5">
                        {cleanChave ? cleanChave : '00000000000000000000000000000000000000000000'}
                    </div>
                </div>

                {/* 3. PROTOCOLO DE AUTORIZAÇÃO DE USO */}
                <div className="border-b-[1.5px] border-black py-1 px-1 text-center bg-white">
                    <div className="text-[7pt] font-black uppercase tracking-wider">
                        PROTOCOLO DE AUTORIZAÇÃO DE USO
                    </div>
                    <div className="text-[7pt] font-mono font-bold mt-0.5">
                        {data.protocoloAutorizacao || '135264727467603'} {data.dataHoraAutorizacao || '09/11/2026 12:00'}
                    </div>
                </div>

                {/* 4. EMITENTE (DADOS DA FRANGA TOYS) */}
                <div className="border-b-[1.5px] border-black p-1.5 space-y-0.5 bg-white text-[7pt]">
                    <div>
                        <span className="font-black uppercase">NOME/RAZÃO SOCIAL: </span>
                        <span className="font-bold">{data.emitenteRazao || 'FRANGA TOYS'}</span>
                    </div>
                    <div className="flex justify-between items-center pr-2">
                        <div>
                            <span className="font-black uppercase">CNPJ/CPF: </span>
                            <span className="font-mono">{data.emitenteCnpj || '67.566.499/0001-70'}</span>
                        </div>
                        <div>
                            <span className="font-black uppercase">UF: </span>
                            <span className="font-bold">{data.emitenteUf || 'SP'}</span>
                        </div>
                    </div>
                    <div>
                        <span className="font-black uppercase">IE: </span>
                        <span className="font-mono">{data.emitenteIe || '160422603112'}</span>
                    </div>
                </div>

                {/* 5. GRID: SÉRIE / EMISSÃO / OPERAÇÃO */}
                <div className="border-b-[1.5px] border-black grid grid-cols-3 divide-x-[1.5px] divide-black text-center text-[7pt] bg-white">
                    <div className="p-1 flex flex-col justify-center">
                        <div className="font-black uppercase">SÉRIE: {data.serie || '1'}</div>
                        <div className="font-black uppercase mt-0.5">Nº: {data.numeroNFe || '1'}</div>
                    </div>
                    <div className="p-1 flex flex-col justify-center">
                        <div className="font-black uppercase text-[6.5pt]">EMISSÃO</div>
                        <div className="font-mono font-bold mt-0.5">{data.dataEmissao || '11/2026'}</div>
                    </div>
                    <div className="p-1 flex items-center justify-between px-1.5 text-left">
                        <div className="text-[6pt] font-black leading-tight uppercase">
                            0 - ENTRADA<br />1 - SAÍDA
                        </div>
                        <div className="border-[1.5px] border-black font-black text-[9pt] px-1.5 py-0.5 ml-1">
                            {data.tipoOperacao || '1'}
                        </div>
                    </div>
                </div>

                {/* 6. DESTINATÁRIO */}
                <div className="border-b-[1.5px] border-black bg-white flex-1 flex flex-col justify-between">
                    <div className="text-[7.5pt] font-black text-center py-0.5 border-b border-black uppercase tracking-wider bg-gray-50/50">
                        DESTINATÁRIO
                    </div>
                    <div className="p-1.5 space-y-1 text-[7pt] flex-1">
                        <div>
                            <span className="font-black uppercase">NOME/RAZÃO SOCIAL: </span>
                            <span className="font-bold">{data.destinatarioNome}</span>
                        </div>
                        <div className="flex justify-between items-center pr-2">
                            <div>
                                <span className="font-black uppercase">CNPJ/CPF: </span>
                                <span className="font-mono">{data.destinatarioCpfCnpj || 'NÃO INFORMADO'}</span>
                            </div>
                            <div>
                                <span className="font-black uppercase">IE: </span>
                                <span className="font-mono">{data.destinatarioIe || 'N/I'}</span>
                            </div>
                        </div>
                        <div>
                            <span className="font-black uppercase">ENDEREÇO: </span>
                            <span>
                                {data.destinatarioEndereco}
                                {data.destinatarioCep ? ` - ${data.destinatarioCep}` : ''}
                                {data.destinatarioCidade ? ` - ${data.destinatarioCidade}` : ''}
                            </span>
                        </div>
                        <div className="flex justify-between items-center pr-2">
                            <div>
                                <span className="font-black uppercase">UF: </span>
                                <span className="font-bold">{data.destinatarioUf || 'SP'}</span>
                            </div>
                            {data.destinatarioTelefone && (
                                <div>
                                    <span className="font-black uppercase">TEL: </span>
                                    <span className="font-mono">{data.destinatarioTelefone}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 7. VALOR TOTAL DA NOTA FISCAL */}
                <div className="border-b-[1.5px] border-black px-2 py-1.5 flex justify-between items-center text-[7.5pt] bg-white">
                    <span className="font-black uppercase tracking-wider">
                        VALOR TOTAL DA NOTA FISCAL:
                    </span>
                    <span className="font-black font-mono text-[9pt]">
                        {formatCurrency(data.valorTotal)}
                    </span>
                </div>

                {/* 8. EXTRAS PARA O CENÁRIO DE ENTREGA PRÓPRIA DA LOJA */}
                {data.showExtrasLoja !== false && (
                    <div className="p-1.5 bg-gray-50 text-[6.5pt] leading-tight space-y-1">
                        <div className="flex justify-between items-center border-b border-black/40 pb-0.5">
                            <span className="font-black uppercase tracking-wider text-[7pt] flex items-center gap-1">
                                📦 ENTREGA PRÓPRIA DA LOJA
                                {data.pedidoNumero && (
                                    <span className="font-mono text-black"> (PEDIDO #{data.pedidoNumero})</span>
                                )}
                            </span>
                            <span className="border border-black px-1 py-0.2 rounded font-black text-[6pt] uppercase bg-black text-white">
                                ⚠️ FRÁGIL / RESINA 3D
                            </span>
                        </div>

                        {data.itensResumo && (
                            <div className="truncate">
                                <span className="font-black uppercase">CONTEÚDO: </span>
                                <span className="font-medium text-gray-800">{data.itensResumo}</span>
                            </div>
                        )}

                        {data.observacoesEntrega && (
                            <div className="truncate text-gray-700 italic">
                                <span className="font-bold uppercase not-italic">OBS: </span>
                                {data.observacoesEntrega}
                            </div>
                        )}

                        <div className="pt-1 flex justify-between items-end text-[5.5pt] text-gray-600">
                            <div>Franga Toys Ateliê 3D • Colecionáveis de Alta Resolução</div>
                            <div className="border-t border-black px-4 pt-0.5 text-center font-bold text-black uppercase">
                                Assinatura do Recebedor
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

