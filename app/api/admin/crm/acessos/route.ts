import { NextResponse } from 'next/server';
import { requireRoles } from '@/lib/server-auth';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { DEFAULT_ADMIN_IPS, DEFAULT_ADMIN_VISITOR_IDS } from '@/lib/analytics-exclusion';

export async function GET(req: Request) {
    try {
        const sessionOrResponse = await requireRoles(['admin', 'sales']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const { searchParams } = new URL(req.url);
        const clienteId = searchParams.get('cliente_id');
        const limit = Number(searchParams.get('limit')) || 25;

        let query = supabase
            .from('crm_acessos_beacon')
            .select(`
                id,
                visitor_id,
                session_date,
                cliente_id,
                email,
                pathname,
                ultima_pagina,
                total_paginas,
                paginas_vistas,
                figuras_vistas,
                duracao_total_segundos,
                duracao_segundos,
                referrer,
                utm_source,
                utm_medium,
                utm_campaign,
                cidade,
                estado,
                pais,
                dispositivo,
                navegador,
                ip,
                figura_id,
                primeiro_acesso_em,
                ultimo_acesso_em,
                created_at,
                figuras (
                    id,
                    nome,
                    imagem_url
                ),
                crm_cadencias (
                    id,
                    nome,
                    cupom_codigo
                ),
                clientes (
                    id,
                    nome,
                    email
                )
            `)
            .neq('cidade', 'Localhost')
            .neq('ip', 'local')
            .neq('cidade', 'Portland')
            .order('ultimo_acesso_em', { ascending: false })
            .limit(limit);

        if (clienteId) {
            query = query.eq('cliente_id', clienteId);
        }

        const { data, error } = await query;
        if (error) throw error;

        const rawLogs: any[] = (data as any[]) || [];

        // Filtrar acessos do próprio lojista/administrador
        const envIps = (process.env.ADMIN_EXCLUDED_IPS || '').split(',').map(s => s.trim()).filter(Boolean);
        const excludedIps = new Set([...DEFAULT_ADMIN_IPS, ...envIps]);
        const excludedVisitors = new Set(DEFAULT_ADMIN_VISITOR_IDS.map(v => v.toLowerCase()));

        const logs = rawLogs.filter(log => {
            if (log.ip && excludedIps.has(log.ip)) return false;
            if (log.visitor_id && excludedVisitors.has(log.visitor_id.toLowerCase())) return false;
            return true;
        });

        // 1. Coletar tokens de rastreio e slugs de figuras a resolver
        const rastreioTokens: string[] = [];
        const figuraSlugs: string[] = [];

        for (const log of logs) {
            const path = log.ultima_pagina || log.pathname || '';
            const tokenMatch = path.match(/\/(rastreio|recibo|verificar|certificado)\/([a-zA-Z0-9-]+)/);
            if (tokenMatch && tokenMatch[2]) {
                rastreioTokens.push(tokenMatch[2]);
            }

            if (!log.figuras) {
                const figMatch = path.match(/\/figura\/([a-zA-Z0-9-_]+)/);
                if (figMatch && figMatch[1] && isNaN(Number(figMatch[1]))) {
                    figuraSlugs.push(figMatch[1]);
                }
            }
        }

        // 2. Buscar vendas associadas aos tokens de rastreio/certificado
        const vendasByToken: Record<string, any> = {};
        if (rastreioTokens.length > 0) {
            const { data: vendas } = await supabase
                .from('vendas')
                .select(`
                    id,
                    access_token,
                    cliente_nome,
                    cliente_contato,
                    cliente_id,
                    figura_id,
                    figuras ( id, nome, imagem_url )
                `)
                .in('access_token', rastreioTokens);

            if (vendas) {
                for (const v of vendas) {
                    if (v.access_token) {
                        vendasByToken[v.access_token] = v;
                    }
                }
            }
        }

        // 3. Buscar figuras por slug
        const figurasBySlug: Record<string, any> = {};
        if (figuraSlugs.length > 0) {
            const { data: figs } = await supabase
                .from('figuras')
                .select('id, nome, imagem_url, slug')
                .in('slug', figuraSlugs);

            if (figs) {
                for (const f of figs) {
                    if (f.slug) {
                        figurasBySlug[f.slug] = f;
                    }
                }
            }
        }

        // 4. Enriquecer os logs com os dados resolvidos
        for (const log of logs) {
            const path = log.ultima_pagina || log.pathname || '';
            const tokenMatch = path.match(/\/(rastreio|recibo|verificar|certificado)\/([a-zA-Z0-9-]+)/);
            if (tokenMatch && tokenMatch[2]) {
                const token = tokenMatch[2];
                const venda = vendasByToken[token];
                if (venda) {
                    log.pedido_info = {
                        id: venda.id,
                        cliente_nome: venda.cliente_nome,
                        cliente_contato: venda.cliente_contato,
                        tipo: tokenMatch[1],
                        token
                    };
                    if (!log.clientes) {
                        log.clientes = {
                            id: venda.cliente_id,
                            nome: venda.cliente_nome,
                            email: null,
                            telefone: venda.cliente_contato
                        };
                    }
                    if (!log.figuras && venda.figuras) {
                        log.figuras = venda.figuras;
                    }
                }
            }

            if (!log.figuras) {
                const figMatch = path.match(/\/figura\/([a-zA-Z0-9-_]+)/);
                if (figMatch && figMatch[1] && figurasBySlug[figMatch[1]]) {
                    log.figuras = figurasBySlug[figMatch[1]];
                }
            }
        }

        return NextResponse.json(logs);
    } catch (error: any) {
        console.error('Erro ao buscar acessos do beacon:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const sessionOrResponse = await requireRoles(['admin']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        const visitorId = searchParams.get('visitor_id');
        const ip = searchParams.get('ip');

        if (!id && !visitorId && !ip) {
            return NextResponse.json({ error: 'Informe id, visitor_id ou ip para exclusão' }, { status: 400 });
        }

        let query = supabase.from('crm_acessos_beacon').delete();

        if (id) {
            query = query.eq('id', id);
        } else if (visitorId) {
            query = query.eq('visitor_id', visitorId);
        } else if (ip) {
            query = query.eq('ip', ip);
        }

        const { error } = await query;
        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Erro ao deletar acesso:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
