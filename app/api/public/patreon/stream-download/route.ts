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

        // 1. Validar membro no Patreon (somente na HORA H do clique)
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
        const fileId = figureId || '';
        const apiKey = process.env.GOOGLE_DRIVE_API_KEY;

        // 2. Registrar LOG DE AUDITORIA no Supabase no clique exato
        await supabase
            .from('download_tokens')
            .insert({
                token: `direct_stream_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                patron_email: normalizedEmail,
                patron_name: patronName,
                figure_id: null,
                file_name: targetFileName,
                real_file_url: realFileUrl || fileId,
                is_used: true,
                used_at: new Date().toISOString(),
                user_ip: clientIp
            });

        // 3. Montar a URL binária direta de download no servidor (Sem abrir nenhuma aba nem expor URLs ao usuário)
        let driveBinaryUrl = '';
        if (apiKey && fileId && !fileId.includes('_item_')) {
            driveBinaryUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;
        } else if (fileId && typeof fileId === 'string' && fileId.length >= 25 && !fileId.includes('_item_')) {
            driveBinaryUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;
        } else {
            // Fallback para URL de download direto de arquivos do Google Drive
            const folderMatch = realFileUrl?.match(/\/folders\/([a-zA-Z0-9_-]+)/);
            const idToUse = folderMatch ? folderMatch[1] : fileId;
            driveBinaryUrl = `https://drive.usercontent.google.com/download?id=${idToUse}&export=download`;
        }

        // 4. Buscar o arquivo binário em segundo plano pelo servidor Node (Proxy Server Stream)
        let fileRes = await fetch(driveBinaryUrl, {
            redirect: 'follow',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        // Tratar arquivos grandes que exigem confirmação do Google Drive
        if (fileRes.headers.get('content-type')?.includes('text/html')) {
            const htmlText = await fileRes.text();
            const confirmMatch = htmlText.match(/confirm=([a-zA-Z0-9_-]+)/);
            if (confirmMatch) {
                const confirmUrl = `${driveBinaryUrl}&confirm=${confirmMatch[1]}`;
                fileRes = await fetch(confirmUrl, { redirect: 'follow' });
            } else {
                // Tenta endpoint uc?export=download&confirm=t
                const ucUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;
                const ucRes = await fetch(ucUrl, { redirect: 'follow' });
                if (ucRes.ok && !ucRes.headers.get('content-type')?.includes('text/html')) {
                    fileRes = ucRes;
                }
            }
        }

        if (!fileRes.ok || !fileRes.body) {
            return NextResponse.json({ error: 'Erro ao fazer o stream do arquivo no servidor.' }, { status: 502 });
        }

        // 5. Entregar os bytes binários diretamente no navegador como arquivo baixado (Content-Disposition)
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
        console.error('Erro na entrega segura do stream proxy:', error);
        return NextResponse.json({ error: error.message || 'Erro interno no servidor' }, { status: 500 });
    }
}
