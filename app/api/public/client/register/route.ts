import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { nome, telefone, wishlist = [] } = body;

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

        // 1. Verifica se o cliente já existe por telefone
        const { data: existing, error: searchError } = await supabase
            .from('clientes')
            .select('id, nome, telefone, wishlist')
            .eq('telefone', cleanPhone)
            .maybeSingle();

        if (searchError) {
            console.error('Erro ao buscar cliente:', searchError);
        }

        if (existing) {
            // Unifica a wishlist existente com os novos itens
            const existingWishlist = Array.isArray(existing.wishlist) ? existing.wishlist : [];
            const mergedWishlist = Array.from(new Set([...existingWishlist, ...incomingWishlist]));

            const { data: updated, error: updateError } = await supabase
                .from('clientes')
                .update({
                    nome: cleanName || existing.nome,
                    wishlist: mergedWishlist,
                    ultimo_acesso_em: new Date().toISOString()
                })
                .eq('id', existing.id)
                .select('id, nome, telefone, wishlist')
                .single();

            if (updateError) {
                console.error('Erro ao atualizar cliente:', updateError);
                return NextResponse.json({ error: 'Erro ao atualizar dados do cliente.' }, { status: 500 });
            }

            return NextResponse.json({
                ok: true,
                isNew: false,
                client: updated
            });
        }

        // 2. Cria novo cliente
        const { data: created, error: insertError } = await supabase
            .from('clientes')
            .insert({
                nome: cleanName,
                telefone: cleanPhone,
                wishlist: incomingWishlist,
                data_cadastro: new Date().toISOString(),
                ultimo_acesso_em: new Date().toISOString()
            })
            .select('id, nome, telefone, wishlist')
            .single();

        if (insertError) {
            console.error('Erro ao cadastrar cliente:', insertError);
            return NextResponse.json({ error: 'Erro ao cadastrar cliente.' }, { status: 500 });
        }

        return NextResponse.json({
            ok: true,
            isNew: true,
            client: created
        });
    } catch (err: any) {
        console.error('Erro no cadastro de cliente:', err);
        return NextResponse.json({ error: err.message || 'Erro interno no servidor' }, { status: 500 });
    }
}
