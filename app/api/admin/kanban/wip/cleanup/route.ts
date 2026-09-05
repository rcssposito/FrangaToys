import { NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { supabaseAdmin as supabase } from '@/lib/supabase';

const RETENTION_DAYS = 15;

/**
 * GET: Consulta o status de retenção das fotos WIP de pedidos concluídos.
 * Retorna quantas fotos estão elegíveis para limpeza (> 15 dias) e quantas ainda estão no período de tolerância.
 */
export async function GET() {
    try {
        const sessionOrResponse = await requireRoles(['admin', 'sales', 'production', 'painter']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const now = new Date();
        const cutoffTime = new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

        // Buscar todas as vendas concluídas que ainda possuem fotos WIP
        const { data: sales, error } = await supabase
            .from('vendas')
            .select('id, cliente_nome, status, data_venda, data_conclusao, wip_fotos')
            .eq('status', 'Concluída')
            .not('wip_fotos', 'is', null);

        if (error) throw error;

        const completedWithWip = (sales || []).filter(s => Array.isArray(s.wip_fotos) && s.wip_fotos.length > 0);

        const eligibleOrders: any[] = [];
        const inGracePeriodOrders: any[] = [];
        let eligiblePhotosCount = 0;
        let gracePhotosCount = 0;

        for (const sale of completedWithWip) {
            const completionDate = sale.data_conclusao ? new Date(sale.data_conclusao) : (sale.data_venda ? new Date(sale.data_venda) : now);
            const photoCount = sale.wip_fotos.length;

            if (completionDate <= cutoffTime) {
                eligibleOrders.push({
                    id: sale.id,
                    cliente_nome: sale.cliente_nome,
                    data_conclusao: sale.data_conclusao || sale.data_venda,
                    photoCount
                });
                eligiblePhotosCount += photoCount;
            } else {
                const daysRemaining = Math.max(0, Math.ceil((completionDate.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000 - now.getTime()) / (24 * 60 * 60 * 1000)));
                inGracePeriodOrders.push({
                    id: sale.id,
                    cliente_nome: sale.cliente_nome,
                    data_conclusao: sale.data_conclusao || sale.data_venda,
                    photoCount,
                    daysRemaining
                });
                gracePhotosCount += photoCount;
            }
        }

        return NextResponse.json({
            retentionDays: RETENTION_DAYS,
            eligibleOrdersCount: eligibleOrders.length,
            eligiblePhotosCount,
            eligibleOrders,
            inGracePeriodOrdersCount: inGracePeriodOrders.length,
            gracePhotosCount,
            inGracePeriodOrders
        });
    } catch (err: any) {
        console.error('WIP Cleanup Status Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * POST: Executa a faxina das fotos WIP com mais de 15 dias de conclusão no ImageKit e limpa o campo no Supabase.
 */
export async function POST(req: Request) {
    try {
        const sessionOrResponse = await requireRoles(['admin', 'sales', 'production']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
        const now = new Date();
        const cutoffTime = new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

        // Opcional: permitir limpar um pedido específico ou todos elegíveis
        let targetSaleId: number | null = null;
        try {
            const body = await req.json();
            if (body && body.saleId) targetSaleId = Number(body.saleId);
        } catch {
            // body vazio é ok
        }

        let query = supabase
            .from('vendas')
            .select('id, cliente_nome, status, data_venda, data_conclusao, wip_fotos')
            .eq('status', 'Concluída')
            .not('wip_fotos', 'is', null);

        if (targetSaleId) {
            query = query.eq('id', targetSaleId);
        }

        const { data: sales, error } = await query;
        if (error) throw error;

        const completedWithWip = (sales || []).filter(s => Array.isArray(s.wip_fotos) && s.wip_fotos.length > 0);

        const ordersToClean = targetSaleId 
            ? completedWithWip 
            : completedWithWip.filter(sale => {
                const completionDate = sale.data_conclusao ? new Date(sale.data_conclusao) : (sale.data_venda ? new Date(sale.data_venda) : now);
                return completionDate <= cutoffTime;
            });

        let totalDeletedPhotos = 0;
        let totalCleanedOrders = 0;
        const auth = privateKey ? Buffer.from(`${privateKey}:`).toString('base64') : null;

        for (const order of ordersToClean) {
            const photos = order.wip_fotos || [];
            
            // 1. Deletar arquivos do ImageKit se tiverem file_id
            if (auth) {
                const deletePromises = photos
                    .filter((p: any) => p.file_id)
                    .map((p: any) => 
                        fetch(`https://api.imagekit.io/v1/files/${p.file_id}`, {
                            method: 'DELETE',
                            headers: { Authorization: `Basic ${auth}` }
                        }).catch(e => {
                            console.error(`Falha ao excluir arquivo ${p.file_id} do ImageKit:`, e);
                            return null;
                        })
                    );

                await Promise.allSettled(deletePromises);
            }

            // 2. Limpar campo wip_fotos na venda do Supabase
            const { error: updateErr } = await supabase
                .from('vendas')
                .update({ wip_fotos: [] })
                .eq('id', order.id);

            if (!updateErr) {
                totalCleanedOrders++;
                totalDeletedPhotos += photos.length;
            }
        }

        return NextResponse.json({
            success: true,
            cleanedOrdersCount: totalCleanedOrders,
            deletedPhotosCount: totalDeletedPhotos,
            message: `${totalDeletedPhotos} foto(s) de ${totalCleanedOrders} pedido(s) concluído(s) foram excluídas do ImageKit.`
        });
    } catch (err: any) {
        console.error('WIP Cleanup Execution Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
