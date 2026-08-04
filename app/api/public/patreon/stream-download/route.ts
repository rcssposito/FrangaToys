import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { fetchPatreonMemberships } from '@/lib/integrations/patreon';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, figureId, fileName, realFileUrl, allowFree = true } = body;

        if (!email) {
            return NextResponse.json({ error: 'E-mail do apoiador é obrigatório.' }, { status: 400 });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'desconhecido';

        // 1. Validar membro no Patreon
        let isAuthorized = false;
        let patronName = 'Apoiador Patreon';

        try {
            const memberships = await fetchPatreonMemberships();
            const member = memberships.find(m => {
                return m.patronStatus === 'active_patron' || (allowFree && m.patronStatus === 'free_member');
            });

            if (member) {
                isAuthorized = true;
                patronName = member.campaignName || 'Apoiador Validado';
            } else if (allowFree) {
                isAuthorized = true;
            }
        } catch (patreonErr) {
            if (allowFree) isAuthorized = true;
        }

        if (!isAuthorized) {
            return NextResponse.json({ 
                error: 'Assinatura no Patreon não encontrada ou inativa para este e-mail.' 
            }, { status: 403 });
        }

        const targetFileName = fileName || 'modelo-3d-frangatoys.zip';
        const targetFileId = figureId || '';
        let streamUrl = realFileUrl;

        // Se for um arquivo específico do Google Drive (ID com 25+ caracteres)
        if (targetFileId && typeof targetFileId === 'string' && targetFileId.length > 20 && !targetFileId.includes('_item_')) {
            streamUrl = `https://drive.google.com/uc?export=download&id=${targetFileId}`;
        } else if (realFileUrl && realFileUrl.includes('drive.google.com')) {
            // Se for URL de pasta do Google Drive, extrai o ID da pasta
            const folderMatch = realFileUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/);
            const idToUse = folderMatch ? folderMatch[1] : targetFileId;
            streamUrl = `https://drive.google.com/uc?export=download&id=${idToUse}`;
        }

        // 2. Registrar LOG DE AUDITORIA no Supabase no clique exato
        await supabase
            .from('download_tokens')
            .insert({
                token: `direct_stream_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                patron_email: normalizedEmail,
                patron_name: patronName,
                figure_id: null,
                file_name: targetFileName,
                real_file_url: realFileUrl || streamUrl,
                is_used: true,
                used_at: new Date().toISOString(),
                user_ip: clientIp
            });

        // 3. Fazer o Stream direto do arquivo binary real
        let fileRes = await fetch(streamUrl, {
            redirect: 'follow',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        // Se o Google Drive retornar confirmação de vírus para arquivos grandes
        if (fileRes.headers.get('content-type')?.includes('text/html')) {
            const htmlText = await fileRes.text();
            const confirmMatch = htmlText.match(/confirm=([a-zA-Z0-9_-]+)/);
            if (confirmMatch) {
                const confirmUrl = `${streamUrl}&confirm=${confirmMatch[1]}`;
                fileRes = await fetch(confirmUrl, { redirect: 'follow' });
            } else if (targetFileId && targetFileId.length > 20) {
                // Tenta URL alternativa direta do Google Drive CDN (lh3)
                const cdnUrl = `https://lh3.googleusercontent.com/d/${targetFileId}`;
                const cdnRes = await fetch(cdnUrl, { redirect: 'follow' });
                if (cdnRes.ok && !cdnRes.headers.get('content-type')?.includes('text/html')) {
                    fileRes = cdnRes;
                }
            }
        }

        if (!fileRes.ok || !fileRes.body) {
            return NextResponse.json({ error: 'Erro ao conectar ao arquivo no Google Drive.' }, { status: 502 });
        }

        const safeFileName = encodeURIComponent(targetFileName);
        const contentType = fileRes.headers.get('content-type') || 'application/octet-stream';

        return new NextResponse(fileRes.body as any, {
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="${safeFileName}"; filename*=UTF-8''${safeFileName}`,
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });

    } catch (error: any) {
        console.error('Erro no stream do Google Drive:', error);
        return NextResponse.json({ error: error.message || 'Erro interno no servidor' }, { status: 500 });
    }
}
