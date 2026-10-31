import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { getCuratedFolders, getDriveClient, getAllowedStudioEmails, syncSubfolderCache, curatedJsonPath } from '@/lib/integrations/drive-downloader';
import * as fs from 'fs';
import * as path from 'path';

export async function GET(req: NextRequest) {
    try {
        const sessionOrResponse = await requireRoles(['admin']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const { searchParams } = new URL(req.url);
        const destinationBase = searchParams.get('destFolder') || 'D:\\rcssp\\Downloads\\3d\\3 - Com suporte';

        const data = await getCuratedFolders(destinationBase);

        return NextResponse.json({
            success: true,
            defaultDestFolder: destinationBase,
            totalFolders: data.folders.length,
            studios: data.studios,
            folders: data.folders,
            totalCatalogMatched: data.totalCatalogMatched,
            totalNovelties: data.totalNovelties
        });
    } catch (err: any) {
        console.error('[Drive Ingest GET Error]:', err);
        return NextResponse.json({ error: err.message || 'Erro ao carregar pastas' }, { status: 500 });
    }
}

// POST: Re-sincroniza a lista de pastas compartilhadas diretamente da API do Google Drive
export async function POST(req: NextRequest) {
    try {
        const sessionOrResponse = await requireRoles(['admin']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const drive = await getDriveClient();
        const allowedEmails = await getAllowedStudioEmails();

        let allFolders: any[] = [];
        let pageToken: string | undefined = undefined;

        do {
            const res: any = await drive.files.list({
                q: "sharedWithMe = true and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
                fields: "nextPageToken, files(id, name, owners(displayName, emailAddress), sharedWithMeTime, modifiedTime, webViewLink)",
                pageSize: 100,
                pageToken
            });

            const files = res.data.files || [];
            allFolders.push(...files);
            pageToken = res.data.nextPageToken;
        } while (pageToken);

        // Filtra estritamente pelos e-mails dos estúdios cadastrados no banco de dados
        const filtered = allFolders.filter(f => {
            const email = f.owners?.[0]?.emailAddress?.toLowerCase().trim();
            return email && allowedEmails.includes(email);
        });

        // Salva arquivo JSON atualizado APENAS com os estúdios cadastrados no banco
        fs.writeFileSync(curatedJsonPath, JSON.stringify(filtered, null, 2), 'utf-8');

        // Atualiza cache de subpastas para pacotes mensais
        await syncSubfolderCache(drive, filtered);

        return NextResponse.json({
            success: true,
            totalScanned: allFolders.length,
            curatedCount: filtered.length,
            message: `Sincronização concluída! ${filtered.length} pastas encontradas para os estúdios selecionados.`
        });
    } catch (err: any) {
        console.error('[Drive Ingest POST Error]:', err);
        return NextResponse.json({ error: err.message || 'Erro ao re-sincronizar pastas' }, { status: 500 });
    }
}

