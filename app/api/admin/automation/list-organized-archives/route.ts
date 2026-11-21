import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const BASE_ROOT = 'D:\\rcssp\\Downloads\\3d\\3 - Com suporte';

export async function GET(req: NextRequest) {
    try {
        if (!fs.existsSync(BASE_ROOT)) {
            return NextResponse.json({ success: true, archives: [] });
        }

        const archives: Array<{
            name: string;
            category: string;
            fullPath: string;
            figureName: string;
            hasWebpCover: boolean;
            coverFileName?: string | null;
        }> = [];

        const categories = fs.readdirSync(BASE_ROOT, { withFileTypes: true })
            .filter(d => d.isDirectory() && !d.name.startsWith('.'));

        for (const cat of categories) {
            const catPath = path.join(BASE_ROOT, cat.name);
            const figureFolders = fs.readdirSync(catPath, { withFileTypes: true })
                .filter(d => d.isDirectory() && !d.name.startsWith('.'));

            for (const fig of figureFolders) {
                const figPath = path.join(catPath, fig.name);
                const files = fs.readdirSync(figPath);

                const archiveFiles = files.filter(f => /\.(rar|zip|7z)$/i.test(f));
                const primaryArchive = archiveFiles.find(f => /image|render|foto|pic|art/i.test(f)) || archiveFiles[0];
                
                // Reconhece qualquer imagem de capa (.webp, .jpg, .png) que não seja ícone .ico
                const coverFile = files.find(f => 
                    /\.(webp|jpg|jpeg|png)$/i.test(f) && 
                    !f.toLowerCase().endsWith('.ico') &&
                    !path.basename(f).startsWith('._')
                );

                if (primaryArchive) {
                    archives.push({
                        name: archiveFiles.length > 1 ? `${archiveFiles.length} arquivos (${primaryArchive})` : primaryArchive,
                        category: cat.name,
                        fullPath: path.join(figPath, primaryArchive),
                        figureName: fig.name,
                        hasWebpCover: !!coverFile,
                        coverFileName: coverFile || null
                    });
                }
            }
        }

        return NextResponse.json({
            success: true,
            total: archives.length,
            archives
        });
    } catch (error: any) {
        console.error('Erro ao listar arquivos organizados:', error);
        return NextResponse.json({ error: error.message || 'Erro ao listar pacotes.' }, { status: 500 });
    }
}
