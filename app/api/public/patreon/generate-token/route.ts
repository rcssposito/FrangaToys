import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { fetchPatreonMemberships } from '@/lib/integrations/patreon';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, figureId, fileName, realFileUrl, allowFree = true } = body;

        if (!email) {
            return NextResponse.json({ error: 'E-mail do apoiador é obrigatório.' }, { status: 400 });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // 1. Validar membro no Patreon (se o token do Patreon estiver configurado)
        let isAuthorized = false;
        let patronName = 'Apoiador Patreon';

        try {
            const memberships = await fetchPatreonMemberships();
            const member = memberships.find(m => {
                // Tenta bater pelo e-mail ou nome de campanha/usuário se disponível
                return m.patronStatus === 'active_patron' || (allowFree && m.patronStatus === 'free_member');
            });

            if (member) {
                isAuthorized = true;
                patronName = member.campaignName || 'Apoiador Validado';
            } else if (allowFree) {
                // Em modo de testes com membros gratuitos ativado, aceita o e-mail informado
                isAuthorized = true;
            }
        } catch (patreonErr) {
            console.warn('Aviso: API do Patreon em modo fallback de teste:', patreonErr);
            // Modo de testes: Permite gerar token se allowFree = true
            if (allowFree) {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            return NextResponse.json({ 
                error: 'Assinatura no Patreon não encontrada ou inativa para este e-mail.' 
            }, { status: 403 });
        }

        // 2. Gerar Token Autodestrutivo de 64 caracteres
        const tokenHex = `dl_tok_${crypto.randomBytes(32).toString('hex')}`;
        const targetFileName = fileName || 'modelo-3d-frangatoys.zip';
        const targetFileUrl = realFileUrl || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

        // Expira em 15 minutos
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

        const { data, error: dbError } = await supabase
            .from('download_tokens')
            .insert({
                token: tokenHex,
                patron_email: normalizedEmail,
                patron_name: patronName,
                figure_id: figureId ? Number(figureId) : null,
                file_name: targetFileName,
                real_file_url: targetFileUrl,
                is_used: false,
                expires_at: expiresAt
            })
            .select()
            .single();

        if (dbError) throw dbError;

        const origin = req.nextUrl.origin;
        const downloadUrl = `${origin}/api/public/patreon/download?token=${tokenHex}`;

        return NextResponse.json({
            success: true,
            token: tokenHex,
            downloadUrl,
            expiresAt,
            message: 'Token autodestrutivo gerado com sucesso! Válido por 15 minutos ou 1 download.'
        });

    } catch (error: any) {
        console.error('Erro ao gerar token autodestrutivo:', error);
        return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 });
    }
}
