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
            const rawPhone = (record.whatsapp || '').trim();
            const cleanPhone = rawPhone.replace(/\D/g, '');
            const email = record.email || '';
            const primeiroNome = record.nome ? record.nome.trim().split(' ')[0] : 'Colecionador';

            const rawMessage = 
                `Olá, ${primeiroNome}! Seu convite para o ateliê exclusivo da Franga Toys foi liberado 🎉\n\n` +
                `🔑 *Sua Chave VIP:* ${token}\n\n` +
                `Acesse o acervo pelo link seguro:\n${inviteUrl}\n\n` +
                `Se preferir, insira sua chave em "Já tenho convite" na tela inicial.\n\n` +
                `Qualquer dúvida com peças sob encomenda ou acabamentos, estamos à disposição por aqui!`;

            const whatsappMessage = encodeURIComponent(rawMessage);
            const whatsappSendUrl = cleanPhone ? `https://wa.me/55${cleanPhone}?text=${whatsappMessage}` : null;
            const whatsappWebUrl = cleanPhone ? `https://web.whatsapp.com/send?phone=55${cleanPhone}&text=${whatsappMessage}` : null;

            // Notifica confirmação no Telegram com a mensagem pronta para copiar e links Web/App
            let tgConfirmMsg = `✅ *ACESSO LIBERADO COM SUCESSO!*\n\n` +
                `👤 *Cliente:* ${primeiroNome} (${record.nome})\n`;

            if (rawPhone) {
                tgConfirmMsg += `📱 *WhatsApp:* ${rawPhone}\n`;
            }
            if (email) {
                tgConfirmMsg += `📧 *E-mail:* ${email}\n`;
            }

            tgConfirmMsg += `🔑 *Chave VIP:* \`${token}\`\n\n` +
                `💬 *Mensagem para o cliente (toque para copiar):*\n\`\`\`\n${rawMessage}\n\`\`\`\n\n`;

            if (whatsappWebUrl && whatsappSendUrl) {
                tgConfirmMsg += `🔗 [Abrir no WhatsApp Web (PC da Loja)](${whatsappWebUrl})\n` +
                    `📱 [Abrir no WhatsApp App](${whatsappSendUrl})`;
            } else {
                tgConfirmMsg += `ℹ️ _Solicitação via Google sem WhatsApp. O usuário já tem acesso liberado ao recarregar o site._`;
            }

            await sendTelegramAlert(tgConfirmMsg);

            return new NextResponse(renderHtmlApproval({
                nome: record.nome,
                primeiroNome,
                whatsapp: rawPhone || null,
                email: email || null,
                token,
                rawMessage,
                inviteUrl,
                whatsappSendUrl,
                whatsappWebUrl
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

            let tgRejectMsg = `🚫 *SOLICITAÇÃO RECUSADA!*\n\n` +
                `👤 *Nome:* ${record.nome}\n`;

            if (record.whatsapp) {
                tgRejectMsg += `📱 *WhatsApp:* ${record.whatsapp}\n`;
            }
            if (record.email) {
                tgRejectMsg += `📧 *E-mail:* ${record.email}\n`;
            }

            tgRejectMsg += `🌐 *IP:* \`${record.ip}\`\n\n` +
                `_Este visitante foi barrado e não terá acesso ao catálogo._`;

            await sendTelegramAlert(tgRejectMsg);

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

function renderHtmlApproval({ 
    nome, 
    primeiroNome, 
    whatsapp, 
    email,
    token,
    rawMessage,
    inviteUrl, 
    whatsappSendUrl,
    whatsappWebUrl 
}: { 
    nome: string; 
    primeiroNome: string; 
    whatsapp: string | null; 
    email: string | null;
    token: string;
    rawMessage: string;
    inviteUrl: string; 
    whatsappSendUrl: string | null;
    whatsappWebUrl: string | null;
}) {
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
        <div class="w-16 h-16 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl font-black">
            ✓
        </div>
        
        <span class="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            Acesso Liberado
        </span>

        <h1 class="text-2xl font-black text-white mt-3 mb-1">
            ${primeiroNome}
        </h1>
        <p class="text-xs text-zinc-400 mb-4">
            ${nome} ${whatsapp ? `• WhatsApp: <strong>${whatsapp}</strong>` : ''} ${email ? `• E-mail: <strong>${email}</strong>` : ''}
        </p>

        <!-- Chave VIP em Destaque -->
        <div class="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 mb-5 text-center">
            <span class="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-1">Chave VIP Gerada</span>
            <span class="font-mono text-sm font-black text-amber-200 select-all tracking-wider">${token}</span>
        </div>

        ${whatsappWebUrl && whatsappSendUrl ? `
        <!-- Botões de Envio de WhatsApp -->
        <div class="space-y-2 mb-4">
            <a href="${whatsappWebUrl}" target="_blank" class="w-full block bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl shadow-lg transition-all text-center">
                💻 Enviar no WhatsApp Web (PC da Loja)
            </a>
            <a href="${whatsappSendUrl}" target="_blank" class="w-full block bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs uppercase tracking-wider py-3 px-4 rounded-xl transition-all text-center">
                📱 Abrir no WhatsApp App (Celular)
            </a>
        </div>
        ` : `
        <div class="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-3.5 mb-4 text-xs text-blue-300 leading-relaxed text-left">
            ℹ️ <strong>Conta Google Aprovada:</strong> O cliente não cadastrou WhatsApp. O acesso já está liberado automaticamente na conta dele ao recarregar o site.
        </div>
        `}

        <!-- Copiar Mensagem Formatada -->
        <div class="bg-black/60 border border-zinc-800 rounded-2xl p-3 text-left mb-5">
            <div class="flex items-center justify-between mb-1.5">
                <span class="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Texto da Mensagem</span>
                <button onclick="navigator.clipboard.writeText(document.getElementById('msgArea').value); alert('Mensagem copiada!');" class="text-[10px] text-amber-400 hover:underline font-bold">
                    Copiar Texto
                </button>
            </div>
            <textarea id="msgArea" readonly rows="4" class="w-full bg-transparent text-[11px] text-zinc-300 select-all outline-none resize-none leading-relaxed font-sans">${rawMessage}</textarea>
        </div>

        <a href="${inviteUrl}" target="_blank" class="text-xs text-zinc-500 hover:text-white font-medium underline transition-colors">
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

