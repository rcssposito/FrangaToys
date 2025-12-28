
import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

// LER CONFIGURAÇÕES
export async function GET() {
    try {
        let { data, error } = await supabase
            .from('pricing_params')
            .select('*')
            .eq('id', 1)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        // Se não existir, criar padrão
        if (!data) {
            console.log('Creating default pricing params...');
            const { data: newData, error: createError } = await supabase
                .from('pricing_params')
                .insert([{
                    id: 1,
                    custo_h_impressao: 1.00,
                    custo_h_pintura: 50.00,
                    custo_resina_kg: 250.00,
                    margem_basica: 1.40,
                    margem_premium: 1.70
                }])
                .select()
                .single();

            if (createError) throw createError;
            data = newData;
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Settings API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// ATUALIZAR CONFIGURAÇÕES
export async function PUT(req: Request) {
    try {
        const body = await req.json();

        // Validação básica
        if (body.margem_basica < 1 || body.margem_premium < 1) {
            return NextResponse.json({ error: 'Margens devem ser maiores que 1.0' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('pricing_params')
            .update({
                custo_h_impressao: body.custo_h_impressao,
                custo_h_pintura: body.custo_h_pintura,
                custo_resina_kg: body.custo_resina_kg,
                margem_basica: body.margem_basica,
                margem_premium: body.margem_premium
            })
            .eq('id', 1)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
