import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
    try {
        const { figureId } = await req.json();

        if (!figureId) {
            return NextResponse.json({ error: 'Missing figureId' }, { status: 400 });
        }

        const cookieStore = await cookies();
        const isAdmin = cookieStore.has('admin_session');

        // Se for admin, não contabiliza a visualização
        if (!isAdmin) {
            // Primeiro busca o valor atual de views
            const { data: figure } = await supabaseAdmin
                .from('figuras')
                .select('views')
                .eq('id', figureId)
                .single();

            if (figure) {
                // Atualiza somando 1
                await supabaseAdmin
                    .from('figuras')
                    .update({ views: (figure.views || 0) + 1 })
                    .eq('id', figureId);
            }
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('Views API Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
