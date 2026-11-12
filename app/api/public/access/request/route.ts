import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendTelegramAlert } from '@/lib/telegram';
import { generateDecisionSecret, generateVipToken, VIP_COOKIE_NAME } from '@/lib/gatekeeper';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { nome, whatsapp, instagram, mensagem } = body;

        if (!nome || !whatsapp) {
            return NextResponse.json(
                { error: 'Nome e WhatsApp são obrigatórios' },
                { status: 400 }
            );
        }

        const cleanInstagram = (instagram || '').trim().replace(/^@/, '');
        if (!cleanInstagram) {
            return NextResponse.json(
                { error: 'O perfil do Instagram (@seu_perfil) é obrigatório.' },
                { status: 400 }
            );
        }

        const cleanPhone = whatsapp.replace(/\D/g, '');
        if (cleanPhone.length < 10) {
            return NextResponse.json(
                { error: 'Número de WhatsApp inválido (informe com DDD)' },
                { status: 400 }
            );
        }

        const cleanMensagem = (mensagem || '').trim();
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                   req.headers.get('x-real-ip') || 
                   'IP Desconhecido';
        const userAgent = req.headers.get('user-agent') || 'Desconhecido';

        // 1. CHECAGEM INTELIGENTE DE CLIENTE EXISTENTE (OPÇÃO 1: AUTO-APROVAÇÃO)
        const last8Phone = cleanPhone.slice(-8);
        const { data: existingClients } = await supabaseAdmin
            .from('clientes')
            .select('id, nome, email, telefone, instagram, total_acessos')
            .not('telefone', 'is', null);

        const matchedClient = (existingClients || []).find(c => {
            if (!c.telefone) return false;
            const cPhone = c.telefone.replace(/\D/g, '');
            return cPhone.endsWith(last8Phone) || cleanPhone.endsWith(cPhone.slice(-8));
        });

        if (matchedClient) {
            // Cliente identificado! Busca histórico de vendas
            const { data: clientSales } = await supabaseAdmin
                .from('vendas')
                .select('id, valor_venda_final')
                .eq('cliente_id', matchedClient.id);

            const numPedidos = (clientSales || []).length;
            const totalGasto = (clientSales || []).reduce((sum, v) => sum + (parseFloat(v.valor_venda_final) || 0), 0);

            // Gera Token VIP de 90 dias
            const vipToken = generateVipToken();
            const expiraEm = new Date();
            expiraEm.setDate(expiraEm.getDate() + 90);

            // Registra em solicitacoes_acesso já aprovado
            await supabaseAdmin.from('solicitacoes_acesso').insert({
                nome: matchedClient.nome || nome.trim(),
                whatsapp: cleanPhone,
                instagram: cleanInstagram,
                mensagem: cleanMensagem ? `Cliente da casa: ${cleanMensagem}` : 'Cliente da casa (Auto-Aprovado)',
                ip,
                user_agent: userAgent,
                status: 'aprovado',
                token_vip: vipToken,
                token_expira_em: expiraEm.toISOString(),
                aprovado_em: new Date().toISOString()
            });

            // Atualiza dados na tabela clientes (salva instagram se novo e incrementa acessos)
            const updatePayload: Record<string, any> = {
                ultimo_acesso_em: new Date().toISOString(),
                total_acessos: (matchedClient.total_acessos || 0) + 1
            };
            if (!matchedClient.instagram && cleanInstagram) {
                updatePayload.instagram = cleanInstagram;
            }
            await supabaseAdmin.from('clientes').update(updatePayload).eq('id', matchedClient.id);

            // Notifica Telegram com destaque de Cliente Conhecido
            const clientePrimeiroNome = matchedClient.nome ? matchedClient.nome.trim().split(' ')[0] : (nome.trim().split(' ')[0] || 'Colecionador');
            let tgAutoMsg = `⭐️ *CLIENTE DA CASA ACESSOU O ATELIÊ! (LIBERAÇÃO AUTOMÁTICA)*\n\n` +
                `👤 *Cliente:* ${matchedClient.nome}\n` +
                `📱 *WhatsApp:* ${cleanPhone}\n` +
                `📸 *Instagram:* [@${cleanInstagram}](https://instagram.com/${cleanInstagram})\n`;

            if (numPedidos > 0) {
                tgAutoMsg += `📦 *Histórico:* ${numPedidos} pedido(s) (Total: R$ ${totalGasto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})\n`;
            } else {
                tgAutoMsg += `📋 *Histórico:* Contato cadastrado na carteira de clientes\n`;
            }

            if (cleanMensagem) {
                tgAutoMsg += `💬 *Mensagem deixada:* _"${cleanMensagem}"_\n`;
            }

            tgAutoMsg += `🔑 *Chave VIP Ativada:* \`${vipToken}\`\n\n` +
                `⚡ _O catálogo foi desbloqueado automaticamente na tela do cliente._`;

            await sendTelegramAlert(tgAutoMsg);

            const response = NextResponse.json({
                ok: true,
                auto_approved: true,
                token: vipToken,
                primeiroNome: clientePrimeiroNome,
                message: `Bem-vindo de volta, ${clientePrimeiroNome}! Identificamos seu cadastro como cliente do ateliê. Seu acesso VIP foi liberado com sucesso 🎉`
            });

            response.cookies.set({
                name: VIP_COOKIE_NAME,
                value: vipToken,
                maxAge: 90 * 24 * 60 * 60,
                path: '/',
                httpOnly: false,
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production'
            });

            return response;
        }

        // 2. CASO NOVO VISITANTE: Salva a solicitação pendente para triagem do admin
        const { data: record, error: insertError } = await supabaseAdmin
            .from('solicitacoes_acesso')
            .insert({
                nome: nome.trim(),
                whatsapp: cleanPhone,
                instagram: cleanInstagram,
                mensagem: cleanMensagem || null,
                ip,
                user_agent: userAgent,
                status: 'pendente'
            })
            .select()
            .single();

        if (insertError || !record) {
            console.error('Erro ao registrar solicitação de acesso:', insertError);
            return NextResponse.json(
                { error: 'Erro ao salvar solicitação. Tente novamente em instantes.' },
                { status: 500 }
            );
        }

        const id = record.id;
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://frangatoys.com.br';

        // 2. Criação dos links de checagem e decisão
        const approveSecret = generateDecisionSecret(id, 'approve');
        const rejectSecret = generateDecisionSecret(id, 'reject');

        const approveUrl = `${baseUrl}/api/public/access/decision?id=${id}&action=approve&secret=${approveSecret}`;
        const rejectUrl = `${baseUrl}/api/public/access/decision?id=${id}&action=reject&secret=${rejectSecret}`;

        const linkedinSearch = `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(nome.trim())}`;
        const googleLawyerSearch = `https://www.google.com/search?q=${encodeURIComponent(`"${nome.trim()}" (advogado OR oab OR associados OR juridico)`)}`;
        const jusbrasilSearch = `https://www.google.com/search?q=${encodeURIComponent(`site:jusbrasil.com.br "${nome.trim()}"`)}`;
        const whatsappLink = `https://wa.me/55${cleanPhone}`;
        const instagramLink = cleanInstagram ? `https://instagram.com/${cleanInstagram}` : null;

        // 3. Monta mensagem do Telegram com visual e links de busca
        let tgMsg = `🔒 *NOVA SOLICITAÇÃO DE ACESSO AO ATELIÊ!*\n\n` +
            `👤 *Nome:* ${nome.trim()}\n` +
            `📱 *WhatsApp:* [${cleanPhone}](${whatsappLink})\n` +
            `📸 *Instagram:* [@${cleanInstagram}](${instagramLink})\n`;

        if (cleanMensagem) {
            tgMsg += `💬 *Mensagem do Visitante:* _"${cleanMensagem}"_\n`;
        }

        tgMsg += `🌐 *IP:* \`${ip}\`\n\n` +
            `🔍 *CHECAGEM PREVENTIVA (Anti-Advocacia/Bot):*\n` +
            `• [Pesquisar no LinkedIn](${linkedinSearch})\n` +
            `• [Buscar se é Advogado / OAB](${googleLawyerSearch})\n` +
            `• [Checar no Jusbrasil](${jusbrasilSearch})\n\n` +
            `⚡ _Selecione a ação abaixo para liberar ou barrar o visitante:_`;

        const replyMarkup = {
            inline_keyboard: [
                [
                    {
                        text: '🟢 APROVAR ACESSO',
                        url: approveUrl
                    },
                    {
                        text: '🔴 RECUSAR / BLOQUEAR',
                        url: rejectUrl
                    }
                ]
            ]
        };

        await sendTelegramAlert(tgMsg, replyMarkup);

        return NextResponse.json({
            ok: true,
            id: record.id,
            message: 'Solicitação recebida com sucesso!'
        });

    } catch (err: any) {
        console.error('Erro na rota de solicitação de acesso:', err);
        return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
    }
}

