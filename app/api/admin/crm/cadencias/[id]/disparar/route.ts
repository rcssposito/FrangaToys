import { NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const sessionOrResponse = await requireRoles(['admin', 'sales']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const { id: cadenciaId } = await params;

        // 1. Obter cadência
        const { data: cadencia, error: cadErr } = await supabase
            .from('crm_cadencias')
            .select('*')
            .eq('id', cadenciaId)
            .single();

        if (cadErr || !cadencia) {
            return NextResponse.json({ error: 'Cadência não encontrada' }, { status: 404 });
        }

        // 2. Obter envios pendentes com dados do cliente
        const { data: envios, error: enviosErr } = await supabase
            .from('crm_cadencia_envios')
            .select(`
                id,
                status,
                cliente_id,
                metadados,
                clientes (
                    id,
                    nome,
                    email,
                    telefone
                )
            `)
            .eq('cadencia_id', cadenciaId)
            .eq('status', 'pendente')
            .limit(100);

        if (enviosErr) throw enviosErr;

        if (!envios || envios.length === 0) {
            return NextResponse.json({ 
                success: true, 
                message: 'Nenhum envio pendente para esta cadência.', 
                disparados: 0 
            });
        }

        const resendKey = process.env.RESEND_API_KEY;
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://frangatoys.com.br';
        let disparadosSucesso = 0;
        let falhas = 0;

        for (const envio of envios) {
            const cliente = envio.clientes as any;
            if (!cliente) continue;

            const primeiroNome = cliente.nome ? cliente.nome.split(' ')[0] : 'Colecionador';
            const cupom = cadencia.cupom_codigo || 'FRANGA10';
            const desconto = cadencia.desconto_percentual ? `${cadencia.desconto_percentual}` : '10';

            // Substituir variáveis dinâmicas
            const renderText = (template: string) => {
                return (template || '')
                    .replace(/{nome}/gi, cliente.nome || 'Colecionador')
                    .replace(/{primeiro_nome}/gi, primeiroNome)
                    .replace(/{cupom}/gi, cupom)
                    .replace(/{desconto}/gi, desconto)
                    .replace(/{loja_link}/gi, `${siteUrl}/?cupom=${encodeURIComponent(cupom)}`);
            };

            const assunto = renderText(cadencia.assunto_email || 'Presente Especial Franga Toys!');
            const conteudo = renderText(cadencia.conteudo_email || '');

            let envioStatus = 'enviado';
            let erroMsg: string | null = null;

            // Se Resend estiver configurado e o cliente tiver e-mail, enviar via Resend
            if (resendKey && cliente.email) {
                try {
                    const res = await fetch('https://api.resend.com/emails', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${resendKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            from: 'Franga Toys <contato@frangatoys.com.br>',
                            to: cliente.email,
                            subject: assunto,
                            html: `
                                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #09090b; color: #f4f4f5; padding: 24px; border-radius: 16px; border: 1px solid #27272a;">
                                    <div style="text-align: center; margin-bottom: 24px;">
                                        <h1 style="color: #f97316; font-size: 24px; margin: 0;">Franga Toys</h1>
                                        <p style="color: #a1a1aa; font-size: 12px; margin: 4px 0 0 0;">Colecionáveis & Miniaturas 3D Exclusivas</p>
                                    </div>
                                    <div style="background: #18181b; padding: 20px; border-radius: 12px; border: 1px solid #3f3f46; white-space: pre-wrap; line-height: 1.6; font-size: 14px; color: #e4e4e7;">
${conteudo}
                                    </div>
                                    <div style="text-align: center; margin-top: 24px;">
                                        <a href="${siteUrl}/?cupom=${encodeURIComponent(cupom)}" style="background: linear-gradient(to right, #f97316, #f59e0b); color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: bold; font-size: 13px; display: inline-block;">
                                            Resgatar Cupom na Loja
                                        </a>
                                    </div>
                                </div>
                            `
                        })
                    });

                    if (!res.ok) {
                        const errData = await res.json();
                        throw new Error(errData.message || 'Falha no envio de e-mail');
                    }
                } catch (e: any) {
                    envioStatus = 'falha';
                    erroMsg = e.message;
                    falhas++;
                }
            }

            if (envioStatus === 'enviado') {
                disparadosSucesso++;
            }

            // Atualizar status do envio
            await supabase
                .from('crm_cadencia_envios')
                .update({
                    status: envioStatus,
                    enviado_em: new Date().toISOString(),
                    erro_mensagem: erroMsg,
                    metadados: {
                        ...(envio.metadados || {}),
                        assunto_renderizado: assunto,
                        conteudo_renderizado: conteudo,
                        canal_utilizado: cliente.email ? 'email' : 'notificacao_sistema'
                    }
                })
                .eq('id', envio.id);
        }

        // Atualizar contadores na cadência
        const { count: totalEnviadosCount } = await supabase
            .from('crm_cadencia_envios')
            .select('*', { count: 'exact', head: true })
            .eq('cadencia_id', cadenciaId)
            .eq('status', 'enviado');

        await supabase
            .from('crm_cadencias')
            .update({
                total_enviados: totalEnviadosCount || disparadosSucesso,
                status: 'ativa',
                updated_at: new Date().toISOString()
            })
            .eq('id', cadenciaId);

        return NextResponse.json({
            success: true,
            disparados: disparadosSucesso,
            falhas,
            message: `${disparadosSucesso} notificações/e-mails processados com sucesso.`
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
