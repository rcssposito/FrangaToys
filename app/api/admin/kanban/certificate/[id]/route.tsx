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

        const d = new Date(sale.data_venda);
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
                        padding: '80px',
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

                    {/* Logo - Absolute Corner */}
                    <img
                        src="https://ik.imagekit.io/lojinha3d/Franga%20Toys.png"
                        style={{ 
                            position: 'absolute',
                            top: 60,
                            right: 60,
                            width: 100,
                            display: 'flex'
                        }}
                    />

                    {/* Title Section */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 40, width: '100%', marginTop: 20 }}>
                        <div style={{ 
                            display: 'flex',
                            fontSize: 11, 
                            letterSpacing: '8px', 
                            color: '#fb923c', 
                            fontWeight: '800', 
                            textTransform: 'uppercase',
                            marginBottom: 10,
                            opacity: 0.8
                        }}>Documento de Autenticidade</div>
                        <div style={{ 
                            display: 'flex',
                            fontSize: 42, 
                            fontWeight: '900', 
                            color: '#ffffff', 
                            letterSpacing: '2px',
                            textAlign: 'center',
                            textTransform: 'uppercase'
                        }}>Certificado de Originalidade</div>
                    </div>

                    {/* Content Section */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginTop: 40, marginBottom: 40 }}>
                        <div style={{ 
                            display: 'flex',
                            fontSize: 14, 
                            color: '#71717a', 
                            textTransform: 'uppercase',
                            letterSpacing: '2px',
                            marginBottom: 12
                        }}>Certificado emitido para:</div>
                        
                        <div style={{ 
                            display: 'flex',
                            fontSize: 36, 
                            fontWeight: '800', 
                            color: '#ffffff', 
                            textAlign: 'center',
                            marginBottom: 40
                        }}>{String(sale.cliente_nome || 'Colecionador')}</div>

                        <div style={{ 
                            display: 'flex',
                            fontSize: 13, 
                            color: '#71717a', 
                            textTransform: 'uppercase',
                            letterSpacing: '2px',
                            marginBottom: 12
                        }}>Obra de Arte:</div>
                        
                        <div style={{ 
                            display: 'flex',
                            fontSize: 52, 
                            fontWeight: '900', 
                            color: '#f97316', 
                            textAlign: 'center',
                            marginBottom: 15
                        }}>{String(fig?.nome || 'Figura Colecionável')}</div>
                        
                        <div style={{ 
                            display: 'flex',
                            fontSize: 18, 
                            color: '#a1a1aa', 
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            letterSpacing: '4px',
                            marginBottom: 50
                        }}>Estúdio: {String(studio?.nome || 'FrangaToys')}</div>

                        <div style={{ display: 'flex', height: '1px', width: '100px', backgroundColor: '#3f3f46', marginBottom: 40 }} />

                        {/* Stats Row */}
                        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: 80 }}>
                                <div style={{ display: 'flex', fontSize: 11, color: '#52525b', fontWeight: '900', textTransform: 'uppercase', marginBottom: 8 }}>Série / ID</div>
                                <div style={{ display: 'flex', fontSize: 26, fontWeight: '800', color: '#e4e4e7' }}>#{String(sale.id).padStart(6, '0')}</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: 80 }}>
                                <div style={{ display: 'flex', fontSize: 11, color: '#52525b', fontWeight: '900', textTransform: 'uppercase', marginBottom: 8 }}>Data de Emissão</div>
                                <div style={{ display: 'flex', fontSize: 26, fontWeight: '800', color: '#e4e4e7' }}>{dataVenda}</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ display: 'flex', fontSize: 11, color: '#52525b', fontWeight: '900', textTransform: 'uppercase', marginBottom: 8 }}>Dimensões</div>
                                <div style={{ display: 'flex', fontSize: 26, fontWeight: '800', color: '#e4e4e7' }}>{meta.altura_cm || '??'} cm</div>
                            </div>
                        </div>
                    </div>

                    {/* QR Code - Absolute Corner */}
                    <div style={{ 
                        position: 'absolute',
                        bottom: 60,
                        left: 60,
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center' 
                    }}>
                        <div style={{ display: 'flex', padding: 10, backgroundColor: 'white', borderRadius: 10, marginBottom: 10 }}>
                            <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(req.nextUrl.origin + '/verificar/' + sale.id)}`} 
                                style={{ width: 110, height: 110 }} 
                            />
                        </div>
                        <div style={{ display: 'flex', fontSize: 9, color: '#52525b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>Token de Autenticidade</div>
                    </div>

                    {/* Footer Section */}
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', borderTop: '1px solid #27272a', paddingTop: 40 }}>
                        {/* Signature */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ 
                                display: 'flex',
                                fontSize: 42,
                                color: '#f97316',
                                fontWeight: '900',
                                letterSpacing: '2px',
                                marginBottom: 5
                            }}>Rodrigo S.</div>
                            <div style={{ display: 'flex', height: '1px', width: '220px', backgroundColor: '#f97316', marginBottom: 12 }} />
                            <div style={{ display: 'flex', fontSize: 11, color: '#71717a', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px' }}>
                                Artista Responsável / FrangaToys
                            </div>
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
