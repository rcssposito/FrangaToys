import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendTelegramAlert } from '@/lib/telegram';
import { generateDecisionSecret } from '@/lib/gatekeeper';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { nome, whatsapp, instagram } = body;

        if (!nome || !whatsapp) {
            return NextResponse.json(
                { error: 'Nome e WhatsApp são obrigatórios' },
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

        const cleanInstagram = (instagram || '').trim().replace(/^@/, '');
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                   req.headers.get('x-real-ip') || 
                   'IP Desconhecido';
        const userAgent = req.headers.get('user-agent') || 'Desconhecido';

        // 1. Salva a solicitação no banco
        const { data: record, error: insertError } = await supabaseAdmin
            .from('solicitacoes_acesso')
            .insert({
                nome: nome.trim(),
                whatsapp: cleanPhone,
                instagram: cleanInstagram || null,
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
            `📱 *WhatsApp:* [${cleanPhone}](${whatsappLink})\n`;

        if (cleanInstagram) {
            tgMsg += `📸 *Instagram:* [@${cleanInstagram}](${instagramLink})\n`;
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

