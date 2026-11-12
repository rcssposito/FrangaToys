import { NextRequest, NextResponse } from 'next/server';
import { verifyVipToken, verifyVipByEmail, VIP_COOKIE_NAME } from '@/lib/gatekeeper';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { token } = body;

        const result = await verifyVipToken(token);

        if (!result.valid) {
            return NextResponse.json(
                { ok: false, error: 'Chave de acesso inválida ou expirada.' },
                { status: 401 }
            );
        }

        const response = NextResponse.json({
            ok: true,
            nome: result.nome || 'Membro VIP',
            message: 'Acesso liberado!'
        });

        // Grava o cookie VIP por 60 dias
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

    } catch (err: any) {
        console.error('Erro ao verificar chave VIP:', err);
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


