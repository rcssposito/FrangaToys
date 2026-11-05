import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { nome, telefone, wishlist = [], visitorId, clienteId } = body;

        if (!nome || typeof nome !== 'string' || nome.trim().length < 2) {
            return NextResponse.json({ error: 'Por favor, informe seu nome.' }, { status: 400 });
        }

        if (!telefone || typeof telefone !== 'string') {
            return NextResponse.json({ error: 'Telefone é obrigatório.' }, { status: 400 });
        }

        const cleanPhone = telefone.replace(/\D/g, '');
        if (cleanPhone.length < 10) {
            return NextResponse.json({ error: 'Informe um WhatsApp válido com DDD.' }, { status: 400 });
        }

        const cleanName = nome.trim();
        const incomingWishlist = Array.isArray(wishlist)
            ? wishlist.map(id => Number(id)).filter(id => !isNaN(id) && id > 0)
            : [];

        // Identifica IP do cliente para correlação retroativa
        const rawIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                      req.headers.get('x-real-ip') || 
                      '';

        // 1. Tenta identificar se o usuário já está logado via Supabase Auth (ex: Google Login)
        const supabaseAuth = await createClient();
        const { data: { user } } = await supabaseAuth.auth.getUser();

        // 2. Cookie ou body ID existente
        const cookieClienteId = req.cookies.get('franga_cliente_id')?.value;
        const targetClienteId = clienteId || cookieClienteId;

        // 3. Procura cliente por sessão (Google Auth ou Cookie ID)
        let clientBySession: any = null;
        if (user?.email) {
            const { data } = await supabase
                .from('clientes')
                .select('*')
                .or(`auth_user_id.eq.${user.id},email.ilike.${user.email}`)
                .maybeSingle();
            clientBySession = data;
        }
        if (!clientBySession && targetClienteId) {
            const { data } = await supabase
                .from('clientes')
                .select('*')
                .eq('id', targetClienteId)
                .maybeSingle();
            clientBySession = data;
        }

        // 4. Procura clientes existentes por telefone
        const { data: phoneMatches } = await supabase
            .from('clientes')
            .select('*')
            .or(`telefone.eq.${cleanPhone},telefone.ilike.%${cleanPhone.slice(-8)}%`)
            .order('data_cadastro', { ascending: true });

        const clientsWithPhone = phoneMatches || [];
        const secondaries = clientBySession 
            ? clientsWithPhone.filter(c => c.id !== clientBySession.id)
            : [];
        const clientByPhone = clientsWithPhone[0] || null;

        const nowIso = new Date().toISOString();
        let clientRecord: any = null;
        let isNew = false;
        const userAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;

        if (clientBySession && secondaries.length > 0) {
            // Há registros separados pelo telefone: mescla todos no registro de sessão
            let primary = { ...clientBySession };

            for (const secondary of secondaries) {
                const primaryWishlist = Array.isArray(primary.wishlist) ? primary.wishlist : [];
                const secondaryWishlist = Array.isArray(secondary.wishlist) ? secondary.wishlist : [];
                const mergedWishlist = Array.from(new Set([...primaryWishlist, ...secondaryWishlist, ...incomingWishlist]));

                const primaryTags = Array.isArray(primary.tags) ? primary.tags : [];
                const secondaryTags = Array.isArray(secondary.tags) ? secondary.tags : [];
                const mergedTags = Array.from(new Set([...primaryTags, ...secondaryTags, 'Lead Quente', 'Favoritos', ...(user ? ['Google Login'] : [])]));

                // Migra vínculos de telemetria e pedidos
                await supabase.from('crm_acessos_beacon').update({ cliente_id: primary.id }).eq('cliente_id', secondary.id);
                await supabase.from('vendas').update({ cliente_id: primary.id }).eq('cliente_id', secondary.id);

                // Preserva o nome mais completo (ex: nome com sobrenome de compras antigas)
                const bestNome = (secondary.nome && secondary.nome.length > (cleanName || primary.nome || '').length)
                    ? secondary.nome
                    : (cleanName || primary.nome || secondary.nome);

                const { data: updated, error: updateErr } = await supabase
                    .from('clientes')
                    .update({
                        nome: bestNome,
                        telefone: cleanPhone,
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
                        avatar_url: primary.avatar_url || secondary.avatar_url || userAvatar,
                        wishlist: mergedWishlist,
                        tags: mergedTags,
                        ultimo_acesso_em: nowIso,
                        total_acessos: (primary.total_acessos || 1) + (secondary.total_acessos || 1)
                    })
                    .eq('id', primary.id)
                    .select('*')
                    .single();

                if (updateErr) throw updateErr;

                // Deleta registro duplicado redundante
                await supabase.from('clientes').delete().eq('id', secondary.id);

                primary = updated;
                clientRecord = updated;
            }
        } else if (clientBySession) {
            // Cliente já existia por sessão (Google Login), vinculando WhatsApp
            const currentWishlist = Array.isArray(clientBySession.wishlist) ? clientBySession.wishlist : [];
            const mergedWishlist = Array.from(new Set([...currentWishlist, ...incomingWishlist]));
            const currentTags = Array.isArray(clientBySession.tags) ? clientBySession.tags : [];
            const mergedTags = Array.from(new Set([...currentTags, 'Lead Quente', 'Favoritos', ...(user ? ['Google Login'] : [])]));

            const { data: updated, error: updateErr } = await supabase
                .from('clientes')
                .update({
                    nome: cleanName || clientBySession.nome,
                    telefone: cleanPhone,
                    email: clientBySession.email || (user?.email || null),
                    auth_user_id: clientBySession.auth_user_id || (user?.id || null),
                    avatar_url: clientBySession.avatar_url || userAvatar,
                    wishlist: mergedWishlist,
                    tags: mergedTags,
                    ultimo_acesso_em: nowIso
                })
                .eq('id', clientBySession.id)
                .select('*')
                .single();

            if (updateErr) throw updateErr;
            clientRecord = updated;
        } else if (clientByPhone) {
            // Cliente já existia por telefone, atualiza nome, tags, wishlist e anexa Google se disponível
            const currentWishlist = Array.isArray(clientByPhone.wishlist) ? clientByPhone.wishlist : [];
            const mergedWishlist = Array.from(new Set([...currentWishlist, ...incomingWishlist]));
            const currentTags = Array.isArray(clientByPhone.tags) ? clientByPhone.tags : [];
            const mergedTags = Array.from(new Set([...currentTags, 'Lead Quente', 'Favoritos', ...(user ? ['Google Login'] : [])]));

            const updateData: any = {
                nome: cleanName || clientByPhone.nome,
                wishlist: mergedWishlist,
                tags: mergedTags,
                ultimo_acesso_em: nowIso
            };
            if (user?.email) {
                updateData.email = clientByPhone.email || user.email;
                updateData.auth_user_id = clientByPhone.auth_user_id || user.id;
                updateData.avatar_url = clientByPhone.avatar_url || userAvatar;
            }

            const { data: updated, error: updateErr } = await supabase
                .from('clientes')
                .update(updateData)
                .eq('id', clientByPhone.id)
                .select('*')
                .single();

            if (updateErr) throw updateErr;
            clientRecord = updated;
        } else {
            // Novo cliente absoluto
            const insertData: any = {
                nome: cleanName,
                telefone: cleanPhone,
                wishlist: incomingWishlist,
                tags: ['Lead Quente', 'Favoritos', ...(user ? ['Google Login'] : [])],
                data_cadastro: nowIso,
                ultimo_acesso_em: nowIso,
                total_acessos: 1
            };
            if (user?.email) {
                insertData.email = user.email;
                insertData.auth_user_id = user.id;
                insertData.avatar_url = userAvatar;
            }

            const { data: created, error: insertErr } = await supabase
                .from('clientes')
                .insert(insertData)
                .select('*')
                .single();

            if (insertErr) throw insertErr;
            clientRecord = created;
            isNew = true;
        }

        // 5. Correlaciona telemetria do Beacon
        if (clientRecord?.id) {
            try {
                if (visitorId) {
                    await supabase
                        .from('crm_acessos_beacon')
                        .update({ cliente_id: clientRecord.id })
                        .eq('visitor_id', visitorId);
                }

                if (rawIp && rawIp !== '127.0.0.1' && rawIp !== '::1' && rawIp !== 'localhost') {
                    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
                    await supabase
                        .from('crm_acessos_beacon')
                        .update({ cliente_id: clientRecord.id })
                        .eq('ip', rawIp)
                        .is('cliente_id', null)
                        .gte('created_at', twoHoursAgo);
                }

                const { data: latestBeacon } = await supabase
                    .from('crm_acessos_beacon')
                    .select('cidade, estado')
                    .eq('cliente_id', clientRecord.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (latestBeacon && latestBeacon.cidade && latestBeacon.cidade !== 'Desconhecido') {
                    await supabase
                        .from('clientes')
                        .update({
                            cidade_ultimo_acesso: latestBeacon.cidade,
                            uf_ultimo_acesso: latestBeacon.estado !== 'Desconhecido' ? latestBeacon.estado : undefined
                        })
                        .eq('id', clientRecord.id);
                }
            } catch (beaconErr) {
                console.error('Erro ao correlacionar telemetria do beacon ao cliente:', beaconErr);
            }
        }

        const response = NextResponse.json({
            ok: true,
            isNew,
            cliente: clientRecord,
            client: clientRecord
        });

        // Grava cookies para hidratação imediata no navegador
        response.cookies.set('franga_cliente_id', clientRecord.id, {
            path: '/',
            maxAge: 60 * 60 * 24 * 365,
            sameSite: 'lax'
        });
        response.cookies.set('frangatoys_tracking_phone', cleanPhone, {
            path: '/',
            maxAge: 60 * 60 * 24 * 365,
            sameSite: 'lax'
        });
        response.cookies.set('frangatoys_client_nome', encodeURIComponent(clientRecord.nome || cleanName), {
            path: '/',
            maxAge: 60 * 60 * 24 * 365,
            sameSite: 'lax'
        });

        return response;
    } catch (err: any) {
        console.error('Erro no cadastro de cliente:', err);
        return NextResponse.json({ error: err.message || 'Erro interno no servidor' }, { status: 500 });
    }
}
