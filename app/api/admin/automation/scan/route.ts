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

        // Identifica pastas de categorias existentes (ex: 00 - Anime, 01 - Games, etc.)
        const categoryFolders = entries
            .filter(e => e.isDirectory())
            .map(e => e.name);

        // Identifica arquivos comprimidos soltos na raiz (rar, zip, 7z)
        const files = entries
            .filter(e => e.isFile() && /\.(rar|zip|7z)$/i.test(e.name))
            .map(e => {
                const fullPath = path.join(folderPath, e.name);
                const stats = fs.statSync(fullPath);
                return {
                    name: e.name,
                    sizeBytes: stats.size,
                    sizeFormatted: (stats.size / (1024 * 1024)).toFixed(1) + ' MB',
                    extension: path.extname(e.name).toLowerCase(),
                    fullPath: fullPath,
                    modifiedAt: stats.mtime
                };
            });

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
