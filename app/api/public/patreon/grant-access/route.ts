import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { verifyActivePatreonMember } from '@/lib/integrations/patreon';
import { grantDriveFolderAccess, extractFolderId } from '@/lib/integrations/gdrive';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, folderUrl } = body;

        if (!email) {
            return NextResponse.json({ error: 'E-mail é obrigatório para liberar a permissão.' }, { status: 400 });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'desconhecido';

        // 1. Validar ESTRITAMENTE o membro no Patreon (Sem fallbacks fakes)
        const patreonCheck = await verifyActivePatreonMember(normalizedEmail);

        if (!patreonCheck.isAuthorized) {
            return NextResponse.json({ 
                error: patreonCheck.reason || `A assinatura no Patreon não foi encontrada ou está inativa para o e-mail ${normalizedEmail}. Apenas apoiadores ativos possuem acesso.`
            }, { status: 403 });
        }

        const targetFolderUrl = folderUrl || 'https://drive.google.com';
        const folderId = extractFolderId(targetFolderUrl);

        // 2. Conceder permissão de leitor na pasta restrita do Google Drive via API v3
        const permResult = await grantDriveFolderAccess(folderId, normalizedEmail);

        // 3. Registrar Log de Auditoria no Supabase
        await supabase
            .from('download_tokens')
            .insert({
                token: `granted_perm_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                patron_email: normalizedEmail,
                patron_name: patreonCheck.patronName,
                figure_id: null,
                file_name: `Permissão de Acesso à Pasta Restrita (ID: ${folderId.substring(0, 8)}...)`,
                real_file_url: targetFolderUrl,
                is_used: true,
                used_at: new Date().toISOString(),
                user_ip: clientIp
            });

        // 4. Retornar resposta com sucesso e o link da pasta restrita
        return NextResponse.json({
            success: true,
            email: normalizedEmail,
            folderUrl: targetFolderUrl,
            message: permResult.message || `Permissão de acesso concedida para ${normalizedEmail}`
        });

    } catch (error: any) {
        console.error('Erro ao conceder permissão na pasta do Google Drive:', error);
        return NextResponse.json({ error: error.message || 'Erro interno no servidor' }, { status: 500 });
    }
}
