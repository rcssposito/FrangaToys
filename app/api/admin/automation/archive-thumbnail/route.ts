import { NextRequest } from 'next/server';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

export const dynamic = 'force-dynamic';

const UNRAR_PATH = 'C:\\Program Files\\WinRAR\\UnRAR.exe';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const archivePath = searchParams.get('archivePath');
        const innerPath = searchParams.get('innerPath');

        if (!archivePath || !innerPath) {
            return new Response('Parâmetros archivePath e innerPath obrigatórios.', { status: 400 });
        }

        if (!fs.existsSync(archivePath)) {
            return new Response('Arquivo compactado não encontrado.', { status: 404 });
        }

        const ext = path.extname(archivePath).toLowerCase();
        let buffer: Buffer | null = null;

        // Caso 1: Imagem dentro de ZIP aninhado (sub.zip::foto.jpg)
        if (innerPath.includes('::')) {
            const [nestedArchiveName, targetImageName] = innerPath.split('::');
            const mainZip = new AdmZip(archivePath);
            const nestedEntry = mainZip.getEntry(nestedArchiveName);
            if (!nestedEntry) {
                return new Response('Sub-compactado não encontrado.', { status: 404 });
            }
            const nestedBuffer = nestedEntry.getData();
            const nestedZip = new AdmZip(nestedBuffer);
            const imgEntry = nestedZip.getEntry(targetImageName);
            if (!imgEntry) {
                return new Response('Imagem não encontrada no sub-compactado.', { status: 404 });
            }
            buffer = imgEntry.getData();
        }
        // Caso 2: Arquivo RAR
        else if (ext === '.rar') {
            if (!fs.existsSync(UNRAR_PATH)) {
                return new Response('UnRAR.exe não encontrado.', { status: 500 });
            }
            buffer = execSync(`"${UNRAR_PATH}" p -inul "${archivePath}" "${innerPath}"`, {
                maxBuffer: 15 * 1024 * 1024
            });
        }
        // Caso 3: Arquivo ZIP direto
        else if (ext === '.zip' || ext === '.7z') {
            const zip = new AdmZip(archivePath);
            const entry = zip.getEntry(innerPath);
            if (!entry) {
                return new Response('Imagem não encontrada no ZIP.', { status: 404 });
            }
            buffer = entry.getData();
        } else {
            return new Response('Formato não suportado.', { status: 400 });
        }

        if (!buffer || buffer.length === 0) {
            return new Response('Imagem vazia ou não encontrada no pacote.', { status: 404 });
        }

        const imgExt = path.extname(innerPath).toLowerCase();
        let contentType = 'image/jpeg';
        if (imgExt === '.png') contentType = 'image/png';
        if (imgExt === '.webp') contentType = 'image/webp';

        return new Response(new Uint8Array(buffer), {
            headers: {
                'Content-Type': contentType,
                'Content-Length': buffer.length.toString(),
                'Cache-Control': 'public, max-age=86400, immutable'
            }
        });
    } catch (error: any) {
        console.error('Erro ao gerar thumbnail de compactado:', error);
        return new Response('Erro ao extrair miniatura: ' + error.message, { status: 500 });
    }
}
