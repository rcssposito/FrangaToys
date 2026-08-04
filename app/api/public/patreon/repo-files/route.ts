import { NextRequest, NextResponse } from 'next/server';
import { listGoogleDriveFolderFiles } from '@/lib/integrations/gdrive';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const folderUrl = searchParams.get('url') || '';

        if (!folderUrl) {
            return NextResponse.json({ files: [] });
        }

        const files = await listGoogleDriveFolderFiles(folderUrl);

        return NextResponse.json({ files });
    } catch (error: any) {
        console.error('Erro ao listar arquivos do repositório Google Drive:', error);
        return NextResponse.json({ files: [], error: error.message }, { status: 500 });
    }
}
