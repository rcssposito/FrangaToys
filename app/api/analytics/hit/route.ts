import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { figureId, source, platform } = body;

        if (!figureId) return NextResponse.json({ error: 'Missing figureId' }, { status: 400 });

        // 1. Get Geolocation (Vercel Headers)
        let country = req.headers.get('x-vercel-ip-country') || 'BR';
        let city = req.headers.get('x-vercel-ip-city') || 'Desconhecido';
        let state = req.headers.get('x-vercel-ip-country-region') || 'Desconhecido';

        // Fallback for Local/Other environments using public IP API
        if (city === 'Desconhecido' || city === 'localhost') {
            try {
                const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'check';
                const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,countryCode,region,regionName,city`);
                const geoData = await geoRes.json();
                if (geoData.status === 'success') {
                    country = geoData.countryCode;
                    city = geoData.city;
                    state = geoData.region; // regionName for full name, region for short
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

        // 3. Log the hit
        const { error } = await supabase
            .from('figuras_analytics')
            .insert({
                figura_id: figureId,
                origem: source || 'direto',
                cidade: city,
                estado: state,
                pais: country,
                dispositivo: device,
                plataforma: platform || 'site'
            });

        // Also increment the total views in the main table
        await supabase.rpc('increment_views', { figure_id: figureId });

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Analytics Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
