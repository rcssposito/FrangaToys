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
            let nestedBuffer: Buffer;

            if (ext === '.rar') {
                if (!fs.existsSync(UNRAR_PATH)) {
                    return new Response('UnRAR.exe não encontrado.', { status: 500 });
                }
                nestedBuffer = execSync(`"${UNRAR_PATH}" p -inul "${archivePath}" "${nestedArchiveName}"`, {
                    maxBuffer: 60 * 1024 * 1024
                });
            } else {
                nestedBuffer = execSync(`tar -xf "${archivePath}" -O "${nestedArchiveName}"`, {
                    maxBuffer: 60 * 1024 * 1024
                });
            }

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
            try {
                buffer = execSync(`tar -xf "${archivePath}" -O "${innerPath}"`, {
                    maxBuffer: 20 * 1024 * 1024
                });
            } catch (tarErr) {
                // Fallback para AdmZip se o arquivo for menor que 2GB
                const stats = fs.statSync(archivePath);
                if (stats.size < 2 * 1024 * 1024 * 1024) {
                    const zip = new AdmZip(archivePath);
                    const entry = zip.getEntry(innerPath);
                    if (entry) buffer = entry.getData();
                } else {
                    throw tarErr;
                }
            }
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
