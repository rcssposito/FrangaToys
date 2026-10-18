import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

export const dynamic = 'force-dynamic';

const UNRAR_PATH = 'C:\\Program Files\\WinRAR\\UnRAR.exe';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            archivePath,
            figureName,
            coverInnerPath,
            hoverInnerPath
        } = body;

        if (!archivePath || !figureName || !coverInnerPath) {
            return NextResponse.json({ error: 'Parâmetros obrigatórios ausentes.' }, { status: 400 });
        }

        const ext = path.extname(archivePath).toLowerCase();
        const figureDir = path.dirname(archivePath);

        // Função para extrair um arquivo do compactado para o destino
        const extractImageToFile = (innerPath: string, destFile: string) => {
            // Se for imagem aninhada em sub-zip
            if (innerPath.includes('::')) {
                const [nestedArchiveName, targetImageName] = innerPath.split('::');
                let nestedBuffer: Buffer;

                if (ext === '.rar') {
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
                if (!imgEntry) throw new Error('Imagem não encontrada no sub-compactado.');
                fs.writeFileSync(destFile, imgEntry.getData());
            }
            // Se for RAR
            else if (ext === '.rar') {
                execSync(`"${UNRAR_PATH}" e -y -inul "${archivePath}" "${innerPath}" "${path.dirname(destFile)}\\"`);
                const extractedName = path.basename(innerPath);
                const extractedPath = path.join(path.dirname(destFile), extractedName);
                if (fs.existsSync(extractedPath) && extractedPath.toLowerCase() !== destFile.toLowerCase()) {
                    if (fs.existsSync(destFile)) fs.unlinkSync(destFile);
                    fs.renameSync(extractedPath, destFile);
                }
            }
            // Se for ZIP direto
            else {
                try {
                    const imgBuffer = execSync(`tar -xf "${archivePath}" -O "${innerPath}"`, {
                        maxBuffer: 30 * 1024 * 1024
                    });
                    fs.writeFileSync(destFile, imgBuffer);
                } catch (tarErr) {
                    const stats = fs.statSync(archivePath);
                    if (stats.size < 2 * 1024 * 1024 * 1024) {
                        const zip = new AdmZip(archivePath);
                        const entry = zip.getEntry(innerPath);
                        if (!entry) throw new Error('Imagem não encontrada no ZIP.');
                        fs.writeFileSync(destFile, entry.getData());
                    } else {
                        throw tarErr;
                    }
                }
            }
        };

        // 1. Extrai a Capa para a pasta da figura
        const coverExt = path.extname(coverInnerPath).toLowerCase() || '.jpg';
        const finalCoverPath = path.join(figureDir, `${figureName}${coverExt}`);
        extractImageToFile(coverInnerPath, finalCoverPath);

        // 2. Extrai o Hover (se houver) para a pasta da figura
        let finalHoverPath: string | null = null;
        if (hoverInnerPath) {
            const hoverExt = path.extname(hoverInnerPath).toLowerCase() || '.jpg';
            finalHoverPath = path.join(figureDir, `${figureName}_2${hoverExt}`);
            extractImageToFile(hoverInnerPath, finalHoverPath);
        }

        return NextResponse.json({
            success: true,
            figureName,
            coverExtracted: finalCoverPath,
            hoverExtracted: finalHoverPath
        });
    } catch (error: any) {
        console.error('Erro ao extrair imagem escolhida:', error);
        return NextResponse.json({ error: error.message || 'Erro ao extrair imagem.' }, { status: 500 });
    }
}
