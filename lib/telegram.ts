export async function sendTelegramAlert(message: string, reply_markup?: any) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
        console.warn('Telegram Bot: Token ou ChatID não configurados no .env');
        return;
    }

    try {
        const body: any = {
            chat_id: chatId,
            text: message,
            parse_mode: 'Markdown'
        };

        if (reply_markup) {
            body.reply_markup = reply_markup;
        }

        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        
        if (!res.ok) {
            const err = await res.json();
            console.error('Telegram API Error:', err);
        }
    } catch (err) {
        console.error('Telegram Alert Failed:', err);
    }
}

import crypto from 'crypto';

export function generatePaymentConfirmSecret(checkoutId: string): string {
    const secretKey = process.env.TELEGRAM_BOT_TOKEN || process.env.SUPABASE_SERVICE_ROLE_KEY || 'frangatoys_pix_secret';
    return crypto.createHmac('sha256', secretKey).update(checkoutId).digest('hex').substring(0, 16);
}
