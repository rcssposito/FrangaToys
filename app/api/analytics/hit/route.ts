import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getClientIp, isExcludedAdmin } from '@/lib/analytics-exclusion';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { figureId, source, platform } = body;

        if (!figureId) return NextResponse.json({ error: 'Missing figureId' }, { status: 400 });

        // 1. Get Geolocation (Vercel Headers - They are URL encoded!)
        const safeDecode = (val: string | null, fallback: string) => {
            if (!val) return fallback;
            try { return decodeURIComponent(val); } catch { return val; }
        };

        let country = safeDecode(req.headers.get('x-vercel-ip-country'), 'BR');
        let city = safeDecode(req.headers.get('x-vercel-ip-city'), 'Desconhecido');
        let state = safeDecode(req.headers.get('x-vercel-ip-country-region'), 'Desconhecido');

        const ip = getClientIp(req.headers);

        // 1. Ignorar se for o lojista/administrador
        const adminCheck = isExcludedAdmin({
            ip,
            cookies: req.cookies
        });

        if (adminCheck.excluded) {
            return NextResponse.json({ ignored: adminCheck.reason });
        }

        // 3. Ignorar robôs, indexadores e crawlers conhecidos
        const ua = req.headers.get('user-agent') || '';
        const isBot = /bot|googlebot|crawler|spider|robot|crawling|facebookexternalhit|bingbot|slurp|semrush|ahrefs|lighthouse|headless|phantomjs|selenium|playwright|puppeteer|python|curl|wget|httpclient|postman|uptimerobot|petalbot|bytespider|mj12bot|dotbot|screaming frog|ia_archiver/i.test(ua);
        if (isBot) {
            return NextResponse.json({ ignored: 'bot' });
        }

        // 4. Prevenção de F5 / spam: não duplicar views para a mesma figura na mesma sessão recente (janela de 30 minutos)
        const recentHitsCookie = req.cookies.get('franga_recent_hits')?.value || '';
        const recentList = recentHitsCookie ? recentHitsCookie.split(',') : [];
        const figureKey = String(figureId);

        if (recentList.includes(figureKey)) {
            return NextResponse.json({ success: true, deduped: true });
        }

        // Fallback para IPs reais quando a Vercel não sabe a cidade
        if (city === 'Desconhecido') {
            try {
                // Usando ipwho.is que é mais tolerante a rate-limits em chamadas server-side
                const geoRes = await fetch(`https://ipwho.is/${ip}`);
                if (geoRes.ok) {
                    const geoData = await geoRes.json();
                    if (geoData.success) {
                        country = geoData.country_code || country;
                        city = geoData.city || city;
                        state = geoData.region_code || geoData.region || state;
                    }
                }
            } catch (e) {
                console.warn('Geo Fallback failed', e);
            }
        }

        // 2. Detect Device from User-Agent
        let device = 'desktop';
        if (/mobile/i.test(ua)) device = 'mobile';
        if (/tablet/i.test(ua)) device = 'tablet';

        // 3. Log the hit in analytics table
        const { error: logError } = await supabaseAdmin
            .from('figuras_analytics')
            .insert({
                figura_id: Number(figureId),
                origem: source || 'direto',
                cidade: city,
                estado: state,
                pais: country,
                dispositivo: device,
                plataforma: platform || 'site'
            });

        if (logError) console.error('Error logging analytics hit:', logError.message);

        // 4. Increment views in figures table (Tenta RPC, se falhar faz Manual)
        const { error: rpcError } = await supabaseAdmin.rpc('increment_views', { figure_id: Number(figureId) });

        if (rpcError) {
            console.warn('RPC increment_views failed, using manual fallback:', rpcError.message);
            
            // Busca valor atual
            const { data: currentData } = await supabaseAdmin
                .from('figuras')
                .select('views')
                .eq('id', Number(figureId))
                .single();
            
            // Soma +1 manualmente
            await supabaseAdmin
                .from('figuras')
                .update({ views: (currentData?.views || 0) + 1 })
                .eq('id', Number(figureId));
        }

        // Atualiza cookie de visualizações recentes da sessão (máx 25 itens, 30 minutos)
        const updatedList = [...recentList, figureKey].slice(-25).join(',');
        const response = NextResponse.json({ success: true });
        response.cookies.set('franga_recent_hits', updatedList, {
            path: '/',
            maxAge: 60 * 30,
            sameSite: 'lax',
            httpOnly: true
        });

        return response;
    } catch (error: any) {
        console.error('Analytics Route Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
