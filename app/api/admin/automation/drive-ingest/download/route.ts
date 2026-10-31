import { NextRequest } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { downloadDriveFolder } from '@/lib/integrations/drive-downloader';

export async function POST(req: NextRequest) {
    const sessionOrResponse = await requireRoles(['admin']);
    if (sessionOrResponse instanceof Response) return sessionOrResponse;

    const body = await req.json();
    const { folderId, destinationFolder, studioName, folderName, includeStudioFolder = false, isArchiveFile = false, archiveExtension = '.zip' } = body;

    if (!folderId || !destinationFolder || !studioName || !folderName) {
        return new Response(JSON.stringify({ error: 'Parâmetros obrigatórios ausentes.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            const sendEvent = (data: any) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            };

            try {
                sendEvent({ type: 'start', message: `Iniciando download de "${folderName}"...` });

                const result = await downloadDriveFolder(
                    folderId,
                    destinationFolder,
                    studioName,
                    folderName,
                    (progress) => {
                        sendEvent({ type: 'progress', progress });
                    },
                    Boolean(includeStudioFolder),
                    Boolean(isArchiveFile),
                    archiveExtension
                );

                sendEvent({
                    type: 'done',
                    result,
                    message: `Download concluído! ${result.filesDownloaded} arquivos baixados, ${result.filesSkipped} já existentes pulados.`
                });
            } catch (err: any) {
                console.error('[Drive Download Stream Error]:', err);
                sendEvent({ type: 'error', error: err.message || 'Erro durante o download' });
            } finally {
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }
    });
}

