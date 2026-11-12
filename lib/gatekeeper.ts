import crypto from 'crypto';
import { supabaseAdmin } from './supabase';

export const VIP_COOKIE_NAME = 'franga_vip_token';

/**
 * Verifica se um token VIP é válido.
 * Aceita o segredo mestre ou um token ativo da tabela solicitacoes_acesso.
 */
export async function verifyVipToken(token?: string | null): Promise<{ valid: boolean; nome?: string; id?: string }> {
    if (!token || typeof token !== 'string') {
        return { valid: false };
    }

    const cleanToken = token.trim();
    const masterSecret = process.env.VIP_MASTER_SECRET || 'frangatoys2026';

    // 1. Chave mestre de contingência
    if (cleanToken === masterSecret) {
        return { valid: true, nome: 'Acesso Mestre', id: 'master' };
    }

    try {
        // 2. Consulta no Supabase
        const { data, error } = await supabaseAdmin
            .from('solicitacoes_acesso')
            .select('id, nome, status, token_expira_em')
            .eq('token_vip', cleanToken)
            .eq('status', 'aprovado')
            .maybeSingle();

        if (error || !data) {
            return { valid: false };
        }

        // 3. Validação de expiração (se houver)
        if (data.token_expira_em) {
            const expiraEm = new Date(data.token_expira_em).getTime();
            if (Date.now() > expiraEm) {
                return { valid: false };
            }
        }

        return {
            valid: true,
            nome: data.nome,
            id: data.id
        };
    } catch (err) {
        console.error('Erro ao verificar VIP token:', err);
        return { valid: false };
    }
}

/**
 * Verifica se um email possui acesso VIP aprovado.
 * Se o email for do proprietário / administrador, o acesso é liberado instantaneamente.
 */
export async function verifyVipByEmail(email?: string | null): Promise<{ valid: boolean; token?: string; nome?: string; id?: string }> {
    if (!email || typeof email !== 'string') return { valid: false };

    const masterSecret = process.env.VIP_MASTER_SECRET || 'frangatoys2026';

    try {
        // 1. Checa se é o e-mail do proprietário/administrador da Franga Toys
        const { data: adminUser } = await supabaseAdmin
            .from('usuarios')
            .select('id, nome, role, email')
            .ilike('email', email.trim())
            .maybeSingle();

        if (adminUser) {
            return {
                valid: true,
                token: masterSecret,
                nome: adminUser.nome || 'Proprietário Franga Toys',
                id: adminUser.id
            };
        }

        // 2. Checa se é um cliente com solicitação aprovada
        const { data, error } = await supabaseAdmin
            .from('solicitacoes_acesso')
            .select('id, nome, status, token_vip, token_expira_em')
            .ilike('email', email.trim())
            .eq('status', 'aprovado')
            .maybeSingle();

        if (error || !data) return { valid: false };

        if (data.token_expira_em) {
            const expiraEm = new Date(data.token_expira_em).getTime();
            if (Date.now() > expiraEm) return { valid: false };
        }

        return {
            valid: true,
            token: data.token_vip || undefined,
            nome: data.nome,
            id: data.id
        };
    } catch {
        return { valid: false };
    }
}

/**
 * Gera um token VIP criptograficamente aleatório.
 */
export function generateVipToken(): string {
    return 'vip_' + crypto.randomBytes(12).toString('hex');
}

/**
 * Gera assinatura HMAC segura para botões do Telegram (Aprovar / Recusar).
 */
export function generateDecisionSecret(id: string, action: string): string {
    const key = process.env.TELEGRAM_BOT_TOKEN || process.env.SUPABASE_SERVICE_ROLE_KEY || 'franga_gatekeeper_secret';
    return crypto.createHmac('sha256', key).update(`${id}:${action}`).digest('hex').substring(0, 16);
}

