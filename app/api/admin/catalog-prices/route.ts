
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
                    codigo,
                    studios ( nome ),
                    figuras_meta (
                        resina_kg,
                        horas_impressao,
                        horas_pintura,
                        altura_cm,
                        largura_cm,
                        profundidade_cm
                    )
                `)
                .or(`nome.ilike.%${search}%,codigo.ilike.%${search}%,sinonimos.ilike.%${search}%`)
                .limit(50);

            if (error) throw error;

            const formatted = data.map((item: any) => {
                const meta = item.figuras_meta || {};

                // Custo Estilizado: Pintura fixa de 20 minutos (0.33h)
                const custoPinturaEstilizado = 0.33 * (settings.custo_h_pintura || 50);
                const custoBaseEstilizado =
                    ((meta.resina_kg || 0) * (settings.custo_resina_kg || 0)) +
                    ((meta.horas_impressao || 0) * (settings.custo_h_impressao || 0)) +
                    custoPinturaEstilizado;

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
                    codigo: item.codigo,
                    studio: item.studios?.nome || 'N/A',
                    resina_kg: meta.resina_kg || 0,
                    horas_pintura: meta.horas_pintura || 0,
                    altura_cm: meta.altura_cm || 0,
                    largura_cm: meta.largura_cm || 0,
                    profundidade_cm: meta.profundidade_cm || 0,
                    custo_producao: custoProducao,
                    "Estilizado (R$)": roundTo5(custoBaseEstilizado * (settings.margem_pobre || 1.15)),
                    "Colorido (R$)": roundTo5(custoBase * (settings.margem_basica || 1.30)),
                    "2D (R$)": roundTo5(custoBase * (settings.margem_premium || 1.60))
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
                    horas_pintura,
                    altura_cm,
                    largura_cm,
                    profundidade_cm
                )
            `)
            .order('nome', { ascending: true })
            .limit(100);

        if (error) throw error;

        const formatted = data.map((item: any) => {
            const meta = item.figuras_meta || {};

            // Custo Estilizado: Pintura fixa de 20 minutos (0.33h)
            const custoPinturaEstilizado = 0.33 * (settings.custo_h_pintura || 50);
            const custoBaseEstilizado =
                ((meta.resina_kg || 0) * (settings.custo_resina_kg || 0)) +
                ((meta.horas_impressao || 0) * (settings.custo_h_impressao || 0)) +
                custoPinturaEstilizado;

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
                codigo: item.codigo,
                studio: item.studios?.nome || 'N/A',
                resina_kg: meta.resina_kg || 0,
                horas_pintura: meta.horas_pintura || 0,
                altura_cm: meta.altura_cm || 0,
                largura_cm: meta.largura_cm || 0,
                profundidade_cm: meta.profundidade_cm || 0,
                custo_producao: custoProducao,
                "Estilizado (R$)": roundTo5(custoBaseEstilizado * (settings.margem_pobre || 1.15)),
                "Colorido (R$)": roundTo5(custoBase * (settings.margem_basica || 1.30)),
                "2D (R$)": roundTo5(custoBase * (settings.margem_premium || 1.60))
            };
        });

        return NextResponse.json(formatted);

    } catch (error: any) {
        console.error('Catalog Search Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
