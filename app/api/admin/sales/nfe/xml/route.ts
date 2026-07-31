import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { supabaseAdmin as supabase } from '@/lib/supabase';

function getFormattedDate(): string {
  const date = new Date();
  const tzOffset = -date.getTimezoneOffset();
  const diff = tzOffset >= 0 ? '+' : '-';
  const pad = (num: number) => String(num).padStart(2, '0');
  
  return date.getFullYear() +
    '-' + pad(date.getMonth() + 1) +
    '-' + pad(date.getDate()) +
    'T' + pad(date.getHours()) +
    ':' + pad(date.getMinutes()) +
    ':' + pad(date.getSeconds()) +
    diff + pad(Math.floor(Math.abs(tzOffset) / 60)) +
    ':' + pad(Math.abs(tzOffset) % 60);
}

export async function GET(req: NextRequest) {
  try {
    const sessionOrResponse = await requireRoles(['admin', 'sales', 'finance']);
    if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

    const { searchParams } = new URL(req.url);
    const checkoutId = searchParams.get('checkout_id');

    if (checkoutId) {
      const { data: existingRecord } = await supabase
        .from('registros_nfe')
        .select('numero_nfe')
        .eq('checkout_id', checkoutId)
        .maybeSingle();

      if (existingRecord) {
        return NextResponse.json({ nextNfeNumber: existingRecord.numero_nfe, alreadyAssigned: true });
      }
    }

    const { data: maxRecord, error } = await supabase
      .from('registros_nfe')
      .select('numero_nfe')
      .order('numero_nfe', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    let nextNfeNumber = 2; 
    if (maxRecord) {
      nextNfeNumber = maxRecord.numero_nfe + 1;
    } else {
      const { data: salesWithKeys } = await supabase
        .from('vendas')
        .select('chave_nfe')
        .not('chave_nfe', 'is', null);

      if (salesWithKeys && salesWithKeys.length > 0) {
        let maxNum = 0;
        for (const s of salesWithKeys) {
            if (s.chave_nfe && s.chave_nfe.length === 44) {
                const numStr = s.chave_nfe.slice(25, 34);
                const num = parseInt(numStr, 10);
                if (!isNaN(num) && num > maxNum) {
                    maxNum = num;
                }
            }
        }
        if (maxNum >= 1) {
            nextNfeNumber = maxNum + 1;
        }
      }
    }

    return NextResponse.json({ nextNfeNumber, alreadyAssigned: false });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionOrResponse = await requireRoles(['admin', 'sales', 'finance']);
    if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

    const body = await req.json();
    const { 
      checkout_id, 
      sale_id,
      nome, 
      cpf, 
      cep, 
      logradouro, 
      numero, 
      complemento,
      bairro, 
      cidade, 
      uf
    } = body;

    let finalCheckoutId = checkout_id;

    if (!finalCheckoutId && sale_id) {
        const { data: sale } = await supabase
            .from('vendas')
            .select('checkout_id')
            .eq('id', Number(sale_id))
            .maybeSingle();
        
        if (sale && sale.checkout_id) {
            finalCheckoutId = sale.checkout_id;
        } else {
            const dummyId = `MAN_${sale_id}`;
            await supabase
                .from('vendas')
                .update({ checkout_id: dummyId })
                .eq('id', Number(sale_id));
            finalCheckoutId = dummyId;
        }
    }

    if (!finalCheckoutId) {
        return NextResponse.json({ error: 'Checkout ID não encontrado para esta venda' }, { status: 400 });
    }

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
        figura_id,
        link_pagamento,
        figuras (
          nome,
          codigo
        )
      `)
      .eq('checkout_id', finalCheckoutId);

    if (salesError || !sales || sales.length === 0) {
      return NextResponse.json({ error: 'Nenhuma venda encontrada para este checkout' }, { status: 404 });
    }

    const cnpjEmitente = (process.env.NEXT_PUBLIC_CNPJ || '67.566.499/0001-70').replace(/\D/g, '');
    const ieEmitente = (process.env.NEXT_PUBLIC_INSCRICAO_ESTADUAL || '160.422.603.112').replace(/\D/g, '');

    const totalFrete = sales[0].valor_frete || 0;
    const totalItens = sales.reduce((acc, s) => acc + (s.valor_venda_final || 0), 0);
    const totalGeral = totalItens + totalFrete;

    const ufDestinatario = uf || 'SP';
    const cfop = ufDestinatario === 'SP' ? '5102' : '6102'; // CFOP correto para MEI (CRT=4)

    const itensNFe = sales.map((sale: any, idx: number) => {
      const fig = sale.figuras;
      const unitPrice = (sale.valor_venda_final || 0) / (sale.quantidade || 1);
      return {
        numero_item: String(idx + 1),
        codigo_produto: (fig?.codigo || `FIG${sale.figura_id}`).replace(/[^a-zA-Z0-9]/g, '').slice(0, 60) || 'PROD01',
        descricao: fig?.nome || 'Figura Personalizada',
        codigo_ncm: '95030099', 
        cfop: cfop,
        unidade_comercial: 'UN',
        quantidade_comercial: Number(sale.quantidade || 1).toFixed(4),
        valor_unitario_comercial: Number(unitPrice).toFixed(10),
        valor_bruto: Number(sale.valor_venda_final || 0).toFixed(2),
        unidade_tributavel: 'UN',
        quantidade_tributavel: Number(sale.quantidade || 1).toFixed(4),
        valor_unitario_tributavel: Number(unitPrice).toFixed(10),
        icms_situacao_tributaria: '102', 
        icms_origem: '0',
        pis_situacao_tributaria: '49',
        cofins_situacao_tributaria: '49'
      };
    });

    const cleanCpfCnpj = (cpf || '99999999999').replace(/\D/g, '');
    const isCnpj = cleanCpfCnpj.length === 14;

    // Buscar código IBGE do município via ViaCEP de forma síncrona/dinâmica
    let ibgeCodigo = '3550308'; // Default: São Paulo
    const cleanCep = (cep || '01310100').replace(/\D/g, '');
    if (cleanCep.length === 8) {
      try {
        const viaCepRes = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        if (viaCepRes.ok) {
          const viaCepData = await viaCepRes.json();
          if (viaCepData && viaCepData.ibge) {
            ibgeCodigo = viaCepData.ibge;
          }
        }
      } catch (err) {
        console.error('ViaCEP fetch error in NFe XML:', err);
      }
    }

    const tPagMap: Record<string, string> = {
      'pix': '17',
      'card': '03',
      'boleto': '15'
    };
    const metodoPagamento = sales[0].link_pagamento ? 'card' : 'pix';
    const tPag = tPagMap[metodoPagamento] || '15';

    // 2. Travar ou inserir número sequencial de forma segura
    let numeroNfe = 2;

    const { data: existingRecord } = await supabase
      .from('registros_nfe')
      .select('numero_nfe')
      .eq('checkout_id', finalCheckoutId)
      .maybeSingle();

    if (existingRecord) {
      numeroNfe = existingRecord.numero_nfe;
    } else {
      let attempts = 0;
      let inserted = false;
      while (attempts < 5 && !inserted) {
        attempts++;
        const { data: maxRecord } = await supabase
          .from('registros_nfe')
          .select('numero_nfe')
          .order('numero_nfe', { ascending: false })
          .limit(1)
          .maybeSingle();

        let nextNum = 2; 
        if (maxRecord) {
          nextNum = maxRecord.numero_nfe + 1;
        } else {
          const { data: salesWithKeys } = await supabase
            .from('vendas')
            .select('chave_nfe')
            .not('chave_nfe', 'is', null);

          if (salesWithKeys && salesWithKeys.length > 0) {
            let maxNum = 0;
            for (const s of salesWithKeys) {
              if (s.chave_nfe && s.chave_nfe.length === 44) {
                const numStr = s.chave_nfe.slice(25, 34);
                const num = parseInt(numStr, 10);
                if (!isNaN(num) && num > maxNum) {
                  maxNum = num;
                }
              }
            }
            if (maxNum >= 1) {
              nextNum = maxNum + 1;
            }
          }
        }

        const { error: insertError } = await supabase
          .from('registros_nfe')
          .insert([{
            numero_nfe: nextNum,
            checkout_id: finalCheckoutId,
            cliente_nome: nome || sales[0].cliente_nome || 'Cliente Franga Toys',
            valor_total: totalGeral,
            status: 'rascunho'
          }]);

        if (!insertError) {
          numeroNfe = nextNum;
          inserted = true;
        } else {
          if (insertError.code !== '23505') {
            throw insertError;
          }
        }
      }

      if (!inserted) {
        throw new Error('Falha ao reservar um número sequencial único para esta NF-e após várias tentativas.');
      }
    }

    const payload = {
      cnpj_emitente: cnpjEmitente,
      inscricao_estadual_emitente: ieEmitente,
      natureza_operacao: 'Venda de mercadoria produzida pelo estabelecimento',
      tipo_documento: 1, 
      presenca_comprador: 2, 
      destino_operacao: ufDestinatario === 'SP' ? 1 : 2,
      consumidor_final: 1,
      finalidade_emissao: 1,
      data_emissao: getFormattedDate(),
      nome_destinatario: nome || sales[0].cliente_nome || 'Cliente Franga Toys',
      [isCnpj ? 'cnpj_destinatario' : 'cpf_destinatario']: cleanCpfCnpj,
      telefone_destinatario: sales[0].cliente_contato ? sales[0].cliente_contato.replace(/\D/g, '') : undefined,
      logradouro_destinatario: logradouro || 'Av. Paulista',
      numero_destinatario: numero || '1000',
      complemento_destinatario: complemento || undefined,
      bairro_destinatario: bairro || 'Bela Vista',
      municipio_destinatario: cidade || 'São Paulo',
      uf_destinatario: ufDestinatario,
      cep_destinatario: cleanCep,
      itens: itensNFe,
      valor_frete: Number(totalFrete).toFixed(2),
      valor_total: Number(totalGeral).toFixed(2),
      modalidade_frete: totalFrete > 0 ? 1 : 9,
      numero_nfe: numeroNfe,
      t_pag: tPag,
      ibge_codigo: ibgeCodigo
    };

    // Gerar XML NF-e v4.00
    const ufMap: Record<string, string> = {
      'AC': '12', 'AL': '27', 'AP': '16', 'AM': '13', 'BA': '29', 'CE': '23', 'DF': '53', 'ES': '32', 'GO': '52',
      'MA': '21', 'MT': '51', 'MS': '50', 'MG': '31', 'PA': '15', 'PB': '25', 'PR': '41', 'PE': '26', 'PI': '22',
      'RJ': '33', 'RN': '24', 'RS': '43', 'RO': '11', 'RR': '14', 'SC': '42', 'SP': '35', 'SE': '28', 'TO': '17'
    };

    const cUF = ufMap[payload.uf_destinatario] || '35';
    const now = new Date();
    const aamm = String(now.getFullYear()).slice(-2) + String(now.getMonth() + 1).padStart(2, '0');
    const dummyCNPJ = payload.cnpj_emitente.padEnd(14, '0').slice(0, 14);
    const cNF = String(Math.floor(10000000 + Math.random() * 90000000));
    const dummyAccessKey = `${cUF}${aamm}${dummyCNPJ}55001${String(payload.numero_nfe).padStart(9, '0')}1${cNF}`;
    
    let sum = 0;
    let multiplier = 2;
    for (let i = dummyAccessKey.length - 1; i >= 0; i--) {
      sum += Number(dummyAccessKey[i]) * multiplier;
      multiplier = multiplier === 9 ? 2 : multiplier + 1;
    }
    const remainder = sum % 11;
    const cDV = remainder < 2 ? 0 : 11 - remainder;
    const finalKey = `${dummyAccessKey}${cDV}`;

    const formatXmlString = (str: string) => {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    const itemsXml = payload.itens.map((item: any, index: number) => {
      return `
    <det nItem="${index + 1}">
      <prod>
        <cProd>${formatXmlString(item.codigo_produto)}</cProd>
        <cEAN>SEM GTIN</cEAN>
        <xProd>${formatXmlString(item.descricao)}</xProd>
        <NCM>${item.codigo_ncm}</NCM>
        <CFOP>${item.cfop}</CFOP>
        <uCom>${item.unidade_comercial}</uCom>
        <qCom>${Number(item.quantidade_comercial).toFixed(4)}</qCom>
        <vUnCom>${Number(item.valor_unitario_comercial).toFixed(10)}</vUnCom>
        <vProd>${Number(item.valor_bruto).toFixed(2)}</vProd>
        <cEANTrib>SEM GTIN</cEANTrib>
        <uTrib>${item.unidade_tributavel}</uTrib>
        <qTrib>${Number(item.quantidade_tributavel).toFixed(4)}</qTrib>
        <vUnTrib>${Number(item.valor_unitario_tributavel).toFixed(10)}</vUnTrib>
        <indTot>1</indTot>
      </prod>
      <imposto>
        <ICMS>
          <ICMSSN102>
            <orig>${item.icms_origem || '0'}</orig>
            <CSOSN>${item.icms_situacao_tributaria || '102'}</CSOSN>
          </ICMSSN102>
        </ICMS>
        <PIS>
          <PISOutr>
            <CST>${item.pis_situacao_tributaria || '49'}</CST>
            <vBC>0.00</vBC>
            <pPIS>0.0000</pPIS>
            <vPIS>0.00</vPIS>
          </PISOutr>
        </PIS>
        <COFINS>
          <COFINSOutr>
            <CST>${item.cofins_situacao_tributaria || '49'}</CST>
            <vBC>0.00</vBC>
            <pCOFINS>0.0000</pCOFINS>
            <vCOFINS>0.00</vCOFINS>
          </COFINSOutr>
        </COFINS>
      </imposto>
    </det>`;
    }).join('');

    const destCpfCnpjTag = isCnpj 
      ? `<CNPJ>${cleanCpfCnpj}</CNPJ>` 
      : `<CPF>${cleanCpfCnpj}</CPF>`;

    const destIETag = '';

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="NFe${finalKey}" versao="4.00">
    <ide>
      <cUF>${cUF}</cUF>
      <cNF>${cNF}</cNF>
      <natOp>${formatXmlString(payload.natureza_operacao)}</natOp>
      <mod>55</mod>
      <serie>1</serie>
      <nNF>${payload.numero_nfe}</nNF>
      <dhEmi>${payload.data_emissao}</dhEmi>
      <tpNF>${payload.tipo_documento}</tpNF>
      <idDest>${payload.destino_operacao}</idDest>
      <cMunFG>3550308</cMunFG>
      <tpImp>1</tpImp>
      <tpEmis>1</tpEmis>
      <cDV>${cDV}</cDV>
      <tpAmb>1</tpAmb>
      <finNFe>1</finNFe>
      <indFinal>1</indFinal>
      <indPres>${payload.presenca_comprador}</indPres>
      <procEmi>0</procEmi>
      <verProc>FrangaToys v1.0</verProc>
    </ide>
    <emit>
      <CNPJ>${payload.cnpj_emitente}</CNPJ>
      <xNome>67.566.499 BIANCA MACHADO MASTROCOLLO</xNome>
      <xFant>Franga Toys</xFant>
      <enderEmit>
        <xLgr>Rua Catanduvas do Sul</xLgr>
        <nro>459 A</nro>
        <xBairro>Jardim Primavera (Zona Norte)</xBairro>
        <cMun>3550308</cMun>
        <xMun>São Paulo</xMun>
        <UF>SP</UF>
        <CEP>02755090</CEP>
        <cPais>1058</cPais>
        <xPais>BRASIL</xPais>
        <fone>11988781670</fone>
      </enderEmit>
      <IE>${payload.inscricao_estadual_emitente}</IE>
      <CRT>4</CRT>
    </emit>
    <dest>
      ${destCpfCnpjTag}
      <xNome>${formatXmlString(payload.nome_destinatario)}</xNome>
      <enderDest>
        <xLgr>${formatXmlString(payload.logradouro_destinatario)}</xLgr>
        <nro>${formatXmlString(payload.numero_destinatario)}</nro>
        ${payload.complemento_destinatario ? `<xCpl>${formatXmlString(payload.complemento_destinatario)}</xCpl>` : ''}
        <xBairro>${formatXmlString(payload.bairro_destinatario)}</xBairro>
        <cMun>${payload.ibge_codigo}</cMun>
        <xMun>${formatXmlString(payload.municipio_destinatario)}</xMun>
        <UF>${payload.uf_destinatario}</UF>
        <CEP>${payload.cep_destinatario}</CEP>
        <cPais>1058</cPais>
        <xPais>BRASIL</xPais>
        ${payload.telefone_destinatario ? `<fone>${payload.telefone_destinatario}</fone>` : ''}
      </enderDest>
      <indIEDest>9</indIEDest>
      ${destIETag}
    </dest>
    ${itemsXml}
    <total>
      <ICMSTot>
        <vBC>0.00</vBC>
        <vICMS>0.00</vICMS>
        <vICMSDeson>0.00</vICMSDeson>
        <vFCP>0.00</vFCP>
        <vBCST>0.00</vBCST>
        <vST>0.00</vST>
        <vFCPST>0.00</vFCPST>
        <vFCPSTRet>0.00</vFCPSTRet>
        <vProd>${payload.itens.reduce((acc: number, item: any) => acc + Number(item.valor_bruto), 0).toFixed(2)}</vProd>
        <vFrete>${Number(payload.valor_frete).toFixed(2)}</vFrete>
        <vSeg>0.00</vSeg>
        <vDesc>0.00</vDesc>
        <vII>0.00</vII>
        <vIPI>0.00</vIPI>
        <vIPIDevol>0.00</vIPIDevol>
        <vPIS>0.00</vPIS>
        <vCOFINS>0.00</vCOFINS>
        <vOutro>0.00</vOutro>
        <vNF>${Number(payload.valor_total).toFixed(2)}</vNF>
      </ICMSTot>
    </total>
    <transp>
      <modFrete>${payload.modalidade_frete}</modFrete>
    </transp>
    <pag>
      <detPag>
        <indPag>0</indPag>
        <tPag>${payload.t_pag}</tPag>
        <vPag>${Number(payload.valor_total).toFixed(2)}</vPag>
      </detPag>
    </pag>
    <infAdic>
      <infCpl>Referente ao pedido #${sales[0].id}</infCpl>
    </infAdic>
  </infNFe>
</NFe>`;

    return new NextResponse(xml.trim(), {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Content-Disposition': `attachment; filename="NFe-${payload.numero_nfe}.xml"`
      }
    });

  } catch (error: any) {
    console.error('XML Generation Error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao gerar XML' }, { status: 500 });
  }
}
