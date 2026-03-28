import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

        const { data: sale, error } = await supabase
            .from('vendas')
            .select(`
                id,
                cliente_nome,
                data_venda,
                figuras (
                    nome,
                    imagem_url,
                    studios (nome),
                    figuras_meta (
                        altura_cm
                    )
                )
            `)
            .eq('id', id)
            .single();

        if (error || !sale) {
            return new Response('Certificado não encontrado', { status: 404 });
        }

        const fig = sale.figuras as any;
        const meta = (Array.isArray(fig?.figuras_meta) ? fig.figuras_meta[0] : fig?.figuras_meta) || {};
        const studio = (Array.isArray(fig?.studios) ? fig.studios[0] : fig?.studios) || {};

        const d = new Date();
        const dataVenda = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

        return new ImageResponse(
            (
                <div
                    style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        backgroundColor: '#09090b',
                        backgroundImage: 'linear-gradient(135deg, #111114 0%, #09090b 100%)',
                        padding: '60px',
                        color: '#ffffff',
                        fontFamily: 'sans-serif',
                        border: '32px solid #18181b',
                    }}
                >
                    {/* Inner Decorative Border */}
                    <div style={{
                        position: 'absolute',
                        top: 20,
                        left: 20,
                        right: 20,
                        bottom: 20,
                        border: '1px solid #f97316',
                        opacity: 0.2,
                        display: 'flex',
                    }} />


                    {/* Title Section */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 50, width: '100%', marginTop: 20 }}>
                        <div style={{
                            display: 'flex',
                            fontSize: 48,
                            fontWeight: '900',
                            color: '#ffffff',
                            letterSpacing: '3px',
                            textAlign: 'center',
                            textTransform: 'uppercase'
                        }}>Certificado de Autenticidade</div>
                    </div>

                    {/* Body Content Section */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginBottom: 120 }}>
                        <div style={{
                            display: 'flex',
                            fontSize: 10,
                            color: '#71717a',
                            textTransform: 'uppercase',
                            letterSpacing: '2px',
                            marginBottom: 8
                        }}>Certificado emitido para:</div>

                        <div style={{
                            display: 'flex',
                            fontSize: 32,
                            fontWeight: '800',
                            color: '#ffffff',
                            textAlign: 'center',
                            marginBottom: 30
                        }}>{String(sale.cliente_nome || 'Colecionador')}</div>

                        <div style={{
                            display: 'flex',
                            fontSize: 10,
                            color: '#71717a',
                            textTransform: 'uppercase',
                            letterSpacing: '2px',
                            marginBottom: 8
                        }}>Obra:</div>

                        <div style={{
                            display: 'flex',
                            fontSize: 54,
                            fontWeight: '900',
                            color: '#f97316',
                            textAlign: 'center',
                            marginBottom: 10
                        }}>{String(fig?.nome || 'Figura Colecionável')}</div>

                        <div style={{
                            display: 'flex',
                            fontSize: 14,
                            color: '#a1a1aa',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            letterSpacing: '4px',
                            marginBottom: 110
                        }}>Estúdio: {String(studio?.nome || 'FrangaToys')}</div>

                        {/* Signature Area */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                            <div style={{ display: 'flex', height: '1px', width: '400px', backgroundColor: '#3f3f46', marginBottom: 15 }} />
                            <div style={{ display: 'flex', fontSize: 9, color: '#52525b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>Artista</div>
                        </div>
                    </div>

                    {/* Footer Row (QR | Stats | Logo) */}
                    <div style={{
                        position: 'absolute',
                        bottom: 40,
                        left: 60,
                        right: 60,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-end',
                    }}>
                        {/* Token / QR */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ display: 'flex', padding: 8, backgroundColor: 'white', borderRadius: 8, marginBottom: 8 }}>
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(req.nextUrl.origin + '/verificar/' + sale.id)}`}
                                    style={{ width: 90, height: 90 }}
                                />
                            </div>
                            <div style={{ display: 'flex', fontSize: 8, color: '#52525b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>Token Oficial</div>
                        </div>

                        {/* Technical Stats */}
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 15 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: 60 }}>
                                <div style={{ display: 'flex', fontSize: 9, color: '#52525b', fontWeight: '900', textTransform: 'uppercase', marginBottom: 5 }}>Série / ID</div>
                                <div style={{ display: 'flex', fontSize: 22, fontWeight: '800', color: '#e4e4e7' }}>#{String(sale.id).padStart(6, '0')}</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: 60 }}>
                                <div style={{ display: 'flex', fontSize: 9, color: '#52525b', fontWeight: '900', textTransform: 'uppercase', marginBottom: 5 }}>Data de Emissão</div>
                                <div style={{ display: 'flex', fontSize: 22, fontWeight: '800', color: '#e4e4e7' }}>{dataVenda}</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ display: 'flex', fontSize: 9, color: '#52525b', fontWeight: '900', textTransform: 'uppercase', marginBottom: 5 }}>Dimensões</div>
                                <div style={{ display: 'flex', fontSize: 22, fontWeight: '800', color: '#e4e4e7' }}>{meta.altura_cm || '??'} cm</div>
                            </div>
                        </div>

                        {/* Logo */}
                        <div style={{ display: 'flex', marginBottom: 10 }}>
                            <img
                                src="https://ik.imagekit.io/lojinha3d/Franga%20Toys.png"
                                style={{ width: 140 }}
                            />
                        </div>
                    </div>
                </div>
            ),
            {
                width: 1200,
                height: 800,
            }
        );
    } catch (e) {
        console.error("Certificate Generation Error:", e);
        return new Response('Error rendering Certificate', { status: 500 });
    }
}
