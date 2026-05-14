export async function sendTelegramAlert(message: string) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
        console.warn('Telegram Bot: Token ou ChatID não configurados no .env');
        return;
    }

    try {
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown'
            })
        });
        
        if (!res.ok) {
            const err = await res.json();
            console.error('Telegram API Error:', err);
        }
    } catch (err) {
        console.error('Telegram Alert Failed:', err);
    }
}
