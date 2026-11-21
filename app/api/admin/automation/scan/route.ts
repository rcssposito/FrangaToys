import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const DEFAULT_PATH = 'D:\\rcssp\\Downloads\\3d\\3 - Com suporte';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const folderPath = searchParams.get('folderPath') || DEFAULT_PATH;

        if (!fs.existsSync(folderPath)) {
            return NextResponse.json({
                error: `Pasta não encontrada: ${folderPath}`,
                exists: false
            }, { status: 404 });
        }

        const entries = fs.readdirSync(folderPath, { withFileTypes: true });

        const isCategoryFolderName = (name: string) =>
            /^\d+\s*-\s*/.test(name) || ['anime', 'games', 'marvel', 'dc', 'random'].includes(name.trim().toLowerCase());

        // Identifica pastas de categorias existentes (ex: 00 - Anime, 01 - Games, etc.)
        const categoryFolders = entries
            .filter(e => e.isDirectory() && isCategoryFolderName(e.name))
            .map(e => e.name);

        // 1. Identifica pastas de personagens agrupadas no Passo 1 (que não são pastas de categoria e contêm .rar/.zip/.7z)
        const groupedFolderItems = entries
            .filter(e => e.isDirectory() && !e.name.startsWith('.') && !isCategoryFolderName(e.name))
            .map(e => {
                const fullPath = path.join(folderPath, e.name);
                const innerEntries = fs.readdirSync(fullPath, { withFileTypes: true });
                const innerArchives = innerEntries.filter(f => f.isFile() && /\.(rar|zip|7z)$/i.test(f.name));
                if (innerArchives.length === 0) return null;

                let totalSize = 0;
                let latestMtime = new Date(0);
                for (const arc of innerArchives) {
                    const st = fs.statSync(path.join(fullPath, arc.name));
                    totalSize += st.size;
                    if (st.mtime > latestMtime) latestMtime = st.mtime;
                }

                return {
                    name: e.name,
                    isDirectory: true,
                    archiveCount: innerArchives.length,
                    innerFiles: innerArchives.map(a => a.name),
                    sizeBytes: totalSize,
                    sizeFormatted: `${(totalSize / (1024 * 1024)).toFixed(1)} MB (${innerArchives.length} arq.)`,
                    extension: '',
                    fullPath,
                    modifiedAt: latestMtime
                };
            })
            .filter(Boolean);

        // 2. Identifica arquivos comprimidos ainda soltos na raiz (rar, zip, 7z)
        const looseFiles = entries
            .filter(e => e.isFile() && /\.(rar|zip|7z)$/i.test(e.name))
            .map(e => {
                const fullPath = path.join(folderPath, e.name);
                const stats = fs.statSync(fullPath);
                return {
                    name: e.name,
                    isDirectory: false,
                    archiveCount: 1,
                    innerFiles: [e.name],
                    sizeBytes: stats.size,
                    sizeFormatted: (stats.size / (1024 * 1024)).toFixed(1) + ' MB',
                    extension: path.extname(e.name).toLowerCase(),
                    fullPath: fullPath,
                    modifiedAt: stats.mtime
                };
            });

        const files = [...groupedFolderItems, ...looseFiles];

        return NextResponse.json({
            success: true,
            folderPath,
            categoryFolders,
            totalFiles: files.length,
            files
        });
    } catch (error: any) {
        console.error('Erro ao escanear pasta 3D:', error);
        return NextResponse.json({ error: error.message || 'Erro interno ao escanear' }, { status: 500 });
    }
}
