import { NextRequest } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const body = await req.json();
    const scriptType = body.scriptType; // 'lojinha3d', 'importar', 'upload', 'gen_sinonimos', 'powershell'

    // Define diretórios locais do projeto
    const projectRoot = path.resolve(process.cwd(), '..');
    const scriptsDir = path.join(projectRoot, 'scripts', 'automation');
    const manualDir = path.join(projectRoot, 'Processo Manual');

    let command = '';
    let args: string[] = [];
    let cwd = scriptsDir;

    if (scriptType === 'powershell_organizar') {
        command = 'powershell.exe';
        args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', '.\\Script.ps1', '-Etapa', 'organizar_pastas', '-NoPause'];
        cwd = manualDir;
    } else if (scriptType === 'powershell_imagens') {
        command = 'powershell.exe';
        args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', '.\\Script.ps1', '-Etapa', 'otimizar_imagens', '-NoPause'];
        cwd = manualDir;
    } else if (scriptType === 'powershell' || scriptType === 'powershell_full' || scriptType === 'pipeline_principal') {
        command = 'powershell.exe';
        args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', '.\\Script.ps1', '-Etapa', '1', '-NoPause'];
        cwd = manualDir;
    } else if (scriptType === 'lojinha3d') {
        command = 'cmd.exe';
        args = ['/c', 'lojinha3d.bat', '--nopause'];
        cwd = manualDir;
    } else if (scriptType === 'importar') {
        command = 'python';
        args = ['importar.py'];
        cwd = scriptsDir;
    } else if (scriptType === 'upload') {
        command = 'python';
        args = ['upload.py'];
        cwd = scriptsDir;
    } else if (scriptType === 'importar') {
        command = 'python';
        args = ['importar.py'];
        cwd = scriptsDir;
    } else if (scriptType === 'atualizar') {
        command = 'python';
        args = ['atualizar.py'];
        cwd = scriptsDir;
    } else if (scriptType === 'gen_sinonimos') {
        command = 'python';
        args = ['gen_sinonimos.py'];
        cwd = scriptsDir;
    } else if (scriptType === 'validar') {
        command = 'python';
        args = ['validar.py'];
        cwd = scriptsDir;
    } else {
        return new Response(JSON.stringify({ error: 'Tipo de script inválido.' }), { status: 400 });
    }

    // Configura streaming SSE (Server-Sent Events)
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        start(controller) {
            const sendEvent = (data: any) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            };

            sendEvent({ type: 'start', text: `🚀 Iniciando execução: ${command} ${args.join(' ')}`, message: `🚀 Iniciando execução: ${command} ${args.join(' ')}` });

            const child = spawn(command, args, {
                cwd,
                shell: true,
                env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUNBUFFERED: '1' }
            });

            // Fecha stdin para não travar em comandos interativos
            if (child.stdin) {
                child.stdin.end();
            }

            child.stdout.on('data', (chunk) => {
                const text = chunk.toString('utf-8');
                sendEvent({ type: 'stdout', text, message: text });
            });

            child.stderr.on('data', (chunk) => {
                const text = chunk.toString('utf-8');
                sendEvent({ type: 'stderr', text, message: text });
            });

            child.on('close', (code) => {
                sendEvent({ type: 'end', done: true, code, text: `🏁 Processo encerrado com código ${code}.`, message: `🏁 Processo encerrado com código ${code}.` });
                controller.close();
            });

            child.on('error', (err) => {
                sendEvent({ type: 'error', done: true, code: 1, text: `❌ Erro ao iniciar processo: ${err.message}`, message: `❌ Erro ao iniciar processo: ${err.message}` });
                controller.close();
            });
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive'
        }
    });
}
