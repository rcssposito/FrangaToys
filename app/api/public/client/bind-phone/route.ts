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

        // Verifica se existem outros clientes cadastrados com este telefone
        const { data: phoneMatches } = await supabaseAdmin
            .from('clientes')
            .select('*')
            .or(`telefone.eq.${cleanPhone},telefone.ilike.%${cleanPhone.slice(-8)}%`)
            .neq('id', clientToUpdateId);

        let finalClient: any = null;

        if (phoneMatches && phoneMatches.length > 0) {
            // Existe outro(s) cadastro(s) com este telefone: mescla tudo no cliente da sessão!
            const { data: currentClient } = await supabaseAdmin
                .from('clientes')
                .select('*')
                .eq('id', clientToUpdateId)
                .maybeSingle();

            let primary = currentClient || phoneMatches[0];

            for (const secondary of phoneMatches) {
                if (secondary.id === primary.id) continue;

                const mergedWishlist = Array.from(new Set([
                    ...(primary.wishlist || []),
                    ...(secondary.wishlist || [])
                ]));
                const mergedTags = Array.from(new Set([
                    ...(primary.tags || []),
                    ...(secondary.tags || []),
                    'Lead Quente'
                ]));

                await supabaseAdmin.from('crm_acessos_beacon').update({ cliente_id: primary.id }).eq('cliente_id', secondary.id);
                await supabaseAdmin.from('vendas').update({ cliente_id: primary.id }).eq('cliente_id', secondary.id);

                // Preserva o nome mais completo e todos os dados fiscais/endereço
                const bestNome = (secondary.nome && secondary.nome.length > (primary.nome || '').length)
                    ? secondary.nome
                    : (primary.nome || secondary.nome);

                const { data: merged } = await supabaseAdmin
                    .from('clientes')
                    .update({
                        telefone: cleanPhone,
                        nome: bestNome,
                        cpf: primary.cpf || secondary.cpf || null,
                        cep: primary.cep || secondary.cep || null,
                        logradouro: primary.logradouro || secondary.logradouro || null,
                        numero: primary.numero || secondary.numero || null,
                        bairro: primary.bairro || secondary.bairro || null,
                        cidade: primary.cidade || secondary.cidade || null,
                        uf: primary.uf || secondary.uf || null,
                        complemento: primary.complemento || secondary.complemento || null,
                        instagram: primary.instagram || secondary.instagram || null,
                        notas: primary.notas || secondary.notas || null,
                        email: primary.email || secondary.email || (user?.email || null),
                        auth_user_id: primary.auth_user_id || secondary.auth_user_id || (user?.id || null),
                        avatar_url: primary.avatar_url || secondary.avatar_url,
                        wishlist: mergedWishlist,
                        tags: mergedTags,
                        ultimo_acesso_em: new Date().toISOString()
                    })
                    .eq('id', primary.id)
                    .select('*')
                    .single();

                await supabaseAdmin.from('clientes').delete().eq('id', secondary.id);
                if (merged) primary = merged;
            }

            finalClient = primary;
            clientToUpdateId = primary.id;
        }

        if (!finalClient) {
            // Atualiza telefone no cadastro do cliente normalmente
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
            finalClient = updated;
        }

        // Associa telemetria retroativa do beacon se visitorId estiver disponível
        if (visitorId) {
            await supabaseAdmin
                .from('crm_acessos_beacon')
                .update({ cliente_id: clientToUpdateId })
                .eq('visitor_id', visitorId);
        }

        const response = NextResponse.json({ ok: true, client: finalClient });

        // Salva nos cookies do navegador
        response.cookies.set('franga_cliente_id', clientToUpdateId, {
            path: '/',
            maxAge: 60 * 60 * 24 * 365,
            sameSite: 'lax'
        });
        response.cookies.set('frangatoys_tracking_phone', cleanPhone, {
            path: '/',
            maxAge: 60 * 60 * 24 * 365,
            sameSite: 'lax'
        });
        if (finalClient?.nome) {
            response.cookies.set('frangatoys_client_nome', encodeURIComponent(finalClient.nome), {
                path: '/',
                maxAge: 60 * 60 * 24 * 365,
                sameSite: 'lax'
            });
        }

        return response;
    } catch (err: any) {
        console.error('Erro ao vincular telefone ao cliente:', err);
        return NextResponse.json({ error: err.message || 'Erro interno no servidor' }, { status: 500 });
    }
}
