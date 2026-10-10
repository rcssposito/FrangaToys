export interface PricingParams {
    id: number;
    custo_resina_kg: number;
    custo_h_impressao: number;
    custo_h_pintura: number;
    margem_pobre: number;    // Estilizado
    margem_basica: number;   // Colorido
    margem_premium: number;  // 2D/Premium
    taxa_cartao?: number;    // Multiplicador do cartão (ex: 1.15)
}

export interface FigureMeta {
    resina_kg?: number | null;
    horas_impressao?: number | null;
    horas_pintura?: number | null;
    is_campanha_active?: boolean | null;
    desconto_campanha?: number | null;
    preco_fixo_campanha?: number | null;
    is_bundle?: boolean | null;
    desconto_bundle_pct?: number | null;
    preco_fixo_bundle?: number | null;
}

export interface PriceResult {
    custo_producao: number;
    // Preços no Cartão (Padrão para Vitrine)
    estilizado: number;
    colorido: number;
    premium: number;
    // Preços no PIX (Com desconto)
    pix_estilizado: number;
    pix_colorido: number;
    pix_premium: number;
    // Preços Originais antes do desconto (para exibir comparação/riscado)
    original_estilizado?: number;
    original_colorido?: number;
    original_pix_estilizado?: number;
    original_pix_colorido?: number;
    desconto_bundle_pct?: number;
}

export function calculateFigurePrices(meta: FigureMeta, settings: PricingParams): PriceResult {
    const resina = meta.resina_kg || 0;
    const hImpressao = meta.horas_impressao || 0;
    const hPintura = meta.horas_pintura || 0;
    const taxaCartao = settings.taxa_cartao || 1.15;

    // 1. Custo de Produção (Resina + Impressão)
    const custoProducao = Math.ceil(
        (resina * (settings.custo_resina_kg || 0)) +
        (hImpressao * (settings.custo_h_impressao || 0))
    );

    // 2. Sem Pintura: Custo de Produção (Resina + Impressão) + Margem Pobre (no painting cost)
    const custoBaseEstilizado = custoProducao;
    
    // 3. Colorido: Pintura Real + Margem Básica
    const custoBaseTotal = (resina * (settings.custo_resina_kg || 0)) +
                           (hImpressao * (settings.custo_h_impressao || 0)) +
                           (hPintura * (settings.custo_h_pintura || 0));

    const roundTo5 = (val: number) => Math.ceil(val / 5) * 5;

    // Cálculo das margas líquidas (PIX)
    let pixEstilizado = roundTo5(custoBaseEstilizado * (settings.margem_pobre || 1.15));
    let pixColorido = roundTo5(custoBaseTotal * (settings.margem_basica || 1.30));
    let pixPremium = 0; // Removed/Zeroed out

    // Guarda os preços originais antes de qualquer desconto
    const originalPixEstilizado = pixEstilizado;
    const originalPixColorido = pixColorido;
    const originalEstilizado = roundTo5(originalPixEstilizado * taxaCartao);
    const originalColorido = roundTo5(originalPixColorido * taxaCartao);

    // Aplicar desconto de campanha se ativo
    if (meta.is_campanha_active) {
        if (meta.preco_fixo_campanha && meta.preco_fixo_campanha > 0) {
            // Se tiver preço fixo, ele sobrepõe apenas a versão sem pintura (conforme pedido)
            pixEstilizado = meta.preco_fixo_campanha;
        } else if (meta.desconto_campanha && meta.desconto_campanha > 0) {
            // Se não tiver preço fixo, mas tiver porcentagem, aplica em todos
            const factor = 1 - (meta.desconto_campanha / 100);
            pixEstilizado = roundTo5(pixEstilizado * factor);
            pixColorido = roundTo5(pixColorido * factor);
            pixPremium = 0;
        } else {
            // Se estiver sem valor de desconto ou preço fixo, é pra usar o custo de produção
            pixEstilizado = custoProducao;
        }
    }

    // Aplicar desconto de Bundle (Combo de figuras)
    if (meta.is_bundle) {
        if (meta.preco_fixo_bundle && meta.preco_fixo_bundle > 0) {
            pixColorido = meta.preco_fixo_bundle;
        } else if (meta.desconto_bundle_pct && meta.desconto_bundle_pct > 0) {
            const factor = 1 - (meta.desconto_bundle_pct / 100);
            pixEstilizado = roundTo5(pixEstilizado * factor);
            pixColorido = roundTo5(pixColorido * factor);
        }
    }

    return {
        custo_producao: custoProducao,
        // Preços no Cartão (PIX * Taxa)
        estilizado: roundTo5(pixEstilizado * taxaCartao),
        colorido: roundTo5(pixColorido * taxaCartao),
        premium: 0,
        // Preços Líquidos
        pix_estilizado: pixEstilizado,
        pix_colorido: pixColorido,
        pix_premium: 0,
        // Preços Originais e Desconto
        original_estilizado: originalEstilizado,
        original_colorido: originalColorido,
        original_pix_estilizado: originalPixEstilizado,
        original_pix_colorido: originalPixColorido,
        desconto_bundle_pct: meta.is_bundle ? (meta.desconto_bundle_pct || 0) : undefined,
    };
}

export function getFigureTier(price: number): number {
    if (price >= 1800) return 1;
    if (price >= 1200) return 2;
    if (price >= 600) return 3;
    if (price >= 350) return 4;
    return 5;
}

export function getTierBadgeStyle(tier: number): { label: string, bg: string, text: string, border: string } {
    switch (tier) {
        case 1:
            return { label: 'Tier 1', bg: 'bg-purple-950/40 backdrop-blur-md', text: 'text-purple-400 font-extrabold', border: 'border-purple-500/20' };
        case 2:
            return { label: 'Tier 2', bg: 'bg-amber-950/40 backdrop-blur-md', text: 'text-amber-400 font-extrabold', border: 'border-amber-500/20' };
        case 3:
            return { label: 'Tier 3', bg: 'bg-blue-950/40 backdrop-blur-md', text: 'text-blue-400 font-extrabold', border: 'border-blue-500/20' };
        case 4:
            return { label: 'Tier 4', bg: 'bg-emerald-950/40 backdrop-blur-md', text: 'text-emerald-400 font-extrabold', border: 'border-emerald-500/20' };
        default:
            return { label: 'Tier 5', bg: 'bg-zinc-900/40 backdrop-blur-md', text: 'text-zinc-350 font-extrabold', border: 'border-zinc-500/20' };
    }
}

export interface BundleComponentItem {
    id: number;
    nome: string;
    quantidade: number;
    resina_kg?: number | null;
    horas_impressao?: number | null;
    horas_pintura?: number | null;
    preco_estilizado?: number;
    preco_colorido?: number;
}

export interface BundlePricingSummary {
    horas_pintura_total: number;
    horas_impressao_total: number;
    resina_kg_total: number;
    custo_producao_total: number;
    preco_cheio_estilizado: number;
    preco_cheio_colorido: number;
    desconto_pct: number;
    preco_bundle_estilizado: number;
    preco_bundle_colorido: number;
    economia_estilizado: number;
    economia_colorido: number;
}

/**
 * Calcula a soma dinâmica de insumos, tempos e precificação de um Bundle de figuras
 */
export function calculateBundlePricing(
    components: BundleComponentItem[],
    settings: PricingParams,
    descontoPct = 0,
    precoFixo?: number | null
): BundlePricingSummary {
    const roundTo5 = (val: number) => Math.ceil(val / 5) * 5;

    let horasPinturaTotal = 0;
    let horasImpressaoTotal = 0;
    let resinaKgTotal = 0;
    let precoCheioEstilizado = 0;
    let precoCheioColorido = 0;

    components.forEach(comp => {
        const qty = comp.quantidade || 1;
        horasPinturaTotal += (comp.horas_pintura || 0) * qty;
        horasImpressaoTotal += (comp.horas_impressao || 0) * qty;
        resinaKgTotal += (comp.resina_kg || 0) * qty;

        // Se o componente já tem preço calculado, usa; senão calcula avulso
        if (comp.preco_estilizado && comp.preco_colorido) {
            precoCheioEstilizado += comp.preco_estilizado * qty;
            precoCheioColorido += comp.preco_colorido * qty;
        } else {
            const singlePrice = calculateFigurePrices({
                resina_kg: comp.resina_kg,
                horas_impressao: comp.horas_impressao,
                horas_pintura: comp.horas_pintura,
            }, settings);
            precoCheioEstilizado += singlePrice.colorido ? singlePrice.estilizado * qty : 0;
            precoCheioColorido += singlePrice.colorido * qty;
        }
    });

    // Custo de produção total somado
    const custoProducaoTotal = Math.ceil(
        (resinaKgTotal * (settings.custo_resina_kg || 0)) +
        (horasImpressaoTotal * (settings.custo_h_impressao || 0))
    );

    const safeDesconto = Math.max(0, Math.min(100, descontoPct || 0));
    const factor = 1 - (safeDesconto / 100);

    let precoBundleEstilizado = roundTo5(precoCheioEstilizado * factor);
    let precoBundleColorido = roundTo5(precoCheioColorido * factor);

    if (precoFixo && precoFixo > 0) {
        precoBundleColorido = precoFixo;
        precoBundleEstilizado = roundTo5(precoFixo * 0.6); // proporção estimada
    }

    return {
        horas_pintura_total: Number(horasPinturaTotal.toFixed(2)),
        horas_impressao_total: Number(horasImpressaoTotal.toFixed(2)),
        resina_kg_total: Number(resinaKgTotal.toFixed(3)),
        custo_producao_total: custoProducaoTotal,
        preco_cheio_estilizado: precoCheioEstilizado,
        preco_cheio_colorido: precoCheioColorido,
        desconto_pct: safeDesconto,
        preco_bundle_estilizado: precoBundleEstilizado,
        preco_bundle_colorido: precoBundleColorido,
        economia_estilizado: Math.max(0, precoCheioEstilizado - precoBundleEstilizado),
        economia_colorido: Math.max(0, precoCheioColorido - precoBundleColorido),
    };
}
