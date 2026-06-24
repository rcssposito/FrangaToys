import { supabaseAdmin as supabase } from './supabase';
import { sendTelegramAlert } from './telegram';

export async function enviarReciboAutomatico(checkoutId: string): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Buscar vendas vinculadas ao checkout
    const { data: sales, error } = await supabase
      .from('vendas')
      .select(`
        id,
        valor_venda_final,
        valor_frete,
        cliente_nome,
        cliente_contato,
        quantidade,
        observacao,
        figuras (
          nome
        )
      `)
      .eq('checkout_id', checkoutId);

    if (error || !sales || sales.length === 0) {
      return { success: false, message: 'Nenhuma venda encontrada para envio do recibo' };
    }

    const firstItem = sales[0];
    const totalFrete = firstItem.valor_frete || 0;
    const totalItens = sales.reduce((acc, s) => acc + (s.valor_venda_final || 0), 0);
    const totalGeral = totalItens + totalFrete;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://frangatoys.com.br';
    
    // Link do recibo (Ficha de OS do primeiro item do checkout)
    const linkRecibo = `${siteUrl}/api/admin/kanban/os/${firstItem.id}`;
    
    // 2. Montar mensagem formatada para envio
    const itemSummary = sales.map(s => {
      const fig = (Array.isArray(s.figuras) ? s.figuras[0] : s.figuras) as any;
      return `• ${s.quantidade}x ${fig?.nome || 'Figura'}`;
    }).join('\n');
    
    const textoMensagem = `Olá, ${firstItem.cliente_nome}! Seu pedido na Franga Toys foi recebido com sucesso. 🎉\n\n` +
      `📦 *Resumo do Pedido #${checkoutId}:*\n${itemSummary}\n\n` +
      `💰 *Total:* R$ ${totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n` +
      `🧾 *Acesse seu Recibo Oficial aqui:* ${linkRecibo}\n\n` +
      `Seu pedido já entrou na nossa fila de produção. Agradecemos a preferência!`;

    // 3. Notificar o Admin no Telegram com a mensagem pronta para ele encaminhar no WhatsApp do cliente
    const whatsappLink = `https://wa.me/${firstItem.cliente_contato.replace(/\D/g, '')}?text=${encodeURIComponent(textoMensagem)}`;
    
    await sendTelegramAlert(
      `📲 *[ENVIO DE RECIBO]*\n\n` +
      `Pedido *#${checkoutId}* gerado!\n` +
      `Cliente: *${firstItem.cliente_nome}* (${firstItem.cliente_contato})\n\n` +
      `💬 *Mensagem para o cliente:*\n\`\`\`\n${textoMensagem}\n\`\`\`\n` +
      `🔗 [Clique aqui para enviar via WhatsApp](${whatsappLink})`
    );

    console.log(`[Notification Manager] Recibo preparado e notificado no Telegram para o checkout ${checkoutId}`);

    return { success: true, message: 'Recibo gerado e notificado no Telegram' };
  } catch (err: any) {
    console.error('enviarReciboAutomatico error:', err);
    return { success: false, message: err.message || 'Erro interno ao enviar recibo' };
  }
}
