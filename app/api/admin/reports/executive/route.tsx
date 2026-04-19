
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const runtime = 'edge';

export async function GET(req: NextRequest) {
    try {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1; // 1-12
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        
        // Match Dashboard date logic (Local Midnight)
        const janFirst = new Date(currentYear, 0, 1);

        // 1. FETCH DATA
        // Fetch all current year sales for Stats - EXCLUDING Canceled
        const { data: allSalesYear } = await supabase
            .from('vendas')
            .select('*, figuras(figuras_meta(resina_kg, horas_pintura))')
            .gte('data_venda', janFirst.toISOString())
            .neq('status', 'Cancelado')
            .order('data_venda', { ascending: false });

        const salesMonth = (allSalesYear || []).filter(s => new Date(s.data_venda) >= thirtyDaysAgo);

        // Fetch Pending Resin Demand (Direct logic from dashboard)
        const { data: pendingResinData } = await supabase
            .from('vendas')
            .select(`
                id,
                status,
                quantidade,
                figuras ( figuras_meta ( resina_kg ) )
            `)
            .neq('status', 'Cancelado');

        // Logic for Resin Demand (Statuses: Fila de Impressão, Imprimindo)
        const totalResinRequired = (pendingResinData || []).filter(s => ['Fila de Impressão', 'Imprimindo'].includes(s.status || '')).reduce((acc, sale: any) => {
            const figura = Array.isArray(sale.figuras) ? sale.figuras[0] : sale.figuras;
            const meta = Array.isArray(figura?.figuras_meta) ? figura.figuras_meta[0] : figura?.figuras_meta;
            const resinaPerUnit = Number(meta?.resina_kg) || 0;
            return acc + (resinaPerUnit * (Number(sale.quantidade) || 1));
        }, 0);

        // Logic for Pending Deliveries (Status: Pronto p/ Entrega)
        const pendingDeliveryCount = (pendingResinData || []).filter(s => s.status === 'Pronto p/ Entrega').length;

        // Fetch Studios for fixed costs
        const { data: studios } = await supabase.from('studios').select('*');
        const activeStudios = (studios || []).filter(s => s.ativo);
        const monthlyFixedCost = activeStudios.reduce((acc, s) => acc + (s.custo_mensal || 0), 0);

        // Fetch Users for Seller Names
        const { data: adminUsers } = await supabase.from('admin_users').select('email, nome');
        const userMap = (adminUsers || []).reduce((acc: any, u) => {
            acc[u.email.toLowerCase()] = u.nome;
            return acc;
        }, {});

        // Pricing Params (Resin Stock)
        const { data: settingsList } = await supabase
            .from('pricing_params')
            .select('*')
            .order('id', { ascending: true })
            .limit(1);
        const settings = settingsList?.[0];
        const resinStock = Number(settings?.estoque_resina_kg) || 0;

        // 2. AGGREGATE STATS
        const monthRevenue = salesMonth.reduce((acc, s) => acc + (s.valor_venda_final || 0) + (s.valor_frete || 0), 0);
        const monthProfit = salesMonth.reduce((acc, s) => acc + (s.lucro_real || 0), 0);
        
        const sellerStats: Record<string, { revenue: number, comm: number, paint: number, count: number }> = {};
        const studioStatsMap: Record<string, { revenue: number, profit: number }> = {};
        const customerStatsMap: Record<string, { name: string, revenue: number, count: number }> = {};

        salesMonth.forEach(s => {
            const sellerEmail = (s.vendedor || 'Ateliê').toLowerCase();
            if (!sellerStats[sellerEmail]) sellerStats[sellerEmail] = { revenue: 0, comm: 0, paint: 0, count: 0 };
            
            sellerStats[sellerEmail].revenue += (s.valor_venda_final || 0) + (s.valor_frete || 0);
            sellerStats[sellerEmail].comm += (s.comissao_vendedor || 0);
            sellerStats[sellerEmail].count += 1;

            const fig = Array.isArray(s.figuras) ? s.figuras[0] : s.figuras;
            const meta = Array.isArray(fig?.figuras_meta) ? fig.figuras_meta[0] : fig?.figuras_meta;
            if (meta?.horas_pintura) {
                const paintCost = (Math.ceil(meta.horas_pintura * 50) * (s.quantidade || 1));
                sellerStats[sellerEmail].paint += paintCost;
            }

            const studioId = s.estudio_id || 'outros';
            if (!studioStatsMap[studioId]) studioStatsMap[studioId] = { revenue: 0, profit: 0 };
            studioStatsMap[studioId].revenue += (s.valor_venda_final || 0) + (s.valor_frete || 0);
            studioStatsMap[studioId].profit += (s.lucro_real || 0);

            const customerKey = s.cliente_id || s.cliente_nome || 'Cliente Final';
            if (!customerStatsMap[customerKey]) {
                customerStatsMap[customerKey] = { 
                    name: s.cliente_nome || 'Cliente Final', 
                    revenue: 0, 
                    count: 0 
                };
            }
            customerStatsMap[customerKey].revenue += (s.valor_venda_final || 0) + (s.valor_frete || 0);
            customerStatsMap[customerKey].count += 1;
        });

        const ytdRevenue = (allSalesYear || []).reduce((acc, s) => acc + (s.valor_venda_final || 0) + (s.valor_frete || 0), 0);
        const ytdProfit = (allSalesYear || []).reduce((acc, s) => acc + (s.lucro_real || 0), 0);
        
        const ytdStudioBudget = monthlyFixedCost * 12;

        // 4. FORMATTING
        const topSellers = Object.entries(sellerStats)
            .map(([email, stats]) => ({
                name: userMap[email] || email.split('@')[0].toUpperCase(),
                ...stats,
            }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 3);

        const allStudiosList = [...(studios || [])];
        if (studioStatsMap['outros']) allStudiosList.push({ id: 'outros', nome: 'Outros', custo_mensal: 0 });
        const topStudios = allStudiosList
            .map(s => {
                const sData = studioStatsMap[s.id] || { revenue: 0, profit: 0 };
                const netIncome = sData.revenue - (s.custo_mensal || 0);
                return {
                    id: s.id,
                    name: s.nome,
                    revenue: sData.revenue,
                    netIncome,
                    pct: monthRevenue > 0 ? (sData.revenue / monthRevenue) * 100 : 0
                };
            })
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 3);

        const topCustomers = Object.values(customerStatsMap)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 3);

        const projectedBalance = resinStock - totalResinRequired;
        const formatMoney = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const formatDate = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

        return new ImageResponse(
            (
                <div style={{
                    height: '100%', width: '100%',
                    display: 'flex', flexDirection: 'column',
                    backgroundColor: '#ffffff', padding: '50px',
                    fontFamily: 'sans-serif',
                }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '4px solid #000', paddingBottom: 15, marginBottom: 25 }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <h1 style={{ fontSize: 32, fontWeight: 900, margin: 0, textTransform: 'uppercase' }}>Ficha Consolidada Operacional</h1>
                            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px' }}>Franga Toys // Smart Workshop Intelligence</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <span style={{ fontSize: 13, fontWeight: 800 }}>Mês Referência: {currentMonth}/{currentYear}</span>
                            <span style={{ fontSize: 9, color: '#94a3b8' }}>Geração: {formatDate(now)}</span>
                        </div>
                    </div>

                    {/* TOP KPIs: MONTHLY */}
                    <div style={{ display: 'flex', gap: 15, marginBottom: 25 }}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 18, border: '2px solid #e2e8f0' }}>
                            <span style={{ fontSize: 9, fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Renda do Mês (30d)</span>
                            <span style={{ fontSize: 22, fontWeight: 900 }}>R$ {formatMoney(monthRevenue)}</span>
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 18, border: '2px solid #000' }}>
                            <span style={{ fontSize: 9, fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Lucro Real do Mês</span>
                            <span style={{ fontSize: 22, fontWeight: 900, color: '#10b981' }}>R$ {formatMoney(monthProfit)}</span>
                        </div>
                        {/* Logistics Badge (Standalone STAT) */}
                        <div style={{ width: 180, display: 'flex', flexDirection: 'column', padding: 18, border: '2px solid #f97316', backgroundColor: '#fff7ed' }}>
                            <span style={{ fontSize: 9, fontWeight: 900, color: '#ea580c', textTransform: 'uppercase' }}>P/ Enviar (Logística)</span>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                                <span style={{ fontSize: 22, fontWeight: 900 }}>{pendingDeliveryCount}</span>
                                <span style={{ fontSize: 10, fontWeight: 800, color: '#9a3412' }}>PEDIDOS</span>
                            </div>
                        </div>
                    </div>

                    {/* --- MONITOR DE PRODUÇÃO (Exactly as Dashboard Image) --- */}
                    <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 30 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                            <div style={{ display: 'flex', width: 14, height: 14, border: '2px solid #000', borderRadius: '50%' }}></div>
                            <h3 style={{ fontSize: 15, fontWeight: 900, margin: 0, textTransform: 'uppercase' }}>Monitor de Produção (Saldo de Insumos)</h3>
                        </div>
                        <div style={{ display: 'flex', gap: 15 }}>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 20, border: '2px solid #e2e8f0', backgroundColor: '#fdfdfd', alignItems: 'center' }}>
                                <span style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Estoque de Resina</span>
                                <span style={{ fontSize: 28, fontWeight: 900, marginTop: 5 }}>{resinStock.toFixed(2)}<span style={{ fontSize: 12, marginLeft: 4 }}>kg</span></span>
                            </div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 20, border: '2px solid #e2e8f0', backgroundColor: '#fdfdfd', alignItems: 'center' }}>
                                <span style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Demanda Pendente</span>
                                <span style={{ fontSize: 28, fontWeight: 900, marginTop: 5 }}>{totalResinRequired.toFixed(2)}<span style={{ fontSize: 12, marginLeft: 4 }}>kg</span></span>
                            </div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 20, border: '2px solid #10b981', backgroundColor: '#ecfdf5', alignItems: 'center' }}>
                                <span style={{ fontSize: 9, fontWeight: 800, color: '#047857', textTransform: 'uppercase' }}>Saldo Projetado</span>
                                <span style={{ fontSize: 28, fontWeight: 900, marginTop: 5, color: projectedBalance > 0 ? '#059669' : '#dc2626' }}>{projectedBalance.toFixed(2)}<span style={{ fontSize: 12, marginLeft: 4 }}>kg</span></span>
                                <div style={{ marginTop: 8, padding: '2px 8px', backgroundColor: projectedBalance > 0 ? '#059669' : '#dc2626', borderRadius: 4, height: 16, display: 'flex', alignItems: 'center' }}>
                                    <span style={{ fontSize: 8, color: '#fff', fontWeight: 900 }}>{projectedBalance > 0 ? 'EM DIA' : 'ALERTA STOCK'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* PERFORMANCE TRIO (Team, Studio, Customers) */}
                    <div style={{ display: 'flex', gap: 20, marginBottom: 30 }}>
                        {/* Sellers */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <h3 style={{ fontSize: 11, fontWeight: 900, borderBottom: '2px solid #000', paddingBottom: 6, marginBottom: 10, textTransform: 'uppercase' }}>Equipe (Top 3)</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {topSellers.map((s, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                                        <span style={{ fontSize: 10, fontWeight: 800 }}>{s.name}</span>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                            <span style={{ fontSize: 10, fontWeight: 900 }}>R$ {formatMoney(s.revenue)}</span>
                                            <span style={{ fontSize: 8, color: '#64748b', fontWeight: 700 }}>{s.count} Pedidos</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* Studios */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <h3 style={{ fontSize: 11, fontWeight: 900, borderBottom: '2px solid #000', paddingBottom: 6, marginBottom: 10, textTransform: 'uppercase' }}>Estúdios (Top 3)</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {topStudios.map((s, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                                        <span style={{ fontSize: 10, fontWeight: 800 }}>{s.name}</span>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                            <span style={{ fontSize: 10, fontWeight: 900 }}>R$ {formatMoney(s.revenue)}</span>
                                            <span style={{ fontSize: 8, color: s.netIncome > 0 ? '#10b981' : '#ef4444', fontWeight: 900 }}>NET: R$ {formatMoney(s.netIncome)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* Customers */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <h3 style={{ fontSize: 11, fontWeight: 900, borderBottom: '2px solid #000', paddingBottom: 6, marginBottom: 10, textTransform: 'uppercase' }}>Top Clientes (Mês)</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {topCustomers.map((c, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                                        <span style={{ fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80px' }}>{c.name}</span>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                            <span style={{ fontSize: 10, fontWeight: 900 }}>R$ {formatMoney(c.revenue)}</span>
                                            <span style={{ fontSize: 8, color: '#64748b', fontWeight: 700 }}>{c.count} Pedidos</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* YTD SECTION */}
                    <div style={{ display: 'flex', flexDirection: 'column', padding: 20, border: '2px solid #000', backgroundColor: '#f8fafc', marginBottom: 25 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                            <h3 style={{ fontSize: 14, fontWeight: 900, margin: 0, textTransform: 'uppercase' }}>Sumário Operacional Anual (YTD)</h3>
                            <span style={{ fontSize: 10, fontWeight: 900, backgroundColor: '#000', color: '#fff', padding: '3px 8px' }}>ACUMULADO {currentYear}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                <div style={{ display: 'flex', gap: 40 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 9, fontWeight: 800, color: '#64748b' }}>FATURAMENTO ACUMULADO</span><span style={{ fontSize: 16, fontWeight: 900 }}>R$ {formatMoney(ytdRevenue)}</span></div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 9, fontWeight: 800, color: '#64748b' }}>LUCRO REAL ACUMULADO</span><span style={{ fontSize: 16, fontWeight: 900, color: '#10b981' }}>R$ {formatMoney(ytdProfit)}</span></div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                                <span style={{ fontSize: 10, fontWeight: 800, color: '#64748b' }}>ORÇAMENTO ANUAL ESTÚDIOS</span>
                                <span style={{ fontSize: 14, fontWeight: 900, color: '#ef4444' }}>- R$ {formatMoney(ytdStudioBudget)}</span>
                            </div>
                        </div>
                    </div>

                    {/* FOOTER & SIGNATURES */}
                    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}><div style={{ width: '80%', borderBottom: '1px solid #000', marginBottom: 5 }}></div><span style={{ fontSize: 8, fontWeight: 900, textTransform: 'uppercase' }}>Administração Executiva</span></div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}><div style={{ width: '80%', borderBottom: '1px solid #000', marginBottom: 5 }}></div><span style={{ fontSize: 8, fontWeight: 900, textTransform: 'uppercase' }}>Responsável de Produção</span></div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: 10 }}>
                             <span style={{ fontSize: 7, color: '#94a3b8', letterSpacing: '2px' }}>FRANGA TOYS WORKSHOP INTELLIGENCE // SYSTEM v4.4</span>
                             <span style={{ fontSize: 7, color: '#94a3b8' }}>RELATÓRIO PROPRIEDADE PRIVADA</span>
                        </div>
                    </div>
                </div>
            ),
            { width: 842, height: 1191 }
        );
    } catch (e) {
        console.error('Report Error:', e);
        return new Response('Erro ao gerar relatório', { status: 500 });
    }
}
