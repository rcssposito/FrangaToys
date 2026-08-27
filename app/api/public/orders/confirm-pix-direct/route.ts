import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { sendTelegramAlert, generatePaymentConfirmSecret } from '@/lib/telegram';
import { emitirNFe } from '@/lib/nfe';

export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const checkout_id = searchParams.get('checkout_id');
        const secret = searchParams.get('secret');

        if (!checkout_id || !secret) {
            return new NextResponse(renderHtmlError('Parâmetros inválidos'), {
                status: 400,
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
        }

        const expectedSecret = generatePaymentConfirmSecret(checkout_id);
        if (secret !== expectedSecret) {
            return new NextResponse(renderHtmlError('Assinatura de segurança inválida ou expirada.'), {
                status: 403,
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
        }

        // Buscar a venda
        const isNumeric = /^\d+$/.test(checkout_id);
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(checkout_id);

        let query = supabase.from('vendas').select(`
            *,
            figuras ( nome )
        `);

        if (isUuid) {
            query = query.eq('checkout_id', checkout_id);
        } else if (isNumeric) {
            query = query.or(`checkout_id.eq.${checkout_id},id.eq.${checkout_id}`);
        } else {
            query = query.eq('checkout_id', checkout_id);
        }

        const { data: sales, error: fetchError } = await query;

        if (fetchError || !sales || sales.length === 0) {
            return new NextResponse(renderHtmlError('Pedido não encontrado no banco de dados.'), {
                status: 404,
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
        }

        const firstSale = sales[0];
        const clienteNome = firstSale.cliente_nome;
        const total = sales.reduce((acc, s) => acc + (Number(s.valor_venda_final) || 0), 0) + (Number(firstSale.valor_frete) || 0);

        // Se já está pago
        if (firstSale.status_pagamento === 'Pago') {
            return new NextResponse(renderHtmlSuccess({
                clienteNome,
                total,
                checkout_id,
                alreadyPaid: true
            }), {
                status: 200,
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
        }

        // Atualizar todas as vendas deste checkout (por checkout_id ou por id se for numérico)
        let updateQuery = supabase.from('vendas').update({
            status_pagamento: 'Pago',
            status: 'Fila de Impressão'
        });

        if (isUuid) {
            updateQuery = updateQuery.eq('checkout_id', checkout_id);
        } else if (isNumeric) {
            updateQuery = updateQuery.or(`checkout_id.eq.${checkout_id},id.eq.${checkout_id}`);
        } else {
            updateQuery = updateQuery.eq('checkout_id', checkout_id);
        }

        const { error: updateError } = await updateQuery;

        if (updateError) {
            console.error('Erro ao atualizar vendas via Telegram:', updateError);
            return new NextResponse(renderHtmlError(`Erro ao atualizar banco: ${updateError.message}`), {
                status: 500,
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
        }

        // Notificar confirmação no Telegram
        await sendTelegramAlert(
            `🎉 *PAGAMENTO CONFIRMADO VIA TELEGRAM!*\n\n` +
            `👤 *Cliente:* ${clienteNome}\n` +
            `💰 *Valor Confirmado:* R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
            `🆔 *Checkout:* \`${checkout_id}\`\n\n` +
            `O pedido foi marcado como *Pago* e enviado para a *Fila de Impressão* no seu Kanban!`
        );

        // Emitir NF-e
        try {
            await emitirNFe(checkout_id);
        } catch (nfeErr) {
            console.error('Erro na emissão de NF-e pós confirmação Telegram:', nfeErr);
        }

        return new NextResponse(renderHtmlSuccess({
            clienteNome,
            total,
            checkout_id,
            alreadyPaid: false
        }), {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });

    } catch (err: any) {
        console.error('Confirm Pix Direct Error:', err);
        return new NextResponse(renderHtmlError(err.message || 'Erro interno no servidor'), {
            status: 500,
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
    }
}

function renderHtmlSuccess({ clienteNome, total, checkout_id, alreadyPaid }: any) {
    return `<!DOCTYPE html>
<html lang="pt-BR" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pagamento Confirmado | FrangaToys</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800;900&display=swap" rel="stylesheet">
    <style>body { font-family: 'Plus Jakarta Sans', sans-serif; }</style>
</head>
<body class="bg-black text-white min-h-screen flex items-center justify-center p-4">
    <div className="max-w-md w-full bg-zinc-950 border border-zinc-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
        <div class="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        
        <div class="space-y-2">
            <h1 class="text-2xl font-black tracking-tight text-white">
                ${alreadyPaid ? 'PAGAMENTO JÁ CONFIRMADO' : 'PAGAMENTO CONFIRMADO!'}
            </h1>
            <p class="text-xs text-zinc-400 font-medium">
                ${alreadyPaid ? 'Este pedido já constava como pago no sistema.' : 'O pedido foi atualizado e enviado para a Fila de Impressão no Kanban.'}
            </p>
        </div>

        <div class="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 text-left space-y-2 text-xs">
            <div class="flex justify-between">
                <span class="text-zinc-500 font-bold uppercase tracking-wider">Cliente:</span>
                <span class="text-white font-extrabold">${clienteNome}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-zinc-500 font-bold uppercase tracking-wider">Valor:</span>
                <span class="text-emerald-400 font-black">R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-zinc-500 font-bold uppercase tracking-wider">Checkout:</span>
                <span class="text-zinc-400 font-mono text-[10px]">${checkout_id}</span>
            </div>
        </div>

        <a href="/admin/kanban" class="inline-flex items-center justify-center w-full bg-orange-500 hover:bg-orange-400 text-black font-black py-3.5 px-6 rounded-2xl uppercase tracking-widest text-xs transition-all shadow-lg shadow-orange-500/10">
            Ir para o Kanban
        </a>
    </div>
</body>
</html>`;
}

function renderHtmlError(message: string) {
    return `<!DOCTYPE html>
<html lang="pt-BR" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Erro ao Confirmar | FrangaToys</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>body { font-family: sans-serif; }</style>
</head>
<body class="bg-black text-white min-h-screen flex items-center justify-center p-4">
    <div class="max-w-md w-full bg-zinc-950 border border-red-500/20 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
        <div class="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <h1 class="text-xl font-bold text-red-400">Falha na Operação</h1>
        <p class="text-xs text-zinc-400">${message}</p>
        <a href="/admin/kanban" class="inline-block bg-zinc-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs">Voltar ao Kanban</a>
    </div>
</body>
</html>`;
}
