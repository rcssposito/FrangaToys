import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

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

        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

        // Tratamento para localhost (ambiente de dev)
        if (ip === '127.0.0.1' || ip === '::1') {
            city = 'Localhost';
            state = 'DEV';
        } 
        // Fallback para IPs reais quando a Vercel não sabe a cidade
        else if (city === 'Desconhecido') {
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
        const ua = req.headers.get('user-agent') || '';
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

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Analytics Route Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
