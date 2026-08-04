import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const token = searchParams.get('token');

        if (!token) {
            return new NextResponse('Token de download não fornecido.', { status: 400 });
        }

        // 1. Buscar o token no banco de dados
        const { data: tokData, error: dbError } = await supabase
            .from('download_tokens')
            .select('*')
            .eq('token', token)
            .maybeSingle();

        if (dbError || !tokData) {
            return new NextResponse('Link de download inválido ou inexistente.', { status: 404 });
        }

        // 2. Verificar se já foi utilizado / autodestruído
        if (tokData.is_used) {
            return new NextResponse(`
                <!DOCTYPE html>
                <html lang="pt-BR">
                <head>
                    <meta charset="UTF-8">
                    <title>Link Autodestruído - Franga Toys</title>
                    <style>
                        body { background: #09090b; color: #fff; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                        .card { background: #18181b; border: 1px solid #3f3f46; border-radius: 24px; padding: 40px; text-align: center; max-width: 480px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
                        .icon { font-size: 48px; margin-bottom: 16px; }
                        h1 { font-size: 20px; font-weight: 900; color: #f43f5e; text-transform: uppercase; margin: 0 0 12px 0; }
                        p { font-size: 14px; color: #a1a1aa; line-height: 1.6; margin: 0 0 24px 0; }
                        .badge { background: rgba(244, 63, 94, 0.1); border: 1px solid rgba(244, 63, 94, 0.3); color: #f43f5e; font-size: 11px; font-weight: 800; padding: 6px 12px; border-radius: 9999px; display: inline-block; text-transform: uppercase; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <div class="icon">🛑</div>
                        <h1>Link Autodestruído</h1>
                        <p>Este token de download de uso único já foi utilizado anteriormente e autodestruído para segurança do autor.</p>
                        <div class="badge">Proteção Anti-Scalper Ativa</div>
                    </div>
                </body>
                </html>
            `, { status: 403, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        }

        // 3. Verificar se expirou por tempo (15 min)
        if (new Date(tokData.expires_at) < new Date()) {
            return new NextResponse(`
                <!DOCTYPE html>
                <html lang="pt-BR">
                <head>
                    <meta charset="UTF-8">
                    <title>Link Expirado - Franga Toys</title>
                    <style>
                        body { background: #09090b; color: #fff; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                        .card { background: #18181b; border: 1px solid #3f3f46; border-radius: 24px; padding: 40px; text-align: center; max-width: 480px; }
                        .icon { font-size: 48px; margin-bottom: 16px; }
                        h1 { font-size: 20px; font-weight: 900; color: #f59e0b; text-transform: uppercase; margin: 0 0 12px 0; }
                        p { font-size: 14px; color: #a1a1aa; line-height: 1.6; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <div class="icon">⏳</div>
                        <h1>Link Expirado</h1>
                        <p>O tempo limite de 15 minutos para este link expirou. Por favor, solicite um novo link na página de downloads.</p>
                    </div>
                </body>
                </html>
            `, { status: 410, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        }

        // 4. AUTODESTRUIÇÃO DO TOKEN: Marca como utilizado imediatamente no banco de dados
        const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'desconhecido';
        await supabase
            .from('download_tokens')
            .update({
                is_used: true,
                used_at: new Date().toISOString(),
                user_ip: clientIp
            })
            .eq('token', token);

        // 5. Stream seguro do arquivo para o cliente (sem expor a URL original da nuvem)
        const fileRes = await fetch(tokData.real_file_url);

        if (!fileRes.ok || !fileRes.body) {
            return new NextResponse('Erro ao obter o arquivo no servidor remoto.', { status: 502 });
        }

        const safeFileName = encodeURIComponent(tokData.file_name);

        return new NextResponse(fileRes.body as any, {
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${safeFileName}"; filename*=UTF-8''${safeFileName}`,
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });

    } catch (error: any) {
        console.error('Erro na entrega do download autodestrutivo:', error);
        return new NextResponse('Erro interno no servidor ao processar o download.', { status: 500 });
    }
}
