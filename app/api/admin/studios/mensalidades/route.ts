import { NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const sessionOrResponse = await requireRoles(['admin', 'pricing', 'finance']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const { searchParams } = new URL(req.url);
        const paramAno = searchParams.get('ano');
        const ano = paramAno ? parseInt(paramAno, 10) : new Date().getFullYear();

        // 1. Buscar todos os estúdios (ativos e inativos para permitir ativação em meses passados se desejar)
        const { data: studios, error: studiosErr } = await supabase
            .from('studios')
            .select('id, nome, custo_mensal, ativo, logo_url')
            .order('ativo', { ascending: false })
            .order('nome', { ascending: true });

        if (studiosErr) throw studiosErr;

        // 2. Buscar registros de mensalidades do ano
        const { data: mensalidades, error: mensErr } = await supabase
            .from('studios_mensalidades')
            .select('studio_id, ano, mes, ativo, valor_pago, tier_tipo, observacao')
            .eq('ano', ano);

        if (mensErr) throw mensErr;

        // Mapear registros existentes: "studioId-mes" => { ativo, valor_pago, tier_tipo, observacao }
        const mensMap = new Map<string, { ativo: boolean; valor_pago: number; tier_tipo?: string; observacao?: string | null }>();
        (mensalidades || []).forEach(m => {
            mensMap.set(`${m.studio_id}-${m.mes}`, {
                ativo: m.ativo,
                valor_pago: Number(m.valor_pago) || 0,
                tier_tipo: m.tier_tipo,
                observacao: m.observacao
            });
        });

        // 3. Montar matriz de 12 meses para cada estúdio
        const monthTotals = Array(12).fill(0);
        let totalGeralAno = 0;

        const resultStudios = (studios || []).map(st => {
            const defaultCost = Number(st.custo_mensal) || 0;
            const meses = [];
            let totalStudioAno = 0;
            let mesesAtivosCount = 0;

            for (let mes = 1; mes <= 12; mes++) {
                const record = mensMap.get(`${st.id}-${mes}`);
                const isAtivo = record ? record.ativo : false;
                const valor = record ? record.valor_pago : (isAtivo ? defaultCost : 0);
                const tierTipo = record?.tier_tipo || (valor > 0 && valor < defaultCost ? 'reduzido' : valor > 0 ? 'merchant' : 'inativo');

                if (isAtivo) {
                    totalStudioAno += valor;
                    mesesAtivosCount += 1;
                    monthTotals[mes - 1] += valor;
                    totalGeralAno += valor;
                }

                meses.push({
                    mes,
                    ativo: isAtivo,
                    valor,
                    tier_tipo: tierTipo,
                    observacao: record?.observacao || null,
                    registrado: !!record
                });
            }

            return {
                id: st.id,
                nome: st.nome,
                custo_mensal_base: defaultCost,
                ativo_atual: st.ativo,
                logo_url: st.logo_url,
                total_ano: totalStudioAno,
                meses_ativos_count: mesesAtivosCount,
                meses
            };
        });

        return NextResponse.json({
            ano,
            totais_por_mes: monthTotals,
            total_geral_ano: totalGeralAno,
            studios: resultStudios
        });

    } catch (error: any) {
        console.error('Erro na API de mensalidades de estúdios:', error);
        return NextResponse.json({ error: error.message || 'Erro ao carregar mensalidades' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const sessionOrResponse = await requireRoles(['admin', 'pricing', 'finance']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const body = await req.json();

        // Aceita atualização individual ou em lote
        const updates: Array<{
            studio_id: number;
            ano: number;
            mes: number;
            ativo: boolean;
            valor_pago?: number;
            tier_tipo?: string;
            observacao?: string | null;
        }> = Array.isArray(body.updates) ? body.updates : [body];

        if (!updates.length) {
            return NextResponse.json({ error: 'Nenhuma atualização fornecida' }, { status: 400 });
        }

        // Buscar estúdios para obter custo_mensal base caso valor_pago não seja especificado
        const studioIds = Array.from(new Set(updates.map(u => u.studio_id)));
        const { data: studiosData } = await supabase
            .from('studios')
            .select('id, custo_mensal')
            .in('id', studioIds);

        const studioCostMap = new Map<number, number>();
        (studiosData || []).forEach(s => studioCostMap.set(s.id, Number(s.custo_mensal) || 0));

        const rowsToUpsert = updates.map(u => {
            const baseCost = studioCostMap.get(u.studio_id) || 0;
            const valor = u.valor_pago !== undefined ? Number(u.valor_pago) : baseCost;
            const tierTipo = u.tier_tipo || (valor > 0 && valor < baseCost ? 'reduzido' : valor > 0 ? 'merchant' : 'inativo');
            return {
                studio_id: u.studio_id,
                ano: u.ano,
                mes: u.mes,
                ativo: Boolean(u.ativo),
                valor_pago: valor,
                tier_tipo: tierTipo,
                observacao: u.observacao !== undefined ? u.observacao : null,
                updated_at: new Date().toISOString()
            };
        });

        const { error: upsertErr } = await supabase
            .from('studios_mensalidades')
            .upsert(rowsToUpsert, { onConflict: 'studio_id,ano,mes' });

        if (upsertErr) throw upsertErr;

        return NextResponse.json({ success: true, count: rowsToUpsert.length });

    } catch (error: any) {
        console.error('Erro ao atualizar mensalidades de estúdios:', error);
        return NextResponse.json({ error: error.message || 'Erro ao salvar mensalidades' }, { status: 500 });
    }
}
