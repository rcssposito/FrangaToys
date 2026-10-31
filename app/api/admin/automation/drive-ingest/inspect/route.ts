import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { inspectDriveFolder, formatBytes } from '@/lib/integrations/drive-downloader';

export async function GET(req: NextRequest) {
    try {
        const sessionOrResponse = await requireRoles(['admin']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const { searchParams } = new URL(req.url);
        const folderId = searchParams.get('folderId');
        const destFolder = searchParams.get('destFolder') || undefined;
        const studioName = searchParams.get('studioName') || undefined;
        const isArchiveFile = searchParams.get('isArchiveFile') === 'true';

        if (!folderId) {
            return NextResponse.json({ error: 'ID da pasta não fornecido' }, { status: 400 });
        }

        const result = await inspectDriveFolder(folderId, destFolder, studioName, isArchiveFile);

        return NextResponse.json({
            success: true,
            hasSubfolders: result.hasSubfolders,
            totalFiles: result.totalFiles,
            totalBytes: result.totalBytes,
            formattedTotalSize: result.formattedTotalSize,
            directFiles: result.directFiles,
            subfolders: result.subfolders,
            files: result.items
        });
    } catch (err: any) {
        console.error('[Drive Inspect GET Error]:', err);
        return NextResponse.json({ error: err.message || 'Erro ao inspecionar pasta' }, { status: 500 });
    }
}

