
import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        // 1. Fetch Sales Data (Transactions)
        let query = supabase
            .from('vendas')
            .select(`
                *,
                figuras (
                    id,
                    studios ( nome )
                )
            `);

        if (startDate) query = query.gte('data_venda', startDate);
        if (endDate) query = query.lte('data_venda', endDate);

        const { data: sales, error: salesError } = await query;

        if (salesError) throw salesError;

        // 2. Fetch Studio Details with Inventory Count (Database Aggregation)
        // This avoids the 1000 row limit by counting on the database side
        const { data: studios, error: studiosError } = await supabase
            .from('studios')
            .select('nome, custo_mensal, qtd_display, figuras(count)');

        if (studiosError) throw studiosError;

        // --- Aggregation Logic ---

        // KPI Calculation
        const totalRevenue = sales.reduce((acc, s) => acc + (s.valor_venda_final || 0), 0);
        const totalProfit = sales.reduce((acc, s) => acc + (s.lucro_real || 0), 0);
        const totalSalesCount = sales.length; // Transactions count
        const totalItemsSold = sales.reduce((acc, s) => acc + (s.quantidade || 1), 0); // Items count
        const averageTicket = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;

        // Calculate Total Fixed Costs (Studios)
        const monthlyFixedCost = studios.reduce((acc, s) => acc + (s.custo_mensal || 0), 0);

        let costMultiplier = 1;
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Should be approx 30-31 for a month, 365 for a year.
            if (diffDays > 300) costMultiplier = 12;
        }

        const totalFixedCost = monthlyFixedCost * costMultiplier;

        // Optional: Net Profit could subtract fixed costs? 
        // For now, let's just return totalFixedCost as a separate KPI.

        // Grouping by Studio (Sales)
        const studioSalesMap: { [key: string]: { revenue: number, profit: number, itemsSold: number } } = {};

        sales.forEach(sale => {
            // @ts-ignore
            let studioName = sale.figuras?.studios?.nome || 'Outros';
            // Handle array case if any weirdness, but usually it's single
            // @ts-ignore
            if (Array.isArray(sale.figuras?.studios)) studioName = sale.figuras?.studios[0]?.nome || 'Outros';

            if (!studioSalesMap[studioName]) {
                studioSalesMap[studioName] = { revenue: 0, profit: 0, itemsSold: 0 };
            }
            studioSalesMap[studioName].revenue += (sale.valor_venda_final || 0);
            studioSalesMap[studioName].profit += (sale.lucro_real || 0);
            studioSalesMap[studioName].itemsSold += (sale.quantidade || 1);
        });

        // Grouping by Studio (Inventory) - AUTOMATIC FROM DB
        // We now use the count returned by the database query
        const inventoryByStudio = studios
            .map(s => ({
                name: s.nome,
                // @ts-ignore
                value: s.figuras?.[0]?.count || 0 // PostgREST returns array of objects for count
            }))
            .sort((a, b) => b.value - a.value);


        // Format for Sales Charts (Revenue, Profit, Sold)
        const revenueByStudio = Object.entries(studioSalesMap)
            .map(([name, data]) => ({ name, value: data.revenue }))
            .sort((a, b) => b.value - a.value);

        const profitByStudio = Object.entries(studioSalesMap)
            .map(([name, data]) => ({ name, value: data.profit }))
            .sort((a, b) => b.value - a.value);

        const soldByStudio = Object.entries(studioSalesMap)
            .map(([name, data]) => ({ name, value: data.itemsSold }))
            .sort((a, b) => b.value - a.value);

        // 5. Revenue vs Cost
        // Yield Calculation
        const revenueVsCost = studios.map(s => {
            const revenue = studioSalesMap[s.nome]?.revenue || 0;
            return {
                name: s.nome,
                revenue,
                cost: s.custo_mensal || 0
            };
        })
            .filter(i => i.revenue > 0 || i.cost > 0)
            .sort((a, b) => b.revenue - a.revenue);


        return NextResponse.json({
            kpis: {
                totalRevenue,
                totalProfit,
                totalSalesCount,
                totalItemsSold,
                averageTicket,
                totalFixedCost
            },
            charts: {
                revenueByStudio,
                profitByStudio,
                soldByStudio,
                inventoryByStudio,
                revenueVsCost
            }
        });

    } catch (error: any) {
        console.error('Dashboard API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
