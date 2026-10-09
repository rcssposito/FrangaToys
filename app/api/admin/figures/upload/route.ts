import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { uploadFile } from '@/lib/storage';

function toCleanFileName(name: string) {
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

        // 1. Padronizar nome canônico sempre com extensão .webp
        const baseClean = toCleanFileName(figureName);
        const targetFileName = `${baseClean}_${index}.webp`;

        // 2. Pasta de destino padronizada por categoria
        const rawCategory = categoria.trim().toLowerCase();
        const validFolders = ['anime', 'games', 'marvel', 'dc', 'random'];
        const folder = validFolders.includes(rawCategory) ? rawCategory : 'random';

        // 3. Upload através da camada universal de storage (Cloudflare R2 ou ImageKit)
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const result = await uploadFile({
            buffer,
            folder,
            fileName: targetFileName,
            contentType: 'image/webp',
        });

        return NextResponse.json({
            success: true,
            provider: result.provider,
            url: result.url,
            fileName: targetFileName,
            filePath: result.path,
        });
    } catch (err: any) {
        console.error('Erro no upload de foto da figura:', err);
        return NextResponse.json({ error: err.message || 'Falha interna no upload' }, { status: 500 });
    }
}
