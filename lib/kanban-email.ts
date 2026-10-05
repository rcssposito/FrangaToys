import { supabaseAdmin as supabase } from './supabase';

export interface KanbanNotificationOptions {
    saleId: number;
    oldStatus?: string;
    newStatus: string;
    force?: boolean;
}

export interface KanbanNotificationResult {
    success: boolean;
    email?: string;
    motivo?: string;
    error?: string;
    resendId?: string;
}

interface StatusConfig {
    badge: string;
    badgeBg: string;
    badgeColor: string;
    badgeBorder: string;
    accentColor: string;
    subject: string;
    title: string;
    stepIndex: number; // 1 to 5
    descricao: string;
    dicaAtelie: string;
}

const STATUS_CONFIGS: Record<string, StatusConfig> = {
    'Fila de Impressão': {
        badge: 'Fila de Produção',
        badgeBg: 'rgba(245, 158, 11, 0.15)',
        badgeColor: '#fbbf24',
        badgeBorder: 'rgba(245, 158, 11, 0.3)',
        accentColor: '#f59e0b',
        subject: '🚀 Seu pedido entrou na Fila de Impressão 3D!',
        title: 'Seu colecionável entrou na Fila de Impressão!',
        stepIndex: 1,
        descricao: 'Temos ótimas novidades: seu pedido foi aprovado, os modelos 3D foram preparados e fatiados em altíssima resolução. Ele já está na fila para materialização em nossas impressoras 3D!',
        dicaAtelie: 'Nossa equipe confere suportes e calibrações micrométricas para garantir que cada detalhe da miniatura saia perfeito.'
    },
    'Imprimindo': {
        badge: 'Impressão 3D Ativa',
        badgeBg: 'rgba(249, 115, 22, 0.15)',
        badgeColor: '#fb923c',
        badgeBorder: 'rgba(249, 115, 22, 0.3)',
        accentColor: '#f97316',
        subject: '🏭 Máquinas rodando! Sua peça está sendo impressa',
        title: 'Suas peças estão sendo impressas em 3D agora mesmo!',
        stepIndex: 2,
        descricao: 'A produção começou a todo vapor! Nossas impressoras 3D de alta precisão já estão trabalhando camada por camada para criar cada detalhe e textura da sua peça.',
        dicaAtelie: 'Trabalhamos com resinas premium de alta definição para assegurar máxima fidelidade nas proporções e traços anatômicos.'
    },
    'Lavagem e Cura': {
        badge: 'Pós-Processamento',
        badgeBg: 'rgba(59, 130, 246, 0.15)',
        badgeColor: '#60a5fa',
        badgeBorder: 'rgba(59, 130, 246, 0.3)',
        accentColor: '#3b82f6',
        subject: '💧 Impressão concluída! Fase de Pós-Processamento',
        title: 'Impressão 3D finalizada! Entrou em Pós-Processamento',
        stepIndex: 3,
        descricao: 'Sua peça saiu da máquina com sucesso! Ela agora passa pelo processo de lavagem química detalhada e câmara de cura ultravioleta para alcançar resistência mecânica ideal e toque perfeito.',
        dicaAtelie: 'Nesta etapa também removemos com extrema delicadeza todos os suportes de impressão antes da preparação para acabamento.'
    },
    'Pintura Secagem': {
        badge: 'Pintura & Acabamento',
        badgeBg: 'rgba(168, 85, 247, 0.15)',
        badgeColor: '#c084fc',
        badgeBorder: 'rgba(168, 85, 247, 0.3)',
        accentColor: '#a855f7',
        subject: '🎨 Arte em andamento! Sua peça está na fase de Pintura',
        title: 'A mágica está acontecendo: Fase de Pintura Artística!',
        stepIndex: 4,
        descricao: 'Chegou o momento em que a peça ganha vida! Seu colecionável já está na bancada dos nossos artistas plásticos recebendo primer, aerografia, pintura manual de detalhes e selagem protetora.',
        dicaAtelie: 'Cada tonalidade, sombreamento e efeito de luz é feito à mão com tintas especializadas para colecionadores exigentes.'
    },
    'Pronto p/ Entrega': {
        badge: 'Pronto p/ Entrega',
        badgeBg: 'rgba(16, 185, 129, 0.15)',
        badgeColor: '#34d399',
        badgeBorder: 'rgba(16, 185, 129, 0.3)',
        accentColor: '#10b981',
        subject: '🎉 Pronto! Seu colecionável está finalizado!',
        title: 'Obra de arte finalizada e pronta para entrega!',
        stepIndex: 5,
        descricao: 'A espera valeu a pena! Sua peça foi aprovada em nosso rigoroso controle de qualidade, recebeu acabamento final e está embalada com máxima proteção para envio ou retirada.',
        dicaAtelie: 'Se o seu pedido for com envio pelos Correios/transportadora, logo em seguida você receberá as atualizações de rastreio!'
    },
    'Concluída': {
        badge: 'Pedido Entregue',
        badgeBg: 'rgba(16, 185, 129, 0.15)',
        badgeColor: '#34d399',
        badgeBorder: 'rgba(16, 185, 129, 0.3)',
        accentColor: '#10b981',
        subject: '⭐ Pedido Entregue! Esperamos que curta seu colecionável!',
        title: 'Pedido Concluído e Entregue com Sucesso!',
        stepIndex: 5,
        descricao: 'Consta em nosso sistema que o seu pedido foi entregue! Foi um prazer imenso modelar e produzir essa peça exclusiva para a sua coleção.',
        dicaAtelie: 'Adoramos ver nossos colecionáveis no cantinho de vocês! Se puder, tire uma foto e marque a gente no Instagram @frangatoys!'
    }
};

const STEPS_TIMELINE = [
    { label: 'Fila', index: 1 },
    { label: 'Impressão', index: 2 },
    { label: 'Pós-Processo', index: 3 },
    { label: 'Pintura', index: 4 },
    { label: 'Pronto', index: 5 }
];

export async function notificarMudancaStatusKanban({
    saleId,
    oldStatus,
    newStatus,
    force = false
}: KanbanNotificationOptions): Promise<KanbanNotificationResult> {
    try {
        // 1. Validar se há chave do Resend
        const resendKey = process.env.RESEND_API_KEY;
        if (!resendKey) {
            return { success: false, motivo: 'Chave RESEND_API_KEY não configurada no servidor' };
        }

        // 2. Não disparar se não mudou de status (a menos que seja forçado manualmente)
        if (!force && oldStatus && oldStatus === newStatus) {
            return { success: false, motivo: 'Status não foi alterado' };
        }

        // 3. Verificar se o status atual tem template configurado
        const config = STATUS_CONFIGS[newStatus];
        if (!config) {
            return { success: false, motivo: `Status "${newStatus}" não possui modelo de e-mail associado` };
        }

        // 4. Buscar informações detalhadas da venda
        const { data: sale, error: saleErr } = await supabase
            .from('vendas')
            .select(`
                id,
                cliente_id,
                cliente_nome,
                cliente_contato,
                quantidade,
                metodo_entrega,
                figuras (
                    nome,
                    imagem_url
                ),
                clientes:cliente_id (
                    id,
                    nome,
                    email,
                    telefone
                )
            `)
            .eq('id', saleId)
            .single();

        if (saleErr || !sale) {
            return { success: false, motivo: 'Venda não encontrada' };
        }

        // 5. Descobrir e-mail do cliente (com fallback robusto)
        let clienteEmail: string | null = (sale.clientes as any)?.email || null;
        let clienteNome: string = (sale.clientes as any)?.nome || sale.cliente_nome || 'Colecionador';

        // Fallback 1: Buscar por telefone no cadastro de clientes se o vínculo direto não tiver e-mail
        if (!clienteEmail && sale.cliente_contato) {
            const cleanPhone = sale.cliente_contato.replace(/\D/g, '');
            if (cleanPhone) {
                const { data: clientByPhone } = await supabase
                    .from('clientes')
                    .select('email, nome')
                    .eq('telefone', cleanPhone)
                    .not('email', 'is', null)
                    .limit(1)
                    .maybeSingle();

                if (clientByPhone?.email) {
                    clienteEmail = clientByPhone.email;
                    if (clientByPhone.nome) clienteNome = clientByPhone.nome;
                }
            }
        }

        // Fallback 2: Buscar por nome exato em clientes
        if (!clienteEmail && sale.cliente_nome) {
            const { data: clientByName } = await supabase
                .from('clientes')
                .select('email, nome')
                .ilike('nome', sale.cliente_nome.trim())
                .not('email', 'is', null)
                .limit(1)
                .maybeSingle();

            if (clientByName?.email) {
                clienteEmail = clientByName.email;
            }
        }

        if (!clienteEmail || !clienteEmail.includes('@')) {
            return { success: false, motivo: 'Cliente sem e-mail cadastrado' };
        }

        // 6. Dados formatados do produto e cliente
        const primeiroNome = clienteNome.trim().split(' ')[0] || 'Colecionador';
        const figure = Array.isArray(sale.figuras) ? sale.figuras[0] : sale.figuras;
        const figuraNome = figure?.nome || 'Figura Colecionável 3D';
        const figuraImagem = figure?.imagem_url || null;
        const quantidade = sale.quantidade || 1;
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://frangatoys.com.br';
        const osUrl = `${siteUrl}/api/admin/kanban/os/${sale.id}`;

        // 7. Renderizar a timeline de progresso em HTML
        const timelineColsHtml = STEPS_TIMELINE.map(step => {
            const isCompleted = step.index < config.stepIndex;
            const isCurrent = step.index === config.stepIndex;
            
            let dotBg = '#27272a';
            let dotColor = '#71717a';
            let labelColor = '#71717a';
            let labelWeight = '500';
            let dotContent = `${step.index}`;

            if (isCompleted) {
                dotBg = '#10b981';
                dotColor = '#ffffff';
                labelColor = '#a1a1aa';
                dotContent = '✓';
            } else if (isCurrent) {
                dotBg = config.accentColor;
                dotColor = '#ffffff';
                labelColor = '#ffffff';
                labelWeight = '700';
            }

            return `
                <td style="text-align: center; width: 20%; vertical-align: top; padding: 4px 2px;">
                    <div style="width: 26px; height: 26px; border-radius: 50%; background: ${dotBg}; color: ${dotColor}; font-weight: 800; font-size: 11px; line-height: 26px; margin: 0 auto 6px auto; box-shadow: ${isCurrent ? `0 0 12px ${config.accentColor}80` : 'none'};">
                        ${dotContent}
                    </div>
                    <div style="font-size: 10px; color: ${labelColor}; font-weight: ${labelWeight}; text-transform: uppercase; letter-spacing: 0.5px;">
                        ${step.label}
                    </div>
                </td>
            `;
        }).join('');

        // 8. Template HTML oficial Franga Toys
        const html = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${config.title}</title>
            </head>
            <body style="margin: 0; padding: 20px 10px; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f4f4f5;">
                <div style="max-width: 580px; margin: 0 auto; background: #0c0a09; border: 1px solid #27272a; border-radius: 18px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.6);">
                    
                    <!-- Top Branding Bar -->
                    <div style="background: linear-gradient(180deg, #18181b 0%, #0c0a09 100%); padding: 26px 20px 20px 20px; text-align: center; border-bottom: 1px solid #27272a;">
                        <h1 style="color: #f97316; font-size: 24px; font-weight: 900; letter-spacing: -0.5px; margin: 0; text-transform: uppercase;">
                            FRANGA TOYS
                        </h1>
                        <p style="color: #a1a1aa; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin: 4px 0 0 0;">
                            Colecionáveis & Miniaturas 3D Exclusivas
                        </p>
                    </div>

                    <!-- Main Content Body -->
                    <div style="padding: 28px 24px;">
                        
                        <!-- Status Badge & Greeting -->
                        <div style="margin-bottom: 22px;">
                            <span style="display: inline-block; padding: 5px 14px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; background: ${config.badgeBg}; color: ${config.badgeColor}; border: 1px solid ${config.badgeBorder}; margin-bottom: 14px;">
                                ● ${config.badge}
                            </span>
                            <h2 style="font-size: 21px; font-weight: 900; color: #ffffff; margin: 0 0 8px 0; line-height: 1.3; letter-spacing: -0.3px;">
                                ${config.title}
                            </h2>
                            <p style="font-size: 14px; color: #a1a1aa; margin: 0; line-height: 1.5;">
                                Olá, <strong style="color: #f4f4f5;">${primeiroNome}</strong>! Atualizamos o status do seu pedido em nosso ateliê de produção.
                            </p>
                        </div>

                        <!-- Production Timeline -->
                        <div style="background: #18181b; border: 1px solid #27272a; border-radius: 14px; padding: 18px 12px; margin-bottom: 24px;">
                            <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #71717a; margin-bottom: 14px; text-align: center;">
                                Linha do Tempo da Produção
                            </div>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    ${timelineColsHtml}
                                </tr>
                            </table>
                        </div>

                        <!-- Product Preview Card -->
                        <div style="background: #141417; border: 1px solid #27272a; border-radius: 14px; padding: 16px; margin-bottom: 24px;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    ${figuraImagem ? `
                                        <td style="width: 70px; vertical-align: top;">
                                            <img src="${figuraImagem}" alt="${figuraNome}" style="width: 64px; height: 64px; object-fit: cover; border-radius: 10px; border: 1px solid #3f3f46; display: block;" />
                                        </td>
                                    ` : ''}
                                    <td style="vertical-align: middle; padding-left: ${figuraImagem ? '14px' : '0'};">
                                        <div style="font-size: 15px; font-weight: 800; color: #ffffff; margin-bottom: 4px; line-height: 1.3;">
                                            ${figuraNome}
                                        </div>
                                        <div style="font-size: 12px; color: #a1a1aa;">
                                            Ordem de Produção <strong style="color: #f97316;">#${sale.id}</strong> • Quantidade: <strong style="color: #ffffff;">${quantidade}x</strong>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </div>

                        <!-- Status Description Box -->
                        <div style="background: #18181b; border-left: 4px solid ${config.accentColor}; border-radius: 4px 12px 12px 4px; padding: 18px; margin-bottom: 26px;">
                            <p style="font-size: 14px; line-height: 1.6; color: #e4e4e7; margin: 0 0 10px 0;">
                                ${config.descricao}
                            </p>
                            <p style="font-size: 12px; line-height: 1.5; color: #a1a1aa; margin: 0; font-style: italic;">
                                💡 <strong>Bastidores:</strong> ${config.dicaAtelie}
                            </p>
                        </div>

                        <!-- Action Button -->
                        <div style="text-align: center; margin-bottom: 24px;">
                            <a href="${osUrl}" target="_blank" style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 800; font-size: 13px; display: inline-block; box-shadow: 0 4px 16px rgba(249, 115, 22, 0.35); text-transform: uppercase; letter-spacing: 0.5px;">
                                Acompanhar Ficha de Produção
                            </a>
                        </div>

                        <!-- Help & Contact Footer -->
                        <div style="border-top: 1px solid #27272a; padding-top: 20px; text-align: center;">
                            <p style="font-size: 12px; color: #71717a; margin: 0 0 6px 0; line-height: 1.5;">
                                Dúvidas sobre o pedido? Fale conosco diretamente pelo WhatsApp ou pelo Instagram <a href="https://instagram.com/frangatoys" style="color: #f97316; text-decoration: none; font-weight: 700;">@frangatoys</a>.
                            </p>
                        </div>

                    </div>

                    <!-- Footnote -->
                    <div style="background: #09090b; padding: 16px 20px; text-align: center; border-top: 1px solid #18181b; font-size: 11px; color: #52525b;">
                        Franga Toys Ateliê • São Paulo, SP • <a href="${siteUrl}" style="color: #a1a1aa; text-decoration: none;">frangatoys.com.br</a>
                    </div>

                </div>
            </body>
            </html>
        `;

        // 9. Envio via Resend API
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'Franga Toys <contato@frangatoys.com.br>';
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${resendKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: fromEmail,
                to: clienteEmail,
                subject: `[Franga Toys] ${config.subject}`,
                html
            })
        });

        const resData = await res.json();
        if (!res.ok) {
            throw new Error(resData.message || 'Falha na resposta do Resend');
        }

        console.log(`[Kanban Email] E-mail de status "${newStatus}" enviado para ${clienteEmail} (Venda #${saleId}, Resend ID: ${resData.id})`);

        return {
            success: true,
            email: clienteEmail,
            resendId: resData.id
        };

    } catch (err: any) {
        console.error('[Kanban Email Exception]:', err);
        return {
            success: false,
            error: err.message || 'Erro inesperado ao enviar notificação de status'
        };
    }
}
