import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const sessionOrResponse = await requireRoles(['admin', 'sales', 'finance', 'production', 'painter', 'orcamento']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const { searchParams } = new URL(req.url);
        const queryTerm = searchParams.get('q')?.trim() || '';
        const includeCompleted = searchParams.get('includeCompleted') === 'true';
        const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10), 50);

        let query = supabase
            .from('vendas')
            .select(`
                id,
                checkout_id,
                access_token,
                data_venda,
                cliente_id,
                cliente_nome,
                cliente_contato,
                valor_venda_final,
                valor_frete,
                metodo_entrega,
                chave_nfe,
                quantidade,
                observacao,
                status,
                vendedor,
                pintor_nome,
                data_conclusao,
                figura_id,
                figuras (
                    id,
                    nome,
                    codigo,
                    imagem_url,
                    studios (
                        id,
                        nome
                    ),
                    figuras_meta (
                        altura_cm,
                        largura_cm,
                        profundidade_cm,
                        resina_kg,
                        horas_impressao,
                        horas_pintura
                    )
                )
            `)
            .order('data_venda', { ascending: false })
            .limit(limit);

        // Por padrão, traz SOMENTE pedidos não finalizados (ativos no Kanban / em produção / prontos para entrega)
        if (!includeCompleted) {
            query = query.neq('status', 'Concluída').is('data_conclusao', null);
        }

        if (queryTerm) {
            // Se for número puro, tenta casar com id da venda
            if (/^\d+$/.test(queryTerm)) {
                query = query.or(`id.eq.${queryTerm},cliente_nome.ilike.%${queryTerm}%,cliente_contato.ilike.%${queryTerm}%,checkout_id.ilike.%${queryTerm}%`);
            } else {
                query = query.or(`cliente_nome.ilike.%${queryTerm}%,cliente_contato.ilike.%${queryTerm}%,checkout_id.ilike.%${queryTerm}%`);
            }
        }

        const { data: sales, error: salesErr } = await query;
        if (salesErr) throw salesErr;

        if (!sales || sales.length === 0) {
            return NextResponse.json({ sales: [] });
        }

        // Buscar dados completos dos clientes vinculados
        const clientIds = Array.from(new Set(sales.map((s: any) => s.cliente_id).filter(Boolean)));
        let clientsMap = new Map<number, any>();

        if (clientIds.length > 0) {
            const { data: clients, error: clientErr } = await supabase
                .from('clientes')
                .select('*')
                .in('id', clientIds);

            if (!clientErr && clients) {
                clients.forEach((c: any) => clientsMap.set(c.id, c));
            }
        }

        // Agrupar itens por checkout_id (ou id avulso) para vendas com múltiplos itens
        const formatted = sales.map((sale: any) => {
            const client = sale.cliente_id ? clientsMap.get(sale.cliente_id) : null;
            const fig = Array.isArray(sale.figuras) ? sale.figuras[0] : sale.figuras;
            const studio = Array.isArray(fig?.studios) ? fig.studios[0] : fig?.studios;
            const meta = Array.isArray(fig?.figuras_meta) ? fig.figuras_meta[0] : fig?.figuras_meta;

            const totalItem = Number(sale.valor_venda_final || 0);
            const totalFrete = Number(sale.valor_frete || 0);
            const valorTotal = totalItem + totalFrete;

            return {
                id: sale.id,
                checkout_id: sale.checkout_id || `VENDA_${sale.id}`,
                access_token: sale.access_token || null,
                data_venda: sale.data_venda,
                metodo_entrega: sale.metodo_entrega || 'entrega_propria',
                status: sale.status || 'Em Produção',
                vendedor: sale.vendedor || 'Ateliê',
                pintor_nome: sale.pintor_nome || 'Ateliê',
                chave_nfe: sale.chave_nfe || null,
                figura_nome: fig?.nome || 'Figura Personalizada',
                figura_codigo: fig?.codigo || null,
                figura_imagem: fig?.imagem_url || null,
                studio_nome: studio?.nome || 'Franga Toys Studio',
                altura_cm: meta?.altura_cm || null,
                largura_cm: meta?.largura_cm || null,
                profundidade_cm: meta?.profundidade_cm || null,
                resina_kg: meta?.resina_kg || null,
                horas_impressao: meta?.horas_impressao || null,
                horas_pintura: meta?.horas_pintura || null,
                quantidade: sale.quantidade || 1,
                observacao: sale.observacao || '',
                valor_total: valorTotal,
                cliente: {
                    id: client?.id || sale.cliente_id || null,
                    nome: client?.nome || sale.cliente_nome || 'Cliente Franga Toys',
                    telefone: client?.telefone || sale.cliente_contato || '',
                    cpf: client?.cpf || '',
                    cep: client?.cep || '',
                    logradouro: client?.logradouro || '',
                    numero: client?.numero || '',
                    complemento: client?.complemento || '',
                    bairro: client?.bairro || '',
                    cidade: client?.cidade || '',
                    uf: client?.uf || 'SP'
                }
            };
        });

        return NextResponse.json({ sales: formatted });
    } catch (err: any) {
        console.error('Erro ao buscar vendas para etiquetas:', err);
        return NextResponse.json({ error: err.message || 'Falha ao buscar vendas' }, { status: 500 });
    }
}
