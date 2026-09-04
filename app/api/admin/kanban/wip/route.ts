import { NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { supabaseAdmin as supabase } from '@/lib/supabase';

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

        const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
        if (!privateKey) {
            return NextResponse.json({ error: 'Chave do ImageKit não configurada no servidor' }, { status: 500 });
        }

        // 1. Upload para o ImageKit
        const auth = Buffer.from(`${privateKey}:`).toString('base64');
        const uploadFormData = new FormData();
        uploadFormData.append('file', file);
        uploadFormData.append('fileName', `wip_${saleId}_${Date.now()}`);
        uploadFormData.append('folder', '/wip');
        uploadFormData.append('useUniqueFileName', 'true');

        const uploadRes = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
            method: 'POST',
            headers: {
                Authorization: `Basic ${auth}`
            },
            body: uploadFormData
        });

        if (!uploadRes.ok) {
            const errText = await uploadRes.text();
            console.error('ImageKit Upload Error:', errText);
            return NextResponse.json({ error: 'Falha ao enviar imagem para o ImageKit' }, { status: 500 });
        }

        const uploadData = await uploadRes.json();
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
