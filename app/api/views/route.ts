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
        if (isAdmin) {
            return NextResponse.json({ ignored: 'admin' });
        }

        // Checar localhost via headers
        const forwarded = req.headers.get('x-forwarded-for') || '';
        const isLocal = forwarded.includes('127.0.0.1') || forwarded.startsWith('192.168.') || forwarded.startsWith('10.');
        if (isLocal) {
            return NextResponse.json({ ignored: 'localhost' });
        }

        // Checar robôs
        const ua = req.headers.get('user-agent') || '';
        const isBot = /bot|googlebot|crawler|spider|robot|crawling|facebookexternalhit|bingbot|slurp|semrush|ahrefs|lighthouse|headless|phantomjs|selenium|playwright|puppeteer|python|curl|wget|httpclient|postman|uptimerobot|petalbot|bytespider|mj12bot|dotbot|screaming frog|ia_archiver/i.test(ua);
        if (isBot) {
            return NextResponse.json({ ignored: 'bot' });
        }

        // Prevenção de F5 repetido
        const recentViews = cookieStore.get('franga_recent_views')?.value || '';
        const viewedList = recentViews ? recentViews.split(',') : [];
        const figureKey = String(figureId);

        if (viewedList.includes(figureKey)) {
            return NextResponse.json({ success: true, deduped: true });
        }

        // Busca o valor atual de views
        const { data: figure } = await supabaseAdmin
            .from('figuras')
            .select('views')
            .eq('id', figureId)
            .single();

        if (figure) {
            await supabaseAdmin
                .from('figuras')
                .update({ views: (figure.views || 0) + 1 })
                .eq('id', figureId);
        }

        const updatedViews = [...viewedList, figureKey].slice(-25).join(',');
        const response = NextResponse.json({ success: true });
        response.cookies.set('franga_recent_views', updatedViews, {
            path: '/',
            maxAge: 60 * 30,
            sameSite: 'lax',
            httpOnly: true
        });

        return response;
    } catch (err: any) {
        console.error('Views API Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
