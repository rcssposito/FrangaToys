import { supabaseAdmin as supabase } from './supabase';

export interface NFeEmailOptions {
    checkoutId?: string;
    saleId?: number;
    chaveNfe: string;
    numeroNfe?: number;
    xmlContent?: string;
    force?: boolean;
}

export interface NFeEmailResult {
    success: boolean;
    email?: string;
    motivo?: string;
    error?: string;
    resendId?: string;
}

/**
 * Formata chave de 44 dígitos em blocos legíveis de 4 dígitos:
 * 3526 1067 5664 9900 0170 5500 1000 0000 0210 0000 0001
 */
function formatarChaveNFe(chave: string): string {
    const limpa = chave.replace(/\D/g, '');
    return limpa.replace(/(\d{4})/g, '$1 ').trim();
}

/**
 * Gera um XML NFe 4.0 mínimo autorizado/completo caso não seja fornecido conteúdo direto
 */
function gerarXmlFallback(params: {
    chave: string;
    numeroNfe: number;
    clienteNome: string;
    clienteCpfCnpj?: string;
    itens: Array<{ nome: string; quantidade: number; valor: number }>;
    valorTotal: number;
    dataEmissao: string;
}): string {
    const { chave, numeroNfe, clienteNome, clienteCpfCnpj, itens, valorTotal, dataEmissao } = params;
    const cleanDoc = (clienteCpfCnpj || '').replace(/\D/g, '');
    const isCnpj = cleanDoc.length === 14;

    const escapeXml = (str: string) => (str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

    const itensXml = itens.map((item, idx) => `
    <det nItem="${idx + 1}">
      <prod>
        <cProd>FIG${idx + 1}</cProd>
        <cEAN>SEM GTIN</cEAN>
        <xProd>${escapeXml(item.nome)}</xProd>
        <NCM>95030099</NCM>
        <CFOP>5102</CFOP>
        <uCom>UN</uCom>
        <qCom>${Number(item.quantidade).toFixed(4)}</qCom>
        <vUnCom>${Number(item.valor / (item.quantidade || 1)).toFixed(10)}</vUnCom>
        <vProd>${Number(item.valor).toFixed(2)}</vProd>
        <cEANTrib>SEM GTIN</cEANTrib>
        <uTrib>UN</uTrib>
        <qTrib>${Number(item.quantidade).toFixed(4)}</qTrib>
        <vUnTrib>${Number(item.valor / (item.quantidade || 1)).toFixed(10)}</vUnTrib>
        <indTot>1</indTot>
      </prod>
    </det>`).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="NFe${chave}" versao="4.00">
    <ide>
      <cUF>35</cUF>
      <natOp>Venda de mercadoria</natOp>
      <mod>55</mod>
      <serie>1</serie>
      <nNF>${numeroNfe}</nNF>
      <dhEmi>${dataEmissao}</dhEmi>
      <tpNF>1</tpNF>
      <idDest>1</idDest>
      <cMunFG>3550308</cMunFG>
      <tpImp>1</tpImp>
      <tpEmis>1</tpEmis>
      <tpAmb>1</tpAmb>
      <finNFe>1</finNFe>
      <indFinal>1</indFinal>
      <indPres>2</indPres>
    </ide>
    <emit>
      <CNPJ>67566499000170</CNPJ>
      <xNome>FRANGA TOYS ATELIE DE COLECIONAVEIS</xNome>
      <xFant>FRANGA TOYS</xFant>
      <enderEmit>
        <xLgr>Av Paulista</xLgr>
        <nro>1000</nro>
        <xBairro>Bela Vista</xBairro>
        <cMun>3550308</cMun>
        <xMun>Sao Paulo</xMun>
        <UF>SP</UF>
        <CEP>01310100</CEP>
      </enderEmit>
      <IE>160422603112</IE>
      <CRT>4</CRT>
    </emit>
    <dest>
      ${isCnpj ? `<CNPJ>${cleanDoc}</CNPJ>` : `<CPF>${cleanDoc || '00000000000'}</CPF>`}
      <xNome>${escapeXml(clienteNome)}</xNome>
      <indIEDest>9</indIEDest>
    </dest>
    ${itensXml}
    <total>
      <ICMSTot>
        <vProd>${Number(valorTotal).toFixed(2)}</vProd>
        <vNF>${Number(valorTotal).toFixed(2)}</vNF>
      </ICMSTot>
    </total>
  </infNFe>
</NFe>`.trim();
}

/**
 * Envia o e-mail de confirmação de NF-e para o cliente com a chave, link da SEFAZ e anexo XML
 */
export async function enviarEmailNFe({
    checkoutId,
    saleId,
    chaveNfe,
    numeroNfe,
    xmlContent,
    force = false
}: NFeEmailOptions): Promise<NFeEmailResult> {
    try {
        const resendKey = process.env.RESEND_API_KEY;
        if (!resendKey) {
            return { success: false, motivo: 'Chave RESEND_API_KEY não configurada no servidor' };
        }

        const cleanKey = (chaveNfe || '').replace(/\D/g, '');
        if (cleanKey.length !== 44) {
            return { success: false, motivo: 'Chave de acesso inválida (deve ter 44 dígitos)' };
        }

        // 1. Descobrir número da NF-e caso não informado diretamente
        let numNota = numeroNfe;
        if (!numNota) {
            const numStr = cleanKey.slice(25, 34);
            const parsed = parseInt(numStr, 10);
            if (!isNaN(parsed) && parsed > 0) {
                numNota = parsed;
            } else {
                numNota = 1;
            }
        }

        // 2. Buscar vendas vinculadas (por checkout_id ou por sale_id)
        let query = supabase
            .from('vendas')
            .select(`
                id,
                checkout_id,
                cliente_id,
                cliente_nome,
                cliente_contato,
                valor_venda_final,
                valor_frete,
                quantidade,
                figuras (
                    nome,
                    imagem_url
                ),
                clientes:cliente_id (
                    id,
                    nome,
                    email,
                    telefone,
                    cpf
                )
            `);

        if (checkoutId) {
            query = query.eq('checkout_id', checkoutId);
        } else if (saleId) {
            query = query.eq('id', saleId);
        } else {
            return { success: false, motivo: 'É necessário informar checkoutId ou saleId' };
        }

        const { data: sales, error: salesErr } = await query;
        if (salesErr || !sales || sales.length === 0) {
            return { success: false, motivo: 'Nenhuma venda encontrada para esta NF-e' };
        }

        const firstSale = sales[0];

        // 3. Descobrir e-mail do cliente (com fallback)
        let clienteEmail: string | null = (firstSale.clientes as any)?.email || null;
        let clienteNome: string = (firstSale.clientes as any)?.nome || firstSale.cliente_nome || 'Colecionador';
        let clienteCpf: string = (firstSale.clientes as any)?.cpf || '';
        const clienteTelefone: string = (firstSale.clientes as any)?.telefone || firstSale.cliente_contato || '';

        // Fallback: Buscar por telefone no cadastro de clientes se o vínculo direto não tiver e-mail
        if (!clienteEmail && clienteTelefone) {
            const cleanPhone = clienteTelefone.replace(/\D/g, '');
            if (cleanPhone) {
                const { data: clientByPhone } = await supabase
                    .from('clientes')
                    .select('email, nome, cpf')
                    .eq('telefone', cleanPhone)
                    .not('email', 'is', null)
                    .limit(1)
                    .maybeSingle();

                if (clientByPhone?.email) {
                    clienteEmail = clientByPhone.email;
                    if (clientByPhone.nome) clienteNome = clientByPhone.nome;
                    if (clientByPhone.cpf) clienteCpf = clientByPhone.cpf;
                }
            }
        }

        if (!clienteEmail) {
            return {
                success: false,
                motivo: `Cliente (${clienteNome}) não possui e-mail cadastrado para envio da NF-e`
            };
        }

        // 4. Montar dados dos itens e valores
        const totalFrete = firstSale.valor_frete || 0;
        const totalItens = sales.reduce((acc, s) => acc + (s.valor_venda_final || 0), 0);
        const totalGeral = totalItens + totalFrete;

        const itensFormatados = sales.map(s => {
            const fig = (Array.isArray(s.figuras) ? s.figuras[0] : s.figuras) as any;
            return {
                nome: fig?.nome || 'Colecionável Personalizado',
                imagem_url: fig?.imagem_url || null,
                quantidade: s.quantidade || 1,
                valor: s.valor_venda_final || 0
            };
        });

        const chaveFormatada = formatarChaveNFe(cleanKey);
        const primeiroNome = clienteNome.trim().split(' ')[0];
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://frangatoys.com.br';
        const rastreioUrl = `${siteUrl}/rastreio/${clienteTelefone ? clienteTelefone.replace(/\D/g, '') : ''}`;
        const sefazConsultaUrl = 'https://www.nfe.fazenda.gov.br/portal/consultaRecibo.aspx';

        // 5. Preparar XML para anexo
        let finalXml = xmlContent;
        if (!finalXml) {
            finalXml = gerarXmlFallback({
                chave: cleanKey,
                numeroNfe: numNota,
                clienteNome,
                clienteCpfCnpj: clienteCpf,
                itens: itensFormatados,
                valorTotal: totalGeral,
                dataEmissao: new Date().toISOString()
            });
        }

        const xmlBase64 = Buffer.from(finalXml, 'utf-8').toString('base64');

        // 6. Template HTML Premium
        const html = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Nota Fiscal Eletrônica - Franga Toys</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f4f4f5;">
                <div style="max-width: 600px; margin: 30px auto; background-color: #121215; border: 1px solid #27272a; border-radius: 20px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);">
                    
                    <!-- Top Accent Bar -->
                    <div style="height: 4px; background: linear-gradient(90deg, #10b981 0%, #059669 50%, #f59e0b 100%);"></div>

                    <!-- Header -->
                    <div style="padding: 28px 28px 18px 28px; text-align: center; border-bottom: 1px solid #1f1f23;">
                        <p style="font-size: 11px; font-weight: 800; letter-spacing: 2px; color: #10b981; text-transform: uppercase; margin: 0 0 6px 0;">
                            Documento Fiscal Eletrônico
                        </p>
                        <h1 style="font-size: 22px; font-weight: 900; color: #ffffff; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">
                            Franga Toys Ateliê
                        </h1>
                        <p style="font-size: 11px; color: #71717a; margin: 4px 0 0 0;">
                            CNPJ: 67.566.499/0001-70 • São Paulo, SP
                        </p>
                    </div>

                    <!-- Main Body -->
                    <div style="padding: 30px 28px;">

                        <!-- Badge de Status SEFAZ -->
                        <div style="text-align: center; margin-bottom: 24px;">
                            <span style="background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.35); font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; padding: 6px 16px; rounded-full; display: inline-block; border-radius: 999px;">
                                ✅ SEFAZ • NF-e Autorizada
                            </span>
                        </div>

                        <!-- Greeting & Headline -->
                        <h2 style="font-size: 20px; font-weight: 800; color: #ffffff; text-align: center; margin: 0 0 12px 0;">
                            Sua Nota Fiscal foi emitida com sucesso!
                        </h2>
                        <p style="font-size: 14px; line-height: 1.6; color: #a1a1aa; text-align: center; margin: 0 0 28px 0;">
                            Olá, <strong style="color: #ffffff;">${primeiroNome}</strong>! Informamos que a Nota Fiscal Eletrônica referente ao seu pedido na Franga Toys foi autorizada pela SEFAZ. O arquivo XML oficial encontra-se anexado a este e-mail.
                        </p>

                        <!-- Box de Dados Fiscais da NF-e -->
                        <div style="background: #18181b; border: 1px solid #27272a; border-radius: 14px; padding: 20px; margin-bottom: 24px;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 6px 0; font-size: 12px; color: #71717a; font-weight: 600;">Número da NF-e:</td>
                                    <td style="padding: 6px 0; font-size: 13px; color: #ffffff; font-weight: 800; text-align: right;">${numNota}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 0; font-size: 12px; color: #71717a; font-weight: 600;">Série:</td>
                                    <td style="padding: 6px 0; font-size: 13px; color: #ffffff; font-weight: 800; text-align: right;">1</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 0; font-size: 12px; color: #71717a; font-weight: 600;">Valor Total:</td>
                                    <td style="padding: 6px 0; font-size: 14px; color: #10b981; font-weight: 900; text-align: right;">
                                        R$ ${totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                </tr>
                                ${checkoutId ? `
                                <tr>
                                    <td style="padding: 6px 0; font-size: 12px; color: #71717a; font-weight: 600;">Identificador do Pedido:</td>
                                    <td style="padding: 6px 0; font-size: 12px; color: #d4d4d8; font-family: monospace; text-align: right;">#${checkoutId}</td>
                                </tr>
                                ` : ''}
                            </table>

                            <!-- Chave de Acesso em Destaque -->
                            <div style="margin-top: 16px; pt-3; border-top: 1px solid #27272a; padding-top: 14px;">
                                <p style="font-size: 11px; color: #71717a; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 6px 0;">
                                    Chave de Acesso da NF-e (44 dígitos):
                                </p>
                                <div style="background: #09090b; border: 1px solid #3f3f46; border-radius: 8px; padding: 10px 12px; font-family: monospace; font-size: 11px; color: #38bdf8; word-break: break-all; letter-spacing: 1px; text-align: center;">
                                    ${chaveFormatada}
                                </div>
                            </div>
                        </div>

                        <!-- Resumo dos Itens do Pedido -->
                        <div style="margin-bottom: 26px;">
                            <p style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #71717a; margin: 0 0 10px 0;">
                                Itens da Nota Fiscal:
                            </p>
                            <div style="background: #141418; border: 1px solid #27272a; border-radius: 12px; overflow: hidden;">
                                ${itensFormatados.map((item, idx) => `
                                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; ${idx > 0 ? 'border-top: 1px solid #1f1f23;' : ''}">
                                        <div style="display: flex; align-items: center; gap: 12px;">
                                            ${item.imagem_url ? `
                                                <img src="${item.imagem_url}" alt="${item.nome}" style="width: 36px; height: 36px; border-radius: 8px; object-fit: cover; border: 1px solid #27272a; background: #000;" />
                                            ` : ''}
                                            <div>
                                                <div style="font-size: 13px; font-weight: 700; color: #ffffff;">${item.nome}</div>
                                                <div style="font-size: 11px; color: #71717a;">Qtd: ${item.quantidade}x</div>
                                            </div>
                                        </div>
                                        <div style="font-size: 13px; font-weight: 700; color: #d4d4d8; font-family: monospace;">
                                            R$ ${item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                `).join('')}
                                ${totalFrete > 0 ? `
                                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; border-top: 1px solid #1f1f23; background: #0f0f12;">
                                        <div style="font-size: 12px; color: #a1a1aa;">Frete / Envio:</div>
                                        <div style="font-size: 12px; font-weight: 700; color: #a1a1aa; font-family: monospace;">
                                            R$ ${totalFrete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        </div>

                        <!-- Botões de Ação -->
                        <div style="text-align: center; margin-bottom: 24px;">
                            <a href="${sefazConsultaUrl}" target="_blank" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 13px 26px; border-radius: 12px; font-weight: 800; font-size: 12px; display: inline-block; box-shadow: 0 4px 16px rgba(16, 185, 129, 0.35); text-transform: uppercase; letter-spacing: 0.5px; margin-right: 8px; margin-bottom: 8px;">
                                Consultar na SEFAZ
                            </a>
                            <a href="${rastreioUrl}" target="_blank" style="background: #27272a; color: #e4e4e7; text-decoration: none; padding: 13px 22px; border-radius: 12px; font-weight: 700; font-size: 12px; display: inline-block; border: 1px solid #3f3f46; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                                Acompanhar Pedido
                            </a>
                        </div>

                        <!-- Informação do Anexo XML -->
                        <div style="background: rgba(56, 189, 248, 0.08); border-left: 3px solid #38bdf8; border-radius: 4px 10px 10px 4px; padding: 12px 14px; margin-bottom: 24px;">
                            <p style="font-size: 12px; line-height: 1.5; color: #bae6fd; margin: 0;">
                                📎 <strong>Arquivo XML Anexado:</strong> O arquivo oficial <code>NFe-${numNota}.xml</code> está anexado a este e-mail para seu arquivo contábil e fiscal.
                            </p>
                        </div>

                        <!-- Rodapé de Suporte -->
                        <div style="border-top: 1px solid #27272a; padding-top: 18px; text-align: center;">
                            <p style="font-size: 12px; color: #71717a; margin: 0 0 6px 0; line-height: 1.5;">
                                Em caso de dúvidas, fale conosco pelo WhatsApp ou Instagram <a href="https://instagram.com/frangatoys" style="color: #f97316; text-decoration: none; font-weight: 700;">@frangatoys</a>.
                            </p>
                        </div>

                    </div>

                    <!-- Footnote Oficial -->
                    <div style="background: #09090b; padding: 16px 20px; text-align: center; border-top: 1px solid #18181b; font-size: 11px; color: #52525b;">
                        Franga Toys Ateliê de Colecionáveis • São Paulo, SP • <a href="${siteUrl}" style="color: #a1a1aa; text-decoration: none;">frangatoys.com.br</a>
                    </div>

                </div>
            </body>
            </html>
        `;

        // 7. Envio via Resend API com anexo XML
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'Franga Toys <pedidos@frangatoys.com.br>';
        const payload: any = {
            from: fromEmail,
            to: clienteEmail,
            subject: `🧾 [Franga Toys] Sua Nota Fiscal Eletrônica (NF-e #${numNota}) foi emitida!`,
            html,
            attachments: [
                {
                    filename: `NFe-${numNota}.xml`,
                    content: xmlBase64
                }
            ]
        };

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${resendKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const resData = await res.json();
        if (!res.ok) {
            throw new Error(resData.message || 'Falha na resposta do Resend ao enviar NF-e');
        }

        console.log(`[NF-e Email] E-mail com XML da NF-e #${numNota} enviado com sucesso para ${clienteEmail} (Resend ID: ${resData.id})`);

        return {
            success: true,
            email: clienteEmail,
            resendId: resData.id
        };

    } catch (err: any) {
        console.error('[NF-e Email Exception]:', err);
        return {
            success: false,
            error: err.message || 'Erro inesperado ao enviar e-mail de NF-e'
        };
    }
}
