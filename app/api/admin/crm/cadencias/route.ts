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
                        metadados,
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

        let validCupomCodigo: string | null = null;
        let validDescontoPercentual: number | null = null;

        if (cupom_codigo) {
            const normalizedCodigo = cupom_codigo.trim().toUpperCase();
            const { data: cupomDb } = await supabase
                .from('cupoms_desconto')
                .select('id, codigo, tipo, valor, ativo')
                .eq('codigo', normalizedCodigo)
                .maybeSingle();

            if (!cupomDb) {
                return NextResponse.json({ 
                    error: `O cupom "${cupom_codigo}" não existe no sistema. Crie-o primeiro na aba de Cupons.` 
                }, { status: 400 });
            }

            if (!cupomDb.ativo) {
                return NextResponse.json({ 
                    error: `O cupom "${cupom_codigo}" está inativo. Ative-o em Cupons antes de usá-lo na cadência.` 
                }, { status: 400 });
            }

            validCupomCodigo = cupomDb.codigo;
            validDescontoPercentual = Number(cupomDb.valor);
        }

        // 1. Criar o registro da cadência
        const { data: cadencia, error: cadenciaErr } = await supabase
            .from('crm_cadencias')
            .insert([{
                nome,
                descricao,
                target_tags,
                tipo_canal,
                cupom_codigo: validCupomCodigo,
                desconto_percentual: validDescontoPercentual,
                assunto_email: assunto_email || `Presente Especial da Franga Toys: Promoção Exclusiva!`,
                conteudo_email: conteudo_email || `Olá, {primeiro_nome}!\n\nPreparamos uma condição exclusiva especialmente para você em nosso acervo de colecionáveis.\n\nUse o cupom {cupom} e garanta {desconto}% OFF!\n\nAcesse agora: {loja_link}`,
                status
            }])
            .select()
            .single();

        if (cadenciaErr) throw cadenciaErr;

        // 2. Localizar clientes elegíveis (aqueles que possuem ao menos uma das target_tags)
        const { data: allClients, error: clientErr } = await supabase
            .from('clientes')
            .select('id, nome, email, telefone, tags');

        if (clientErr) throw clientErr;

        const normalizedTargets = target_tags.map((t: string) => (t || '').trim().toLowerCase()).filter(Boolean);
        const eligibleClients = (allClients || []).filter((client: any) => {
            const clientTags = Array.isArray(client.tags)
                ? client.tags.map((t: string) => (t || '').trim().toLowerCase())
                : [];
            return normalizedTargets.some((tt: string) => clientTags.includes(tt));
        });

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
            const normalizedCodigo = updateFields.cupom_codigo.trim().toUpperCase();
            const { data: cupomDb } = await supabase
                .from('cupoms_desconto')
                .select('id, codigo, tipo, valor, ativo')
                .eq('codigo', normalizedCodigo)
                .maybeSingle();

            if (!cupomDb) {
                return NextResponse.json({ 
                    error: `O cupom "${updateFields.cupom_codigo}" não existe no sistema. Crie-o primeiro na aba de Cupons.` 
                }, { status: 400 });
            }

            if (!cupomDb.ativo) {
                return NextResponse.json({ 
                    error: `O cupom "${updateFields.cupom_codigo}" está inativo.` 
                }, { status: 400 });
            }

            updateFields.cupom_codigo = cupomDb.codigo;
            updateFields.desconto_percentual = Number(cupomDb.valor);
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
            const { data: allClients } = await supabase
                .from('clientes')
                .select('id, nome, email, telefone, tags');

            const normalizedTargets = cadencia.target_tags.map((t: string) => (t || '').trim().toLowerCase()).filter(Boolean);
            const eligibleClients = (allClients || []).filter((client: any) => {
                const clientTags = Array.isArray(client.tags)
                    ? client.tags.map((t: string) => (t || '').trim().toLowerCase())
                    : [];
                return normalizedTargets.some((tt: string) => clientTags.includes(tt));
            });

            if (eligibleClients) {
                const eligibleIds = eligibleClients.map((c: any) => c.id);

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

                // Remover da fila clientes que não têm mais as tags atuais da cadência
                if (eligibleIds.length > 0) {
                    await supabase
                        .from('crm_cadencia_envios')
                        .delete()
                        .eq('cadencia_id', id)
                        .not('cliente_id', 'in', `(${eligibleIds.map(eid => `"${eid}"`).join(',')})`);
                } else {
                    await supabase
                        .from('crm_cadencia_envios')
                        .delete()
                        .eq('cadencia_id', id);
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

// DELETAR CADÊNCIA OU REMOVER DESTINATÁRIO
export async function DELETE(req: Request) {
    try {
        const sessionOrResponse = await requireRoles(['admin']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        const envioId = searchParams.get('envio_id');

        if (envioId) {
            const { data: envio } = await supabase
                .from('crm_cadencia_envios')
                .select('cadencia_id')
                .eq('id', envioId)
                .single();

            const { error: delErr } = await supabase
                .from('crm_cadencia_envios')
                .delete()
                .eq('id', envioId);

            if (delErr) throw delErr;

            if (envio?.cadencia_id) {
                const { count } = await supabase
                    .from('crm_cadencia_envios')
                    .select('*', { count: 'exact', head: true })
                    .eq('cadencia_id', envio.cadencia_id);

                await supabase
                    .from('crm_cadencias')
                    .update({ total_impactados: count || 0 })
                    .eq('id', envio.cadencia_id);
            }

            return NextResponse.json({ success: true, message: 'Destinatário removido da cadência' });
        }

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
