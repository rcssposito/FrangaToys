
import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const startDateParam = searchParams.get('startDate');
        const endDateParam = searchParams.get('endDate');

        // --- Date Range Logic ---
        const now = new Date();
        const currentStart = startDateParam ? new Date(startDateParam) : new Date(now.getFullYear(), 0, 1);
        const currentEnd = endDateParam ? new Date(endDateParam) : new Date(now.getFullYear(), 11, 31);

        // Previous Period Logic
        const duration = currentEnd.getTime() - currentStart.getTime();
        const previousStart = new Date(currentStart.getTime());
        const previousEnd = new Date(currentEnd.getTime());
        const dayDiff = Math.ceil(duration / (1000 * 60 * 60 * 24));

        // Dynamic label for comparison
        let comparisonLabel = "vs. período anterior";

        if (dayDiff > 300) {
            previousStart.setFullYear(previousStart.getFullYear() - 1);
            previousEnd.setFullYear(previousEnd.getFullYear() - 1);
            comparisonLabel = `vs. ${previousStart.getFullYear()}`;
        } else {
            previousStart.setMonth(previousStart.getMonth() - 1);
            const isLastDay = new Date(currentEnd.getTime() + 86400000).getDate() === 1;
            if (isLastDay) {
                previousEnd.setDate(0);
            } else {
                previousEnd.setMonth(previousEnd.getMonth() - 1);
            }
            comparisonLabel = "vs. mês anterior";
        }

        // 1. Fetch Current Period Sales
        let query = supabase
            .from('vendas')
            .select(`
                *,
                figuras (
                    id,
                    nome,
                    studios ( nome ),
                    series ( 
                        nome,
                        categorias ( nome )
                    )
                )
            `)

            .gte('data_venda', currentStart.toISOString())
            .lte('data_venda', currentEnd.toISOString());

        // 2. Fetch Previous Period Sales
        let prevQuery = supabase
            .from('vendas')
            .select('valor_venda_final, lucro_real, quantidade')
            .gte('data_venda', previousStart.toISOString())
            .lte('data_venda', previousEnd.toISOString());

        const [currRes, prevRes] = await Promise.all([query, prevQuery]);

        if (currRes.error) throw currRes.error;
        if (prevRes.error) throw prevRes.error;

        const sales = currRes.data;
        const prevSales = prevRes.data;

        // 3. Fetch Studio Details
        const { data: studios, error: studiosError } = await supabase
            .from('studios')
            .select('nome, custo_mensal, qtd_display, figuras(count)');

        if (studiosError) throw studiosError;

        // --- KPI Calculation & Trends ---
        const calculateKPIs = (data: any[]) => {
            const paidSales = data.filter(s => (s.valor_venda_final || 0) > 0);
            return {
                revenue: data.reduce((acc, s) => acc + (s.valor_venda_final || 0), 0),
                profit: data.reduce((acc, s) => acc + (s.lucro_real || 0), 0),
                paidSalesCount: paidSales.length,
                totalItems: data.reduce((acc, s) => acc + (s.quantidade || 1), 0),
            };
        };

        const currentKPIs = calculateKPIs(sales);
        const previousKPIs = calculateKPIs(prevSales);

        const calculateTrend = (curr: number, prev: number) => {
            if (prev === 0) {
                if (curr === 0) return 0;
                return null;
            }
            return ((curr - prev) / prev) * 100;
        };

        const trends = {
            revenue: calculateTrend(currentKPIs.revenue, previousKPIs.revenue),
            profit: calculateTrend(currentKPIs.profit, previousKPIs.profit),
            paidSalesCount: calculateTrend(currentKPIs.paidSalesCount, previousKPIs.paidSalesCount),
            totalItems: calculateTrend(currentKPIs.totalItems, previousKPIs.totalItems)
        };

        // --- Financial Ratios ---
        const monthlyFixedCost = studios.reduce((acc, s) => acc + (s.custo_mensal || 0), 0);
        let costMultiplier = 1;
        if (dayDiff > 300) costMultiplier = 12;
        const totalFixedCost = monthlyFixedCost * costMultiplier;

        const profitMargin = currentKPIs.revenue > 0
            ? (currentKPIs.profit / currentKPIs.revenue) * 100
            : 0;

        const revenueCoverage = totalFixedCost > 0
            ? (currentKPIs.revenue / totalFixedCost) * 100
            : 0;

        // --- Grouping Logic ---
        const studioSalesMap: { [key: string]: { revenue: number, profit: number, itemsSold: number } } = {};
        const productSalesMap: { [key: string]: { id: number, name: string, studio: string, revenue: number, qty: number } } = {};
        const categorySalesMap: { [key: string]: number } = {};
        const seriesSalesMap: { [key: string]: { value: number, category: string } } = {};

        sales.forEach(sale => {
            // @ts-ignore
            const figure = sale.figuras;
            // @ts-ignore
            let studioName = figure?.studios?.nome || 'Outros';
            // @ts-ignore
            if (Array.isArray(figure?.studios)) studioName = figure?.studios[0]?.nome || 'Outros';

            if (!studioSalesMap[studioName]) {
                studioSalesMap[studioName] = { revenue: 0, profit: 0, itemsSold: 0 };
            }
            studioSalesMap[studioName].revenue += (sale.valor_venda_final || 0);
            studioSalesMap[studioName].profit += (sale.lucro_real || 0);
            studioSalesMap[studioName].itemsSold += (sale.quantidade || 1);

            if (figure) {
                const key = figure.id;
                if (!productSalesMap[key]) {
                    productSalesMap[key] = {
                        id: figure.id,
                        name: figure.nome,
                        studio: studioName,
                        revenue: 0,
                        qty: 0
                    };
                }
                productSalesMap[key].revenue += (sale.valor_venda_final || 0);
                productSalesMap[key].qty += (sale.quantidade || 1);

                // Category & Series Aggregation
                // @ts-ignore
                const seriesName = figure.series?.nome || 'Sem Série';
                // @ts-ignore
                const categoryName = figure.series?.categorias?.nome || 'Sem Categoria';

                categorySalesMap[categoryName] = (categorySalesMap[categoryName] || 0) + (sale.quantidade || 1); // Count unit sales

                if (!seriesSalesMap[seriesName]) {
                    seriesSalesMap[seriesName] = { value: 0, category: categoryName };
                }
                seriesSalesMap[seriesName].value += (sale.quantidade || 1);
            }
        });

        const topProducts = Object.values(productSalesMap)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        const recentActivity = sales
            .sort((a, b) => new Date(b.data_venda).getTime() - new Date(a.data_venda).getTime())
            .slice(0, 10)
            .map(s => ({
                id: s.id,
                date: s.data_venda,
                // @ts-ignore
                product: s.figuras?.nome || 'Figura Desconhecida',
                value: s.valor_venda_final,
                status: s.status
            }));

        const inventoryByStudio = studios
            .map(s => ({
                name: s.nome,
                // @ts-ignore
                value: s.figuras?.[0]?.count || 0
            }))
            .sort((a, b) => b.value - a.value);

        const totalInventoryCount = inventoryByStudio.reduce((acc, item) => acc + item.value, 0);

        const revenueByStudio = Object.entries(studioSalesMap)
            .map(([name, data]) => ({ name, value: data.revenue }))
            .sort((a, b) => b.value - a.value);

        const profitByStudio = Object.entries(studioSalesMap)
            .map(([name, data]) => ({ name, value: data.profit }))
            .sort((a, b) => b.value - a.value);

        const soldByStudio = Object.entries(studioSalesMap)
            .map(([name, data]) => ({ name, value: data.itemsSold }))
            .sort((a, b) => b.value - a.value);

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

        // Map aggregated maps to arrays for charts
        const salesByCategory = Object.entries(categorySalesMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const salesBySeries = Object.entries(seriesSalesMap)
            .map(([name, data]) => ({ name, value: data.value, category: data.category }))
            .sort((a, b) => b.value - a.value);

        return NextResponse.json({
            kpis: {
                totalRevenue: currentKPIs.revenue,
                totalProfit: currentKPIs.profit,
                totalPaidSalesCount: currentKPIs.paidSalesCount,
                totalItemsMade: currentKPIs.totalItems,
                averageTicket: currentKPIs.paidSalesCount > 0 ? currentKPIs.revenue / currentKPIs.paidSalesCount : 0,
                totalFixedCost,
                totalInventoryCount,
                trends,
                profitMargin,
                revenueCoverage,
                comparisonLabel
            },
            charts: {
                revenueByStudio,
                profitByStudio,
                soldByStudio,
                inventoryByStudio,
                revenueVsCost,
                salesByCategory, // New
                salesBySeries    // New
            },
            lists: {
                topProducts,
                recentActivity
            }
        });

    } catch (error: any) {
        console.error('Dashboard API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
