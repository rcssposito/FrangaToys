import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { telefone, clienteId, visitorId } = body;

        if (!telefone) {
            return NextResponse.json({ error: 'WhatsApp é obrigatório.' }, { status: 400 });
        }

        const cleanPhone = telefone.replace(/\D/g, '');
        if (cleanPhone.length < 10) {
            return NextResponse.json({ error: 'Informe um WhatsApp válido com DDD.' }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        let clientToUpdateId = clienteId;

        // Se não veio clienteId no body, tenta buscar pelo usuário Google autenticado
        if (!clientToUpdateId && user?.email) {
            const { data: existing } = await supabaseAdmin
                .from('clientes')
                .select('id')
                .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
                .maybeSingle();
            clientToUpdateId = existing?.id;
        }

        // Se mesmo assim não achou por usuário, procura pelo cookie
        if (!clientToUpdateId) {
            const clienteIdCookie = req.cookies.get('franga_cliente_id')?.value;
            if (clienteIdCookie) {
                clientToUpdateId = clienteIdCookie;
            }
        }

        if (!clientToUpdateId) {
            return NextResponse.json({ error: 'Sessão não identificada. Faça login novamente.' }, { status: 400 });
        }

        // Atualiza telefone no cadastro do cliente
        const { data: updated, error: updateError } = await supabaseAdmin
            .from('clientes')
            .update({
                telefone: cleanPhone,
                ultimo_acesso_em: new Date().toISOString()
            })
            .eq('id', clientToUpdateId)
            .select('*')
            .single();

        if (updateError) throw updateError;

        // Associa telemetria retroativa do beacon se visitorId estiver disponível
        if (visitorId) {
            await supabaseAdmin
                .from('crm_acessos_beacon')
                .update({ cliente_id: clientToUpdateId })
                .eq('visitor_id', visitorId);
        }

        const response = NextResponse.json({ ok: true, client: updated });

        // Salva nos cookies do navegador
        response.cookies.set('frangatoys_tracking_phone', cleanPhone, {
            path: '/',
            maxAge: 60 * 60 * 24 * 365,
            sameSite: 'lax'
        });

        return response;
    } catch (err: any) {
        console.error('Erro ao vincular telefone ao cliente:', err);
        return NextResponse.json({ error: err.message || 'Erro interno no servidor' }, { status: 500 });
    }
}
