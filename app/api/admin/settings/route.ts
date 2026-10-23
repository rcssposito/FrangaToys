
import { NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { supabaseAdmin as supabase } from '@/lib/supabase';

// LER CONFIGURAÇÕES
export async function GET() {
    try {
    const sessionOrResponse = await requireRoles(['admin', 'sales', 'finance']);
    if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

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
                    estoque_resina_kg: 0,
                    margem_pobre: 1.15,   // Alvo: Estilizado (15%)
                    margem_basica: 1.30,  // Alvo: Colorido (30%)
                    margem_premium: 1.60, // Alvo: 2D (60%)
                    taxa_cartao: 1.15
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
        const sessionOrResponse = await requireRoles(['admin']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const body = await req.json();

        // Validação básica
        if (body.margem_basica < 1 || (body.margem_premium && body.margem_premium < 1) || (body.margem_pobre && body.margem_pobre < 1)) {
            return NextResponse.json({ error: 'Margens devem ser maiores que 1.0' }, { status: 400 });
        }

        const updatePayload: Record<string, any> = {
            custo_h_impressao: body.custo_h_impressao,
            custo_h_pintura: body.custo_h_pintura,
            custo_resina_kg: body.custo_resina_kg,
            estoque_resina_kg: body.estoque_resina_kg,
            margem_basica: body.margem_basica,
            margem_premium: body.margem_premium,
            margem_pobre: body.margem_pobre,
            taxa_cartao: body.taxa_cartao
        };

        if (body.desconto_primeira_compra !== undefined) {
            updatePayload.desconto_primeira_compra = Number(body.desconto_primeira_compra);
        }
        if (body.desconto_captacao !== undefined) {
            updatePayload.desconto_captacao = Number(body.desconto_captacao);
        }
        if (body.modal_intervalo_dias !== undefined) {
            updatePayload.modal_intervalo_dias = parseInt(body.modal_intervalo_dias, 10);
        }
        if (body.modal_tempo_inatividade_segundos !== undefined) {
            updatePayload.modal_tempo_inatividade_segundos = parseInt(body.modal_tempo_inatividade_segundos, 10);
        }

        const { data, error } = await supabase
            .from('pricing_params')
            .update(updatePayload)
            .eq('id', 1)
            .select()
            .single();

        if (error) throw error;

        // Sincroniza com cupons padrão no banco
        if (body.desconto_captacao !== undefined) {
            await supabase
                .from('cupoms_desconto')
                .update({ valor: Number(body.desconto_captacao) })
                .eq('codigo', 'RESGATE5');
        }
        if (body.desconto_primeira_compra !== undefined) {
            await supabase
                .from('cupoms_desconto')
                .update({ valor: Number(body.desconto_primeira_compra) })
                .eq('codigo', 'PRIMEIRACOMPRA');
        }

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
