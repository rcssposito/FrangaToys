import { supabaseAdmin as supabase } from './supabase';
import { sendTelegramAlert } from './telegram';

interface FocusNFePayload {
  cnpj_emitente: string;
  inscricao_estadual_emitente: string;
  natureza_operacao: string;
  tipo_documento: number; // 1 = Saída
  presenca_comprador: number; // 2 = Internet
  destino_operacao: number; // 1 = Interna, 2 = Interestadual
  consumidor_final: number; // 1 = Sim
  finalidade_emissao: number; // 1 = Normal
  dados_destinatario: {
    nome: string;
    cpf?: string;
    cnpj?: string;
    telefone?: string;
    logradouro?: string;
    numero?: string;
    bairro?: string;
    municipio?: string;
    uf?: string;
    cep?: string;
  };
  itens: Array<{
    numero_item: string;
    codigo_produto: string;
    descricao: string;
    cfop: string; // 5102 = Interno, 6102 = Interestadual
    unidade_comercial: string;
    quantidade_comercial: string;
    valor_unitario_comercial: string;
    valor_bruto: string;
    unidade_tributavel: string;
    quantidade_tributavel: string;
    valor_unitario_tributavel: string;
    icms_situacao_tributaria: string; // 102 = Simples Nacional sem crédito
    icms_origem: string; // 0 = Nacional
  }>;
  valor_frete: string;
  valor_total: string;
  modalidade_frete: number; // 0 = Emitente, 1 = Destinatário, 9 = Sem Frete
}

export async function emitirNFe(checkoutId: string): Promise<{ success: boolean; message: string; chave?: string }> {
  try {
    // 1. Buscar vendas vinculadas ao checkout
    const { data: sales, error: salesError } = await supabase
      .from('vendas')
      .select(`
        id,
        valor_venda_final,
        valor_frete,
        cliente_nome,
        cliente_contato,
        cliente_id,
        quantidade,
        observacao,
        metodo_entrega,
        figuras (
          nome,
          codigo
        )
      `)
      .eq('checkout_id', checkoutId);

    if (salesError || !sales || sales.length === 0) {
      return { success: false, message: 'Nenhuma venda encontrada para este checkout' };
    }

    // 2. Buscar configurações globais
    const { data: settings } = await supabase
      .from('pricing_params')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    const cnpjEmitente = (process.env.NEXT_PUBLIC_CNPJ || '67.566.499/0001-70').replace(/\D/g, '');
    const ieEmitente = (process.env.NEXT_PUBLIC_INSCRICAO_ESTADUAL || '160.422.603.112').replace(/\D/g, '');

    const totalFrete = sales[0].valor_frete || 0;
    const totalItens = sales.reduce((acc, s) => acc + (s.valor_venda_final || 0), 0);
    const totalGeral = totalItens + totalFrete;

    // Fetch customer details from database using cliente_id if available
    let realClient: any = null;
    if (sales[0].cliente_id) {
      const { data: cData } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', sales[0].cliente_id)
        .maybeSingle();
      if (cData) {
        realClient = cData;
      }
    }

    // 3. Montar os itens da NF-e
    const ufDestinatario = realClient?.uf || 'SP';
    const cfop = ufDestinatario === 'SP' ? '5102' : '6102'; // CFOP padrão de venda de mercadoria adquirida de terceiros

    const itensNFe = sales.map((sale: any, idx: number) => {
      const fig = sale.figuras;
      const unitPrice = (sale.valor_venda_final || 0) / (sale.quantidade || 1);
      return {
        numero_item: String(idx + 1),
        codigo_produto: fig?.codigo || `FIG-${sale.figura_id}`,
        descricao: fig?.nome || 'Figura Personalizada',
        cfop: cfop,
        unidade_comercial: 'UN',
        quantidade_comercial: Number(sale.quantidade || 1).toFixed(2),
        valor_unitario_comercial: Number(unitPrice).toFixed(2),
        valor_bruto: Number(sale.valor_venda_final || 0).toFixed(2),
        unidade_tributavel: 'UN',
        quantidade_tributavel: Number(sale.quantidade || 1).toFixed(2),
        valor_unitario_tributavel: Number(unitPrice).toFixed(2),
        icms_situacao_tributaria: '102', // Simples Nacional (Sem crédito)
        icms_origem: '0'
      };
    });

    // 4. Montar destinatário com os dados cadastrais reais
    const destinatario = {
      nome: sales[0].cliente_nome || realClient?.nome || 'Cliente Franga Toys',
      cpf: realClient?.cpf ? realClient.cpf.replace(/\D/g, '') : '99999999999',
      telefone: sales[0].cliente_contato ? sales[0].cliente_contato.replace(/\D/g, '') : (realClient?.telefone ? realClient.telefone.replace(/\D/g, '') : undefined),
      logradouro: realClient?.logradouro || 'Av. Paulista',
      numero: realClient?.numero || '1000',
      bairro: realClient?.bairro || 'Bela Vista',
      municipio: realClient?.cidade || 'São Paulo',
      uf: realClient?.uf || 'SP',
      cep: realClient?.cep ? realClient.cep.replace(/\D/g, '') : '01310100'
    };

    const payload: FocusNFePayload = {
      cnpj_emitente: cnpjEmitente,
      inscricao_estadual_emitente: ieEmitente,
      natureza_operacao: 'Venda de mercadoria',
      tipo_documento: 1, // Saída
      presenca_comprador: 2, // Internet
      destino_operacao: ufDestinatario === 'SP' ? 1 : 2,
      consumidor_final: 1,
      finalidade_emissao: 1,
      dados_destinatario: destinatario,
      itens: itensNFe,
      valor_frete: Number(totalFrete).toFixed(2),
      valor_total: Number(totalGeral).toFixed(2),
      modalidade_frete: totalFrete > 0 ? 1 : 9 // 1 = Destinatário/Correios, 9 = Sem Frete/Retirada
    };

    const isMock = process.env.FOCUSNFE_MOCK !== 'false';
    
    // Se rodar localmente (localhost), força o uso do ambiente de homologação por segurança.
    const isLocalhost = process.env.NODE_ENV === 'development' || 
                        process.env.NEXT_PUBLIC_SITE_URL?.includes('localhost') ||
                        (typeof window !== 'undefined' && window.location.hostname === 'localhost');
                        
    const envMode = isLocalhost ? 'homologation' : (process.env.FOCUSNFE_ENVIRONMENT || 'homologation');
    const apiKey = envMode === 'production' 
      ? process.env.FOCUSNFE_API_KEY 
      : process.env.FOCUSNFE_HOMOLOGATION_KEY;
    const baseUrl = envMode === 'production'
      ? 'https://api.focusnfe.com.br/v2'
      : 'https://homologacao.focusnfe.com.br/v2';

    if (isMock || !apiKey) {
      // --- MOCK SIMULATION MODE ---
      // Generate a mock SEFAZ access key (44 digits)
      const randomDigits = Array.from({ length: 44 }, () => Math.floor(Math.random() * 10)).join('');
      
      // Update observacao of the first item of the sale
      const firstSale = sales[0];
      const newObs = `${firstSale.observacao || ''}\n[NF-e: Emitida (Simulada) | Chave: ${randomDigits}]`.trim();
      
      await supabase
        .from('vendas')
        .update({ observacao: newObs })
        .eq('id', firstSale.id);

      // Notify Telegram
      await sendTelegramAlert(
        `🧾 *[SIMULAÇÃO NF-e]*\n\n` +
        `✅ *Nota Fiscal Simulada com Sucesso!*\n` +
        `👤 *Cliente:* ${destinatario.nome}\n` +
        `💰 *Valor:* R$ ${totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
        `🔑 *Chave de Acesso:* \`${randomDigits}\`\n\n` +
        `*Nota:* Esta nota foi gerada em modo simulação (sem certificado digital).`
      );

      return { success: true, message: 'NF-e simulada com sucesso', chave: randomDigits };
    } else {
      // --- PRODUCTION MODE (Real API Call) ---
      const url = `${baseUrl}/nfe?ref=${checkoutId}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const resData = await response.json();

      if (response.ok && resData.status === 'autorizado') {
        const key = resData.chave_nfe;
        const firstSale = sales[0];
        const newObs = `${firstSale.observacao || ''}\n[NF-e: Autorizada | Chave: ${key}]`.trim();
        
        await supabase
          .from('vendas')
          .update({ observacao: newObs })
          .eq('id', firstSale.id);

        await sendTelegramAlert(
          `🧾 *[NF-e EMITIDA]*\n\n` +
          `✅ *Nota Fiscal Autorizada pela SEFAZ!*\n` +
          `👤 *Cliente:* ${destinatario.nome}\n` +
          `💰 *Valor:* R$ ${totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
          `🔑 *Chave de Acesso:* \`${key}\``
        );

        return { success: true, message: 'NF-e emitida e autorizada', chave: key };
      } else {
        const errorMsg = resData.mensagem || resData.errors?.[0]?.mensagem || 'Erro desconhecido da SEFAZ';
        console.error('FocusNFe Error:', resData);

        const firstSale = sales[0];
        const newObs = `${firstSale.observacao || ''}\n[NF-e: Falha na emissão (${errorMsg})]`.trim();
        
        await supabase
          .from('vendas')
          .update({ observacao: newObs })
          .eq('id', firstSale.id);

        await sendTelegramAlert(
          `⚠️ *[FALHA NF-e]*\n\n` +
          `❌ *Erro ao emitir nota para o checkout ${checkoutId}!*\n` +
          `👤 *Cliente:* ${destinatario.nome}\n` +
          `Detalhe do erro: _${errorMsg}_`
        );

        return { success: false, message: errorMsg };
      }
    }
  } catch (err: any) {
    console.error('emitirNFe error:', err);
    return { success: false, message: err.message || 'Erro interno na emissão' };
  }
}
