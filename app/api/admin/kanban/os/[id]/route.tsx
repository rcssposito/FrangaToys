
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const runtime = 'edge';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Fetch Sale/Kanban info
        const { data: sale, error } = await supabase
            .from('vendas')
            .select(`
                id,
                cliente_nome,
                data_venda,
                quantidade,
                observacao,
                pintura_freelancer,
                figura_id,
                vendedor,
                valor_venda_final,
                valor_frete,
                checkout_id,
                link_pagamento,
                figuras (
                    nome,
                    codigo,
                    imagem_url,
                    studios (nome),
                    figuras_meta (
                        altura_cm,
                        largura_cm,
                        profundidade_cm,
                        resina_kg,
                        horas_impressao,
                        horas_pintura
                    )
                )
            `)
            .eq('id', id)
            .single();

        if (error || !sale) {
            return new Response('Ordem de Serviço não encontrada', { status: 404 });
        }

        const fig = sale.figuras as any;
        const meta = (Array.isArray(fig?.figuras_meta) ? fig.figuras_meta[0] : fig?.figuras_meta) || {};
        const studio = (Array.isArray(fig?.studios) ? fig.studios[0] : fig?.studios) || {};

        // Fetch seller display name
        const { data: userData } = await supabase
            .from('admin_users')
            .select('nome')
            .eq('email', sale.vendedor)
            .single();

        const vendedorNome = userData?.nome || sale.vendedor?.split('@')[0].toUpperCase() || 'FRANGUINHA';

        // --- PAYMENT LOGIC ---
        // Fetch all items in the same checkout session for total calculation
        let alliedQuery = supabase
            .from('vendas')
            .select('valor_venda_final, valor_frete');

        if (sale.checkout_id) {
            alliedQuery = alliedQuery.eq('checkout_id', sale.checkout_id);
        } else {
            alliedQuery = alliedQuery
                .eq('cliente_nome', sale.cliente_nome)
                .eq('data_venda', sale.data_venda);
        }

        const { data: alliedSales } = await alliedQuery;
        const totalItemsPrice = (alliedSales || []).reduce((acc, s) => acc + (Number(s.valor_venda_final) || 0), 0);
        const totalFreight = (alliedSales || []).reduce((acc, s) => acc + (Number(s.valor_frete) || 0), 0);
        const valorTotalReal = totalItemsPrice + totalFreight;

        // Generate Pix Payload
        function generatePixPayload(key: string, name: string, amount: number) {
            name = name.substring(0, 25).normalize('NFD').replace(/[\u0300-\u036f]/g, "").toUpperCase();
            const city = "SAO PAULO";
            const amountStr = amount.toFixed(2);
            let payload = "00020126330014br.gov.bcb.pix" + `01${key.length.toString().padStart(2, '0')}${key}` + "520400005303986" + `54${amountStr.length.toString().padStart(2, '0')}${amountStr}` + "5802BR" + `59${name.length.toString().padStart(2, '0')}${name}` + `60${city.length.toString().padStart(2, '0')}${city}` + "62070503***6304";
            let crc = 0xFFFF;
            for (let i = 0; i < payload.length; i++) {
                crc ^= payload.charCodeAt(i) << 8;
                for (let j = 0; j < 8; j++) {
                    if ((crc & 0x8000) !== 0) crc = (crc << 1) ^ 0x1021;
                    else crc = crc << 1;
                }
            }
            return payload + (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
        }

        const pixPayload = generatePixPayload("43687871886", "Renan C S Sposito", valorTotalReal);
        const originUrl = sale.link_pagamento ? sale.link_pagamento : pixPayload;
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(originUrl)}`;
        const formatMoney = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        return new ImageResponse(
            (
                <div
                    style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        backgroundColor: '#ffffff',
                        padding: '40px 50px',
                        color: '#000000',
                        fontFamily: 'sans-serif',
                    }}
                >
                    {/* Header Section */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #000', paddingBottom: 20, marginBottom: 30 }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 10, height: 35, backgroundColor: '#ea580c', borderRadius: 3 }}></div>
                                <h1 style={{ fontSize: 38, margin: 0, fontWeight: '900', color: '#ea580c', letterSpacing: '-1px' }}>ORDEM DE SERVIÇO</h1>
                            </div>
                            <p style={{ fontSize: 18, color: '#444', margin: '5px 0 0 22px', fontWeight: '500' }}>Franga Toys - Ateliê de Impressão 3D</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <div style={{ display: 'flex', backgroundColor: '#000', color: '#fff', padding: '4px 12px', borderRadius: 6, marginBottom: 4 }}>
                                <span style={{ fontSize: 24, fontWeight: '900' }}>#{sale.id}</span>
                            </div>
                            <span style={{ fontSize: 16, color: '#666', fontWeight: 'bold' }}>{new Date(sale.data_venda).toLocaleDateString('pt-BR')}</span>
                        </div>
                    </div>

                    {/* Content Section */}
                    <div style={{ display: 'flex', gap: 40 }}>
                        {/* Info Column */}
                        <div style={{ display: 'flex', flexDirection: 'column', width: 420 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 20 }}>
                                <span style={{ fontSize: 12, textTransform: 'uppercase', color: '#999', fontWeight: '800', letterSpacing: '1px' }}>Cliente</span>
                                <span style={{ fontSize: 26, fontWeight: '800', color: '#111' }}>{sale.cliente_nome}</span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 20 }}>
                                <span style={{ fontSize: 12, textTransform: 'uppercase', color: '#999', fontWeight: '800', letterSpacing: '1px' }}>Peça / Modelo</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{ fontSize: 26, fontWeight: '800', color: '#111' }}>{fig?.nome}</span>
                                    {fig?.codigo && (
                                        <span style={{ fontSize: 14, fontWeight: '900', backgroundColor: '#000', color: '#fff', padding: '2px 8px', borderRadius: 4, marginTop: 4 }}>{fig.codigo}</span>
                                    )}
                                </div>
                                <span style={{ fontSize: 16, color: '#ea580c', fontWeight: 'bold', marginTop: 2 }}>Estúdio: {studio?.nome || 'N/A'}</span>
                            </div>

                            {/* Tech Specs */}
                            <div style={{ display: 'flex', background: '#f8fafc', padding: '15px 20px', borderRadius: 12, border: '1px solid #e2e8f0', flexDirection: 'column', marginBottom: 20 }}>
                                <span style={{ fontSize: 11, textTransform: 'uppercase', color: '#555', fontWeight: '900', borderBottom: '1px solid #e2e8f0', paddingBottom: 8, marginBottom: 12 }}>Ficha Técnica de Produção</span>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>Altura</span>
                                        <span style={{ fontSize: 18, fontWeight: '900', color: '#000' }}>{meta.altura_cm || '?'}cm</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>Resina</span>
                                        <span style={{ fontSize: 18, fontWeight: '900', color: '#000' }}>{meta.resina_kg ? (meta.resina_kg * 1000).toFixed(0) : '?'}g</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>Impressão</span>
                                        <span style={{ fontSize: 18, fontWeight: '900', color: '#000' }}>{meta.horas_impressao || '?'}h</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>Pintura</span>
                                        <span style={{ fontSize: 18, fontWeight: '900', color: '#000' }}>{meta.horas_pintura || '?'}h</span>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: 12, textTransform: 'uppercase', color: '#999', fontWeight: '800' }}>Quantidade</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: 42, fontWeight: '900', color: '#ea580c' }}>{sale.quantidade}x</span>
                                    <span style={{ fontSize: 24, fontWeight: '800', color: '#ea580c', paddingTop: 8 }}>Unidades</span>
                                </div>
                            </div>
                        </div>

                        {/* Image Column */}
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                            {fig?.imagem_url && (
                                <div style={{ 
                                    display: 'flex', 
                                    position: 'relative',
                                    height: 380,
                                    width: '100%',
                                    backgroundColor: '#ffffff',
                                    borderRadius: 16,
                                    border: '1px solid #f1f5f9',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                    overflow: 'hidden',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    padding: '20px',
                                    marginBottom: 12
                                }}>
                                    <img
                                        src={fig.imagem_url}
                                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                    />
                                    {sale.pintura_freelancer && (
                                        <div style={{ position: 'absolute', top: 12, right: 12, backgroundColor: '#d946ef', color: '#fff', padding: '4px 10px', fontSize: 11, fontWeight: '900', borderRadius: 6, boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                                            PINTURA EXTERNA
                                        </div>
                                    )}
                                </div>
                            )}
                            <div style={{ display: 'flex', background: '#000', padding: '12px', borderRadius: 10, justifyContent: 'center', alignItems: 'center' }}>
                                <span style={{ color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: '1px' }}>VENDEDOR: @{vendedorNome.toUpperCase()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Observations - Spaced out */}
                    <div style={{ display: 'flex', flexDirection: 'column', marginTop: 40 }}>
                        {sale.observacao && (
                            <div style={{ display: 'flex', padding: '15px 20px', borderLeft: '6px solid #ea580c', background: '#fffaf5', borderRadius: '0 10px 10px 0', flexDirection: 'column', marginBottom: 30 }}>
                                <span style={{ fontSize: 11, textTransform: 'uppercase', color: '#c2410c', fontWeight: '900', letterSpacing: '1px', marginBottom: 5 }}>Observações Especiais</span>
                                <p style={{ fontSize: 16, margin: 0, lineHeight: 1.5, color: '#333', fontWeight: '500' }}>{sale.observacao}</p>
                            </div>
                        )}

                        {/* Compact Horizontal Section */}
                        <div style={{ 
                            display: 'flex', 
                            borderTop: '2px solid #f1f5f9', 
                            paddingTop: 30, 
                            marginTop: sale.observacao ? 20 : 40,
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            {/* Checkboxes */}
                            <div style={{ display: 'flex', gap: 20 }}>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <div style={{ width: 18, height: 18, border: '2px solid #ea580c', borderRadius: 4, marginRight: 6 }}></div>
                                    <span style={{ fontSize: 13, fontWeight: '800' }}>IMPRESSÃO</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <div style={{ width: 18, height: 18, border: '2px solid #ea580c', borderRadius: 4, marginRight: 6 }}></div>
                                    <span style={{ fontSize: 13, fontWeight: '800' }}>LIMPEZA</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <div style={{ width: 18, height: 18, border: '2px solid #ea580c', borderRadius: 4, marginRight: 6 }}></div>
                                    <span style={{ fontSize: 13, fontWeight: '800' }}>PINTURA</span>
                                </div>
                            </div>

                            {/* Payment */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                backgroundColor: '#f8fafc',
                                padding: '10px 15px',
                                borderRadius: 12,
                                border: '1px solid #e2e8f0'
                            }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                    <span style={{ fontSize: 9, color: '#64748b', fontWeight: '900', textTransform: 'uppercase' }}>Total {sale.link_pagamento ? 'MP' : 'PIX'}</span>
                                    <span style={{ fontSize: 22, fontWeight: '900', color: '#000' }}>R$ {formatMoney(valorTotalReal)}</span>
                                </div>
                                <img src={qrCodeUrl} style={{ width: 70, height: 70 }} />
                            </div>

                            {/* Stamp */}
                            <div style={{
                                width: 150,
                                height: 150,
                                border: '2px dashed #cbd5e1',
                                borderRadius: 12,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: '#f8fafc'
                            }}>
                                <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: '900' }}>CARIMBO</span>
                                <span style={{ fontSize: 8, color: '#94a3b8', fontWeight: '900' }}>6x6</span>
                            </div>
                        </div>

                        {/* Quality Control labels */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', opacity: 0.5, marginTop: 15 }}>
                            <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 'bold', letterSpacing: '1px' }}>CONTROLE DE QUALIDADE / CONFERÊNCIA FINAL</span>
                            <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 'black' }}>FRANGATOYS PRODUCTION v2.3 (COMPACT LAYOUT)</span>
                        </div>
                    </div>
                </div>
            ),
            {
                width: 800,
                height: 1100,
            }
        );
    } catch (e) {
        return new Response('Error rendering OS', { status: 500 });
    }
}
