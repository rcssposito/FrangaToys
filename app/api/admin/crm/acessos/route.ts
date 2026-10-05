import { NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET(req: Request) {
    try {
        const sessionOrResponse = await requireRoles(['admin', 'sales']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const { searchParams } = new URL(req.url);
        const clienteId = searchParams.get('cliente_id');
        const limit = Number(searchParams.get('limit')) || 25;

        let query = supabase
            .from('crm_acessos_beacon')
            .select(`
                id,
                visitor_id,
                session_date,
                cliente_id,
                email,
                pathname,
                ultima_pagina,
                total_paginas,
                paginas_vistas,
                figuras_vistas,
                duracao_total_segundos,
                duracao_segundos,
                referrer,
                utm_source,
                utm_medium,
                utm_campaign,
                cidade,
                estado,
                pais,
                dispositivo,
                navegador,
                figura_id,
                primeiro_acesso_em,
                ultimo_acesso_em,
                created_at,
                figuras (
                    id,
                    nome,
                    imagem_url
                ),
                crm_cadencias (
                    id,
                    nome,
                    cupom_codigo
                ),
                clientes (
                    id,
                    nome,
                    email
                )
            `)
            .order('ultimo_acesso_em', { ascending: false })
            .limit(limit);

        if (clienteId) {
            query = query.eq('cliente_id', clienteId);
        }

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json(data || []);
    } catch (error: any) {
        console.error('Erro ao buscar acessos do beacon:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
