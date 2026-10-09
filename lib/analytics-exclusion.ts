/**
 * Regras centralizadas para exclusão de acessos do próprio lojista/administrador
 * nos módulos de Beacon, Hit de Figuras e Visualizações gerais.
 */

// Lista de IPs conhecidos do lojista / admin / demonstrações
export const DEFAULT_ADMIN_IPS = [
    '177.33.136.84',  // IP atual da Franga Toys / Rodrigo
    '172.69.138.86',  // Sessão de conexão do lojista
    '172.69.39.24',   // Sessão de conexão do lojista
    '172.71.238.128', // Conexão da demonstração (Giovani)
];

// Lista de visitor IDs conhecidos dos testes/dispositivos do lojista e demos
export const DEFAULT_ADMIN_VISITOR_IDS = [
    'vis_4170x71a',
    'vis_3j40ra',
    'vis_th2yim',
    'vis_fggk5rtw',
    'vis_fuidgc92',
    'vis_42c4cxk8',
    'vis_iba91qwd',
    'vis_n16fi0qx',
];

/**
 * Obtém o IP real do cliente, priorizando headers do Cloudflare (cf-connecting-ip)
 */
export function getClientIp(headers: Headers): string {
    const cfIp = headers.get('cf-connecting-ip');
    if (cfIp && cfIp.trim()) return cfIp.trim();

    const xff = headers.get('x-forwarded-for');
    if (xff) {
        const first = xff.split(',')[0]?.trim();
        if (first) return first;
    }

    const realIp = headers.get('x-real-ip');
    if (realIp && realIp.trim()) return realIp.trim();

    return '127.0.0.1';
}

/**
 * Verifica se uma requisição pertence ao administrador/lojista
 */
export function isExcludedAdmin(params: {
    ip?: string | null;
    visitorId?: string | null;
    pathname?: string | null;
    referrer?: string | null;
    cookies?: { has: (name: string) => boolean };
}): { excluded: boolean; reason?: string } {
    const { ip, visitorId, pathname, referrer, cookies } = params;

    // 1. Cookie de sessão admin ou flag de admin persistente
    if (cookies) {
        if (cookies.has('admin_session') || cookies.has('franga_is_admin')) {
            return { excluded: true, reason: 'admin_cookie' };
        }
    }

    // 2. Parâmetro de lojista / admin no referrer ou pathname
    const fullCheck = `${pathname || ''} ${referrer || ''}`;
    if (fullCheck.includes('incluirNaoVendaveis=true') || fullCheck.includes('/admin')) {
        return { excluded: true, reason: 'admin_url_param' };
    }

    // 3. Visitor ID conhecido do lojista
    if (visitorId) {
        const cleanVid = visitorId.trim().toLowerCase();
        if (DEFAULT_ADMIN_VISITOR_IDS.some(id => cleanVid.includes(id.toLowerCase()))) {
            return { excluded: true, reason: 'admin_visitor_id' };
        }
    }

    // 4. IP do lojista (env var ou default)
    if (ip) {
        const cleanIp = ip.trim();
        const envIps = (process.env.ADMIN_EXCLUDED_IPS || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);

        const allAdminIps = new Set([...DEFAULT_ADMIN_IPS, ...envIps]);
        if (allAdminIps.has(cleanIp)) {
            return { excluded: true, reason: 'admin_ip' };
        }

        // Localhost / IPs locais de desenvolvimento
        if (
            cleanIp === '127.0.0.1' ||
            cleanIp === '::1' ||
            cleanIp.includes('127.0.0.1') ||
            cleanIp.startsWith('192.168.') ||
            cleanIp.startsWith('10.')
        ) {
            return { excluded: true, reason: 'local_ip' };
        }
    }

    return { excluded: false };
}
