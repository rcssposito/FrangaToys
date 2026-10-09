import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { getClientIp, isExcludedAdmin } from '@/lib/analytics-exclusion';

export async function POST(req: NextRequest) {
    try {
        let body: any = {};
        const contentType = req.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
            body = await req.json();
        } else {
            const raw = await req.text();
            try {
                body = JSON.parse(raw);
            } catch {
                body = {};
            }
        }

        const {
            visitorId,
            clienteId,
            email,
            pathname = '/',
            referrer = '',
            utm_source = '',
            utm_medium = '',
            utm_campaign = '',
            cadenciaId = null,
            figuraId = null,
            duracaoSegundos = 0,
            metadados = {}
        } = body;

        if (!visitorId && !clienteId) {
            return NextResponse.json({ error: 'Missing identification' }, { status: 400 });
        }

        const safeVisitorId = visitorId || `cli_${clienteId}`;
        const todayStr = new Date().toISOString().split('T')[0];

        // 1. Geolocalização via Vercel Headers ou Fallback por IP
        const safeDecode = (val: string | null, fallback: string) => {
            if (!val) return fallback;
            try { return decodeURIComponent(val); } catch { return val; }
        };

        let country = safeDecode(req.headers.get('x-vercel-ip-country'), 'BR');
        let city = safeDecode(req.headers.get('x-vercel-ip-city'), 'Desconhecido');
        let state = safeDecode(req.headers.get('x-vercel-ip-country-region'), 'Desconhecido');

        const ip = getClientIp(req.headers);

        // 1. Não gravar se for o lojista/administrador (IP, Cookie, Visitor ID ou URL param)
        const adminCheck = isExcludedAdmin({
            ip,
            visitorId: safeVisitorId,
            pathname,
            referrer,
            cookies: req.cookies
        });

        if (adminCheck.excluded) {
            return NextResponse.json({ ignored: adminCheck.reason });
        }

        // 3. Ignorar robôs e rastreadores automáticos
        const ua = req.headers.get('user-agent') || '';
        const isBot = /bot|googlebot|crawler|spider|robot|crawling|facebookexternalhit|bingbot|slurp|semrush|ahrefs|lighthouse|headless|phantomjs|selenium|playwright|puppeteer|python|curl|wget|httpclient|postman|uptimerobot|petalbot|bytespider|mj12bot|dotbot|screaming frog|ia_archiver/i.test(ua);
        if (isBot || metadados?.isWebDriver) {
            return NextResponse.json({ ignored: 'bot' });
        }

        if (city === 'Desconhecido') {
            try {
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
                console.warn('Geo Fallback failed in beacon:', e);
            }
        }

        // 2. Dispositivo e Navegador via User-Agent
        let dispositivo = 'desktop';
        if (/mobile/i.test(ua)) dispositivo = 'mobile';
        else if (/tablet|ipad/i.test(ua)) dispositivo = 'tablet';

        let navegador = 'Outro';
        if (/chrome|crios/i.test(ua) && !/edg/i.test(ua)) navegador = 'Chrome';
        else if (/safari/i.test(ua) && !/chrome/i.test(ua)) navegador = 'Safari';
        else if (/firefox/i.test(ua)) navegador = 'Firefox';
        else if (/edg/i.test(ua)) navegador = 'Edge';

        // 3. Resolver cliente se tiver email ou se clienteId for válido
        let resolvedClienteId = clienteId || null;
        if (!resolvedClienteId && email) {
            const { data: cData } = await supabase
                .from('clientes')
                .select('id')
                .eq('email', email)
                .maybeSingle();
            if (cData) resolvedClienteId = cData.id;
        }

        // 3.1 Se acessar rastreio, recibo ou certificado de autenticidade com token, vincular cliente e figura automaticamente
        let resolvedFiguraId = figuraId ? Number(figuraId) : null;
        const rastreioMatch = pathname.match(/\/(rastreio|recibo|verificar|certificado)\/([a-zA-Z0-9-]+)/);
        if (rastreioMatch && rastreioMatch[2]) {
            const token = rastreioMatch[2];
            const { data: venda } = await supabase
                .from('vendas')
                .select('cliente_id, figura_id')
                .eq('access_token', token)
                .maybeSingle();
            if (venda) {
                if (!resolvedClienteId && venda.cliente_id) {
                    resolvedClienteId = venda.cliente_id;
                }
                if (!resolvedFiguraId && venda.figura_id) {
                    resolvedFiguraId = venda.figura_id;
                }
            }
        }

        // 3.2 Se for rota de figura com slug (ex: /figura/berserk---slan-v2)
        if (!resolvedFiguraId) {
            const figMatch = pathname.match(/\/figura\/([a-zA-Z0-9-_]+)/);
            if (figMatch && figMatch[1] && isNaN(Number(figMatch[1]))) {
                const { data: fData } = await supabase
                    .from('figuras')
                    .select('id')
                    .eq('slug', figMatch[1])
                    .maybeSingle();
                if (fData?.id) {
                    resolvedFiguraId = fData.id;
                }
            }
        }

        // 4. Buscar se já existe uma sessão aberta hoje para este visitorId
        const { data: existingSession, error: findError } = await supabase
            .from('crm_acessos_beacon')
            .select('*')
            .eq('visitor_id', safeVisitorId)
            .eq('session_date', todayStr)
            .maybeSingle();

        if (findError) {
            console.error('Erro ao verificar sessão do beacon:', findError);
        }

        const nowIso = new Date().toISOString();

        if (existingSession) {
            // SESSÃO EXISTE -> ATUALIZAR (UPSERT)
            const currentPages: string[] = Array.isArray(existingSession.paginas_vistas) ? existingSession.paginas_vistas : [];
            const isNewPage = !currentPages.includes(pathname);
            const updatedPages = isNewPage ? [...currentPages, pathname] : currentPages;

            let currentFiguras: any[] = Array.isArray(existingSession.figuras_vistas) ? existingSession.figuras_vistas : [];
            if (resolvedFiguraId && !currentFiguras.some(f => f.id === Number(resolvedFiguraId))) {
                currentFiguras.push({ id: Number(resolvedFiguraId), visualizado_em: nowIso });
            }

            const updatedTotalPages = isNewPage 
                ? (existingSession.total_paginas || 1) + 1 
                : (existingSession.total_paginas || 1);

            const updatedDuration = (existingSession.duracao_total_segundos || 0) + (Number(duracaoSegundos) || 0);

            await supabase
                .from('crm_acessos_beacon')
                .update({
                    cliente_id: resolvedClienteId || existingSession.cliente_id,
                    email: email || existingSession.email,
                    ultima_pagina: pathname,
                    pathname, // Mantém a última página como rota atual
                    paginas_vistas: updatedPages,
                    figuras_vistas: currentFiguras,
                    total_paginas: updatedTotalPages,
                    duracao_total_segundos: updatedDuration,
                    figura_id: resolvedFiguraId ? Number(resolvedFiguraId) : existingSession.figura_id,
                    utm_source: utm_source || existingSession.utm_source,
                    utm_campaign: utm_campaign || existingSession.utm_campaign,
                    cadencia_id: cadenciaId || existingSession.cadencia_id,
                    ultimo_acesso_em: nowIso
                })
                .eq('id', existingSession.id);
        } else {
            // PRIMEIRA VISITA DO DIA -> CRIAR SESSÃO ÚNICA
            const initialPages = [pathname];
            const initialFiguras = resolvedFiguraId ? [{ id: Number(resolvedFiguraId), visualizado_em: nowIso }] : [];

            await supabase
                .from('crm_acessos_beacon')
                .insert({
                    visitor_id: safeVisitorId,
                    session_date: todayStr,
                    cliente_id: resolvedClienteId,
                    email: email || null,
                    pathname,
                    ultima_pagina: pathname,
                    paginas_vistas: initialPages,
                    figuras_vistas: initialFiguras,
                    total_paginas: 1,
                    duracao_total_segundos: Number(duracaoSegundos) || 0,
                    referrer: referrer ? referrer.slice(0, 500) : null,
                    utm_source: utm_source || null,
                    utm_medium: utm_medium || null,
                    utm_campaign: utm_campaign || null,
                    cadencia_id: cadenciaId || null,
                    cidade: city,
                    estado: state,
                    pais: country,
                    dispositivo,
                    navegador,
                    ip: ip,
                    figura_id: resolvedFiguraId ? Number(resolvedFiguraId) : null,
                    metadados: metadados || {},
                    primeiro_acesso_em: nowIso,
                    ultimo_acesso_em: nowIso
                });
        }

        // 5. Se tiver cliente identificado, atualizar métricas no cadastro do cliente
        if (resolvedClienteId) {
            const { data: cli } = await supabase
                .from('clientes')
                .select('total_acessos, tags')
                .eq('id', resolvedClienteId)
                .single();

            const currentTotal = (cli?.total_acessos || 0) + 1;
            let currentTags: string[] = Array.isArray(cli?.tags) ? [...cli.tags] : [];

            if (currentTotal >= 3 && !currentTags.includes('Lead Quente')) {
                currentTags.push('Lead Quente');
            }

            await supabase
                .from('clientes')
                .update({
                    ultimo_acesso_em: nowIso,
                    total_acessos: currentTotal,
                    cidade_ultimo_acesso: city !== 'Desconhecido' ? city : undefined,
                    uf_ultimo_acesso: state !== 'Desconhecido' ? state : undefined,
                    tags: currentTags
                })
                .eq('id', resolvedClienteId);
        }

        // 6. Se veio de uma cadência de CRM, atualizar status do envio
        if (cadenciaId && resolvedClienteId) {
            await supabase
                .from('crm_cadencia_envios')
                .update({
                    status: 'engajou',
                    metadados: {
                        ultimo_clique_em: nowIso,
                        cidade: city,
                        dispositivo
                    }
                })
                .eq('cadencia_id', cadenciaId)
                .eq('cliente_id', resolvedClienteId);

            const { data: cad } = await supabase
                .from('crm_cadencias')
                .select('total_convertidos')
                .eq('id', cadenciaId)
                .single();

            if (cad) {
                await supabase
                    .from('crm_cadencias')
                    .update({
                        total_convertidos: (cad.total_convertidos || 0) + 1
                    })
                    .eq('id', cadenciaId);
            }
        }

        return NextResponse.json({ success: true, mode: existingSession ? 'session_updated' : 'session_created' });
    } catch (error: any) {
        console.error('Erro na rota de beacon:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
