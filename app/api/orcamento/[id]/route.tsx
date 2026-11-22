import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { calculateFigurePrices, getFigureTier } from '@/lib/pricing';

// Initialize Supabase client with Service Role to bypass RLS for views
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const runtime = 'nodejs';

function getTierColors(tier: number) {
    switch (tier) {
        case 1:
            return { label: 'TIER 1', bg: 'rgba(59, 7, 100, 0.9)', text: '#d8b4fe', border: 'rgba(168, 85, 247, 0.45)' };
        case 2:
            return { label: 'TIER 2', bg: 'rgba(69, 26, 3, 0.9)', text: '#fcd34d', border: 'rgba(245, 158, 11, 0.45)' };
        case 3:
            return { label: 'TIER 3', bg: 'rgba(23, 37, 84, 0.9)', text: '#93c5fd', border: 'rgba(59, 130, 246, 0.45)' };
        case 4:
            return { label: 'TIER 4', bg: 'rgba(6, 78, 59, 0.9)', text: '#6ee7b7', border: 'rgba(16, 185, 129, 0.45)' };
        default:
            return { label: 'TIER 5', bg: 'rgba(24, 24, 27, 0.92)', text: '#d4d4d8', border: 'rgba(113, 113, 122, 0.45)' };
    }
}

function formatBrlInt(val: number): string {
    return Math.round(val).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function getLocalLogoBase64(): string {
    try {
        const logoPath = path.join(process.cwd(), 'public', 'franga-toys-logo.png');
        if (fs.existsSync(logoPath)) {
            const buf = fs.readFileSync(logoPath);
            return `data:image/png;base64,${buf.toString('base64')}`;
        }
    } catch {
        // fallback below
    }
    return 'https://ik.imagekit.io/lojinha3d/Franga%20Toys.png';
}

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
                is_bundle,
                desconto_bundle_pct,
                preco_fixo_bundle,
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
                    profundidade_original,
                    is_campanha_active,
                    desconto_campanha,
                    preco_fixo_campanha
                )
            `)
            .eq('id', id)
            .single();

        if (error || !figure) {
            console.error('Supabase Error fetching figure:', error);
            return new Response('Figure not found', { status: 404 });
        }

        const rawImageUrl = (figure.imagem_url || '').trim();
        let imageUrl = '';
        if (rawImageUrl) {
            const encodedUrl = encodeURI(rawImageUrl).replace(/%25/g, '%');
            // Satori (ImageResponse) não suporta .webp nativamente: converte via wsrv.nl para JPEG em Base64
            const targetFetchUrl = /\.webp(\?.*)?$/i.test(encodedUrl)
                ? `https://wsrv.nl/?url=${encodeURIComponent(encodedUrl)}&output=jpg&w=1000&q=85`
                : encodedUrl;
            try {
                const imgRes = await fetch(targetFetchUrl);
                if (imgRes.ok) {
                    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
                    const buf = Buffer.from(await imgRes.arrayBuffer());
                    if (buf.length > 0 && !contentType.includes('webp')) {
                        imageUrl = `data:${contentType.split(';')[0]};base64,${buf.toString('base64')}`;
                    }
                }
            } catch (imgErr) {
                console.warn('Falha ao pré-carregar imagem do orçamento:', imgErr);
            }
            if (!imageUrl) {
                imageUrl = targetFetchUrl;
            }
        }

        const logoSrc = getLocalLogoBase64();
        const studioData = Array.isArray(figure.studios) ? figure.studios[0] : figure.studios;
        const studioName = (studioData as any)?.nome || 'Studio FrangaToys';
        const meta = (Array.isArray(figure.figuras_meta) ? figure.figuras_meta[0] : figure.figuras_meta) as any || {};

        const formatDim = (current: any, original: any) => {
            const curr = Number(current) || 0;
            const orig = Number(original) || 0;
            if (orig > 0 && Math.abs(curr - orig) > 0.1) {
                return `${Math.round(curr)} (${Math.round(orig)}) cm`;
            }
            return curr > 0 ? `${Math.round(curr)} cm` : '-';
        };

        const alturaStr = formatDim(meta.altura_cm, meta.altura_original);
        const larguraStr = formatDim(meta.largura_cm, meta.largura_original);
        const profundidadeStr = formatDim(meta.profundidade_cm, meta.profundidade_original);

        // Precificação oficial unificada (inclui campanhas e combos)
        const metaWithBundle = {
            ...meta,
            is_bundle: figure.is_bundle,
            desconto_bundle_pct: figure.desconto_bundle_pct,
            preco_fixo_bundle: figure.preco_fixo_bundle,
        };

        const calculated = calculateFigurePrices(metaWithBundle, settings || {
            id: 1,
            custo_resina_kg: 190,
            custo_h_impressao: 1,
            custo_h_pintura: 70,
            margem_pobre: 1.15,
            margem_basica: 1.30,
            margem_premium: 1.60,
            taxa_cartao: 1.15,
        });

        const isCampanha = Boolean(
            meta?.is_campanha_active &&
            ((meta?.desconto_campanha && meta.desconto_campanha > 0) || (meta?.preco_fixo_campanha && meta.preco_fixo_campanha > 0))
        );

        const hasEstilizadoDiscount = Boolean(
            calculated.original_pix_estilizado && calculated.original_pix_estilizado > calculated.pix_estilizado
        );
        const hasColoridoDiscount = Boolean(
            calculated.original_pix_colorido && calculated.original_pix_colorido > calculated.pix_colorido
        );

        const tier = getFigureTier(calculated.colorido);
        const tierStyle = getTierColors(tier);

        const titleFontSize = figure.nome.length > 34 ? 40 : figure.nome.length > 24 ? 46 : 52;

        return new ImageResponse(
            (
                <div
                    style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        backgroundColor: '#050507',
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
                                filter: 'contrast(1.08) brightness(0.78)',
                            }}
                        />
                    )}

                    {/* Gradient Overlay for Legibility (deixa o topo livre para a escultura brilhar) */}
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(to bottom, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0) 24%, rgba(5,5,7,0.55) 62%, #050507 95%)'
                        }}
                    />

                    {/* LOGO */}
                    <img
                        src={logoSrc}
                        style={{
                            position: 'absolute',
                            top: 44,
                            left: 44,
                            width: 215,
                            filter: 'drop-shadow(0 6px 24px rgba(0,0,0,0.7))',
                        }}
                    />

                    {/* BADGE OFERTA NO TOPO DIREITO (SE ATIVA) */}
                    {isCampanha && (
                        <div
                            style={{
                                position: 'absolute',
                                top: 52,
                                right: 44,
                                display: 'flex',
                                alignItems: 'center',
                                backgroundColor: 'rgba(147, 51, 234, 0.92)',
                                border: '1px solid rgba(216, 180, 254, 0.5)',
                                borderRadius: 999,
                                padding: '10px 22px',
                                fontSize: 18,
                                fontWeight: 900,
                                letterSpacing: 3,
                                textTransform: 'uppercase',
                                color: '#ffffff',
                            }}
                        >
                            {meta.desconto_campanha ? `OFERTA -${meta.desconto_campanha}%` : 'OFERTA ESPECIAL'}
                        </div>
                    )}

                    {/* MAIN CONTENT CONTAINER */}
                    <div
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            padding: '44px',
                            gap: 14,
                        }}
                    >
                        {/* Title & Specs Card (Dark Matte Luxury) */}
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 14,
                                backgroundColor: 'rgba(9, 9, 11, 0.86)',
                                padding: '26px 34px',
                                borderRadius: 26,
                                border: '1px solid rgba(255, 255, 255, 0.14)',
                                width: '100%',
                            }}
                        >
                            {/* Top Pills: Studio + Tier */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                <span style={{ color: '#F97316', fontSize: 20, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 3 }}>
                                    STUDIO: {studioName}
                                </span>
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        backgroundColor: tierStyle.bg,
                                        border: `1px solid ${tierStyle.border}`,
                                        borderRadius: 10,
                                        padding: '5px 14px',
                                        fontSize: 14,
                                        fontWeight: 900,
                                        letterSpacing: 2,
                                        color: tierStyle.text,
                                    }}
                                >
                                    {tierStyle.label}
                                </div>
                            </div>

                            <h1 style={{ fontSize: titleFontSize, fontWeight: 900, textTransform: 'uppercase', letterSpacing: -1.5, margin: 0, lineHeight: 1.05, color: '#ffffff' }}>
                                {figure.nome}
                            </h1>

                            {/* 3 Dimensions Row (H / W / D) */}
                            <div style={{ display: 'flex', gap: 28, paddingTop: 10, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: 12, color: '#a1a1aa', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5 }}>Altura</span>
                                    <span style={{ fontSize: 23, fontWeight: 900, color: '#f4f4f5' }}>{alturaStr}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: 12, color: '#a1a1aa', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5 }}>Largura</span>
                                    <span style={{ fontSize: 23, fontWeight: 900, color: '#f4f4f5' }}>{larguraStr}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: 12, color: '#a1a1aa', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5 }}>Profund.</span>
                                    <span style={{ fontSize: 23, fontWeight: 900, color: '#f4f4f5' }}>{profundidadeStr}</span>
                                </div>
                            </div>
                        </div>

                        {/* Price Grid */}
                        <div style={{ display: 'flex', gap: 14 }}>
                            {/* Sem Pintura */}
                            <div
                                style={{
                                    flex: 1,
                                    backgroundColor: 'rgba(9, 9, 11, 0.88)',
                                    border: '1px solid rgba(255, 255, 255, 0.14)',
                                    borderRadius: 26,
                                    padding: '26px 30px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 8,
                                }}
                            >
                                <span style={{ fontSize: 16, color: '#a1a1aa', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 2 }}>
                                    Sem Pintura
                                </span>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {hasEstilizadoDiscount && calculated.original_pix_estilizado && (
                                        <span style={{ fontSize: 16, color: '#71717a', textDecoration: 'line-through', fontWeight: 700 }}>
                                            De R$ {formatBrlInt(calculated.original_pix_estilizado)}
                                        </span>
                                    )}
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                        <span style={{ fontSize: 42, fontWeight: 900, color: '#ffffff' }}>
                                            R$ {formatBrlInt(calculated.pix_estilizado)}
                                        </span>
                                        <span style={{ fontSize: 16, color: '#34d399', fontWeight: 900 }}>PIX</span>
                                    </div>
                                    <span style={{ fontSize: 17, color: '#60a5fa', fontWeight: 800 }}>
                                        CARTÃO R$ {formatBrlInt(calculated.estilizado)}
                                    </span>
                                </div>
                            </div>

                            {/* Colorido */}
                            <div
                                style={{
                                    flex: 1,
                                    backgroundColor: 'rgba(9, 9, 11, 0.88)',
                                    border: '1px solid rgba(249, 115, 22, 0.35)',
                                    borderRadius: 26,
                                    padding: '26px 30px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 8,
                                }}
                            >
                                <span style={{ fontSize: 16, color: '#F97316', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 2 }}>
                                    Colorido
                                </span>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {hasColoridoDiscount && calculated.original_pix_colorido && (
                                        <span style={{ fontSize: 16, color: '#71717a', textDecoration: 'line-through', fontWeight: 700 }}>
                                            De R$ {formatBrlInt(calculated.original_pix_colorido)}
                                        </span>
                                    )}
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                        <span style={{ fontSize: 42, fontWeight: 900, color: '#ffffff' }}>
                                            R$ {formatBrlInt(calculated.pix_colorido)}
                                        </span>
                                        <span style={{ fontSize: 16, color: '#34d399', fontWeight: 900 }}>PIX</span>
                                    </div>
                                    <span style={{ fontSize: 17, color: '#fb923c', fontWeight: 800 }}>
                                        CARTÃO R$ {formatBrlInt(calculated.colorido)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Footer Branding */}
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
                            <span style={{ fontSize: 13, color: '#a1a1aa', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 8, opacity: 0.78 }}>
                                FRANGA TOYS • ATELIÊ 3D • @FRANGATOYS
                            </span>
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
        return new Response('Failed to generate image', {
            status: 500,
        });
    }
}
