import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

export const dynamic = 'force-dynamic';

const UNRAR_PATH = 'C:\\Program Files\\WinRAR\\UnRAR.exe';

interface InnerImage {
    innerPath: string;
    fileName: string;
    type: 'render_color' | 'render_grey' | 'technical' | 'test_print' | 'other';
    score: number;
    isSuggestedCover?: boolean;
    isSuggestedHover?: boolean;
}

// Filtro para ignorar arquivos fantasmas do macOS e lixo de sistema
function isValidImageEntry(entryName: string, size?: number): boolean {
    const base = path.basename(entryName);
    // Ignora arquivos AppleDouble metadata forks (._*) e pastas do Mac
    if (base.startsWith('._') || base.startsWith('.')) return false;
    if (entryName.includes('__MACOSX')) return false;
    if (entryName.toLowerCase().includes('.ds_store')) return false;
    if (entryName.toLowerCase().includes('thumbs.db')) return false;
    if (size !== undefined && size < 2048) return false; // Menor que 2KB não é imagem real
    return /\.(jpg|jpeg|png|webp)$/i.test(base);
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const archivePath = searchParams.get('archivePath');

        if (!archivePath) {
            return NextResponse.json({ error: 'Parâmetro archivePath obrigatório.' }, { status: 400 });
        }

        if (!fs.existsSync(archivePath)) {
            return NextResponse.json({ error: `Arquivo não encontrado: ${archivePath}` }, { status: 404 });
        }

        const ext = path.extname(archivePath).toLowerCase();
        let rawEntries: Array<{ innerPath: string; fileName: string }> = [];

        if (ext === '.rar') {
            if (!fs.existsSync(UNRAR_PATH)) {
                return NextResponse.json({ error: 'UnRAR.exe não encontrado em C:\\Program Files\\WinRAR' }, { status: 500 });
            }
            const output = execSync(`"${UNRAR_PATH}" lb "${archivePath}"`, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
            const lines = output.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
            lines.forEach(l => {
                if (isValidImageEntry(l)) {
                    rawEntries.push({ innerPath: l, fileName: path.basename(l) });
                }
            });
        } else if (ext === '.zip' || ext === '.7z') {
            try {
                const zip = new AdmZip(archivePath);
                const entries = zip.getEntries();

                for (const entry of entries) {
                    if (entry.isDirectory) continue;
                    const name = entry.entryName;

                    // 1. Fotos diretas
                    if (isValidImageEntry(name, entry.header.size)) {
                        rawEntries.push({ innerPath: name, fileName: path.basename(name) });
                    }
                    // 2. Sub-compactados aninhados
                    else if (/\.(zip)$/i.test(name) && !name.includes('__MACOSX') && !path.basename(name).startsWith('._')) {
                        const isLikelyRenders = /render|image|foto|pic|preview|art/i.test(name) || entry.header.size < 60 * 1024 * 1024;
                        if (isLikelyRenders) {
                            try {
                                const subBuffer = entry.getData();
                                const subZip = new AdmZip(subBuffer);
                                const subEntries = subZip.getEntries();
                                for (const sub of subEntries) {
                                    if (sub.isDirectory) continue;
                                    if (isValidImageEntry(sub.entryName, sub.header.size)) {
                                        rawEntries.push({
                                            innerPath: `${name}::${sub.entryName}`,
                                            fileName: path.basename(sub.entryName)
                                        });
                                    }
                                }
                            } catch (subErr) {
                                console.warn('Erro ao abrir sub-zip:', name, subErr);
                            }
                        }
                    }
                }
            } catch (zipErr: any) {
                console.error('Erro AdmZip:', zipErr);
                return NextResponse.json({ error: 'Erro ao ler arquivo ZIP: ' + zipErr.message }, { status: 500 });
            }
        } else {
            return NextResponse.json({ error: 'Formato não suportado. Use .rar ou .zip' }, { status: 400 });
        }

        if (!rawEntries.length) {
            return NextResponse.json({
                success: true,
                totalImages: 0,
                images: []
            });
        }

        // Classificação heurística
        const classifiedImages: InnerImage[] = rawEntries.map(item => {
            const lower = item.innerPath.toLowerCase();
            const fileName = item.fileName;
            let score = 50;
            let type: InnerImage['type'] = 'other';

            if (lower.includes('test_print') || lower.includes('print')) {
                type = 'test_print';
                score = 10;
            } else if (lower.includes('exploded') || lower.includes('dimension') || lower.includes('parts') || lower.includes('assembly') || lower.includes('chitubox') || lower.includes('support')) {
                type = 'technical';
                score = 5;
            } else if (lower.includes('grey') || lower.includes('clay') || lower.includes('gray')) {
                type = 'render_grey';
                score = 30;
            } else if (lower.includes('color') || lower.includes('render') || lower.includes('final') || lower.includes('promo') || lower.includes('cover') || lower.includes('beauty')) {
                type = 'render_color';
                score = 90;
            } else {
                type = 'render_color';
                score = 70;
            }

            // Bônus se contiver "1" ou "01" ou "main" ou "cover"
            if (lower.includes('cover') || lower.includes('(1)') || lower.includes('01.') || lower.includes('_01') || lower.includes('main')) {
                score += 15;
            }

            return {
                innerPath: item.innerPath,
                fileName,
                type,
                score
            };
        });

        // Ordena por pontuação (melhores primeiro)
        classifiedImages.sort((a, b) => b.score - a.score);

        // Marca a primeira como Capa apenas (Hover é 100% opcional)
        if (classifiedImages.length > 0) {
            classifiedImages[0].isSuggestedCover = true;
        }

        return NextResponse.json({
            success: true,
            archivePath,
            totalImages: classifiedImages.length,
            images: classifiedImages
        });
    } catch (error: any) {
        console.error('Erro ao inspecionar compactado:', error);
        return NextResponse.json({ error: error.message || 'Erro ao inspecionar compactado.' }, { status: 500 });
    }
}
