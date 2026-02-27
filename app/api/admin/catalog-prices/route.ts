
import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search');

        // 1. Buscar configurações globais de preço primeiro (sempre id: 1)
        const { data: settings, error: settingsError } = await supabase
            .from('pricing_params')
            .select('*')
            .eq('id', 1)
            .single();

        if (settingsError) throw settingsError;

        // 2. Se houver busca, filtramos na tabela 'figuras' (principais) 
        // para fugir do limite de 1000 itens da View e incluir itens sem metadata
        if (search) {
            const { data, error } = await supabase
                .from('figuras')
                .select(`
                    id,
                    nome,
                    studios ( nome ),
                    figuras_meta (
                        resina_kg,
                        horas_impressao,
                        horas_pintura
                    )
                `)
                .ilike('nome', `%${search}%`)
                .limit(50);

            if (error) throw error;

            const formatted = data.map((item: any) => {
                const meta = item.figuras_meta || {};

                const custoBase =
                    ((meta.resina_kg || 0) * (settings.custo_resina_kg || 0)) +
                    ((meta.horas_impressao || 0) * (settings.custo_h_impressao || 0)) +
                    ((meta.horas_pintura || 0) * (settings.custo_h_pintura || 0));

                const roundTo5 = (val: number) => Math.ceil(val / 5) * 5;

                const custoProducao = Math.ceil(
                    ((meta.resina_kg || 0) * (settings.custo_resina_kg || 0)) +
                    ((meta.horas_impressao || 0) * (settings.custo_h_impressao || 0))
                );

                return {
                    id: item.id,
                    Figura: item.nome,
                    studio: item.studios?.nome || 'N/A',
                    resina_kg: meta.resina_kg || 0, // Adicionado para cálculo de estoque no PDV
                    horas_pintura: meta.horas_pintura || 0,
                    custo_producao: custoProducao,
                    "Básico (R$)": roundTo5(custoBase * settings.margem_basica),
                    "Premium (R$)": roundTo5(custoBase * settings.margem_premium)
                };
            });

            return NextResponse.json(formatted);
        }

        // 3. Caso sem busca: Pega os últimos adicionados ou por ordem alfabética
        const { data, error } = await supabase
            .from('figuras')
            .select(`
                id,
                nome,
                studios ( nome ),
                figuras_meta (
                    resina_kg,
                    horas_impressao,
                    horas_pintura
                )
            `)
            .order('nome', { ascending: true })
            .limit(100);

        if (error) throw error;

        const formatted = data.map((item: any) => {
            const meta = item.figuras_meta || {};
            const custoBase =
                ((meta.resina_kg || 0) * (settings.custo_resina_kg || 0)) +
                ((meta.horas_impressao || 0) * (settings.custo_h_impressao || 0)) +
                ((meta.horas_pintura || 0) * (settings.custo_h_pintura || 0));

            const roundTo5 = (val: number) => Math.ceil(val / 5) * 5;

            const custoProducao = Math.ceil(
                ((meta.resina_kg || 0) * (settings.custo_resina_kg || 0)) +
                ((meta.horas_impressao || 0) * (settings.custo_h_impressao || 0))
            );

            return {
                id: item.id,
                Figura: item.nome,
                studio: item.studios?.nome || 'N/A',
                resina_kg: meta.resina_kg || 0,
                horas_pintura: meta.horas_pintura || 0,
                custo_producao: custoProducao,
                "Básico (R$)": roundTo5(custoBase * settings.margem_basica),
                "Premium (R$)": roundTo5(custoBase * settings.margem_premium)
            };
        });

        return NextResponse.json(formatted);

    } catch (error: any) {
        console.error('Catalog Search Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
