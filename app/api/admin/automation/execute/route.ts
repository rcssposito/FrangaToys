import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const DEFAULT_PATH = 'D:\\rcssp\\Downloads\\3d\\3 - Com suporte';

interface ExecuteItem {
    originalName: string;
    newName: string;
    targetFolder?: string;
    moveToCategory?: boolean;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const baseFolder = body.baseFolder || DEFAULT_PATH;
        const items: ExecuteItem[] = body.items || [];

        if (!items.length) {
            return NextResponse.json({ error: 'Nenhum item selecionado para execução.' }, { status: 400 });
        }

        if (!fs.existsSync(baseFolder)) {
            return NextResponse.json({ error: `Pasta base não existe: ${baseFolder}` }, { status: 404 });
        }

        const logs: Array<{
            original: string;
            final: string;
            success: boolean;
            error?: string;
        }> = [];

        for (const item of items) {
            const sourcePath = path.join(baseFolder, item.originalName);

            if (!fs.existsSync(sourcePath)) {
                logs.push({
                    original: item.originalName,
                    final: '',
                    success: false,
                    error: 'Arquivo de origem não encontrado.'
                });
                continue;
            }

            let destFolder = baseFolder;
            if (item.moveToCategory && item.targetFolder) {
                destFolder = path.join(baseFolder, item.targetFolder);
                if (!fs.existsSync(destFolder)) {
                    fs.mkdirSync(destFolder, { recursive: true });
                }
            }

            const targetPath = path.join(destFolder, item.newName);

            // Proteção contra sobrescrita acidental
            if (fs.existsSync(targetPath) && targetPath.toLowerCase() !== sourcePath.toLowerCase()) {
                logs.push({
                    original: item.originalName,
                    final: targetPath,
                    success: false,
                    error: `Já existe um arquivo com esse nome no destino: ${item.newName}`
                });
                continue;
            }

            try {
                fs.renameSync(sourcePath, targetPath);
                logs.push({
                    original: item.originalName,
                    final: targetPath,
                    success: true
                });
            } catch (err: any) {
                logs.push({
                    original: item.originalName,
                    final: targetPath,
                    success: false,
                    error: err.message || 'Erro ao mover/renomear arquivo.'
                });
            }
        }

        const successCount = logs.filter(l => l.success).length;

        return NextResponse.json({
            success: true,
            total: items.length,
            successCount,
            failureCount: items.length - successCount,
            logs
        });
    } catch (error: any) {
        console.error('Erro na execução da automação:', error);
        return NextResponse.json({ error: error.message || 'Erro interno na execução' }, { status: 500 });
    }
}
