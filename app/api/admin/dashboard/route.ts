
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
            .select('valor_venda_final, lucro_real, quantidade, valor_frete')
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
            .select('nome, custo_mensal, qtd_display, figuras(id, imagem_url, series:series(nome, categorias:categorias(nome, id)), figuras_meta(escala, resina_kg, horas_pintura))');

        if (studiosError) throw studiosError;

        // Fetch Users for Display Names
        const { data: users } = await supabase.from('admin_users').select('email, nome');
        const userMap = (users || []).reduce((acc: any, u) => {
            if (u.email) acc[u.email.toLowerCase()] = u.nome || u.email.split('@')[0];
            return acc;
        }, {});

        // 4. Fetch Pricing View (Budget) - WITH PAGINATION
        // Supabase API might limit rows even if we request more.
        const allPricingData: any[] = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
            // Also fetching 'imagem_url' from the view or related, but vw_figuras_orcamento doesn't have it.
            // Wait, we need the image. The view might not have it. Let's map it from the main query later.
            const { data: batch, error: batchError } = await supabase
                .from('vw_figuras_orcamento')
                .select('id, "Figura", "Total (R$)", "Premium (R$)"')
                .range(page * pageSize, (page + 1) * pageSize - 1);

            if (batchError) {
                console.error("Error fetching pricing batch:", batchError);
                break;
            }

            if (batch && batch.length > 0) {
                allPricingData.push(...batch);
                if (batch.length < pageSize) hasMore = false;
                page++;
            } else {
                hasMore = false;
            }
        }

        console.log(`[PricingDebug] Total Rows Fetched: ${allPricingData.length}`);

        // Map to cleaner objects
        const pricingMap = new Map(); // ID -> { premium, cost }
        if (allPricingData) {
            allPricingData.forEach((row: any) => {
                pricingMap.set(row.id, {
                    name: row['Figura'],
                    cost: row['Total (R$)'] || 0,
                    price: row['Premium (R$)'] || 0
                });
            });
        }

        // --- KPI Calculation & Trends ---
        const calculateKPIs = (data: any[]) => {
            const paidSales = data.filter(s => (s.valor_venda_final || 0) > 0);
            return {
                revenue: data.reduce((acc, s) => acc + (s.valor_venda_final || 0) + (s.valor_frete || 0), 0),
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
        const seriesSalesMap: { [key: string]: { value: number, category: string, studios: { [key: string]: number } } } = {};
        const sellerSalesMap: { [key: string]: { revenue: number, qty: number, figures: any[] } } = {};

        sales.forEach(sale => {
            // @ts-ignore
            const figure = sale.figuras;
            // @ts-ignore
            let studioName = figure?.studios?.nome || 'Outros';
            // @ts-ignore
            if (Array.isArray(figure?.studios)) studioName = figure?.studios[0]?.nome || 'Outros';

            // --- Seller Aggregation ---
            // @ts-ignore
            const rawVendedor = (sale.vendedor || '').toLowerCase();
            const sellerName = rawVendedor ? (userMap[rawVendedor] || rawVendedor) : 'Site / Desconhecido';

            if (!sellerSalesMap[sellerName]) {
                sellerSalesMap[sellerName] = { revenue: 0, qty: 0, figures: [] };
            }
            sellerSalesMap[sellerName].revenue += (sale.valor_venda_final || 0);
            sellerSalesMap[sellerName].qty += (sale.quantidade || 1);

            if (!studioSalesMap[studioName]) {
                studioSalesMap[studioName] = { revenue: 0, profit: 0, itemsSold: 0 };
            }
            studioSalesMap[studioName].revenue += (sale.valor_venda_final || 0);
            studioSalesMap[studioName].profit += (sale.lucro_real || 0);
            studioSalesMap[studioName].itemsSold += (sale.quantidade || 1);

            if (figure) {
                const key = figure.id;

                sellerSalesMap[sellerName].figures.push({
                    id: figure.id,
                    name: figure.nome,
                    price: sale.valor_venda_final || 0,
                    qty: sale.quantidade || 1,
                    date: sale.data_venda
                });

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
                    seriesSalesMap[seriesName] = { value: 0, category: categoryName, studios: {} };
                }
                seriesSalesMap[seriesName].value += (sale.quantidade || 1);

                // Studio breakdown for this series
                if (!seriesSalesMap[seriesName].studios[studioName]) {
                    seriesSalesMap[seriesName].studios[studioName] = 0;
                }
                seriesSalesMap[seriesName].studios[studioName] += (sale.quantidade || 1);
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
            .map(s => {
                const seriesCount: { [key: string]: number } = {};
                // @ts-ignore
                s.figuras?.forEach((f: any) => {
                    const sName = f.series?.nome || 'Sem Série';
                    seriesCount[sName] = (seriesCount[sName] || 0) + 1;
                });

                return {
                    name: s.nome,
                    // @ts-ignore
                    value: s.figuras?.length || 0,
                    series: seriesCount
                };
            })
            .sort((a, b) => b.value - a.value);

        const totalInventoryCount = inventoryByStudio.reduce((acc, item) => acc + item.value, 0);

        // --- New Aggregation: Inventory by Series & Scale ---
        const seriesInventoryMap: { [key: string]: { value: number, category: string, categoryId: number, studios: { [key: string]: number } } } = {};
        const scaleInventoryMap: { [key: string]: number } = {};
        const resourcesByStudioMap: { [key: string]: { resin: number, paint: number } } = {};

        studios.forEach(s => {
            // @ts-ignore
            s.figuras?.forEach((f: any) => {
                // --- Series Logic ---
                const seriesData = Array.isArray(f.series) ? f.series[0] : f.series;
                const sName = seriesData?.nome || 'Sem Série';

                const catData = Array.isArray(seriesData?.categorias) ? seriesData.categorias[0] : seriesData?.categorias;
                const cName = catData?.nome || 'Outros';
                const cId = catData?.id || 999;

                if (!seriesInventoryMap[sName]) {
                    seriesInventoryMap[sName] = { value: 0, category: cName, categoryId: cId, studios: {} };
                }
                seriesInventoryMap[sName].value += 1;

                const studioName = s.nome;
                seriesInventoryMap[sName].studios[studioName] = (seriesInventoryMap[sName].studios[studioName] || 0) + 1;

                if (!resourcesByStudioMap[studioName]) {
                    resourcesByStudioMap[studioName] = { resin: 0, paint: 0 };
                }

                // --- Scale Logic (New) ---
                const meta = Array.isArray(f.figuras_meta) ? f.figuras_meta[0] : f.figuras_meta;
                const scaleRaw = meta?.escala;
                let scaleLabel = 'Outros';

                if (scaleRaw) {
                    // Normalize common scales if needed, or just use raw value if clean
                    // Assuming scale is stored as number (e.g. 10 for 1/10) or string '1/10'
                    // Based on previous files, it seemed to be a number (escala: number | string).
                    // Let's assume it might be 10, 6, 4 etc. and convert to '1/10', '1/6'
                    // OR if it's already '1/10', use it. 
                    // Let's check api/admin/figures/page.tsx, it had placeholder="100".
                    // Let's assume it's a number representing the denominator (e.g. 6 for 1/6) or just a string.
                    // The user asked for "1/10, 1/6".
                    // If it's a number, I'll format it. If string, use as is.
                    scaleLabel = !isNaN(Number(scaleRaw)) ? `1/${scaleRaw}` : String(scaleRaw);
                }

                scaleInventoryMap[scaleLabel] = (scaleInventoryMap[scaleLabel] || 0) + 1;

                // --- Resources Logic (New) ---
                if (meta) {
                    resourcesByStudioMap[studioName].resin += (Number(meta.resina_kg) || 0);
                    resourcesByStudioMap[studioName].paint += (Number(meta.horas_pintura) || 0);
                }
            });
        });

        const inventoryBySeries = Object.entries(seriesInventoryMap)
            .map(([name, data]) => ({ name, value: data.value, category: data.category, categoryId: data.categoryId, studios: data.studios }))
            .sort((a, b) => b.value - a.value);

        const inventoryByScale = Object.entries(scaleInventoryMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const resourcesByStudio = Object.entries(resourcesByStudioMap)
            .map(([name, data]) => ({ name, resin: Math.round(data.resin * 10) / 10, paint: Math.round(data.paint) })) // Round 1 decimal
            .sort((a, b) => b.resin - a.resin)
            .slice(0, 10); // Top 10

        const revenueByStudio = Object.entries(studioSalesMap)
            .map(([name, data]) => ({ name, value: data.revenue }))
            .sort((a, b) => b.value - a.value);

        const profitByStudio = Object.entries(studioSalesMap)
            .map(([name, data]) => ({ name, value: data.profit }))
            .sort((a, b) => b.value - a.value);

        const soldByStudio = Object.entries(studioSalesMap)
            .map(([name, data]) => ({ name, value: data.itemsSold }))
            .sort((a, b) => b.value - a.value);

        const costByStudio = studios
            .map(s => ({ name: s.nome, value: s.custo_mensal || 0 }))
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
            .map(([name, data]) => ({ name, value: data.value, category: data.category, studios: data.studios }))
            .sort((a, b) => b.value - a.value);

        // --- New Price Analytics ---
        let totalPortfolioValue = 0;
        let totalPortfolioBasic = 0;

        // Collect all valid premium prices to determine the dynamic range
        const validItems: { id: number, name: string, price: number, image_url: string }[] = [];

        // Build a map of Images from the 'figuras' we fetched in the studios query
        const imageMap = new Map<number, string>();
        if (studios) {
            studios.forEach(s => {
                if (s.figuras) {
                    s.figuras.forEach((f: any) => {
                        if (f.imagem_url) {
                            imageMap.set(f.id, f.imagem_url);
                        }
                    });
                }
            });
        }

        // Ensure pricingMap is populated (we did this in step 4)
        console.log(`[PricingDebug] Map Size: ${pricingMap.size}`);

        pricingMap.forEach((val, key) => {
            const raw = val.price; // Premium
            const rawBasic = val.cost; // Basic (mapped from 'Total (R$)')

            const num = Number(raw);
            const numBasic = Number(rawBasic);

            if (!isNaN(num)) {
                totalPortfolioValue += num;
                if (num > 0) {
                    validItems.push({
                        id: key,
                        name: val.name,
                        price: num,
                        image_url: imageMap.get(key) || ''
                    });
                }
            }
            if (!isNaN(numBasic)) totalPortfolioBasic += numBasic;
        });

        console.log(`[PricingDebug] Total Premium: ${totalPortfolioValue}`);
        console.log(`[PricingDebug] Total Basic: ${totalPortfolioBasic}`);

        // Calculate dynamic distribution if we have prices
        let priceDistribution: { name: string, value: number, sortKey: number, figures: any[] }[] = [];

        if (validItems.length > 0) {
            // Find Min and Max
            const minPrice = Math.min(...validItems.map(i => i.price));
            const maxPrice = Math.max(...validItems.map(i => i.price));

            if (maxPrice === minPrice) {
                // Edge case: all items have the exact same price
                priceDistribution = [{
                    name: `R$ ${minPrice.toFixed(0)}`,
                    value: validItems.length,
                    sortKey: minPrice,
                    figures: validItems.sort((a, b) => b.price - a.price)
                }];
            } else {
                // Divide the range into 4 buckets
                const range = maxPrice - minPrice;
                let step = Math.ceil(range / 4);

                // Round step to a "cleaner" number (e.g., nearest 50, 100, 500)
                if (step > 1000) step = Math.ceil(step / 500) * 500;
                else if (step > 500) step = Math.ceil(step / 100) * 100;
                else if (step > 100) step = Math.ceil(step / 50) * 50;
                else step = Math.ceil(step / 10) * 10;

                // Create Bucket definitions
                const buckets = [
                    { min: 0, max: step, name: `R$ 0 - ${step}`, figures: [] as any[] },
                    { min: step, max: step * 2, name: `R$ ${step} - ${step * 2}`, figures: [] as any[] },
                    { min: step * 2, max: step * 3, name: `R$ ${step * 2} - ${step * 3}`, figures: [] as any[] },
                    { min: step * 3, max: Infinity, name: `R$ ${step * 3}+`, figures: [] as any[] }
                ];

                // Assign prices to buckets
                validItems.forEach(item => {
                    const p = item.price;
                    if (p < buckets[0].max) buckets[0].figures.push(item);
                    else if (p < buckets[1].max) buckets[1].figures.push(item);
                    else if (p < buckets[2].max) buckets[2].figures.push(item);
                    else buckets[3].figures.push(item);
                });

                priceDistribution = buckets.map(b => ({
                    name: b.name,
                    value: b.figures.length,
                    sortKey: b.min,
                    figures: b.figures.sort((a, b) => b.price - a.price)
                }));
            }
        } else {
            priceDistribution = [];
        }

        // Avg Price by Studio (Filter out Zeros)
        const avgPriceByStudio = studios.map(s => {
            let sum = 0;
            let count = 0;
            if (s.figuras) {
                s.figuras.forEach((f: any) => {
                    const pEntry = pricingMap.get(f.id);
                    if (pEntry && Number(pEntry.price) > 0) { // STRICTLY > 0
                        sum += Number(pEntry.price);
                        count++;
                    }
                });
            }
            return {
                name: s.nome,
                value: count > 0 ? (sum / count) : 0,
                count
            };
        }).filter(s => s.value > 0).sort((a, b) => b.value - a.value);

        // --- Seller Chart ---
        const salesBySeller = Object.entries(sellerSalesMap).map(([name, data]) => {
            const enrichedFigures = data.figures.map(f => ({
                ...f,
                image_url: imageMap.get(f.id) || ''
            })).sort((a, b) => b.price - a.price);

            return {
                name,
                value: data.revenue,
                qty: data.qty,
                figures: enrichedFigures
            };
        }).sort((a, b) => b.value - a.value);



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
                salesByCategory,
                salesBySeries,
                revenueVsCost,
                inventoryBySeries,
                inventoryByScale,
                resourcesByStudio,
                costByStudio,
                // New Charts
                avgPriceByStudio,
                priceDistribution,
                totalPortfolioValue,
                totalPortfolioBasic,
                salesBySeller,
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
