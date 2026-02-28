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

        // 1. Fetch prices and basic info from the view
        const { data: figure, error } = await supabase
            .from('vw_figuras_orcamento')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !figure) {
            console.error("Supabase Error fetching figure:", error);
            return new Response('Figure not found', { status: 404 });
        }

        // 2. Fetch technical details and images from tables
        const { data: details } = await supabase
            .from('figuras')
            .select(`
                imagem_url, 
                tem_extras,
                studios(nome),
                figuras_meta(
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

        const imageUrl = details?.imagem_url || '';
        const studioName = (details?.studios as any)?.nome || 'N/A';
        const meta = (Array.isArray(details?.figuras_meta) ? details?.figuras_meta[0] : details?.figuras_meta) as any || {};

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

        return new ImageResponse(
            (
                <div
                    style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        backgroundColor: '#121212',
                        position: 'relative',
                        fontFamily: 'Inter, "sans-serif"',
                    }}
                >
                    {/* Main Image Container */}
                    <div style={{ display: 'flex', flex: 1, position: 'relative', overflow: 'hidden' }}>
                        {imageUrl && (
                            <img
                                src={imageUrl}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                }}
                            />
                        )}

                        {/* Logo Top Left */}
                        <img
                            src="https://ik.imagekit.io/lojinha3d/Franga%20Toys.png"
                            style={{
                                position: 'absolute',
                                top: 40,
                                left: 40,
                                width: 220,
                            }}
                        />

                        {/* Extras Badge Top Right */}
                        {details?.tem_extras && (
                            <div
                                style={{
                                    position: 'absolute',
                                    top: 40,
                                    right: 40,
                                    backgroundColor: '#EA580C',
                                    color: 'white',
                                    padding: '12px 24px',
                                    borderRadius: '12px',
                                    fontSize: 28,
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                                    border: '2px solid rgba(255,255,255,0.2)'
                                }}
                            >
                                TEM EXTRAS
                            </div>
                        )}
                    </div>

                    {/* Footer Section */}
                    <div
                        style={{
                            display: 'flex',
                            width: '100%',
                            backgroundColor: 'black',
                            padding: '40px',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        {/* Left: Info details with Icons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'white', fontSize: 28, fontWeight: 600 }}>
                                <span style={{ fontSize: 32 }}>📏</span>
                                <span>Altura: <span style={{ color: '#aaa', marginLeft: 8 }}>{alturaStr}</span></span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'white', fontSize: 28, fontWeight: 600 }}>
                                <span style={{ fontSize: 32 }}>📐</span>
                                <span>Largura: <span style={{ color: '#aaa', marginLeft: 8 }}>{larguraStr}</span></span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'white', fontSize: 28, fontWeight: 600 }}>
                                <span style={{ fontSize: 32 }}>📦</span>
                                <span>Profundidade: <span style={{ color: '#aaa', marginLeft: 8 }}>{profundidadeStr}</span></span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'white', fontSize: 28, fontWeight: 600 }}>
                                <span style={{ fontSize: 32 }}>🏷️</span>
                                <span>Estúdio: <span style={{ color: '#EA580C', marginLeft: 8 }}>{studioName}</span></span>
                            </div>
                        </div>

                        {/* Right: Prices */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* Básico Bar */}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    backgroundColor: '#1E1E1E',
                                    borderRadius: 8,
                                    width: 380,
                                    height: 60,
                                    padding: '0 20px',
                                    border: '1px solid #333',
                                }}
                            >
                                <span style={{ flex: 1, textAlign: 'right', color: 'white', fontSize: 24, paddingRight: 10 }}>Básico:</span>
                                <span style={{ flex: 1, textAlign: 'left', color: 'white', fontSize: 26, fontWeight: 'bold' }}>R$ {(figure['Básico (R$)'] || 0).toFixed(2).replace('.', ',')}</span>
                            </div>
                            {/* Premium Bar */}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    backgroundColor: '#EA580C',
                                    borderRadius: 8,
                                    width: 380,
                                    height: 60,
                                    padding: '0 20px',
                                }}
                            >
                                <span style={{ flex: 1, textAlign: 'right', color: 'white', fontSize: 24, paddingRight: 10, fontWeight: 600 }}>Premium:</span>
                                <span style={{ flex: 1, textAlign: 'left', color: 'white', fontSize: 26, fontWeight: 'bold' }}>R$ {(figure['Premium (R$)'] || 0).toFixed(2).replace('.', ',')}</span>
                            </div>
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
