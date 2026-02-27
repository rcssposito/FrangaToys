
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
                figuras (
                    nome,
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
                                <span style={{ fontSize: 26, fontWeight: '800', color: '#111' }}>{fig?.nome}</span>
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
                                <div style={{ display: 'flex', position: 'relative' }}>
                                    <img
                                        src={fig.imagem_url}
                                        style={{ width: '100%', height: 320, objectFit: 'cover', borderRadius: 16, border: '4px solid #f8fafc', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}
                                    />
                                    {sale.pintura_freelancer && (
                                        <div style={{ position: 'absolute', top: 12, right: 12, backgroundColor: '#d946ef', color: '#fff', padding: '4px 10px', fontSize: 11, fontWeight: '900', borderRadius: 6, boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                                            PINTURA EXTERNA
                                        </div>
                                    )}
                                </div>
                            )}
                            <div style={{ display: 'flex', background: '#000', padding: '10px', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 12 }}>
                                <span style={{ color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: '1px' }}>VENDEDOR: @{sale.vendedor?.split('@')[0].toUpperCase() || 'ATELIÊ'}</span>
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

                        {/* Production Checklist */}
                        <div style={{ display: 'flex', borderTop: '2px solid #f1f5f9', paddingTop: 25, justifyContent: 'space-between', alignItems: 'center', marginTop: sale.observacao ? 0 : 40 }}>
                            <div style={{ display: 'flex', gap: 30 }}>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <div style={{ width: 22, height: 22, border: '3px solid #ea580c', borderRadius: 5, marginRight: 8 }}></div>
                                    <span style={{ fontSize: 14, fontWeight: '800' }}>IMPRESSÃO</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <div style={{ width: 22, height: 22, border: '3px solid #ea580c', borderRadius: 5, marginRight: 8 }}></div>
                                    <span style={{ fontSize: 14, fontWeight: '800' }}>LIMPEZA</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <div style={{ width: 22, height: 22, border: '3px solid #ea580c', borderRadius: 5, marginRight: 8 }}></div>
                                    <span style={{ fontSize: 14, fontWeight: '800' }}>PINTURA</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 'bold' }}>CONTROLE DE QUALIDADE</span>
                                <span style={{ fontSize: 9, color: '#cbd5e1' }}>FRANGATOYS PRODUCTION v2.0</span>
                            </div>
                        </div>
                    </div>
                </div>
            ),
            {
                width: 800,
                height: 800,
            }
        );
    } catch (e) {
        return new Response('Error rendering OS', { status: 500 });
    }
}
