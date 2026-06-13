import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with Service Role to bypass RLS for views
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

        // 1. Fetch settings first (always id: 1)
        const { data: settings } = await supabase
            .from('pricing_params')
            .select('*')
            .eq('id', 1)
            .single();

        // 2. Fetch figure and technical details
        const { data: figure, error } = await supabase
            .from('figuras')
            .select(`
                nome,
                imagem_url, 
                tem_extras,
                studios(nome),
                figuras_meta(
                    resina_kg,
                    horas_impressao,
                    horas_pintura,
                    altura_cm, 
                    largura_cm, 
                    profundidade_cm, 
                    altura_original, 
                    largura_original, 
                    profundidade_original
                )
            `)
            .eq('id', id)
            .single();

        if (error || !figure) {
            console.error("Supabase Error fetching figure:", error);
            return new Response('Figure not found', { status: 404 });
        }

        const imageUrl = figure.imagem_url || '';
        const studioName = (figure.studios as any)?.nome || 'Studio FrangaToys';
        const meta = (Array.isArray(figure.figuras_meta) ? figure.figuras_meta[0] : figure.figuras_meta) as any || {};

        const formatDim = (current: any, original: any) => {
            const curr = Number(current) || 0;
            const orig = Number(original) || 0;
            if (orig > 0 && Math.abs(curr - orig) > 0.1) {
                return `${Math.round(curr)} (${Math.round(orig)}) cm`;
            }
            return `${Math.round(curr)} cm`;
        };

        const alturaStr = formatDim(meta.altura_cm, meta.altura_original);
        const larguraStr = formatDim(meta.largura_cm, meta.largura_original);
        const profundidadeStr = formatDim(meta.profundidade_cm, meta.profundidade_original);

        // Preço: Lógica unificada com o Catálogo
        const roundTo5 = (val: number) => Math.ceil(val / 5) * 5;
        const taxaCard = settings?.taxa_cartao || 1.15;
        const custoHPintura = settings?.custo_h_pintura || 50;

        // Custo Base Comum (Resina + Impressão)
        const custoBaseProducao = 
            ((meta.resina_kg || 0) * (settings?.custo_resina_kg || 250)) +
            ((meta.horas_impressao || 0) * (settings?.custo_h_impressao || 1));

        // Regra Sem Pintura: Apenas produção, sem custo de pintura
        const custoBaseEstilizado = custoBaseProducao;
        
        // Regra Padrão (Colorido): Usa horas reais de pintura
        const custoBasePadrao = custoBaseProducao + ((meta.horas_pintura || 0) * custoHPintura);

        const prices = {
            estilizado: roundTo5(custoBaseEstilizado * (settings?.margem_pobre || 1.15)),
            colorido: roundTo5(custoBasePadrao * (settings?.margem_basica || 1.30)),
        };

        const cardPrices = {
            estilizado: roundTo5(prices.estilizado * taxaCard),
            colorido: roundTo5(prices.colorido * taxaCard),
        };

        return new ImageResponse(
            (
                <div
                    style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        backgroundColor: '#000000',
                        position: 'relative',
                        color: 'white',
                    }}
                >
                    {/* FULL BACKGROUND IMAGE */}
                    {imageUrl && (
                        <img
                            src={imageUrl}
                            style={{
                                position: 'absolute',
                                inset: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                filter: 'contrast(1.1) brightness(0.6)',
                            }}
                        />
                    )}

                    {/* Gradient Overlay for Legibility */}
                    <div 
                        style={{ 
                            position: 'absolute', 
                            inset: 0, 
                            background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, transparent 30%, rgba(0,0,0,0.6) 70%, #000000 100%)' 
                        }} 
                    />

                    {/* LOGO */}
                    <img
                        src="https://ik.imagekit.io/lojinha3d/Franga%20Toys.png"
                        style={{
                            position: 'absolute',
                            top: 60,
                            left: 60,
                            width: 240,
                            filter: 'drop-shadow(0 0 30px rgba(0,0,0,0.5))',
                        }}
                    />

                    {/* MAIN CONTENT CONTAINER */}
                    <div
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            padding: '60px',
                            gap: 15,
                        }}
                    >
                        {/* Title Section (Glass Card - Opacity 0.6) */}
                        <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: 5,
                            backgroundColor: 'rgba(9, 9, 11, 0.6)',
                            padding: '30px 45px',
                            borderRadius: 30,
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            width: '100%',
                        }}>
                            <h1 style={{ fontSize: 56, fontWeight: 950, textTransform: 'uppercase', letterSpacing: -2, margin: 0, lineHeight: 1, color: 'white' }}>{figure.nome}</h1>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                                <span style={{ color: '#F97316', fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 4 }}>STUDIO: {studioName}</span>
                                
                                {/* Quick Specs */}
                                <div style={{ display: 'flex', gap: 35 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <span style={{ fontSize: 13, color: '#a1a1aa', fontWeight: 900, textTransform: 'uppercase' }}>Altura</span>
                                        <span style={{ fontSize: 26, fontWeight: 900 }}>{alturaStr}</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <span style={{ fontSize: 13, color: '#a1a1aa', fontWeight: 900, textTransform: 'uppercase' }}>Largura</span>
                                        <span style={{ fontSize: 26, fontWeight: 900 }}>{larguraStr}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Price Grid */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                            {/* Row 1: Sem Pintura & Colorido */}
                            <div style={{ display: 'flex', gap: 15 }}>
                                {/* Sem Pintura */}
                                <div style={{ 
                                    flex: 1, 
                                    backgroundColor: 'rgba(9, 9, 11, 0.7)', 
                                    border: '1px solid rgba(255, 255, 255, 0.12)', 
                                    borderRadius: 30, 
                                    padding: '40px 35px', 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    gap: 10 
                                }}>
                                    <span style={{ fontSize: 18, color: '#a1a1aa', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 2 }}>Sem Pintura</span>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: 44, fontWeight: 950, color: '#ffffff' }}>R$ {prices.estilizado.toFixed(0)} <span style={{ fontSize: 18, color: '#71717a', fontWeight: 900 }}>(PIX)</span></span>
                                        <span style={{ fontSize: 18, color: '#3b82f6', fontWeight: 800 }}>CRED R$ {cardPrices.estilizado.toFixed(0)}</span>
                                    </div>
                                </div>
                                {/* Colorido */}
                                <div style={{ 
                                    flex: 1, 
                                    backgroundColor: 'rgba(9, 9, 11, 0.7)', 
                                    border: '1px solid rgba(249, 115, 22, 0.25)', 
                                    borderRadius: 30, 
                                    padding: '40px 35px', 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    gap: 10 
                                }}>
                                    <span style={{ fontSize: 18, color: '#F97316', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 2 }}>Colorido</span>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: 44, fontWeight: 950, color: '#ffffff' }}>R$ {prices.colorido.toFixed(0)} <span style={{ fontSize: 18, color: '#F97316', fontWeight: 900 }}>(PIX)</span></span>
                                        <span style={{ fontSize: 18, color: '#fb923c', fontWeight: 800 }}>CRED R$ {cardPrices.colorido.toFixed(0)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Branding */}
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
                            <span style={{ fontSize: 14, color: '#71717a', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 10, opacity: 0.6 }}>FrangaToys • Digital Art Studio</span>
                        </div>
                    </div>
                </div>
            ),
            {
                width: 800,
                height: 1200,
            }
        );
    } catch (e) {
        console.error('Failed to generate image', e);
        return new Response(`Failed to generate image`, {
            status: 500,
        });
    }
}
