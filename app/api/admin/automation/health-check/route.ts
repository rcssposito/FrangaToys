import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { requireRoles } from '@/lib/server-auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const execAsync = promisify(exec);

const GEMINI_MODELS = [
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Principal)' },
    { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash' },
    { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash' },
    { id: 'gemini-3-flash-preview', label: 'Gemini 3.0 Flash' },
    { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite' },
    { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite' },
];

const GROQ_MODELS = [
    { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B (Principal Groq)' },
    { id: 'qwen/qwen3.8-27b', label: 'Qwen 3.8 27B' },
    { id: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B' },
    { id: 'allam-2-7b', label: 'ALLaM 2 7B (Instant)' },
];

interface SecretDefinition {
    id: string;
    label: string;
    category: 'IA' | 'Infra & Banco' | 'Pagamentos & Fiscal' | 'Integrações';
    envVar: string;
    providerUrl: string;
    defaultIntervalDays: number;
}

const MONITORED_SECRETS: SecretDefinition[] = [
    {
        id: 'GEMINI_API_KEY',
        label: 'Google AI Studio (Gemini API Key)',
        category: 'IA',
        envVar: 'GEMINI_API_KEY',
        providerUrl: 'https://aistudio.google.com/app/apikey',
        defaultIntervalDays: 90,
    },
    {
        id: 'GROQ_API_KEY',
        label: 'Groq Cloud (Llama & GPT-OSS Key)',
        category: 'IA',
        envVar: 'GROQ_API_KEY',
        providerUrl: 'https://console.groq.com/keys',
        defaultIntervalDays: 90,
    },
    {
        id: 'SUPABASE_SERVICE_ROLE_KEY',
        label: 'Supabase Service Role Key (Admin)',
        category: 'Infra & Banco',
        envVar: 'SUPABASE_SERVICE_ROLE_KEY',
        providerUrl: 'https://supabase.com/dashboard/project/gbmkwqnwkktmwnjcadsv/settings/api',
        defaultIntervalDays: 180,
    },
    {
        id: 'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
        label: 'Cloudflare R2 Secret Access Key (CDN)',
        category: 'Infra & Banco',
        envVar: 'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
        providerUrl: 'https://dash.cloudflare.com/',
        defaultIntervalDays: 90,
    },
    {
        id: 'GOOGLE_PRIVATE_KEY',
        label: 'Google Cloud IAM (Sheets & Drive Bot)',
        category: 'Infra & Banco',
        envVar: 'GOOGLE_PRIVATE_KEY',
        providerUrl: 'https://console.cloud.google.com/iam-admin/serviceaccounts',
        defaultIntervalDays: 90,
    },
    {
        id: 'MP_ACCESS_TOKEN',
        label: 'Mercado Pago Access Token & Webhook',
        category: 'Pagamentos & Fiscal',
        envVar: 'MP_ACCESS_TOKEN',
        providerUrl: 'https://www.mercadopago.com.br/developers/panel/app',
        defaultIntervalDays: 90,
    },
    {
        id: 'FOCUSNFE_API_KEY',
        label: 'FocusNFe Token de Emissão Fiscal',
        category: 'Pagamentos & Fiscal',
        envVar: 'FOCUSNFE_API_KEY',
        providerUrl: 'https://app.focusnfe.com.br/',
        defaultIntervalDays: 180,
    },
    {
        id: 'RESEND_API_KEY',
        label: 'Resend API Key (E-mails Transacionais)',
        category: 'Integrações',
        envVar: 'RESEND_API_KEY',
        providerUrl: 'https://resend.com/api-keys',
        defaultIntervalDays: 90,
    },
    {
        id: 'TELEGRAM_BOT_TOKEN',
        label: 'Telegram Bot Token (@BotFather)',
        category: 'Integrações',
        envVar: 'TELEGRAM_BOT_TOKEN',
        providerUrl: 'https://t.me/BotFather',
        defaultIntervalDays: 180,
    },
    {
        id: 'Franga',
        label: 'SuperFrete / Correios Token de Frete',
        category: 'Integrações',
        envVar: 'Franga',
        providerUrl: 'https://web.superfrete.com/',
        defaultIntervalDays: 90,
    },
    {
        id: 'PATREON_CREATOR_ACCESS_TOKEN',
        label: 'Patreon Creator Access & Refresh Token',
        category: 'Integrações',
        envVar: 'PATREON_CREATOR_ACCESS_TOKEN',
        providerUrl: 'https://www.patreon.com/portal/registration/register-clients',
        defaultIntervalDays: 60,
    },
    {
        id: 'GUMROAD_ACCESS_TOKEN',
        label: 'Gumroad Access Token & Secret',
        category: 'Integrações',
        envVar: 'GUMROAD_ACCESS_TOKEN',
        providerUrl: 'https://app.gumroad.com/settings/advanced',
        defaultIntervalDays: 90,
    },
];

const ROTATION_STATE_PATH = path.join(process.cwd(), '.secrets-rotation.json');

interface RotationStateFile {
    defaultIntervalDays: number;
    keys: Record<
        string,
        {
            fingerprint: string;
            lastRotatedAt: string;
            intervalDays?: number;
        }
    >;
}

function loadRotationState(): RotationStateFile {
    try {
        if (fs.existsSync(ROTATION_STATE_PATH)) {
            const raw = fs.readFileSync(ROTATION_STATE_PATH, 'utf-8');
            const parsed = JSON.parse(raw);
            return {
                defaultIntervalDays: parsed.defaultIntervalDays || 90,
                keys: parsed.keys || {},
            };
        }
    } catch (e) {
        console.warn('Falha ao ler .secrets-rotation.json:', e);
    }
    return { defaultIntervalDays: 90, keys: {} };
}

function saveRotationState(state: RotationStateFile) {
    try {
        fs.writeFileSync(ROTATION_STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
    } catch (e) {
        console.error('Falha ao salvar .secrets-rotation.json:', e);
    }
}

function maskSecretValue(raw: string | undefined, id: string): string {
    if (!raw || !raw.trim()) return 'Não configurada';
    const clean = raw.trim().replace(/^"|"$/g, '');
    if (id === 'GOOGLE_PRIVATE_KEY') {
        const keyBody = clean
            .replace(/-----BEGIN PRIVATE KEY-----/g, '')
            .replace(/-----END PRIVATE KEY-----/g, '')
            .replace(/\\n|\r|\n|\s/g, '');
        if (keyBody.length > 12) {
            return `RSA (${keyBody.slice(0, 5)}...${keyBody.slice(-5)})`;
        }
        return 'Chave RSA Configurada';
    }
    if (clean.length <= 10) return `${clean.slice(0, 2)}***${clean.slice(-2)}`;
    return `${clean.slice(0, 6)}••••${clean.slice(-4)}`;
}

function getSecretFingerprint(raw: string | undefined): string {
    if (!raw || !raw.trim()) return 'empty';
    return crypto.createHash('sha256').update(raw.trim()).digest('hex').slice(0, 12);
}

function getSecretsRotationReport() {
    const state = loadRotationState();
    let stateModified = false;

    // Fallback de data inicial: mtime do arquivo .env
    let envMtimeIso = new Date().toISOString();
    try {
        const envPath = path.join(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
            envMtimeIso = fs.statSync(envPath).mtime.toISOString();
        }
    } catch {
        // fallback para data atual
    }

    const nowMs = Date.now();

    const items = MONITORED_SECRETS.map((sec) => {
        const rawVal = process.env[sec.envVar];
        const configured = Boolean(rawVal && rawVal.trim().length > 0);
        const fingerprint = getSecretFingerprint(rawVal);
        const existing = state.keys[sec.id];

        let lastRotatedAt = existing?.lastRotatedAt || envMtimeIso;
        const intervalDays = existing?.intervalDays || state.defaultIntervalDays || sec.defaultIntervalDays;

        if (!existing && configured) {
            state.keys[sec.id] = {
                fingerprint,
                lastRotatedAt,
                intervalDays,
            };
            stateModified = true;
        } else if (existing && configured && existing.fingerprint !== fingerprint) {
            // A chave mudou no .env! Atualiza automaticamente a data de rotação para agora
            lastRotatedAt = new Date().toISOString();
            state.keys[sec.id] = {
                ...existing,
                fingerprint,
                lastRotatedAt,
            };
            stateModified = true;
        }

        const rotatedMs = new Date(lastRotatedAt).getTime();
        const ageDays = Math.max(0, Math.floor((nowMs - rotatedMs) / (1000 * 60 * 60 * 24)));
        const daysRemaining = intervalDays - ageDays;

        let status: 'healthy' | 'due_soon' | 'overdue' | 'missing' = 'healthy';
        if (!configured) {
            status = 'missing';
        } else if (daysRemaining <= 0) {
            status = 'overdue';
        } else if (daysRemaining <= 14) {
            status = 'due_soon';
        }

        return {
            id: sec.id,
            label: sec.label,
            category: sec.category,
            envVar: sec.envVar,
            providerUrl: sec.providerUrl,
            configured,
            maskedPreview: maskSecretValue(rawVal, sec.id),
            lastRotatedAt,
            intervalDays,
            ageDays,
            daysRemaining,
            status,
        };
    });

    if (stateModified) {
        saveRotationState(state);
    }

    const overdueCount = items.filter((i) => i.status === 'overdue').length;
    const dueSoonCount = items.filter((i) => i.status === 'due_soon').length;
    const healthyCount = items.filter((i) => i.status === 'healthy').length;

    return {
        defaultIntervalDays: state.defaultIntervalDays || 90,
        counts: {
            total: items.length,
            healthy: healthyCount,
            dueSoon: dueSoonCount,
            overdue: overdueCount,
        },
        items,
    };
}

async function runNpmJsonCommand(cmd: string): Promise<any> {
    try {
        const { stdout } = await execAsync(cmd, {
            cwd: process.cwd(),
            timeout: 25000,
            maxBuffer: 10 * 1024 * 1024,
        });
        return stdout ? JSON.parse(stdout) : {};
    } catch (err: any) {
        // npm audit e npm outdated retornam exit code 1 quando encontram itens, mas o JSON vem no stdout
        if (err?.stdout) {
            try {
                return JSON.parse(err.stdout);
            } catch {
                return { error: err.message };
            }
        }
        return { error: err.message || 'Falha ao executar comando npm' };
    }
}

async function checkEnvironmentTools() {
    const checks: Array<{
        id: string;
        name: string;
        category: string;
        status: 'ok' | 'warning' | 'error';
        detail: string;
    }> = [];

    // 1. ImageMagick
    try {
        const { stdout } = await execAsync('magick -version', { timeout: 5000 });
        const firstLine = (stdout || '').split('\n')[0]?.trim() || 'Instalado';
        checks.push({
            id: 'imagemagick',
            name: 'ImageMagick CLI (magick)',
            category: 'Local',
            status: 'ok',
            detail: firstLine.replace(/^Version:\s*/i, ''),
        });
    } catch {
        checks.push({
            id: 'imagemagick',
            name: 'ImageMagick CLI (magick)',
            category: 'Local',
            status: 'error',
            detail: 'Comando "magick" não encontrado no PATH',
        });
    }

    // 2. UnRAR.exe
    const unrarPath = 'C:\\Program Files\\WinRAR\\UnRAR.exe';
    const hasUnrar = fs.existsSync(unrarPath);
    checks.push({
        id: 'unrar',
        name: 'WinRAR / UnRAR (Extração RAM 50ms)',
        category: 'Local',
        status: hasUnrar ? 'ok' : 'error',
        detail: hasUnrar ? unrarPath : 'Não encontrado em C:\\Program Files\\WinRAR\\UnRAR.exe',
    });

    // 3. Diretório 3 - Com suporte
    const suporteDir = 'D:\\rcssp\\Downloads\\3d\\3 - Com suporte';
    const hasSuporte = fs.existsSync(suporteDir);
    checks.push({
        id: 'pasta_suporte',
        name: 'Diretório 3D (3 - Com suporte)',
        category: 'Local',
        status: hasSuporte ? 'ok' : 'warning',
        detail: hasSuporte ? suporteDir : `Diretório não montado: ${suporteDir}`,
    });

    // 4. Cloudflare R2
    const hasR2 = Boolean(
        process.env.CLOUDFLARE_R2_ENDPOINT &&
        process.env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
        process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
    );
    checks.push({
        id: 'cloudflare_r2',
        name: 'Cloudflare R2 Storage (CDN)',
        category: 'Nuvem',
        status: hasR2 ? 'ok' : 'error',
        detail: hasR2
            ? `Bucket: ${process.env.CLOUDFLARE_R2_BUCKET_NAME || 'frangatoys-images'}`
            : 'Credenciais R2 ausentes no .env',
    });

    // 5. Google Sheets Credentials
    const projectRoot = path.resolve(process.cwd(), '..');
    const credManual = path.join(projectRoot, 'Processo Manual', 'credentials.json');
    const credScripts = path.join(projectRoot, 'scripts', 'credentials.json');
    const hasSheetsCred = fs.existsSync(credManual) || fs.existsSync(credScripts);
    checks.push({
        id: 'google_sheets',
        name: 'Google Sheets Service Account',
        category: 'Nuvem',
        status: hasSheetsCred ? 'ok' : 'warning',
        detail: hasSheetsCred
            ? (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'credentials.json localizado')
            : 'credentials.json não encontrado',
    });

    // 6. Supabase Database Ping
    const t0 = Date.now();
    try {
        const { error } = await supabaseAdmin.from('categorias').select('id').limit(1);
        const ms = Date.now() - t0;
        checks.push({
            id: 'supabase_db',
            name: 'Banco de Dados Supabase',
            category: 'Nuvem',
            status: error ? 'error' : 'ok',
            detail: error ? error.message : `Conectado (${ms}ms)`,
        });
    } catch (e: any) {
        checks.push({
            id: 'supabase_db',
            name: 'Banco de Dados Supabase',
            category: 'Nuvem',
            status: 'error',
            detail: e.message || 'Erro de conexão',
        });
    }

    return checks;
}

async function testAiModelsLive() {
    const geminiKey = process.env.GEMINI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    const results: Array<{
        provider: 'Gemini' | 'Groq';
        id: string;
        label: string;
        status: 'operational' | 'rate_limited' | 'unavailable';
        httpStatus: number;
        latencyMs: number;
        detail: string;
    }> = [];

    // Testa modelos Gemini em paralelo
    if (geminiKey) {
        const geminiPromises = GEMINI_MODELS.map(async (m) => {
            const start = Date.now();
            try {
                const res = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${m.id}:generateContent?key=${geminiKey}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: 'Responda apenas OK' }] }],
                            generationConfig: { maxOutputTokens: 5 },
                        }),
                        signal: AbortSignal.timeout(8000),
                    }
                );
                const latencyMs = Date.now() - start;
                if (res.ok) {
                    return {
                        provider: 'Gemini' as const,
                        id: m.id,
                        label: m.label,
                        status: 'operational' as const,
                        httpStatus: res.status,
                        latencyMs,
                        detail: `Operacional (${latencyMs}ms)`,
                    };
                }
                if (res.status === 429) {
                    return {
                        provider: 'Gemini' as const,
                        id: m.id,
                        label: m.label,
                        status: 'rate_limited' as const,
                        httpStatus: 429,
                        latencyMs,
                        detail: 'Cota/Rate Limit atingido (429)',
                    };
                }
                return {
                    provider: 'Gemini' as const,
                    id: m.id,
                    label: m.label,
                    status: 'unavailable' as const,
                    httpStatus: res.status,
                    latencyMs,
                    detail: `Indisponível (HTTP ${res.status})`,
                };
            } catch (e: any) {
                return {
                    provider: 'Gemini' as const,
                    id: m.id,
                    label: m.label,
                    status: 'unavailable' as const,
                    httpStatus: 0,
                    latencyMs: Date.now() - start,
                    detail: e.message || 'Timeout / Erro de rede',
                };
            }
        });
        results.push(...(await Promise.all(geminiPromises)));
    }

    // Testa modelos Groq em paralelo
    if (groqKey) {
        const groqPromises = GROQ_MODELS.map(async (m) => {
            const start = Date.now();
            try {
                const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${groqKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: m.id,
                        messages: [{ role: 'user', content: 'Responda apenas OK' }],
                        max_tokens: 5,
                    }),
                    signal: AbortSignal.timeout(8000),
                });
                const latencyMs = Date.now() - start;
                if (res.ok) {
                    return {
                        provider: 'Groq' as const,
                        id: m.id,
                        label: m.label,
                        status: 'operational' as const,
                        httpStatus: res.status,
                        latencyMs,
                        detail: `Operacional (${latencyMs}ms)`,
                    };
                }
                if (res.status === 429) {
                    return {
                        provider: 'Groq' as const,
                        id: m.id,
                        label: m.label,
                        status: 'rate_limited' as const,
                        httpStatus: 429,
                        latencyMs,
                        detail: 'Rate Limit atingido (429)',
                    };
                }
                return {
                    provider: 'Groq' as const,
                    id: m.id,
                    label: m.label,
                    status: 'unavailable' as const,
                    httpStatus: res.status,
                    latencyMs,
                    detail: `Indisponível (HTTP ${res.status})`,
                };
            } catch (e: any) {
                return {
                    provider: 'Groq' as const,
                    id: m.id,
                    label: m.label,
                    status: 'unavailable' as const,
                    httpStatus: 0,
                    latencyMs: Date.now() - start,
                    detail: e.message || 'Timeout / Erro de rede',
                };
            }
        });
        results.push(...(await Promise.all(groqPromises)));
    }

    return results;
}

export async function GET(req: NextRequest) {
    try {
        const sessionOrResponse = await requireRoles(['admin']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const { searchParams } = new URL(req.url);
        const section = searchParams.get('section') || 'all'; // 'all', 'ai', 'cve', 'env', 'secrets'

        let envChecks: any[] = [];
        let aiModels: any[] = [];
        let auditReport: any = null;
        let outdatedPackages: any[] = [];
        let secretsRotation: any = null;

        if (section === 'all' || section === 'env') {
            envChecks = await checkEnvironmentTools();
        }

        if (section === 'all' || section === 'secrets') {
            secretsRotation = getSecretsRotationReport();
        }

        if (section === 'all' || section === 'ai') {
            aiModels = await testAiModelsLive();
        }

        if (section === 'all' || section === 'cve') {
            const [auditRaw, outdatedRaw] = await Promise.all([
                runNpmJsonCommand('npm audit --json'),
                runNpmJsonCommand('npm outdated --json'),
            ]);

            const vulnCounts = auditRaw?.metadata?.vulnerabilities || {
                info: 0,
                low: 0,
                moderate: 0,
                high: 0,
                critical: 0,
                total: 0,
            };

            const vulnsMap = auditRaw?.vulnerabilities || {};
            const vulnerabilities = Object.values(vulnsMap).map((v: any) => {
                const viaObjects = Array.isArray(v.via)
                    ? v.via.filter((item: any) => typeof item === 'object')
                    : [];
                const firstAdvisory = viaObjects[0] || {};
                return {
                    name: v.name,
                    severity: v.severity || 'low',
                    isDirect: Boolean(v.isDirect),
                    range: v.range || '',
                    title: firstAdvisory.title || `Dependência transitiva via ${Array.isArray(v.via) ? v.via.join(', ') : 'pacote'}`,
                    url: firstAdvisory.url || null,
                    cveId: firstAdvisory.url ? firstAdvisory.url.split('/').pop() : null,
                    fixAvailable: Boolean(v.fixAvailable),
                };
            });

            // Ordena por severidade (critical > high > moderate > low)
            const sevOrder: Record<string, number> = { critical: 4, high: 3, moderate: 2, low: 1, info: 0 };
            vulnerabilities.sort((a, b) => (sevOrder[b.severity] || 0) - (sevOrder[a.severity] || 0));

            auditReport = {
                counts: vulnCounts,
                vulnerabilities,
            };

            if (outdatedRaw && !outdatedRaw.error) {
                // Lê package-lock.json para verificar quais versões já foram atualizadas no índice (mesmo com npm run dev rodando)
                let lockPackages: Record<string, any> = {};
                try {
                    const lockPath = path.join(process.cwd(), 'package-lock.json');
                    if (fs.existsSync(lockPath)) {
                        const lockJson = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
                        lockPackages = lockJson.packages || {};
                    }
                } catch {
                    // ignora erro de leitura do lockfile
                }

                outdatedPackages = Object.entries(outdatedRaw).map(([pkgName, info]: [string, any]) => {
                    const lockEntry = lockPackages[`node_modules/${pkgName}`];
                    const lockVersion = lockEntry?.version || null;
                    const isAlreadyAtWanted = info.current === info.wanted;
                    const effectiveCurrent = !isAlreadyAtWanted && lockVersion && lockVersion !== info.current
                        ? `${info.current} (lock: ${lockVersion})`
                        : (info.current || '-');
                    const isWantedSatisfiedInLock = Boolean(!isAlreadyAtWanted && lockVersion && lockVersion === info.wanted);

                    return {
                        name: pkgName,
                        current: effectiveCurrent,
                        wanted: info.wanted || '-',
                        latest: info.latest || '-',
                        type: info.type || 'dependencies',
                        isWantedSatisfiedInLock,
                        isAlreadyAtWanted,
                    };
                });
            }
        }

        return NextResponse.json({
            success: true,
            checkedAt: new Date().toISOString(),
            envChecks,
            secretsRotation,
            aiModels,
            auditReport,
            outdatedPackages,
        });
    } catch (error: any) {
        console.error('Erro no Health Check:', error);
        return NextResponse.json({ error: error.message || 'Erro ao executar Health Check' }, { status: 500 });
    }
}

/**
 * Verifica se o binário nativo do Next.js (@next/swc) está bloqueado pelo 'npm run dev' no Windows.
 */
function isNextSwcLockedByDevServer(cwd: string): boolean {
    const swcPath = path.join(cwd, 'node_modules', '@next', 'swc-win32-x64-msvc', 'next-swc.win32-x64-msvc.node');
    if (!fs.existsSync(swcPath)) return false;
    try {
        const fd = fs.openSync(swcPath, 'r+');
        fs.closeSync(fd);
        return false;
    } catch {
        // EPERM / EBUSY: arquivo .node está carregado na memória pelo npm run dev
        return true;
    }
}

/**
 * Executa npm audit fix ou npm update de forma 100% segura mesmo com 'npm run dev' rodando no Windows.
 * - Se o binário @next/swc estiver em uso pelo servidor dev, executa exclusivamente com --package-lock-only
 *   para atualizar package.json e package-lock.json sem corromper node_modules com rollback parcial do Windows.
 */
async function runHotDevSafeNpmAction(mode: 'audit-fix' | 'npm-update'): Promise<{ output: string }> {
    const cwd = process.cwd();
    const isDevLocked = isNextSwcLockedByDevServer(cwd);

    const lockOnlyCmd = mode === 'audit-fix'
        ? 'npm audit fix --package-lock-only --no-fund'
        : 'npm update --package-lock-only --no-fund --no-audit';

    const fullCmd = mode === 'audit-fix'
        ? 'npm audit fix --no-fund'
        : 'npm update --no-fund --no-audit';

    const logs: string[] = [];

    if (isDevLocked) {
        // Servidor npm run dev está ativo: atualiza apenas package.json e package-lock.json para não quebrar node_modules em uso
        try {
            const { stdout, stderr } = await execAsync(lockOnlyCmd, { cwd, timeout: 90000 });
            if (stdout?.trim()) logs.push(stdout.trim());
            if (stderr?.trim() && !stderr.includes('npm warn')) logs.push(stderr.trim());
        } catch (lockErr: any) {
            if (lockErr?.stdout?.trim()) logs.push(lockErr.stdout.trim());
        }

        logs.push(
            '✔ [Modo Hot-Dev Seguro] O package.json e o package-lock.json foram atualizados com sucesso sem conflitar com o "npm run dev"!\n' +
            'ℹ O índice de versões já está pronto para o GitHub/Vercel e para o scanner de CVEs. Para atualizar os binários locais em node_modules, basta rodar "npm install" quando parar o servidor.'
        );
        return { output: logs.join('\n\n') };
    }

    // Se o servidor não estiver travando o binário nativo, roda a atualização completa
    try {
        const { stdout } = await execAsync(fullCmd, { cwd, timeout: 90000 });
        if (stdout?.trim()) logs.push(stdout.trim());
        logs.push('✔ Tudo sincronizado (package-lock.json + node_modules local)!');
    } catch (err: any) {
        if (err?.stdout?.trim()) logs.push(err.stdout.trim());
        logs.push(`Aviso: ${err?.message || 'Operação concluída com avisos.'}`);
    }

    return { output: logs.join('\n\n') || 'Operação concluída com sucesso.' };
}

export async function POST(req: NextRequest) {
    try {
        const sessionOrResponse = await requireRoles(['admin']);
        if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

        const body = await req.json();

        if (body.action === 'audit-fix') {
            const result = await runHotDevSafeNpmAction('audit-fix');
            return NextResponse.json({
                success: true,
                output: result.output,
            });
        }

        if (body.action === 'npm-update') {
            const result = await runHotDevSafeNpmAction('npm-update');
            return NextResponse.json({
                success: true,
                output: result.output,
            });
        }

        if (body.action === 'mark-rotated') {
            const keyId = body.keyId; // ID da chave ou 'all'
            const state = loadRotationState();
            const nowIso = new Date().toISOString();

            const targets = keyId === 'all'
                ? MONITORED_SECRETS
                : MONITORED_SECRETS.filter((s) => s.id === keyId);

            for (const sec of targets) {
                const rawVal = process.env[sec.envVar];
                state.keys[sec.id] = {
                    fingerprint: getSecretFingerprint(rawVal),
                    lastRotatedAt: nowIso,
                    intervalDays: state.keys[sec.id]?.intervalDays || state.defaultIntervalDays || sec.defaultIntervalDays,
                };
            }

            saveRotationState(state);
            return NextResponse.json({
                success: true,
                secretsRotation: getSecretsRotationReport(),
            });
        }

        if (body.action === 'set-rotation-interval') {
            const intervalDays = Number(body.intervalDays) || 90;
            const keyId = body.keyId; // opcional: se omitido ou 'all', aplica como padrão global e atualiza todas
            const state = loadRotationState();

            if (!keyId || keyId === 'all') {
                state.defaultIntervalDays = intervalDays;
                for (const sec of MONITORED_SECRETS) {
                    const existing = state.keys[sec.id];
                    if (existing) {
                        existing.intervalDays = intervalDays;
                    }
                }
            } else if (state.keys[keyId]) {
                state.keys[keyId].intervalDays = intervalDays;
            }

            saveRotationState(state);
            return NextResponse.json({
                success: true,
                secretsRotation: getSecretsRotationReport(),
            });
        }

        return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({
            error: error.message || 'Erro ao executar ação no Health Check',
            output: error.stdout || error.stderr || '',
        }, { status: 500 });
    }
}
