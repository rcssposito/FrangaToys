import { NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: Request) {
    try {
    const sessionOrResponse = await requireRoles(['admin', 'finance']);
    if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const { searchParams } = new URL(req.url);
        const month = searchParams.get('month'); // YYYY-MM

        let query = supabaseAdmin
            .from('vendas')
            .select('*');

        if (month) {
            const startDate = new Date(`${month}-01T00:00:00Z`);
            const endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + 1);

            query = query
                .gte('data_venda', startDate.toISOString())
                .lt('data_venda', endDate.toISOString());
        }

        const { data: sales, error } = await query;

        if (error) throw error;

        // Grouping variables
        type SellerData = { vendas_realizadas: number; valor_total_vendido: number; comissao_a_receber: number };
        const commissoesPorVendedor: Record<string, SellerData> = {};
        const costPerPainter: Record<string, number> = {};
        let custoPinturaFreelancerTotal = 0;

        for (const sale of sales || []) {
            // Aggregate Seller Data
            if (sale.vendedor) {
                const seller = sale.vendedor.toLowerCase();
                if (!commissoesPorVendedor[seller]) {
                    commissoesPorVendedor[seller] = { vendas_realizadas: 0, valor_total_vendido: 0, comissao_a_receber: 0 };
                }
                commissoesPorVendedor[seller].vendas_realizadas += 1;
                commissoesPorVendedor[seller].valor_total_vendido += sale.valor_venda_final || 0;
                commissoesPorVendedor[seller].comissao_a_receber += sale.comissao_vendedor || 0;
            }
        }

        // Let's do a bulk lookup for Freelancer paint costs if there are any freelancer sales in this period
        const freelancerSales = (sales || []).filter(s => s.pintura_freelancer);
        if (freelancerSales.length > 0) {
            const figureIds = [...new Set(freelancerSales.map(s => s.figura_id))];
            if (figureIds.length > 0) {
                const { data: metas } = await supabaseAdmin.from('figuras_meta').select('figura_id, horas_pintura').in('figura_id', figureIds);

                const metaMap = new Map((metas || []).map(m => [m.figura_id, m.horas_pintura || 0]));
                for (const sale of freelancerSales) {
                    const horas = metaMap.get(sale.figura_id) || 0;
                    const painter = sale.pintor_nome || 'Pintor Desconhecido';

                    // Custo painting = horas * 50 * quantidade
                    const cost = (Math.ceil(horas * 50) * (sale.quantidade || 1));

                    if (!costPerPainter[painter]) costPerPainter[painter] = 0;
                    costPerPainter[painter] += cost;
                    custoPinturaFreelancerTotal += cost;
                }
            }
        }

        // Convert the record to an array and sort by commission
        const vendedoresArray = Object.entries(commissoesPorVendedor).map(([vendedor, stats]) => ({
            vendedor,
            ...stats
        })).sort((a, b) => b.comissao_a_receber - a.comissao_a_receber);

        const paintersArray = Object.entries(costPerPainter).map(([nome, valor]) => ({
            nome,
            valor
        })).sort((a, b) => b.valor - a.valor);

        return NextResponse.json({
            vendedores: vendedoresArray,
            painters: paintersArray,
            freelancer_total: custoPinturaFreelancerTotal
        });
    } catch (error: any) {
        console.error('Commissions GET API Crash:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
