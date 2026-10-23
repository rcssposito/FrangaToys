import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { nome, telefone, wishlist = [], visitorId } = body;

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

        let clientRecord: any = null;
        let isNew = false;

        // 1. Verifica se o cliente já existe por telefone
        const { data: existing, error: searchError } = await supabase
            .from('clientes')
            .select('id, nome, telefone, wishlist, tags, total_acessos')
            .eq('telefone', cleanPhone)
            .maybeSingle();

        if (searchError) {
            console.error('Erro ao buscar cliente:', searchError);
        }

        const nowIso = new Date().toISOString();

        if (existing) {
            // Unifica a wishlist existente com os novos itens
            const existingWishlist = Array.isArray(existing.wishlist) ? existing.wishlist : [];
            const mergedWishlist = Array.from(new Set([...existingWishlist, ...incomingWishlist]));

            // Tags: garante que tem 'Lead Quente' e 'Favoritos'
            const currentTags = Array.isArray(existing.tags) ? existing.tags : [];
            const mergedTags = Array.from(new Set([...currentTags, 'Lead Quente', 'Favoritos']));

            const { data: updated, error: updateError } = await supabase
                .from('clientes')
                .update({
                    nome: cleanName || existing.nome,
                    wishlist: mergedWishlist,
                    tags: mergedTags,
                    ultimo_acesso_em: nowIso
                })
                .eq('id', existing.id)
                .select('*')
                .single();

            if (updateError) {
                console.error('Erro ao atualizar cliente:', updateError);
                return NextResponse.json({ error: 'Erro ao atualizar dados do cliente.' }, { status: 500 });
            }

            clientRecord = updated;
            isNew = false;
        } else {
            // 2. Cria novo cliente com tags adequadas para o CRM
            const { data: created, error: insertError } = await supabase
                .from('clientes')
                .insert({
                    nome: cleanName,
                    telefone: cleanPhone,
                    wishlist: incomingWishlist,
                    tags: ['Lead Quente', 'Favoritos'],
                    data_cadastro: nowIso,
                    ultimo_acesso_em: nowIso,
                    total_acessos: 1
                })
                .select('*')
                .single();

            if (insertError) {
                console.error('Erro ao cadastrar cliente:', insertError);
                return NextResponse.json({ error: 'Erro ao cadastrar cliente.' }, { status: 500 });
            }

            clientRecord = created;
            isNew = true;
        }

        // 3. Correlaciona imediatamente a telemetria do Beacon com o novo cliente
        if (clientRecord?.id) {
            try {
                // Atualiza todas as sessões anteriores com este visitor_id
                if (visitorId) {
                    await supabase
                        .from('crm_acessos_beacon')
                        .update({ cliente_id: clientRecord.id })
                        .eq('visitor_id', visitorId);
                }

                // Se houver IP válido e recente, associa sessões anônimas do mesmo IP
                if (rawIp && rawIp !== '127.0.0.1' && rawIp !== '::1' && rawIp !== 'localhost') {
                    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
                    await supabase
                        .from('crm_acessos_beacon')
                        .update({ cliente_id: clientRecord.id })
                        .eq('ip', rawIp)
                        .is('cliente_id', null)
                        .gte('created_at', twoHoursAgo);
                }

                // Sincroniza cidade e estado do último acesso no cadastro do cliente se disponível
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

        return NextResponse.json({
            ok: true,
            isNew,
            cliente: clientRecord,
            client: clientRecord
        });
    } catch (err: any) {
        console.error('Erro no cadastro de cliente:', err);
        return NextResponse.json({ error: err.message || 'Erro interno no servidor' }, { status: 500 });
    }
}
