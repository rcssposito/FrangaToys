import { NextResponse, NextRequest } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { calculateBundlePricing, calculateFigurePrices, PricingParams } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

function generateSlug(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .trim();
}

/**
 * GET: Lista todos os bundles cadastrados com seus componentes somados e métricas
 */
export async function GET(req: NextRequest) {
    try {
        const sessionOrResponse = await requireRoles(['admin', 'pricing']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        // 1. Carrega configurações globais de precificação reais do banco
        const { data: settings } = await supabase
            .from('pricing_params')
            .select('*')
            .eq('id', 1)
            .single();

        const pricingSettings: PricingParams = {
            id: 1,
            custo_resina_kg: Number(settings?.custo_resina_kg) || 200,
            custo_h_impressao: Number(settings?.custo_h_impressao) || 3,
            custo_h_pintura: Number(settings?.custo_h_pintura) || 75,
            margem_pobre: Number(settings?.margem_pobre) || 1.15,
            margem_basica: Number(settings?.margem_basica) || 1.30,
            margem_premium: Number(settings?.margem_premium) || 1.60,
            taxa_cartao: Number(settings?.taxa_cartao) || 1.15,
        };

        // 2. Busca todas as figuras marcadas como bundle
        const { data: bundles, error } = await supabase
            .from('figuras')
            .select(`
                id,
                nome,
                codigo,
                slug,
                imagem_url,
                imagem_secundaria,
                fotos_extras,
                is_bundle,
                desconto_bundle_pct,
                preco_fixo_bundle,
                disponivel,
                figuras_bundles!bundle_id (
                    id,
                    quantidade,
                    componente:componente_id (
                        id,
                        nome,
                        codigo,
                        imagem_url,
                        disponivel,
                        studio_id,
                        studios (
                            merchant,
                            ativo
                        ),
                        figuras_meta (
                            resina_kg,
                            horas_impressao,
                            horas_pintura
                        )
                    )
                )
            `)
            .eq('is_bundle', true)
            .order('id', { ascending: false });

        if (error) throw error;

        // 3. Processa cada bundle calculando a soma dinâmica de custos, preços e validação de disponibilidade
        const formattedBundles = await Promise.all((bundles || []).map(async (b: any) => {
            const rawComponents = (b.figuras_bundles || []).map((fb: any) => {
                const comp = fb.componente;
                const meta = Array.isArray(comp?.figuras_meta) ? comp.figuras_meta[0] : comp?.figuras_meta;
                const compPrices = calculateFigurePrices(meta || {}, pricingSettings);
                const st = Array.isArray(comp?.studios) ? comp.studios[0] : comp?.studios;
                const studioMerchantOk = st ? (st.merchant !== false && st.ativo !== false) : true;
                const isDisponivel = (comp?.disponivel === true) && studioMerchantOk;

                return {
                    id: comp?.id,
                    nome: comp?.nome || 'Figura',
                    codigo: comp?.codigo,
                    imagem_url: comp?.imagem_url,
                    disponivel: isDisponivel,
                    disponivel_original: comp?.disponivel,
                    studio_merchant_ok: studioMerchantOk,
                    quantidade: fb.quantidade || 1,
                    resina_kg: Number(meta?.resina_kg) || 0,
                    horas_impressao: Number(meta?.horas_impressao) || 0,
                    horas_pintura: Number(meta?.horas_pintura) || 0,
                    preco_colorido: compPrices.colorido,
                    preco_estilizado: compPrices.estilizado,
                };
            });

            const todasPecasDisponiveis = rawComponents.length > 0 && rawComponents.every((c: any) => c.disponivel === true);
            const disponivelReal = Boolean(b.disponivel) && todasPecasDisponiveis;

            // Se o bundle estava marcado como disponivel no banco mas tem peças indisponíveis, auto-corrige no banco
            if (b.disponivel === true && !todasPecasDisponiveis) {
                await supabase.from('figuras').update({ disponivel: false }).eq('id', b.id);
            }

            const summary = calculateBundlePricing(
                rawComponents,
                pricingSettings,
                Number(b.desconto_bundle_pct) || 0,
                b.preco_fixo_bundle ? Number(b.preco_fixo_bundle) : null
            );

            return {
                id: b.id,
                nome: b.nome,
                codigo: b.codigo,
                slug: b.slug,
                imagem_url: b.imagem_url,
                imagem_secundaria: b.imagem_secundaria,
                fotos_extras: b.fotos_extras || [],
                desconto_bundle_pct: Number(b.desconto_bundle_pct) || 0,
                preco_fixo_bundle: b.preco_fixo_bundle ? Number(b.preco_fixo_bundle) : null,
                disponivel: disponivelReal,
                todas_pecas_disponiveis: todasPecasDisponiveis,
                componentes: rawComponents,
                summary,
            };
        }));

        return NextResponse.json({ bundles: formattedBundles });
    } catch (err: any) {
        console.error('[API Bundles GET] Erro:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * POST: Cria um novo bundle e vincula seus componentes
 */
export async function POST(req: NextRequest) {
    try {
        const sessionOrResponse = await requireRoles(['admin', 'pricing']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const body = await req.json();
        const {
            nome,
            codigo,
            imagem_url,
            imagem_secundaria,
            fotos_extras,
            desconto_bundle_pct,
            preco_fixo_bundle,
            componentesIds, // array de { id: number, quantidade: number }
        } = body;

        if (!nome || !componentesIds || !Array.isArray(componentesIds) || componentesIds.length === 0) {
            return NextResponse.json({ error: 'Nome e pelo menos 1 componente são obrigatórios' }, { status: 400 });
        }

        const slug = generateSlug(nome);

        // 1. Identificar serie_id, studio_id e disponibilidade das figuras componentes
        const ids = componentesIds.map((c: any) => c.id);
        const { data: filhas } = await supabase
            .from('figuras')
            .select(`
                id, 
                serie_id, 
                studio_id,
                disponivel,
                studios (
                    merchant,
                    ativo
                )
            `)
            .in('id', ids);

        // Herança de Série: se todas forem da mesma, usa ela; senão usa a do primeiro componente
        const primeiraSerie = filhas?.[0]?.serie_id || null;
        const todasMesmaSerie = filhas?.every(f => f.serie_id === primeiraSerie) ?? false;
        const serieIdFinal = todasMesmaSerie ? primeiraSerie : (primeiraSerie || null);

        // Herança de Estúdio: se todas forem do mesmo estúdio, vincula; se forem de estúdios mistos, fica null
        const primeiroStudio = filhas?.[0]?.studio_id || null;
        const todasMesmoStudio = filhas?.every(f => f.studio_id === primeiroStudio) ?? false;
        const studioIdFinal = todasMesmoStudio ? primeiroStudio : null;

        // Regra Estrita de Disponibilidade:
        // O bundle só pode nascer DISPONÍVEL se TODOS os componentes estiverem disponíveis e seus estúdios tiverem merchant ativo
        const todasFilhasDisponiveis = (filhas || []).length === ids.length && (filhas || []).every(f => {
            const st = Array.isArray(f.studios) ? f.studios[0] : f.studios;
            const studioOk = st ? (st.merchant !== false && st.ativo !== false) : true;
            return f.disponivel === true && studioOk;
        });

        const disponivelDesejado = body.disponivel !== undefined ? Boolean(body.disponivel) : true;
        const disponivelFinal = disponivelDesejado && todasFilhasDisponiveis;

        // 2. Criar a figura pai como Bundle
        const { data: newBundle, error: errFigura } = await supabase
            .from('figuras')
            .insert({
                nome: nome.trim(),
                codigo: codigo?.trim() || null,
                slug,
                serie_id: serieIdFinal,
                studio_id: studioIdFinal,
                imagem_url: imagem_url || null,
                imagem_secundaria: imagem_secundaria || null,
                fotos_extras: fotos_extras || [],
                is_bundle: true,
                desconto_bundle_pct: Number(desconto_bundle_pct) || 0,
                preco_fixo_bundle: preco_fixo_bundle ? Number(preco_fixo_bundle) : null,
                disponivel: disponivelFinal,
            })
            .select()
            .single();

        if (errFigura) throw errFigura;

        const bundleId = newBundle.id;

        // 2. Inserir componentes do bundle na tabela de junção
        const bundleItems = componentesIds.map((item: any) => ({
            bundle_id: bundleId,
            componente_id: item.id,
            quantidade: item.quantidade || 1,
        }));

        const { error: errItems } = await supabase
            .from('figuras_bundles')
            .insert(bundleItems);

        if (errItems) throw errItems;

        // 3. Buscar os componentes para calcular a soma de resina e horas
        const { data: metaFilhos } = await supabase
            .from('figuras_meta')
            .select('figura_id, resina_kg, horas_impressao, horas_pintura')
            .in('figura_id', ids);

        let totalResina = 0;
        let totalImpressao = 0;
        let totalPintura = 0;

        componentesIds.forEach((c: any) => {
            const meta = (metaFilhos || []).find(m => m.figura_id === c.id);
            const qty = c.quantidade || 1;
            totalResina += (Number(meta?.resina_kg) || 0) * qty;
            totalImpressao += (Number(meta?.horas_impressao) || 0) * qty;
            totalPintura += (Number(meta?.horas_pintura) || 0) * qty;
        });

        // 4. Salvar na tabela figuras_meta para compatibilidade com o restante do sistema
        await supabase
            .from('figuras_meta')
            .upsert({
                figura_id: bundleId,
                resina_kg: Number(totalResina.toFixed(3)),
                horas_impressao: Number(totalImpressao.toFixed(2)),
                horas_pintura: Number(totalPintura.toFixed(2)),
            }, { onConflict: 'figura_id' });

        return NextResponse.json({ success: true, bundle: newBundle });
    } catch (err: any) {
        console.error('[API Bundles POST] Erro:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * PUT: Atualiza um bundle existente e seus componentes
 */
export async function PUT(req: NextRequest) {
    try {
        const sessionOrResponse = await requireRoles(['admin', 'pricing']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const body = await req.json();
        const {
            id,
            nome,
            codigo,
            imagem_url,
            imagem_secundaria,
            fotos_extras,
            desconto_bundle_pct,
            preco_fixo_bundle,
            disponivel,
            componentesIds, // array de { id: number, quantidade: number }
        } = body;

        if (!id) return NextResponse.json({ error: 'ID do bundle obrigatório' }, { status: 400 });

        // 1. Atualizar a figura pai
        const updateData: any = {};
        if (nome) {
            updateData.nome = nome.trim();
            updateData.slug = generateSlug(nome);
        }
        if (codigo !== undefined) updateData.codigo = codigo?.trim() || null;
        if (imagem_url !== undefined) updateData.imagem_url = imagem_url;
        if (imagem_secundaria !== undefined) updateData.imagem_secundaria = imagem_secundaria;
        if (fotos_extras !== undefined) updateData.fotos_extras = fotos_extras;
        if (desconto_bundle_pct !== undefined) updateData.desconto_bundle_pct = Number(desconto_bundle_pct) || 0;
        if (preco_fixo_bundle !== undefined) updateData.preco_fixo_bundle = preco_fixo_bundle ? Number(preco_fixo_bundle) : null;
        if (disponivel !== undefined) updateData.disponivel = disponivel;

        const { error: errUpdate } = await supabase
            .from('figuras')
            .update(updateData)
            .eq('id', id);

        if (errUpdate) throw errUpdate;

        // 2. Se informou componentes, recria os vínculos
        if (componentesIds && Array.isArray(componentesIds)) {
            await supabase
                .from('figuras_bundles')
                .delete()
                .eq('bundle_id', id);

            const bundleItems = componentesIds.map((item: any) => ({
                bundle_id: id,
                componente_id: item.id,
                quantidade: item.quantidade || 1,
            }));

            await supabase
                .from('figuras_bundles')
                .insert(bundleItems);

            // Recalcula soma de insumos
            const ids = componentesIds.map((c: any) => c.id);
            const { data: metaFilhos } = await supabase
                .from('figuras_meta')
                .select('figura_id, resina_kg, horas_impressao, horas_pintura')
                .in('figura_id', ids);

            let totalResina = 0;
            let totalImpressao = 0;
            let totalPintura = 0;

            componentesIds.forEach((c: any) => {
                const meta = (metaFilhos || []).find(m => m.figura_id === c.id);
                const qty = c.quantidade || 1;
                totalResina += (Number(meta?.resina_kg) || 0) * qty;
                totalImpressao += (Number(meta?.horas_impressao) || 0) * qty;
                totalPintura += (Number(meta?.horas_pintura) || 0) * qty;
            });

            const { data: filhas } = await supabase
                .from('figuras')
                .select(`
                    id, 
                    serie_id, 
                    studio_id,
                    disponivel,
                    studios (
                        merchant,
                        ativo
                    )
                `)
                .in('id', ids);

            const primeiraSerie = filhas?.[0]?.serie_id || null;
            const todasMesmaSerie = filhas?.every(f => f.serie_id === primeiraSerie) ?? false;
            const serieIdFinal = todasMesmaSerie ? primeiraSerie : (primeiraSerie || null);

            const primeiroStudio = filhas?.[0]?.studio_id || null;
            const todasMesmoStudio = filhas?.every(f => f.studio_id === primeiroStudio) ?? false;
            const studioIdFinal = todasMesmoStudio ? primeiroStudio : null;

            const todasFilhasDisponiveis = (filhas || []).length === ids.length && (filhas || []).every(f => {
                const st = Array.isArray(f.studios) ? f.studios[0] : f.studios;
                const studioOk = st ? (st.merchant !== false && st.ativo !== false) : true;
                return f.disponivel === true && studioOk;
            });

            const updateExtra: any = {
                serie_id: serieIdFinal,
                studio_id: studioIdFinal,
            };
            if (!todasFilhasDisponiveis) {
                updateExtra.disponivel = false;
            }

            await supabase
                .from('figuras')
                .update(updateExtra)
                .eq('id', id);

            await supabase
                .from('figuras_meta')
                .upsert({
                    figura_id: id,
                    resina_kg: Number(totalResina.toFixed(3)),
                    horas_impressao: Number(totalImpressao.toFixed(2)),
                    horas_pintura: Number(totalPintura.toFixed(2)),
                }, { onConflict: 'figura_id' });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[API Bundles PUT] Erro:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
