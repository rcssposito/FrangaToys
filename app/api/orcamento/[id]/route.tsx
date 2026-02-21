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

        // Fetch figure data and pricing from vw_figuras_orcamento
        const { data: figure, error } = await supabase
            .from('vw_figuras_orcamento')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !figure) {
            console.error("Supabase Error fetching figure:", error);
            return new Response('Figure not found', { status: 404 });
        }

        // Fetch original figure to get the image url and studio
        const { data: figureDetails } = await supabase
            .from('figuras')
            .select('imagem_url, studio_id, studios(nome)')
            .eq('id', id)
            .single();

        const imageUrl = figureDetails?.imagem_url || '';
        const studioName = figureDetails?.studios?.nome || 'N/A';

        return new ImageResponse(
            (
                <div
                    style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        backgroundColor: '#1E1E1E',
                        position: 'relative',
                        fontFamily: 'sans-serif',
                    }}
                >
                    {/* Background Image */}
                    {imageUrl && (
                        <img
                            src={imageUrl}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                opacity: 0.9,
                            }}
                        />
                    )}

                    {/* Top Right Logo/Watermark (Optional) */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 20,
                            right: 20,
                            display: 'flex',
                            color: 'rgba(255, 255, 255, 0.4)',
                            fontSize: 24,
                            fontWeight: 'bold',
                        }}
                    >
                        FRANGA TOYS
                    </div>

                    {/* Price Box */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            width: '80%',
                            backgroundColor: 'rgba(30,30,30, 0.85)',
                            borderRadius: 8,
                            marginBottom: 40,
                            padding: '16px',
                            fontFamily: 'sans-serif', // Added font family to fix some text rendering
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'center', color: 'white', fontSize: 32, paddingBottom: 10 }}>
                            Básico: R$ {(figure['Básico (R$)'] || 0).toFixed(2).replace('.', ',')}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', backgroundColor: '#E04A00', color: 'white', fontSize: 36, fontWeight: 'bold', padding: '10px 0', borderRadius: 4 }}>
                            Premium: R$ {(figure['Premium (R$)'] || 0).toFixed(2).replace('.', ',')}
                        </div>
                    </div>

                    {/* Footer Bar */}
                    <div
                        style={{
                            display: 'flex',
                            width: '100%',
                            backgroundColor: 'black',
                            padding: '20px 40px',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontFamily: 'sans-serif'
                        }}
                    >
                        {/* Title */}
                        <div style={{ display: 'flex', color: 'white', fontSize: 42, fontWeight: 'bold' }}>
                            {figure['Figure']}
                        </div>

                        {/* Details */}
                        <div style={{ display: 'flex', flexDirection: 'column', color: 'white', fontSize: 24, gap: 8 }}>
                            <div style={{ display: 'flex' }}>
                                📐 Altura: {figure['A (cm)']} cm
                            </div>
                            <div style={{ display: 'flex' }}>
                                📏 Largura: {figure['L (cm)']} cm
                            </div>
                            <div style={{ display: 'flex' }}>
                                📦 Profundidade: {figure['P (cm)']} cm
                            </div>
                            <div style={{ display: 'flex', color: '#E04A00', fontWeight: 'bold' }}>
                                🏷️ Estúdio: {studioName}
                            </div>
                        </div>
                    </div>
                </div>
            ),
            {
                width: 800,
                height: 1200, // Format similar to the print format ratio you shared
            }
        );
    } catch (e) {
        console.error('Failed to generate image', e);
        return new Response(`Failed to generate image`, {
            status: 500,
        });
    }
}
