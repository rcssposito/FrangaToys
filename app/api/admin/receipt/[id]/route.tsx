import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export const runtime = 'edge';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // 1. Fetch Sale details
        const { data: sale, error } = await supabase
            .from('vendas')
            .select(`
                *,
                figuras ( 
                    nome, 
                    imagem_url,
                    studios ( nome )
                )
            `)
            .eq('id', id)
            .single();

        if (error || !sale) {
            console.error("Supabase Error fetching sale receipt:", error);
            return new Response('Receipt not found', { status: 404 });
        }

        const imageUrl = sale.figuras?.imagem_url || '';
        const studioName = (sale.figuras?.studios as any)?.nome || 'FrangaToys';
        const figureName = sale.figuras?.nome || 'Item Desconhecido';

        // Manual formatting to prevent Edge Runtime Intl crashes
        const d = new Date(sale.data_venda);
        const dataVenda = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        const formatMoney = (val: number) => val.toFixed(2).replace('.', ',');

        // Rotate Quotes pseudo-randomly based on sale ID
        const quotes = [
            `"The oldest and strongest emotion of mankind is fear, and the oldest and strongest kind of fear... is fear of the unknown."`,
            `"It was just a colour out of space — a frightful messenger from unformed realms of infinity beyond all Nature as we know it."`,
            `"That is not dead which can eternal lie, and with strange aeons even death may die."`,
            `"We had placed on exhibition something we did not understand."`
        ];
        const quoteIndex = Number(id) % quotes.length;
        const selectedQuote = quotes[quoteIndex];

        return new ImageResponse(
            (
                <div
                    style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        backgroundColor: '#0a0a0a',
                        fontFamily: 'Inter, "sans-serif"',
                        color: 'white',
                    }}
                >
                    {/* Header */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '30px 50px',
                            backgroundColor: '#18181b', // zinc-900
                            borderBottom: '2px solid #27272a', // zinc-800
                        }}
                    >
                        <img
                            src="https://ik.imagekit.io/lojinha3d/Franga%20Toys.png"
                            style={{ width: 220 }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                            <span style={{ fontSize: 36, fontWeight: 800, color: '#f97316', letterSpacing: '-0.02em' }}>
                                COMPROVANTE DE PEDIDO
                            </span>
                            <span style={{ fontSize: 24, color: '#a1a1aa', fontWeight: 500 }}>
                                #{sale.id.toString().padStart(6, '0')}
                            </span>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div style={{ display: 'flex', flex: 1, padding: '20px 50px', gap: '40px' }}>

                        {/* Left Column: Image (if available) */}
                        {imageUrl ? (
                            <img
                                src={imageUrl}
                                style={{
                                    width: '300px',
                                    height: '420px',
                                    objectFit: 'cover',
                                    borderRadius: '24px',
                                    border: '4px solid #27272a'
                                }}
                            />
                        ) : (
                            <div style={{
                                width: '300px',
                                height: '420px',
                                borderRadius: '24px',
                                backgroundColor: '#18181b',
                                border: '4px dashed #3f3f46',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <span style={{ color: '#52525b', fontSize: 32 }}>Sem Imagem</span>
                            </div>
                        )}

                        {/* Right Column: Details */}
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ color: '#a1a1aa', fontSize: 20, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Cliente</span>
                                <span style={{ fontSize: 36, fontWeight: 800 }}>{sale.cliente_nome}</span>
                                <span style={{ color: '#71717a', fontSize: 18 }}>Data: {dataVenda}</span>
                            </div>

                            <div style={{ height: '2px', backgroundColor: '#27272a', width: '100%', marginTop: 16, marginBottom: 16 }} />

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <span style={{ color: '#a1a1aa', fontSize: 24, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Produto</span>
                                <span style={{ fontSize: 32, fontWeight: 700, color: '#e4e4e7', lineHeight: 1.2 }}>{figureName}</span>
                                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
                                    <span style={{ fontSize: 18, color: '#f97316', backgroundColor: '#f9731620', padding: '6px 16px', borderRadius: 8, fontWeight: 600 }}>
                                        {studioName}
                                    </span>
                                    <span style={{ fontSize: 20, color: '#a1a1aa' }}>
                                        Quantidade: <span style={{ color: 'white', fontWeight: 800 }}>{sale.quantidade}x</span>
                                    </span>
                                </div>
                            </div>

                            {/* Fill space */}
                            <div style={{ display: 'flex', flex: 1 }} />

                            {/* Total Block */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                backgroundColor: '#18181b',
                                padding: '24px 30px',
                                borderRadius: '16px',
                                border: '2px solid #27272a',
                                marginBottom: 16
                            }}>
                                <span style={{ fontSize: 28, color: '#a1a1aa', fontWeight: 600 }}>Total Pago:</span>
                                <span style={{ fontSize: 48, fontWeight: 900, color: '#10b981', letterSpacing: '-0.02em' }}>
                                    R$ {formatMoney(sale.valor_venda_final)}
                                </span>
                            </div>
                        </div>

                    </div>

                    {/* Footer */}
                    <div
                        style={{
                            display: 'flex',
                            width: '100%',
                            backgroundColor: '#f97316',
                            padding: '12px 50px',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                    >
                        <span style={{ color: 'black', fontSize: 13, fontWeight: 700, fontStyle: 'italic', letterSpacing: '0.01em', textAlign: 'center' }}>
                            {selectedQuote}
                        </span>
                    </div>

                </div>
            ),
            {
                width: 1200,
                height: 800,
            }
        );
    } catch (e: any) {
        console.error("Receipt Generation Crash:", e);
        return new Response(`Failed to generate receipt`, { status: 500 });
    }
}
