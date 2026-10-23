import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export const revalidate = 60; // Cache por 60 segundos

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('pricing_params')
            .select('desconto_primeira_compra, desconto_captacao, modal_intervalo_dias, modal_tempo_inatividade_segundos')
            .eq('id', 1)
            .single();

        if (error) {
            console.error('Erro ao ler public settings:', error);
            return NextResponse.json({
                desconto_primeira_compra: 10,
                desconto_captacao: 5,
                modal_intervalo_dias: 30,
                modal_tempo_inatividade_segundos: 45
            });
        }

        return NextResponse.json({
            desconto_primeira_compra: data?.desconto_primeira_compra ? Number(data.desconto_primeira_compra) : 10,
            desconto_captacao: data?.desconto_captacao ? Number(data.desconto_captacao) : 5,
            modal_intervalo_dias: data?.modal_intervalo_dias ? Number(data.modal_intervalo_dias) : 30,
            modal_tempo_inatividade_segundos: data?.modal_tempo_inatividade_segundos ? Number(data.modal_tempo_inatividade_segundos) : 45
        });
    } catch (err: any) {
        console.error('Public settings handler error:', err);
        return NextResponse.json({
            desconto_primeira_compra: 10,
            desconto_captacao: 5,
            modal_intervalo_dias: 30,
            modal_tempo_inatividade_segundos: 45
        });
    }
}
