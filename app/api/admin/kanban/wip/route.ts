import { NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { uploadFile } from '@/lib/storage';

export async function POST(req: Request) {
    try {
        const sessionOrResponse = await requireRoles(['admin', 'sales', 'production', 'painter']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const saleId = formData.get('saleId') as string | null;
        const caption = (formData.get('caption') as string | null) || '';

        if (!file || !saleId) {
            return NextResponse.json({ error: 'Arquivo e ID do pedido são obrigatórios' }, { status: 400 });
        }

        // 1. Upload universal (Cloudflare R2 ou ImageKit)
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const fileName = `wip_${saleId}_${Date.now()}.webp`;

        const uploadData = await uploadFile({
            buffer,
            folder: 'wip',
            fileName,
            contentType: file.type || 'image/webp',
        });
        const photoUrl = uploadData.url;

        // 2. Buscar fotos WIP atuais da venda
        const { data: sale, error: fetchErr } = await supabase
            .from('vendas')
            .select('wip_fotos')
            .eq('id', Number(saleId))
            .single();

        if (fetchErr || !sale) {
            return NextResponse.json({ error: 'Venda não encontrada' }, { status: 404 });
        }

        const currentWip = Array.isArray(sale.wip_fotos) ? sale.wip_fotos : [];
        const newPhotoItem = {
            id: `wip_${Date.now()}`,
            url: photoUrl,
            file_id: uploadData.fileId,
            caption: caption.trim(),
            created_at: new Date().toISOString()
        };

        const updatedWip = [...currentWip, newPhotoItem];

        // 3. Atualizar venda no Supabase
        const { error: updateErr } = await supabase
            .from('vendas')
            .update({ wip_fotos: updatedWip })
            .eq('id', Number(saleId));

        if (updateErr) throw updateErr;

        return NextResponse.json({ success: true, wip_fotos: updatedWip });
    } catch (err: any) {
        console.error('WIP Post Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const sessionOrResponse = await requireRoles(['admin', 'sales', 'production', 'painter']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const { saleId, photoId } = await req.json();
        if (!saleId || !photoId) {
            return NextResponse.json({ error: 'saleId e photoId são obrigatórios' }, { status: 400 });
        }

        const { data: sale, error: fetchErr } = await supabase
            .from('vendas')
            .select('wip_fotos')
            .eq('id', Number(saleId))
            .single();

        if (fetchErr || !sale) {
            return NextResponse.json({ error: 'Venda não encontrada' }, { status: 404 });
        }

        const currentWip = Array.isArray(sale.wip_fotos) ? sale.wip_fotos : [];
        const photoToDelete = currentWip.find((p: any) => p.id === photoId || p.url === photoId);
        const updatedWip = currentWip.filter((p: any) => p.id !== photoId && p.url !== photoId);

        // Deletar do ImageKit se file_id existir
        if (photoToDelete?.file_id && process.env.IMAGEKIT_PRIVATE_KEY) {
            const auth = Buffer.from(`${process.env.IMAGEKIT_PRIVATE_KEY}:`).toString('base64');
            fetch(`https://api.imagekit.io/v1/files/${photoToDelete.file_id}`, {
                method: 'DELETE',
                headers: { Authorization: `Basic ${auth}` }
            }).catch(e => console.error('Error deleting WIP file from ImageKit:', e));
        }

        const { error: updateErr } = await supabase
            .from('vendas')
            .update({ wip_fotos: updatedWip })
            .eq('id', Number(saleId));

        if (updateErr) throw updateErr;

        return NextResponse.json({ success: true, wip_fotos: updatedWip });
    } catch (err: any) {
        console.error('WIP Delete Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
