import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';

function toImageKitFileName(name: string) {
    return name
        .trim()
        .replace(/[^\w-]/g, '_')
        .replace(/_+/g, '_');
}

export async function POST(req: NextRequest) {
    try {
        const sessionOrResponse = await requireRoles(['admin']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const figureName = (formData.get('figureName') as string) || '';
        const categoria = (formData.get('categoria') as string) || 'Random';
        const index = formData.get('index') ? Number(formData.get('index')) : 2;

        if (!file || !figureName) {
            return NextResponse.json({ error: 'Arquivo e nome da figura são obrigatórios' }, { status: 400 });
        }

        const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
        if (!privateKey) {
            return NextResponse.json({ error: 'IMAGEKIT_PRIVATE_KEY não configurada' }, { status: 500 });
        }

        // 1. Padronizar nome canônico sempre com extensão .webp
        const baseClean = toImageKitFileName(figureName);
        const targetFileName = `${baseClean}_${index}.webp`;

        // 3. Pasta de destino padronizada por categoria
        const rawCategory = categoria.trim().toLowerCase();
        const validFolders = ['anime', 'games', 'marvel', 'dc', 'random'];
        const folder = validFolders.includes(rawCategory) ? `/${rawCategory}` : '/random';

        // 4. Preparar payload para a API do ImageKit
        const arrayBuffer = await file.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString('base64');

        const ikPayload = new URLSearchParams();
        ikPayload.append('file', base64Data);
        ikPayload.append('fileName', targetFileName);
        ikPayload.append('folder', folder);
        ikPayload.append('useUniqueFileName', 'false');

        const authHeader = `Basic ${Buffer.from(`${privateKey}:`).toString('base64')}`;

        const uploadRes = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
            method: 'POST',
            headers: {
                Authorization: authHeader,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: ikPayload.toString()
        });

        if (!uploadRes.ok) {
            const errText = await uploadRes.text();
            console.error('ImageKit upload error:', uploadRes.status, errText);
            return NextResponse.json({ error: `Erro no upload do ImageKit (${uploadRes.status}): ${errText}` }, { status: 502 });
        }

        const ikData = await uploadRes.json();
        const rawUrl = (ikData.url || '').split('?')[0];
        const finalUrl = `${rawUrl}?tr=w-500,q-80,f-auto`;

        return NextResponse.json({
            success: true,
            url: finalUrl,
            fileName: targetFileName,
            filePath: ikData.filePath
        });
    } catch (error: any) {
        console.error('Erro no upload de imagem de figura:', error);
        return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
    }
}
