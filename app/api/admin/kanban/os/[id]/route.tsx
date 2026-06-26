
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generatePixPayload } from '@/lib/pix';

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

        const rawVendedor = userData?.nome || sale.vendedor?.split('@')[0] || 'FRANGUINHA';
        const vendedorNome = rawVendedor.toLowerCase().includes('rodrigo') ? 'frangatoys' : rawVendedor;

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



        const pixPayload = generatePixPayload("contato@frangatoys.com.br", "Bianca Machado Mastrocollo", valorTotalReal);
        const originUrl = sale.link_pagamento ? sale.link_pagamento : pixPayload;
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(originUrl)}`;
        const formatMoney = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        const dataVendaObj = new Date(sale.data_venda);
        const dataPrazoObj = new Date(sale.data_venda);
        dataPrazoObj.setDate(dataPrazoObj.getDate() + 45);
        const dataPrazo = dataPrazoObj.toLocaleDateString('pt-BR');
        
        // Retornar o Layout da Ordem de Serviço (Edge Runtime)
        return new ImageResponse(
            (
                <div
                    style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        backgroundColor: '#ffffff',
                        padding: '40px',
                        color: '#000000',
                        fontFamily: 'sans-serif',
                    }}
                >
                    {/* Header Section - Industrial Style */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '4px solid #000', paddingBottom: 15, marginBottom: 25 }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <h1 style={{ fontSize: 26, margin: 0, fontWeight: '900', color: '#000', letterSpacing: '-0.5px' }}>FICHA DE PRODUÇÃO // OS</h1>
                            <p style={{ fontSize: 14, color: '#64748b', margin: '2px 0 0 0', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px' }}>Franga Toys - Ateliê de Impressão 3D</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', borderRight: '2px solid #e2e8f0', paddingRight: 20 }}>
                                <span style={{ fontSize: 10, color: '#64748b', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Entrada</span>
                                <span style={{ fontSize: 16, color: '#000', fontWeight: 'bold' }}>{dataVendaObj.toLocaleDateString('pt-BR')}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', borderRight: '2px solid #e2e8f0', paddingRight: 20 }}>
                                <span style={{ fontSize: 10, color: '#ea580c', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Prazo Max (45d)</span>
                                <span style={{ fontSize: 16, color: '#ea580c', fontWeight: 'bold' }}>{dataPrazo}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#000', color: '#fff', padding: '8px 20px', borderRadius: 4 }}>
                                <span style={{ fontSize: 10, fontWeight: '600', letterSpacing: '1px', opacity: 0.8 }}>ID</span>
                                <span style={{ fontSize: 26, fontWeight: '900', lineHeight: 1 }}>#{sale.id}</span>
                            </div>
                        </div>
                    </div>

                    {/* Content Section */}
                    <div style={{ display: 'flex', gap: 30, flex: 1 }}>
                        
                        {/* LEFT COLUMN: Data & Details */}
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1.1, gap: 20 }}>
                            {/* Client & Product Block */}
                            <div style={{ display: 'flex', flexDirection: 'column', border: '2px solid #000', padding: 20 }}>
                                <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', paddingBottom: 15, marginBottom: 15 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                        <span style={{ fontSize: 11, color: '#64748b', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Cliente</span>
                                        <span style={{ fontSize: 24, fontWeight: '900', color: '#000', textTransform: 'uppercase' }}>{sale.cliente_nome}</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                                        <span style={{ fontSize: 11, color: '#64748b', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Qtd</span>
                                        <span style={{ fontSize: 32, fontWeight: '900', color: '#ea580c', lineHeight: 1 }}>{sale.quantidade}x</span>
                                    </div>
                                </div>
                                
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Modelo / Figura</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                                        <span style={{ fontSize: 28, fontWeight: '900', color: '#000', letterSpacing: '-0.5px' }}>{fig?.nome}</span>
                                        {fig?.codigo && (
                                            <span style={{ fontSize: 14, fontWeight: '900', backgroundColor: '#000', color: '#fff', padding: '4px 8px', borderRadius: 2 }}>{fig.codigo}</span>
                                        )}
                                    </div>
                                    <span style={{ fontSize: 14, color: '#ea580c', fontWeight: '800', marginTop: 4, textTransform: 'uppercase' }}>Estúdio: {studio?.nome || 'N/A'}</span>
                                </div>
                            </div>

                            {/* Technical Specifications (Blueprint Style) */}
                            <div style={{ display: 'flex', flexDirection: 'column', border: '2px solid #e2e8f0', backgroundColor: '#f8fafc', padding: 20 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 15 }}>
                                    <div style={{ width: 12, height: 12, backgroundColor: '#000' }}></div>
                                    <span style={{ fontSize: 14, color: '#000', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px' }}>Parâmetros Técnicos</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 15, borderTop: '1px solid #cbd5e1', paddingTop: 15 }}>
                                    {/* Primeira Linha: Tamanho */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 15, borderBottom: '1px dashed #cbd5e1' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                            <span style={{ fontSize: 10, color: '#64748b', fontWeight: '800', textTransform: 'uppercase' }}>Altura</span>
                                            <span style={{ fontSize: 22, fontWeight: '700', fontFamily: 'monospace', color: '#0f172a' }}>{meta.altura_cm || '--'} cm</span>
                                        </div>
                                        <div style={{ width: 1, backgroundColor: '#cbd5e1' }}></div>
                                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, alignItems: 'center' }}>
                                            <span style={{ fontSize: 10, color: '#64748b', fontWeight: '800', textTransform: 'uppercase' }}>Largura</span>
                                            <span style={{ fontSize: 22, fontWeight: '700', fontFamily: 'monospace', color: '#0f172a' }}>{meta.largura_cm || '--'} cm</span>
                                        </div>
                                        <div style={{ width: 1, backgroundColor: '#cbd5e1' }}></div>
                                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, alignItems: 'flex-end' }}>
                                            <span style={{ fontSize: 10, color: '#64748b', fontWeight: '800', textTransform: 'uppercase' }}>Profund.</span>
                                            <span style={{ fontSize: 22, fontWeight: '700', fontFamily: 'monospace', color: '#0f172a' }}>{meta.profundidade_cm || '--'} cm</span>
                                        </div>
                                    </div>
                                    {/* Segunda Linha: Tempo e Peso */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                            <span style={{ fontSize: 10, color: '#64748b', fontWeight: '800', textTransform: 'uppercase' }}>Peso (Resina)</span>
                                            <span style={{ fontSize: 22, fontWeight: '700', fontFamily: 'monospace', color: '#0f172a' }}>{meta.resina_kg ? (meta.resina_kg * 1000).toFixed(0) : '--'} g</span>
                                        </div>
                                        <div style={{ width: 1, backgroundColor: '#cbd5e1' }}></div>
                                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, alignItems: 'center' }}>
                                            <span style={{ fontSize: 10, color: '#64748b', fontWeight: '800', textTransform: 'uppercase' }}>T. Impressão</span>
                                            <span style={{ fontSize: 22, fontWeight: '700', fontFamily: 'monospace', color: '#0f172a' }}>{meta.horas_impressao || '--'} h</span>
                                        </div>
                                        <div style={{ width: 1, backgroundColor: '#cbd5e1' }}></div>
                                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, alignItems: 'flex-end' }}>
                                            <span style={{ fontSize: 10, color: '#64748b', fontWeight: '800', textTransform: 'uppercase' }}>T. Pintura</span>
                                            <span style={{ fontSize: 22, fontWeight: '700', fontFamily: 'monospace', color: '#0f172a' }}>{meta.horas_pintura || '--'} h</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Special Observations */}
                            {sale.observacao && (
                                <div style={{ display: 'flex', padding: 20, borderLeft: '8px solid #ea580c', background: '#fffaf5', flexDirection: 'column' }}>
                                    <span style={{ fontSize: 12, textTransform: 'uppercase', color: '#c2410c', fontWeight: '900', letterSpacing: '1px', marginBottom: 8 }}>Observações do Cliente / Pedido</span>
                                    <p style={{ fontSize: 18, margin: 0, lineHeight: 1.4, color: '#000', fontWeight: '600' }}>{sale.observacao}</p>
                                </div>
                            )}
                            
                            {/* Process Workflow Checkboxes */}
                            <div style={{ display: 'flex', marginTop: 20, border: '2px solid #000', padding: '15px 20px', justifyContent: 'center', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: 20 }}>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <div style={{ width: 20, height: 20, border: '3px solid #000', marginRight: 8 }}></div>
                                        <span style={{ fontSize: 14, fontWeight: '900', textTransform: 'uppercase' }}>Estilizado</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <div style={{ width: 20, height: 20, border: '3px solid #000', marginRight: 8 }}></div>
                                        <span style={{ fontSize: 14, fontWeight: '900', textTransform: 'uppercase' }}>Colorido</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <div style={{ width: 20, height: 20, border: '3px solid #000', marginRight: 8 }}></div>
                                        <span style={{ fontSize: 14, fontWeight: '900', textTransform: 'uppercase' }}>2D</span>
                                    </div>
                                </div>
                            </div>

                            {/* Recebimento / Declaração */}
                            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 20, border: '2px dashed #cbd5e1', padding: '15px 20px', backgroundColor: '#f8fafc' }}>
                                <p style={{ fontSize: 12, margin: 0, lineHeight: 1.5, color: '#1e293b', fontWeight: 'bold' }}>
                                    {`Declaro ter recebido o valor de R$ ${formatMoney(Number(sale.valor_venda_final) || 0)} referente à confecção de ${fig?.nome || 'figura personalizada'}.`}
                                </p>
                                <p style={{ fontSize: 11, margin: '8px 0 0 0', color: '#64748b', fontWeight: 'bold' }}>
                                    {`Franga Toys – CNPJ ${process.env.NEXT_PUBLIC_CNPJ || '67.566.499/0001-70'}`}
                                </p>
                                <p style={{ fontSize: 11, margin: '2px 0 0 0', color: '#64748b', fontWeight: 'bold' }}>
                                    {`Forma de pagamento: ${sale.link_pagamento ? 'Mercado Pago (Cartão/Link)' : 'Pix'}`}
                                </p>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Image, QR Code & Stamp */}
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 20 }}>
                            {/* Figure Image */}
                            {fig?.imagem_url && (
                                <div style={{ 
                                    display: 'flex', 
                                    position: 'relative',
                                    height: 480,
                                    width: '100%',
                                    backgroundColor: '#f8fafc',
                                    border: '2px solid #e2e8f0',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    padding: '20px'
                                }}>
                                    <img
                                        src={fig.imagem_url}
                                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                    />
                                    <div style={{ display: 'flex', position: 'absolute', bottom: 0, right: 0, backgroundColor: '#000', padding: '6px 12px' }}>
                                        <span style={{ color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: '2px' }}>REF: {fig.codigo || 'S/N'}</span>
                                    </div>
                                </div>
                            )}

                            {/* Seller & Tags */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <div style={{ display: 'flex', background: '#000', padding: '12px', justifyContent: 'center', alignItems: 'center' }}>
                                    <span style={{ color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: '1px' }}>VENDEDOR: @{vendedorNome.toUpperCase()}</span>
                                </div>
                                <div style={{ display: 'flex', background: '#000', padding: '12px', justifyContent: 'center', alignItems: 'center' }}>
                                     <span style={{ color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: '1px' }}>PINTOR(A): @{(() => {
                                         let rawPainter = (sale.pintura_freelancer && typeof sale.pintura_freelancer === 'string' ? sale.pintura_freelancer : vendedorNome) || '';
                                         let cleanPainter = rawPainter.split('@')[0];
                                         if (cleanPainter.toLowerCase().includes('rodrigo')) return 'FRANGATOYS';
                                         return cleanPainter.toUpperCase();
                                     })()}</span>
                                 </div>
                            </div>

                            {/* Lower Box: Payment & Stamp */}
                            <div style={{ display: 'flex', marginTop: 'auto', gap: 15 }}>
                                {/* Financial & QR */}
                                <div style={{
                                    display: 'flex',
                                    flex: 1,
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '2px solid #000',
                                    height: 140,
                                    gap: 5
                                }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <span style={{ fontSize: 10, color: '#64748b', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Total {sale.link_pagamento ? 'M.P.' : 'PIX'} {alliedSales && alliedSales.length > 1 ? `(${alliedSales.length} OS)` : ''}</span>
                                        <span style={{ fontSize: 20, fontWeight: '900', color: '#000', marginTop: 2 }}>R$ {formatMoney(valorTotalReal)}</span>
                                        {alliedSales && alliedSales.length > 1 && (
                                            <span style={{ fontSize: 10, color: '#ea580c', fontWeight: '900', marginTop: 2, letterSpacing: '0.5px' }}>PEÇA DA OS: R$ {formatMoney(Number(sale.valor_venda_final) || 0)}</span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', width: 80, height: 80, justifyContent: 'center', alignItems: 'center' }}>
                                        <img src={qrCodeUrl} style={{ width: 80, height: 80 }} />
                                    </div>
                                </div>

                                {/* Stamp Box - Empty for PDF Stamp */}
                                <div style={{
                                    width: 140,
                                    height: 140,
                                    border: '2px dashed #cbd5e1',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: '#fff'
                                }}>
                                    {/* Empty area meant for digital/physical stamp */}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Footer */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '2px solid #e2e8f0', paddingTop: 15, marginTop: 25 }}>
                        <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: '900', letterSpacing: '2px' }}>FRANGA TOYS // WORKSHOP PRINT</span>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <span style={{ fontSize: 8, color: '#94a3b8', fontWeight: 'bold' }}>LAYOUT v3.0</span>
                        </div>
                    </div>
                </div>
            ),
            {
                width: 850,
                height: 1200,
            }
        );
    } catch (e) {
        return new Response('Error rendering OS', { status: 500 });
    }
}