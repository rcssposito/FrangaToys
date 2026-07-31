import { NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { calculateFigurePrices } from '@/lib/pricing';

// GET ALL STUDIOS WITH PERFORMANCE METRICS (ADMIN ONLY)
export async function GET(req: Request) {
    try {
        const sessionOrResponse = await requireRoles(['admin', 'pricing']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        // Fetch pricing parameters (to calculate figure prices)
        const { data: settings, error: settingsError } = await supabase
            .from('pricing_params')
            .select('*')
            .eq('id', 1)
            .single();

        if (settingsError) throw settingsError;

        // Fetch all studios with their figure IDs and metadata
        const { data: studios, error: studiosError } = await supabase
            .from('studios')
            .select('*, figuras(id, views, figuras_meta(resina_kg, horas_impressao, horas_pintura, is_campanha_active, desconto_campanha, preco_fixo_campanha))');

        if (studiosError) throw studiosError;

        // Parse search params for date filtering
        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        let query = supabase
            .from('vendas')
            .select('figura_id, quantidade, valor_venda_final, lucro_real, status')
            .neq('status', 'Cancelado');

        if (startDate) {
            query = query.gte('data_venda', startDate);
        } else {
            // Default to current year for backward compatibility
            const currentYear = new Date().getFullYear();
            const startOfYear = new Date(currentYear, 0, 1).toISOString();
            query = query.gte('data_venda', startOfYear);
        }

        if (endDate) {
            query = query.lte('data_venda', endDate);
        } else if (!startDate) {
            const currentYear = new Date().getFullYear();
            const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999).toISOString();
            query = query.lte('data_venda', endOfYear);
        }

        const { data: sales, error: salesError } = await query;

        if (salesError) throw salesError;

        // Map figure_id to studio_id
        const figureToStudioMap = new Map<number, number>();
        studios?.forEach((s: any) => {
            if (s.figuras) {
                s.figuras.forEach((f: any) => {
                    figureToStudioMap.set(f.id, s.id);
                });
            }
        });

        // Initialize metrics for each studio
        const metricsMap = new Map<number, {
            total_vendas: number;
            total_itens: number;
            receita_bruta: number;
            lucro_liquido: number;
            figuras_vendidas_unicas: Set<number>;
        }>();

        studios?.forEach((s: any) => {
            metricsMap.set(s.id, {
                total_vendas: 0,
                total_itens: 0,
                receita_bruta: 0,
                lucro_liquido: 0,
                figuras_vendidas_unicas: new Set<number>()
            });
        });

        // Populate metrics with sales data
        sales?.forEach((sale: any) => {
            const studioId = figureToStudioMap.get(sale.figura_id);
            if (studioId !== undefined) {
                const m = metricsMap.get(studioId);
                if (m) {
                    m.total_vendas += 1;
                    m.total_itens += (Number(sale.quantidade) || 1);
                    m.receita_bruta += (Number(sale.valor_venda_final) || 0);
                    m.lucro_liquido += (Number(sale.lucro_real) || 0);
                    m.figuras_vendidas_unicas.add(sale.figura_id);
                }
            }
        });

        // Enriched studios object
        const enrichedStudios = studios?.map((s: any) => {
            const m = metricsMap.get(s.id) || {
                total_vendas: 0,
                total_itens: 0,
                receita_bruta: 0,
                lucro_liquido: 0,
                figuras_vendidas_unicas: new Set<number>()
            };

            const total_figuras = s.figuras?.length || 0;
            const figuras_vendidas = m.figuras_vendidas_unicas.size;
            const conversao_acervo = total_figuras > 0 ? (figuras_vendidas / total_figuras) * 100 : 0;
            const margem_lucro = m.receita_bruta > 0 ? (m.lucro_liquido / m.receita_bruta) * 100 : 0;

            // Calculate average ticket as average colored price of figures in the studio's catalog, and sum views/clicks
            let sumPrices = 0;
            let countPrices = 0;
            let total_cliques = 0;
            s.figuras?.forEach((f: any) => {
                total_cliques += f.views || 0;
                const metaList = f.figuras_meta;
                const meta = Array.isArray(metaList) ? metaList[0] : metaList;
                if (meta && settings) {
                    const prices = calculateFigurePrices(meta, settings);
                    sumPrices += prices.pix_colorido; // Use colored PIX price (pix_colorido)
                    countPrices++;
                }
            });
            const ticket_medio = countPrices > 0 ? sumPrices / countPrices : 0;

            // Clean up original figures array to avoid bloated response payload
            const { figuras, ...rest } = s;

            return {
                ...rest,
                total_figuras,
                total_vendas: m.total_vendas,
                total_itens: m.total_itens,
                receita_bruta: m.receita_bruta,
                lucro_liquido: m.lucro_liquido,
                figuras_vendidas,
                conversao_acervo,
                margem_lucro,
                ticket_medio,
                total_cliques
            };
        });

        // Default sort: gross revenue descending, then name ascending
        enrichedStudios?.sort((a: any, b: any) => {
            if (b.receita_bruta !== a.receita_bruta) {
                return b.receita_bruta - a.receita_bruta;
            }
            return a.nome.localeCompare(b.nome);
        });

        return NextResponse.json(enrichedStudios || []);
    } catch (error: any) {
        console.error('GET Admin Studios API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// UPDATE STUDIO
export async function PUT(req: Request) {
    try {
        const sessionOrResponse = await requireRoles(['admin', 'pricing']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const body = await req.json();
        const { id, custo_mensal, qtd_display, qualidade, observacao, logo_url, instagram_handle, social_url, ativo, merchant } = body;

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        const { data, error } = await supabase
            .from('studios')
            .update({ custo_mensal, qtd_display, qualidade, observacao, logo_url, instagram_handle, social_url, ativo, merchant })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // CASCATURAMENTO: Se o status de merchant do estúdio mudou, atualiza todas as figuras
        if (merchant !== undefined) {
             const { error: cascadeError } = await supabase
                .from('figuras')
                .update({ disponivel: merchant })
                .eq('studio_id', id);
            
            if (cascadeError) {
                console.error("Erro no cascateamento de merchant:", cascadeError);
                // Não travamos a resposta do estúdio, mas logamos o erro
            }
        }

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// CREATE STUDIO
export async function POST(req: Request) {
    try {
        const sessionOrResponse = await requireRoles(['admin', 'pricing']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const body = await req.json();
        const { nome, custo_mensal, qtd_display, qualidade, observacao, logo_url, instagram_handle, social_url, ativo, merchant } = body;

        if (!nome) return NextResponse.json({ error: 'Nome required' }, { status: 400 });

        const payload: any = { 
            nome, 
            ativo: ativo ?? true,
            merchant: merchant ?? false
        };

        // Only include fields if they are explicitly provided in the request
        if (custo_mensal !== undefined && custo_mensal !== '') payload.custo_mensal = custo_mensal;
        if (qtd_display !== undefined && qtd_display !== '') payload.qtd_display = qtd_display;
        if (qualidade !== undefined && qualidade !== '') payload.qualidade = qualidade;
        if (observacao !== undefined && observacao !== '') payload.observacao = observacao;
        if (logo_url !== undefined && logo_url !== '') payload.logo_url = logo_url;
        if (instagram_handle !== undefined && instagram_handle !== '') payload.instagram_handle = instagram_handle;
        if (social_url !== undefined && social_url !== '') payload.social_url = social_url;
        if (ativo !== undefined) payload.ativo = ativo;
        if (merchant !== undefined) payload.merchant = merchant;

        const { data, error } = await supabase
            .from('studios')
            .insert([payload])
            .select()
            .single();

        if (error) {
            console.error("SUPABASE ERROR ON INSERT:", JSON.stringify(error, null, 2));
            throw error;
        }

        // CASCATURAMENTO: Se criado como merchant, garante que figuras do estúdio também fiquem disponíveis
        if (data?.merchant && data?.id) {
            await supabase
                .from('figuras')
                .update({ disponivel: true })
                .eq('studio_id', data.id);
        }

        return NextResponse.json(data, { status: 201 });
    } catch (error: any) {
        console.error("POST Studio error", error);
        return NextResponse.json({ error: error.message, fullError: error }, { status: 500 });
    }
}

// DELETE STUDIO
export async function DELETE(req: Request) {
    try {
        const sessionOrResponse = await requireRoles(['admin', 'pricing']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        // First check if there are figures bound to this studio
        const { count, error: countError } = await supabase
            .from('figuras')
            .select('*', { count: 'exact', head: true })
            .eq('studio_id', id);

        if (countError) throw countError;

        if (count && count > 0) {
            return NextResponse.json({ error: `Cannot delete studio because it has ${count} figures associated. Please reassign them first.` }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('studios')
            .delete()
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
