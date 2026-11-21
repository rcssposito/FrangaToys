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
                    error: 'Arquivo ou pasta de origem não encontrado.'
                });
                continue;
            }

            const sourceStat = fs.statSync(sourcePath);
            let destCategoryFolder = baseFolder;
            if (item.moveToCategory && item.targetFolder) {
                destCategoryFolder = path.join(baseFolder, item.targetFolder);
            }

            if (sourceStat.isDirectory()) {
                // Origem já é uma pasta agrupada no Passo 1: renomeia/move a pasta inteira para a categoria!
                const figureFolderName = item.newName.trim().replace(/\.(rar|zip|7z)$/i, '').trim();
                const destFolder = path.join(destCategoryFolder, figureFolderName);

                if (!fs.existsSync(destCategoryFolder)) {
                    fs.mkdirSync(destCategoryFolder, { recursive: true });
                }

                try {
                    if (fs.existsSync(destFolder) && destFolder.toLowerCase() !== sourcePath.toLowerCase()) {
                        // Se a pasta de destino já existir, move os arquivos internos para dentro dela e remove a pasta origem vazia
                        const innerFiles = fs.readdirSync(sourcePath);
                        for (const f of innerFiles) {
                            const srcFile = path.join(sourcePath, f);
                            const dstFile = path.join(destFolder, f);
                            if (!fs.existsSync(dstFile)) {
                                fs.renameSync(srcFile, dstFile);
                            }
                        }
                        if (fs.readdirSync(sourcePath).length === 0) {
                            fs.rmdirSync(sourcePath);
                        }
                    } else if (destFolder.toLowerCase() !== sourcePath.toLowerCase()) {
                        fs.renameSync(sourcePath, destFolder);
                    }

                    logs.push({
                        original: item.originalName,
                        final: destFolder,
                        success: true
                    });
                } catch (err: any) {
                    logs.push({
                        original: item.originalName,
                        final: destFolder,
                        success: false,
                        error: err.message || 'Erro ao mover/renomear pasta agrupada.'
                    });
                }
                continue;
            }

            const ext = path.extname(item.originalName);
            let finalCleanName = item.newName.trim();
            if (ext && !finalCleanName.toLowerCase().endsWith(ext.toLowerCase())) {
                finalCleanName += ext;
            }

            // Nome da figura (sem extensão) para criar a pasta da figura
            const figureFolderName = path.parse(finalCleanName).name;

            // Pasta dedicada da figura: Categoria / Nome_da_Figura
            const destFolder = path.join(destCategoryFolder, figureFolderName);
            if (!fs.existsSync(destFolder)) {
                fs.mkdirSync(destFolder, { recursive: true });
            }

            let targetPath = path.join(destFolder, finalCleanName);

            // Se já existe um arquivo com o nome canônico na pasta (ex: múltiplos RARs da mesma figura), mantém o nome original do RAR dentro da mesma pasta!
            if (fs.existsSync(targetPath) && targetPath.toLowerCase() !== sourcePath.toLowerCase()) {
                targetPath = path.join(destFolder, item.originalName);
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
