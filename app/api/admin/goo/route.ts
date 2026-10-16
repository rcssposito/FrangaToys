import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parseGooBuffer, calculateGooProduction, GooMetadata } from '@/lib/gooParser';

const GOO_DIRECTORY = 'D:\\rcssp\\Downloads\\3d\\2 - Meta';

/**
 * GET /api/admin/goo
 * Lista os arquivos .goo na pasta D:\rcssp\Downloads\3d\2 - Meta
 * Suporta filtro por query ?search=nome
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search')?.toLowerCase() || '';

        if (!fs.existsSync(GOO_DIRECTORY)) {
            return NextResponse.json({
                success: false,
                error: `Diretório não encontrado: ${GOO_DIRECTORY}`,
                files: []
            });
        }

        const entries = fs.readdirSync(GOO_DIRECTORY, { withFileTypes: true });
        
        let gooFiles = entries
            .filter(e => e.isFile() && e.name.toLowerCase().endsWith('.goo'))
            .map(e => {
                const fullPath = path.join(GOO_DIRECTORY, e.name);
                const stats = fs.statSync(fullPath);
                return {
                    name: e.name,
                    fullPath,
                    sizeBytes: stats.size,
                    modifiedAt: stats.mtime,
                };
            });

        // Filtrar por busca se fornecido
        if (search) {
            // Busca inteligente: dividir termos
            const terms = search.split(/[\s_\-]+/).filter(t => t.length > 1);
            gooFiles = gooFiles.filter(f => {
                const lower = f.name.toLowerCase();
                return terms.some(t => lower.includes(t));
            });
        }

        // Ordenar pelos mais recentes primeiro
        gooFiles.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());

        // Limitar a no máximo 50 resultados para performance
        const limited = gooFiles.slice(0, 50);

        return NextResponse.json({
            success: true,
            totalFound: gooFiles.length,
            directory: GOO_DIRECTORY,
            files: limited.map(f => ({
                name: f.name,
                fullPath: f.fullPath,
                sizeMb: (f.sizeBytes / (1024 * 1024)).toFixed(2),
                modifiedAt: f.modifiedAt.toISOString(),
            }))
        });
    } catch (error: any) {
        console.error('Erro ao listar arquivos .goo:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Erro ao listar arquivos .goo'
        }, { status: 500 });
    }
}

/**
 * POST /api/admin/goo
 * Faz parse de arquivos .goo:
 * Aceita:
 * 1) JSON body { filePaths: string[] } -> lê diretamente da pasta local
 * 2) FormData com arquivos anexados -> faz upload e parse do buffer
 */
export async function POST(request: NextRequest) {
    try {
        const contentType = request.headers.get('content-type') || '';
        const parsedMesas: GooMetadata[] = [];

        if (contentType.includes('application/json')) {
            const body = await request.json();
            const filePaths: string[] = body.filePaths || [];

            for (const fPath of filePaths) {
                if (fs.existsSync(fPath)) {
                    // Lemos apenas os primeiros 220KB do cabeçalho onde moram todos os metadados e preview
                    const fd = fs.openSync(fPath, 'r');
                    const headerBuf = Buffer.alloc(220000);
                    const bytesRead = fs.readSync(fd, headerBuf, 0, 220000, 0);
                    fs.closeSync(fd);

                    const meta = parseGooBuffer(headerBuf.subarray(0, bytesRead), path.basename(fPath));
                    parsedMesas.push(meta);
                }
            }
        } else if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            const files = formData.getAll('files') as File[];

            for (const file of files) {
                const arrayBuffer = await file.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                // Pegar os primeiros 220KB
                const sliceBuf = buffer.length > 220000 ? buffer.subarray(0, 220000) : buffer;
                const meta = parseGooBuffer(sliceBuf, file.name);
                parsedMesas.push(meta);
            }
        }

        const summary = calculateGooProduction(parsedMesas);

        return NextResponse.json({
            success: true,
            summary
        });
    } catch (error: any) {
        console.error('Erro ao processar arquivos .goo:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Erro ao processar arquivos .goo'
        }, { status: 500 });
    }
}
