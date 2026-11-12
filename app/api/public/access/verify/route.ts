import { NextRequest, NextResponse } from 'next/server';
import { verifyVipToken, verifyVipByEmail, VIP_COOKIE_NAME, generateVipToken } from '@/lib/gatekeeper';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { token } = body;

        if (!token || typeof token !== 'string') {
            return NextResponse.json(
                { ok: false, error: 'Informe sua chave VIP ou WhatsApp cadastrado.' },
                { status: 400 }
            );
        }

        // 1. Tenta validar como Chave VIP ou Senha Mestre
        const result = await verifyVipToken(token);

        if (result.valid) {
            const response = NextResponse.json({
                ok: true,
                nome: result.nome || 'Membro VIP',
                message: 'Acesso liberado!'
            });

            response.cookies.set({
                name: VIP_COOKIE_NAME,
                value: token.trim(),
                maxAge: 60 * 24 * 60 * 60, // 60 dias
                path: '/',
                httpOnly: false,
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production'
            });

            return response;
        }

        // 2. Se não for chave válida, checa se é o WhatsApp de um cliente já cadastrado
        const cleanPhone = token.replace(/\D/g, '');
        if (cleanPhone.length >= 8) {
            const last8 = cleanPhone.slice(-8);
            const { data: existingClients } = await supabaseAdmin
                .from('clientes')
                .select('id, nome, email, telefone, total_acessos')
                .not('telefone', 'is', null);

            const matchedClient = (existingClients || []).find(c => {
                if (!c.telefone) return false;
                const cPhone = c.telefone.replace(/\D/g, '');
                return cPhone.endsWith(last8) || cleanPhone.endsWith(cPhone.slice(-8));
            });

            if (matchedClient) {
                const vipToken = generateVipToken();
                const expiraEm = new Date();
                expiraEm.setDate(expiraEm.getDate() + 90);

                await supabaseAdmin.from('solicitacoes_acesso').insert({
                    nome: matchedClient.nome,
                    whatsapp: cleanPhone,
                    mensagem: 'Acesso direto por WhatsApp de cliente',
                    status: 'aprovado',
                    token_vip: vipToken,
                    token_expira_em: expiraEm.toISOString(),
                    aprovado_em: new Date().toISOString()
                });

                await supabaseAdmin.from('clientes').update({
                    ultimo_acesso_em: new Date().toISOString(),
                    total_acessos: (matchedClient.total_acessos || 0) + 1
                }).eq('id', matchedClient.id);

                const primeiroNome = matchedClient.nome ? matchedClient.nome.trim().split(' ')[0] : 'Colecionador';

                const response = NextResponse.json({
                    ok: true,
                    nome: primeiroNome,
                    message: `Bem-vindo de volta, ${primeiroNome}!`
                });

                response.cookies.set({
                    name: VIP_COOKIE_NAME,
                    value: vipToken,
                    maxAge: 90 * 24 * 60 * 60,
                    path: '/',
                    httpOnly: false,
                    sameSite: 'lax',
                    secure: process.env.NODE_ENV === 'production'
                });

                return response;
            }
        }

        return NextResponse.json(
            { ok: false, error: 'Chave VIP ou WhatsApp de cliente não encontrado.' },
            { status: 401 }
        );

    } catch (err: any) {
        console.error('Erro ao verificar chave VIP ou WhatsApp:', err);
        return NextResponse.json({ ok: false, error: 'Erro ao validar chave.' }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    const token = req.nextUrl.searchParams.get('token') || req.cookies.get(VIP_COOKIE_NAME)?.value;
    
    // 1. Checa se já possui token VIP válido
    if (token) {
        const result = await verifyVipToken(token);
        if (result.valid) {
            return NextResponse.json({ ok: true, nome: result.nome });
        }
    }

    // 2. Reconhecimento automático do Dono/Admin logado no navegador
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
            const vipStatus = await verifyVipByEmail(user.email);
            if (vipStatus.valid) {
                const response = NextResponse.json({ ok: true, nome: vipStatus.nome });
                response.cookies.set({
                    name: VIP_COOKIE_NAME,
                    value: vipStatus.token || 'frangatoys2026',
                    maxAge: 60 * 24 * 60 * 60,
                    path: '/',
                    httpOnly: false,
                    sameSite: 'lax',
                    secure: process.env.NODE_ENV === 'production'
                });
                return response;
            }
        }
    } catch {
        // segue para bloqueio
    }

    return NextResponse.json({ ok: false });
}


