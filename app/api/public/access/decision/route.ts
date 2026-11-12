import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendTelegramAlert } from '@/lib/telegram';
import { generateDecisionSecret, generateVipToken } from '@/lib/gatekeeper';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const id = searchParams.get('id');
        const action = searchParams.get('action');
        const secret = searchParams.get('secret');

        if (!id || !action || !secret) {
            return new NextResponse(renderHtmlResponse('Parâmetros Inválidos', 'A requisição não contém todos os parâmetros necessários.', 'error'), {
                status: 400,
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
        }

        const expectedSecret = generateDecisionSecret(id, action);
        if (secret !== expectedSecret) {
            return new NextResponse(renderHtmlResponse('Assinatura Inválida', 'A chave de segurança é inválida ou expirou.', 'error'), {
                status: 403,
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
        }

        // Busca o registro
        const { data: record, error: fetchError } = await supabaseAdmin
            .from('solicitacoes_acesso')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (fetchError || !record) {
            return new NextResponse(renderHtmlResponse('Não Encontrado', 'A solicitação de acesso não foi localizada no sistema.', 'error'), {
                status: 404,
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
        }

        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://frangatoys.com.br';

        // 1. CASO DE APROVAÇÃO
        if (action === 'approve') {
            const token = record.token_vip || generateVipToken();
            const expiraEm = new Date();
            expiraEm.setDate(expiraEm.getDate() + 60); // 60 dias de acesso

            await supabaseAdmin
                .from('solicitacoes_acesso')
                .update({
                    status: 'aprovado',
                    token_vip: token,
                    token_expira_em: expiraEm.toISOString(),
                    aprovado_em: new Date().toISOString()
                })
                .eq('id', id);

            const inviteUrl = `${baseUrl}?vip=${token}`;
            const cleanPhone = record.whatsapp.replace(/\D/g, '');
            const whatsappMessage = encodeURIComponent(
                `Olá, ${record.nome}! Seu convite para o ateliê exclusivo da Franga Toys foi liberado 🎉\n\n` +
                `Acesse o acervo completo e coleções pelo link seguro:\n${inviteUrl}\n\n` +
                `Qualquer dúvida com acabamentos ou encomendas personalizadas, estamos à disposição por aqui!`
            );
            const whatsappSendUrl = `https://wa.me/55${cleanPhone}?text=${whatsappMessage}`;

            // Notifica confirmação no Telegram
            await sendTelegramAlert(
                `✅ *ACESSO LIBERADO COM SUCESSO!*\n\n` +
                `👤 *Cliente:* ${record.nome}\n` +
                `📱 *WhatsApp:* ${record.whatsapp}\n` +
                `🔑 *Token VIP:* \`${token}\`\n\n` +
                `🔗 [Enviar Convite no WhatsApp do Cliente](${whatsappSendUrl})`
            );

            return new NextResponse(renderHtmlApproval({
                nome: record.nome,
                whatsapp: record.whatsapp,
                inviteUrl,
                whatsappSendUrl
            }), {
                status: 200,
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
        }

        // 2. CASO DE RECUSA / BLOQUEIO
        if (action === 'reject') {
            await supabaseAdmin
                .from('solicitacoes_acesso')
                .update({
                    status: 'recusado',
                    recusado_em: new Date().toISOString()
                })
                .eq('id', id);

            await sendTelegramAlert(
                `🚫 *SOLICITAÇÃO RECUSADA!*\n\n` +
                `👤 *Nome:* ${record.nome}\n` +
                `📱 *WhatsApp:* ${record.whatsapp}\n` +
                `🌐 *IP:* \`${record.ip}\`\n\n` +
                `_Este visitante foi barrado e não terá acesso ao catálogo._`
            );

            return new NextResponse(renderHtmlResponse(
                'Solicitação Barrada!',
                `O acesso para <strong>${record.nome}</strong> foi recusado. O visitante permanece bloqueado na landing page sem acesso ao acervo.`,
                'success'
            ), {
                status: 200,
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
        }

        return new NextResponse(renderHtmlResponse('Ação Inválida', 'Ação solicitada desconhecida.', 'error'), {
            status: 400,
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });

    } catch (err: any) {
        console.error('Erro na decisão de acesso:', err);
        return new NextResponse(renderHtmlResponse('Erro Interno', err.message, 'error'), {
            status: 500,
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
    }
}

function renderHtmlApproval({ nome, whatsapp, inviteUrl, whatsappSendUrl }: { nome: string; whatsapp: string; inviteUrl: string; whatsappSendUrl: string }) {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Acesso Aprovado | Franga Toys</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { background-color: #09090b; color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    </style>
</head>
<body class="min-h-screen flex items-center justify-center p-4">
    <div class="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center">
        <div class="w-16 h-16 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5 text-3xl">
            ✓
        </div>
        
        <span class="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            Acesso Liberado
        </span>

        <h1 class="text-2xl font-black text-white mt-4 mb-2">
            ${nome}
        </h1>
        <p class="text-xs text-zinc-400 mb-6">
            WhatsApp: <strong>${whatsapp}</strong> — Token VIP gerado e válido por 60 dias.
        </p>

        <!-- Botão Principal WhatsApp -->
        <a href="${whatsappSendUrl}" target="_blank" class="w-full block bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm uppercase tracking-wider py-4 px-6 rounded-2xl shadow-lg shadow-emerald-500/20 transition-all mb-3 text-center">
            📲 Enviar Convite no WhatsApp
        </a>

        <!-- Copiar Link -->
        <div class="bg-black/60 border border-zinc-800 rounded-2xl p-3 text-left mb-6">
            <span class="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Link do Convite</span>
            <input type="text" readonly value="${inviteUrl}" class="w-full bg-transparent text-xs text-zinc-300 select-all outline-none font-mono" id="inviteInput" />
        </div>

        <a href="${inviteUrl}" class="text-xs text-zinc-500 hover:text-white font-medium underline transition-colors">
            Testar link na vitrine →
        </a>
    </div>
</body>
</html>`;
}

function renderHtmlResponse(title: string, message: string, type: 'success' | 'error') {
    const isSuccess = type === 'success';
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} | Franga Toys</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { background-color: #09090b; color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    </style>
</head>
<body class="min-h-screen flex items-center justify-center p-4">
    <div class="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center">
        <div class="w-16 h-16 ${isSuccess ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'} border rounded-2xl flex items-center justify-center mx-auto mb-5 text-2xl font-black">
            ${isSuccess ? '✕' : '!'}
        </div>
        <h1 class="text-xl font-black text-white mb-3">
            ${title}
        </h1>
        <p class="text-xs text-zinc-400 leading-relaxed mb-6">
            ${message}
        </p>
        <button onclick="window.close()" class="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-xs font-bold uppercase tracking-wider text-zinc-300 rounded-xl transition-colors">
            Fechar Janela
        </button>
    </div>
</body>
</html>`;
}

