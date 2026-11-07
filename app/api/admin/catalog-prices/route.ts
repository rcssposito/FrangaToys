import { NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { calculateFigurePrices } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

function formatCatalogItem(item: any, settings: any) {
    const rawMeta = item.figuras_meta;
    const metas = Array.isArray(rawMeta) ? rawMeta : [rawMeta].filter(Boolean);
    const meta =
        metas.find((m: any) => m.is_campanha || m.is_campanha_active || m.preco_fixo_campanha > 0 || m.desconto_campanha > 0) ||
        metas[0] ||
        {};

    const prices = calculateFigurePrices(
        {
            ...meta,
            is_bundle: item.is_bundle,
            desconto_bundle_pct: item.desconto_bundle_pct,
            preco_fixo_bundle: item.preco_fixo_bundle,
        },
        settings
    );

    const isCampanha = Boolean(
        meta.is_campanha_active ||
        meta.preco_fixo_campanha > 0 ||
        meta.desconto_campanha > 0
    );

    const studioObj = Array.isArray(item.studios) ? item.studios[0] : item.studios;
    const seriesObj = Array.isArray(item.series) ? item.series[0] : item.series;
    const catObj = Array.isArray(seriesObj?.categorias) ? seriesObj.categorias[0] : seriesObj?.categorias;
    const studioName = studioObj?.nome || 'N/A';
    const categoriaName = catObj?.nome || 'N/A';
    const categoriaId = catObj?.id ?? seriesObj?.categoria_id ?? null;
    const isOutros =
        categoriaId === 0 ||
        categoriaName.toLowerCase() === 'outros' ||
        studioName.toLowerCase() === 'outros' ||
        studioName.toLowerCase() === 'custom' ||
        Number(item.id) <= 0;

    return {
        id: item.id,
        Figura: item.nome,
        codigo: item.codigo,
        studio: studioName,
        categoria: categoriaName,
        categoria_id: categoriaId,
        is_outros: isOutros,
        resina_kg: meta.resina_kg || 0,
        horas_impressao: meta.horas_impressao || 0,
        horas_pintura: meta.horas_pintura || 0,
        altura_cm: meta.altura_cm || 0,
        largura_cm: meta.largura_cm || 0,
        profundidade_cm: meta.profundidade_cm || 0,
        custo_producao: prices.custo_producao,
        is_campanha: isCampanha,
        preco_fixo_campanha: meta.preco_fixo_campanha,
        desconto_campanha: meta.desconto_campanha,
        "Estilizado (R$)": prices.pix_estilizado,
        "Colorido (R$)": prices.pix_colorido,
    };
}

export async function GET(req: Request) {
    try {
        const sessionOrResponse = await requireRoles(['admin', 'pricing', 'orcamento', 'sales', 'finance']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search');

        // 1. Buscar configurações globais de preço primeiro (sempre id: 1)
        const { data: settings, error: settingsError } = await supabase
            .from('pricing_params')
            .select('*')
            .eq('id', 1)
            .single();

        if (settingsError) throw settingsError;

        const selectColumns = `
            id,
            nome,
            codigo,
            is_bundle,
            desconto_bundle_pct,
            preco_fixo_bundle,
            studios ( nome ),
            series (
                nome,
                categoria_id,
                categorias ( id, nome )
            ),
            figuras_meta (
                resina_kg,
                horas_impressao,
                horas_pintura,
                altura_cm,
                largura_cm,
                profundidade_cm,
                is_campanha_active,
                desconto_campanha,
                preco_fixo_campanha
            )
        `;

        // 2. Se houver busca, filtramos na tabela 'figuras'
        if (search) {
            const { data, error } = await supabase
                .from('figuras')
                .select(selectColumns)
                .or(`nome.ilike.%${search}%,codigo.ilike.%${search}%,sinonimos.ilike.%${search}%`)
                .limit(50);

            if (error) throw error;

            const formatted = (data || []).map((item: any) => formatCatalogItem(item, settings));
            return NextResponse.json(formatted);
        }

        // 3. Caso sem busca: Pega por ordem alfabética
        const { data, error } = await supabase
            .from('figuras')
            .select(selectColumns)
            .order('nome', { ascending: true })
            .limit(100);

        if (error) throw error;

        const formatted = (data || []).map((item: any) => formatCatalogItem(item, settings));
        return NextResponse.json(formatted);
    } catch (error: any) {
        console.error('Catalog Search Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
