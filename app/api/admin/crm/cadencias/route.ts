import { NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { supabaseAdmin as supabase } from '@/lib/supabase';

// LISTAR TODAS AS CADÊNCIAS
export async function GET(req: Request) {
    try {
        const sessionOrResponse = await requireRoles(['admin', 'sales', 'finance']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (id) {
            const { data: cadencia, error } = await supabase
                .from('crm_cadencias')
                .select(`
                    *,
                    crm_cadencia_envios (
                        id,
                        status,
                        enviado_em,
                        erro_mensagem,
                        clientes (
                            id,
                            nome,
                            telefone,
                            email,
                            tags
                        )
                    )
                `)
                .eq('id', id)
                .maybeSingle();

            if (error) throw error;
            if (!cadencia) return NextResponse.json({ error: 'Cadência não encontrada' }, { status: 404 });
            return NextResponse.json(cadencia);
        }

        const { data: cadencias, error } = await supabase
            .from('crm_cadencias')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json(cadencias || []);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// CRIAR UMA NOVA CADÊNCIA DE PROMOÇÃO
export async function POST(req: Request) {
    try {
        const sessionOrResponse = await requireRoles(['admin', 'sales', 'finance']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const body = await req.json();
        const {
            nome,
            descricao,
            target_tags,
            tipo_canal = 'email',
            cupom_codigo,
            desconto_percentual,
            assunto_email,
            conteudo_email,
            status = 'rascunho'
        } = body;

        if (!nome || !Array.isArray(target_tags) || !target_tags.length) {
            return NextResponse.json({ 
                error: 'Nome e ao menos uma tag-alvo são obrigatórios' 
            }, { status: 400 });
        }

        // 1. Criar o registro da cadência
        const { data: cadencia, error: cadenciaErr } = await supabase
            .from('crm_cadencias')
            .insert([{
                nome,
                descricao,
                target_tags,
                tipo_canal,
                cupom_codigo: cupom_codigo ? cupom_codigo.trim().toUpperCase() : null,
                desconto_percentual: desconto_percentual ? Number(desconto_percentual) : null,
                assunto_email: assunto_email || `Presente Especial da Franga Toys: Promoção Exclusiva!`,
                conteudo_email: conteudo_email || `Olá, {primeiro_nome}!\n\nPreparamos uma condição exclusiva especialmente para você em nosso acervo de colecionáveis.\n\nUse o cupom {cupom} e garanta {desconto}% OFF!\n\nAcesse agora: {loja_link}`,
                status
            }])
            .select()
            .single();

        if (cadenciaErr) throw cadenciaErr;

        // 2. Localizar clientes elegíveis (aqueles que possuem ao menos uma das target_tags)
        const { data: eligibleClients, error: clientErr } = await supabase
            .from('clientes')
            .select('id, nome, email, telefone, tags')
            .overlaps('tags', target_tags);

        if (clientErr) throw clientErr;

        let totalImpactados = 0;

        // 3. Vincular clientes elegíveis na fila de envios da cadência
        if (eligibleClients && eligibleClients.length > 0) {
            const enviosToInsert = eligibleClients.map(client => ({
                cadencia_id: cadencia.id,
                cliente_id: client.id,
                canal: tipo_canal,
                status: 'pendente',
                metadados: {
                    cliente_nome: client.nome,
                    cliente_email: client.email || null,
                    cliente_telefone: client.telefone || null
                }
            }));

            const { error: envioErr } = await supabase
                .from('crm_cadencia_envios')
                .insert(enviosToInsert);

            if (envioErr) console.error('Erro ao matricular clientes na cadência:', envioErr);

            totalImpactados = eligibleClients.length;

            // Atualizar o total de impactados na cadência
            await supabase
                .from('crm_cadencias')
                .update({ total_impactados: totalImpactados })
                .eq('id', cadencia.id);
        }

        return NextResponse.json({
            ...cadencia,
            total_impactados: totalImpactados,
            enrolledClientsCount: totalImpactados
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// ATUALIZAR CADÊNCIA
export async function PATCH(req: Request) {
    try {
        const sessionOrResponse = await requireRoles(['admin', 'sales', 'finance']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const body = await req.json();
        const { id, syncClients, ...updateFields } = body;

        if (!id) return NextResponse.json({ error: 'ID da cadência obrigatório' }, { status: 400 });

        if (updateFields.cupom_codigo) {
            updateFields.cupom_codigo = updateFields.cupom_codigo.trim().toUpperCase();
        }
        if (updateFields.desconto_percentual !== undefined) {
            updateFields.desconto_percentual = updateFields.desconto_percentual ? Number(updateFields.desconto_percentual) : null;
        }

        updateFields.updated_at = new Date().toISOString();

        const { data: cadencia, error } = await supabase
            .from('crm_cadencias')
            .update(updateFields)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Se solicitado, sincronizar novos clientes baseado nas tags
        if (syncClients && Array.isArray(cadencia.target_tags) && cadencia.target_tags.length > 0) {
            const { data: eligibleClients } = await supabase
                .from('clientes')
                .select('id, nome, email, telefone')
                .overlaps('tags', cadencia.target_tags);

            if (eligibleClients) {
                for (const client of eligibleClients) {
                    await supabase
                        .from('crm_cadencia_envios')
                        .upsert({
                            cadencia_id: id,
                            cliente_id: client.id,
                            canal: cadencia.tipo_canal,
                            status: 'pendente'
                        }, { onConflict: 'cadencia_id,cliente_id' });
                }

                const { count } = await supabase
                    .from('crm_cadencia_envios')
                    .select('*', { count: 'exact', head: true })
                    .eq('cadencia_id', id);

                await supabase
                    .from('crm_cadencias')
                    .update({ total_impactados: count || 0 })
                    .eq('id', id);
            }
        }

        return NextResponse.json(cadencia);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETAR CADÊNCIA
export async function DELETE(req: Request) {
    try {
        const sessionOrResponse = await requireRoles(['admin']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

        const { error } = await supabase
            .from('crm_cadencias')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true, message: 'Cadência removida com sucesso' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
