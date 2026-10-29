import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

export const dynamic = 'force-dynamic';

const UNRAR_PATH = 'C:\\Program Files\\WinRAR\\UnRAR.exe';

function applyFolderSelfContainedIcon(figureDir: string, sourceImagePath: string) {
    try {
        const localIconPath = path.join(figureDir, 'folder.ico');
        const desktopIniPath = path.join(figureDir, 'desktop.ini');

        if (fs.existsSync(localIconPath)) {
            try { execSync(`attrib -s -h -r "${localIconPath}"`); } catch {}
            try { fs.unlinkSync(localIconPath); } catch {}
        }

        // Gera o folder.ico 256x256 multi-resolução padrão do Windows
        execSync(
            `magick "${sourceImagePath}" -background none -resize 256x256 -gravity center -extent 256x256 -define icon:auto-resize="256,128,64,48,32,16" "${localIconPath}"`,
            { stdio: 'ignore' }
        );

        if (fs.existsSync(localIconPath)) {
            try { execSync(`attrib +h +s "${localIconPath}"`); } catch {}

            if (fs.existsSync(desktopIniPath)) {
                try { execSync(`attrib -s -h -r "${desktopIniPath}"`); } catch {}
                try { fs.unlinkSync(desktopIniPath); } catch {}
            }

            // Grava desktop.ini em UTF-16LE (Unicode) com linha inicial em branco
            const iniContent = `\r\n[.ShellClassInfo]\r\nIconResource=folder.ico,0\r\n`;
            const bom = Buffer.from([0xFF, 0xFE]);
            const bodyBuf = Buffer.from(iniContent, 'utf16le');
            fs.writeFileSync(desktopIniPath, Buffer.concat([bom, bodyBuf]));

            try { execSync(`attrib +s +h "${desktopIniPath}"`); } catch {}
            try { execSync(`attrib +r "${figureDir}"`); } catch {}
        }
    } catch (err) {
        console.warn('Aviso ao gerar icone da pasta:', err);
    }
}

function optimizeCoverToWebpInPlace(figureDir: string, figureName: string, rawCoverPath: string): string {
    const finalWebpPath = path.join(figureDir, `${figureName}.webp`);
    const tempWebpPath = path.join(figureDir, `${figureName}.tmp.webp`);

    try {
        execSync(
            `magick "${rawCoverPath}" -resize "2000x2000>" -quality 80 -define webp:lossless=false "${tempWebpPath}"`,
            { stdio: 'ignore' }
        );

        if (fs.existsSync(tempWebpPath)) {
            const stats = fs.statSync(tempWebpPath);
            if (stats.size > 1024 * 1024) {
                execSync(
                    `magick "${rawCoverPath}" -resize "1920x1920>" -quality 60 -define webp:lossless=false "${tempWebpPath}"`,
                    { stdio: 'ignore' }
                );
            }

            if (fs.existsSync(finalWebpPath)) {
                try { fs.unlinkSync(finalWebpPath); } catch {}
            }
            fs.renameSync(tempWebpPath, finalWebpPath);

            if (rawCoverPath.toLowerCase() !== finalWebpPath.toLowerCase() && fs.existsSync(rawCoverPath)) {
                try { fs.unlinkSync(rawCoverPath); } catch {}
            }

            return finalWebpPath;
        }
    } catch (err) {
        if (fs.existsSync(tempWebpPath)) {
            try { fs.unlinkSync(tempWebpPath); } catch {}
        }
        console.warn('Aviso ao converter para WebP na extração:', err);
    }

    return rawCoverPath;
}

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
            } else if (ext === '.rar') {
                execSync(`"${UNRAR_PATH}" e -y -inul "${archivePath}" "${innerPath}" "${path.dirname(destFile)}\\"`);
                const extractedName = path.basename(innerPath);
                const extractedPath = path.join(path.dirname(destFile), extractedName);
                if (fs.existsSync(extractedPath) && extractedPath.toLowerCase() !== destFile.toLowerCase()) {
                    if (fs.existsSync(destFile)) fs.unlinkSync(destFile);
                    fs.renameSync(extractedPath, destFile);
                }
            } else {
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
        const rawCoverPath = path.join(figureDir, `${figureName}${coverExt}`);
        extractImageToFile(coverInnerPath, rawCoverPath);

        // 2. Já otimiza para .webp e aplica o folder.ico oculto IMEDIATAMENTE (antes do Windows Explorer cachear a pasta amarela!)
        const finalCoverPath = optimizeCoverToWebpInPlace(figureDir, figureName, rawCoverPath);
        applyFolderSelfContainedIcon(figureDir, finalCoverPath);

        // 3. Extrai o Hover (se houver) para a pasta da figura
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
        return NextResponse.json({ error: error.message || 'Erro ao extrair imagem.' }, { status: 400 });
    }
}
