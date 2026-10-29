'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    ShieldCheck,
    ShieldAlert,
    Activity,
    Package,
    RefreshCw,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    ExternalLink,
    Wrench,
    HardDrive,
    Cloud,
    Sparkles,
    Terminal,
    Clock,
    KeyRound,
    Check
} from 'lucide-react';
import { toast } from 'sonner';

interface EnvCheck {
    id: string;
    name: string;
    category: 'Local' | 'Nuvem' | string;
    status: 'ok' | 'warning' | 'error';
    detail: string;
}

interface AiModelCheck {
    provider: 'Gemini' | 'Groq';
    id: string;
    label: string;
    status: 'operational' | 'rate_limited' | 'unavailable';
    httpStatus: number;
    latencyMs: number;
    detail: string;
}

interface VulnerabilityItem {
    name: string;
    severity: 'critical' | 'high' | 'moderate' | 'low' | 'info';
    isDirect: boolean;
    range: string;
    title: string;
    url: string | null;
    cveId: string | null;
    fixAvailable: boolean;
}

interface OutdatedPackage {
    name: string;
    current: string;
    wanted: string;
    latest: string;
    type: string;
    isWantedSatisfiedInLock?: boolean;
    isAlreadyAtWanted?: boolean;
}

interface AuditReport {
    counts: {
        info: number;
        low: number;
        moderate: number;
        high: number;
        critical: number;
        total: number;
    };
    vulnerabilities: VulnerabilityItem[];
}

interface SecretRotationItem {
    id: string;
    label: string;
    category: 'IA' | 'Infra & Banco' | 'Pagamentos & Fiscal' | 'Integrações';
    envVar: string;
    providerUrl: string;
    configured: boolean;
    maskedPreview: string;
    lastRotatedAt: string;
    intervalDays: number;
    ageDays: number;
    daysRemaining: number;
    status: 'healthy' | 'due_soon' | 'overdue' | 'missing';
}

interface SecretsRotationReport {
    defaultIntervalDays: number;
    counts: {
        total: number;
        healthy: number;
        dueSoon: number;
        overdue: number;
    };
    items: SecretRotationItem[];
}

export default function HealthCheckPanel() {
    const [loadingAll, setLoadingAll] = useState(true);
    const [loadingSection, setLoadingSection] = useState<'env' | 'ai' | 'cve' | 'secrets' | null>(null);
    const [runningAuditFix, setRunningAuditFix] = useState(false);
    const [runningNpmUpdate, setRunningNpmUpdate] = useState(false);
    const [auditFixOutput, setAuditFixOutput] = useState<string | null>(null);
    const [rotatingKeyId, setRotatingKeyId] = useState<string | null>(null);

    const [checkedAt, setCheckedAt] = useState<string | null>(null);
    const [envChecks, setEnvChecks] = useState<EnvCheck[]>([]);
    const [secretsRotation, setSecretsRotation] = useState<SecretsRotationReport | null>(null);
    const [aiModels, setAiModels] = useState<AiModelCheck[]>([]);
    const [auditReport, setAuditReport] = useState<AuditReport | null>(null);
    const [outdatedPackages, setOutdatedPackages] = useState<OutdatedPackage[]>([]);

    const fetchHealthData = useCallback(async (section: 'all' | 'env' | 'ai' | 'cve' | 'secrets' = 'all') => {
        if (section === 'all') {
            setLoadingAll(true);
        } else {
            setLoadingSection(section);
        }

        try {
            const res = await fetch(`/api/admin/automation/health-check?section=${section}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Falha ao consultar Health Check');

            if (data.checkedAt) setCheckedAt(data.checkedAt);
            if (section === 'all' || section === 'env') setEnvChecks(data.envChecks || []);
            if (section === 'all' || section === 'secrets') setSecretsRotation(data.secretsRotation || null);
            if (section === 'all' || section === 'ai') setAiModels(data.aiModels || []);
            if (section === 'all' || section === 'cve') {
                setAuditReport(data.auditReport || null);
                setOutdatedPackages(data.outdatedPackages || []);
            }

            if (section !== 'all') {
                toast.success('Diagnóstico atualizado!');
            }
        } catch (err: any) {
            toast.error(err.message || 'Erro ao executar diagnóstico');
        } finally {
            setLoadingAll(false);
            setLoadingSection(null);
        }
    }, []);

    useEffect(() => {
        fetchHealthData('all');
    }, [fetchHealthData]);

    const handleRunAuditFix = async () => {
        setRunningAuditFix(true);
        setAuditFixOutput(null);
        try {
            const res = await fetch('/api/admin/automation/health-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'audit-fix' }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao rodar npm audit fix');

            setAuditFixOutput(data.output || 'Correção aplicada com sucesso.');
            toast.success('npm audit fix concluído! Atualizando radar de CVEs...');
            await fetchHealthData('cve');
        } catch (err: any) {
            toast.error(err.message || 'Falha ao corrigir pacotes');
        } finally {
            setRunningAuditFix(false);
        }
    };

    const handleRunNpmUpdate = async () => {
        setRunningNpmUpdate(true);
        setAuditFixOutput(null);
        try {
            const res = await fetch('/api/admin/automation/health-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'npm-update' }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao rodar npm update');

            setAuditFixOutput(data.output || 'Pacotes compatíveis atualizados com sucesso.');
            toast.success('npm update concluído! Atualizando lista de pacotes...');
            await fetchHealthData('cve');
        } catch (err: any) {
            toast.error(err.message || 'Falha ao atualizar pacotes');
        } finally {
            setRunningNpmUpdate(false);
        }
    };

    const handleMarkRotated = async (keyId: string | 'all', label?: string) => {
        setRotatingKeyId(keyId);
        try {
            const res = await fetch('/api/admin/automation/health-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'mark-rotated', keyId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Falha ao registrar rotação');

            if (data.secretsRotation) {
                setSecretsRotation(data.secretsRotation);
            }
            toast.success(
                keyId === 'all'
                    ? 'Todas as chaves marcadas como rotacionadas hoje!'
                    : `Ciclo de rotação reiniciado para ${label || keyId}!`
            );
        } catch (err: any) {
            toast.error(err.message || 'Erro ao atualizar ciclo da chave');
        } finally {
            setRotatingKeyId(null);
        }
    };

    const handleChangeRotationInterval = async (intervalDays: number) => {
        try {
            const res = await fetch('/api/admin/automation/health-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'set-rotation-interval', intervalDays }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Falha ao alterar intervalo');

            if (data.secretsRotation) {
                setSecretsRotation(data.secretsRotation);
            }
            toast.success(`Lembrete de rotação ajustado para cada ${intervalDays} dias.`);
        } catch (err: any) {
            toast.error(err.message || 'Erro ao salvar intervalo de rotação');
        }
    };

    const operationalAiCount = aiModels.filter(m => m.status === 'operational').length;
    const okEnvCount = envChecks.filter(c => c.status === 'ok').length;
    const totalVulns = auditReport?.counts?.total || 0;
    const criticalOrHighVulns = (auditReport?.counts?.critical || 0) + (auditReport?.counts?.high || 0);
    const overdueSecrets = secretsRotation?.counts?.overdue || 0;
    const dueSoonSecrets = secretsRotation?.counts?.dueSoon || 0;

    const getSeverityBadge = (severity: string) => {
        switch (severity) {
            case 'critical':
                return 'bg-red-500/20 text-red-400 border-red-500/40';
            case 'high':
                return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
            case 'moderate':
                return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
            default:
                return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
        }
    };

    const getSeverityLabel = (severity: string) => {
        switch (severity) {
            case 'critical': return 'Crítica';
            case 'high': return 'Alta';
            case 'moderate': return 'Moderada';
            case 'low': return 'Baixa';
            default: return 'Info';
        }
    };

    return (
        <div className="space-y-6 relative z-10 animate-in fade-in duration-200">
            {/* Barra Superior de Status Geral */}
            <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border shadow-lg ${
                        criticalOrHighVulns > 0 || overdueSecrets > 0
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    }`}>
                        {criticalOrHighVulns > 0 || overdueSecrets > 0 ? (
                            <ShieldAlert className="w-5 h-5" />
                        ) : (
                            <ShieldCheck className="w-5 h-5" />
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <h2 className="text-sm font-black uppercase tracking-wider text-white">
                                Diagnóstico de Saúde, Segredos & Segurança (CVE)
                            </h2>
                            {checkedAt && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-orange-400" />
                                    {new Date(checkedAt).toLocaleTimeString('pt-BR')}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5">
                            Monitoramento em tempo real da esteira 3D, disponibilidade dos modelos de IA, rotação de chaves e auditoria npm.
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => fetchHealthData('all')}
                    disabled={loadingAll || loadingSection !== null}
                    className="py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-black font-black uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50 shrink-0 cursor-pointer"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingAll ? 'animate-spin' : ''}`} />
                    {loadingAll ? 'Executando Diagnóstico...' : 'Rodar Diagnóstico Completo'}
                </button>
            </div>

            {/* 1. CHECKLIST DE FERRAMENTAS & INTEGRAÇÕES DA ESTEIRA */}
            <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                        <HardDrive className="w-4 h-4 text-orange-500" />
                        <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300">
                            1. Infraestrutura Local & Integrações de Nuvem
                        </h3>
                        {!loadingAll && envChecks.length > 0 && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold">
                                {okEnvCount}/{envChecks.length} OK
                            </span>
                        )}
                    </div>

                    <button
                        onClick={() => fetchHealthData('env')}
                        disabled={loadingAll || loadingSection === 'env'}
                        className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                        title="Testar ambiente novamente"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingSection === 'env' ? 'animate-spin text-orange-400' : ''}`} />
                    </button>
                </div>

                {loadingAll && envChecks.length === 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {[1, 2, 3, 4, 5, 6].map(n => (
                            <div key={n} className="h-20 rounded-xl bg-zinc-900/40 border border-zinc-800/60 animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {envChecks.map((check) => (
                            <div
                                key={check.id}
                                className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex items-start justify-between gap-3"
                            >
                                <div className="min-w-0 space-y-1">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-400 font-bold">
                                            {check.category === 'Local' ? (
                                                <span className="flex items-center gap-1"><HardDrive className="w-2.5 h-2.5 text-amber-400" /> Local</span>
                                            ) : (
                                                <span className="flex items-center gap-1"><Cloud className="w-2.5 h-2.5 text-cyan-400" /> Nuvem</span>
                                            )}
                                        </span>
                                        <h4 className="text-xs font-bold text-white truncate" title={check.name}>
                                            {check.name}
                                        </h4>
                                    </div>
                                    <p className="text-[11px] font-mono text-zinc-400 truncate" title={check.detail}>
                                        {check.detail}
                                    </p>
                                </div>

                                <div className="shrink-0">
                                    {check.status === 'ok' && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase">
                                            <CheckCircle2 className="w-3 h-3" /> OK
                                        </span>
                                    )}
                                    {check.status === 'warning' && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase">
                                            <AlertTriangle className="w-3 h-3" /> Aviso
                                        </span>
                                    )}
                                    {check.status === 'error' && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-black uppercase">
                                            <XCircle className="w-3 h-3" /> Falha
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 2. VALIDADOR AO VIVO DE MODELOS DE IA (GEMINI & GROQ) */}
            <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                        <Sparkles className="w-4 h-4 text-orange-500" />
                        <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300">
                            2. Disponibilidade ao Vivo dos Modelos de IA (Cascata Gemini & Groq)
                        </h3>
                        {!loadingAll && aiModels.length > 0 && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-emerald-400 font-bold">
                                {operationalAiCount}/{aiModels.length} operacionais
                            </span>
                        )}
                    </div>

                    <button
                        onClick={() => fetchHealthData('ai')}
                        disabled={loadingAll || loadingSection === 'ai'}
                        className="py-1.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingSection === 'ai' ? 'animate-spin text-orange-400' : ''}`} />
                        {loadingSection === 'ai' ? 'Pingando Modelos...' : 'Testar Modelos Agora'}
                    </button>
                </div>

                {loadingAll && aiModels.length === 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {[1, 2, 3, 4, 5, 6].map(n => (
                            <div key={n} className="h-20 rounded-xl bg-zinc-900/40 border border-zinc-800/60 animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {aiModels.map((model) => (
                            <div
                                key={`${model.provider}-${model.id}`}
                                className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex items-center justify-between gap-3"
                            >
                                <div className="min-w-0 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                                            model.provider === 'Gemini'
                                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                                : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                                        }`}>
                                            {model.provider}
                                        </span>
                                        <h4 className="text-xs font-bold text-white truncate" title={model.label}>
                                            {model.label}
                                        </h4>
                                    </div>
                                    <p className="text-[11px] font-mono text-zinc-500 truncate" title={model.id}>
                                        {model.id}
                                    </p>
                                </div>

                                <div className="shrink-0 text-right">
                                    {model.status === 'operational' && (
                                        <div className="inline-flex flex-col items-end">
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                Online
                                            </span>
                                            <span className="text-[10px] font-mono text-zinc-500 mt-1">
                                                {model.latencyMs}ms
                                            </span>
                                        </div>
                                    )}
                                    {model.status === 'rate_limited' && (
                                        <div className="inline-flex flex-col items-end">
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase">
                                                429 Cota
                                            </span>
                                            <span className="text-[10px] font-mono text-zinc-500 mt-1">
                                                Rate Limit
                                            </span>
                                        </div>
                                    )}
                                    {model.status === 'unavailable' && (
                                        <div className="inline-flex flex-col items-end">
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-black uppercase">
                                                Offline ({model.httpStatus || 'ERR'})
                                            </span>
                                            <span className="text-[10px] font-mono text-zinc-500 mt-1 max-w-[110px] truncate" title={model.detail}>
                                                {model.detail}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 3. LEMBRETE & CICLO DE ROTAÇÃO DE CHAVES E SECRETS (.ENV) */}
            <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-6 space-y-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <KeyRound className="w-4 h-4 text-orange-500" />
                        <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300">
                            3. Lembrete de Rotação de Chaves & Secrets (.env)
                        </h3>
                        {secretsRotation && (
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
                                    {secretsRotation.counts.healthy} em dia
                                </span>
                                {dueSoonSecrets > 0 && (
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold">
                                        {dueSoonSecrets} vencendo em breve
                                    </span>
                                )}
                                {overdueSecrets > 0 && (
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-red-500/15 border border-red-500/40 text-red-400 font-bold animate-pulse">
                                        {overdueSecrets} rotação pendente
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                                Rotacionar a cada:
                            </span>
                            <select
                                value={secretsRotation?.defaultIntervalDays || 90}
                                onChange={(e) => handleChangeRotationInterval(Number(e.target.value))}
                                className="bg-transparent text-xs font-mono font-bold text-orange-400 outline-none cursor-pointer"
                            >
                                <option value={30} className="bg-zinc-900 text-zinc-200">30 dias</option>
                                <option value={60} className="bg-zinc-900 text-zinc-200">60 dias</option>
                                <option value={90} className="bg-zinc-900 text-zinc-200">90 dias (Recomendado)</option>
                                <option value={180} className="bg-zinc-900 text-zinc-200">180 dias (6 meses)</option>
                                <option value={365} className="bg-zinc-900 text-zinc-200">365 dias (1 ano)</option>
                            </select>
                        </div>

                        <button
                            onClick={() => handleMarkRotated('all')}
                            disabled={rotatingKeyId !== null || loadingAll}
                            className="py-1.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                            title="Reiniciar a contagem de todas as chaves para a data de hoje"
                        >
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            Marcar Todas Hoje
                        </button>
                    </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/70 flex items-center justify-between gap-3 text-[11px] text-zinc-400">
                    <span>
                        💡 <strong className="text-zinc-200">Detecção Automática:</strong> Sempre que você alterar o valor de uma chave no arquivo <code className="text-orange-400 font-mono">.env</code>, o Health Check detecta a nova assinatura (hash SHA-256) e zera o cronômetro daquela chave automaticamente.
                    </span>
                </div>

                {loadingAll && !secretsRotation ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {[1, 2, 3, 4, 5, 6].map(n => (
                            <div key={n} className="h-28 rounded-xl bg-zinc-900/40 border border-zinc-800/60 animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {secretsRotation?.items.map((item) => {
                            const progressPct = Math.min(100, Math.round((item.ageDays / item.intervalDays) * 100));
                            const isOverdue = item.status === 'overdue';
                            const isDueSoon = item.status === 'due_soon';

                            return (
                                <div
                                    key={item.id}
                                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                                        isOverdue
                                            ? 'bg-red-500/5 border-red-500/30'
                                            : isDueSoon
                                            ? 'bg-amber-500/5 border-amber-500/30'
                                            : 'bg-zinc-900/40 border-zinc-800/80'
                                    }`}
                                >
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-400 font-bold">
                                                {item.category}
                                            </span>

                                            {item.status === 'healthy' && (
                                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                                                    Faltam {item.daysRemaining}d
                                                </span>
                                            )}
                                            {item.status === 'due_soon' && (
                                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-400">
                                                    Vence em {item.daysRemaining}d
                                                </span>
                                            )}
                                            {item.status === 'overdue' && (
                                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-red-500/20 border border-red-500/40 text-red-400">
                                                    Vencida ({Math.abs(item.daysRemaining)}d)
                                                </span>
                                            )}
                                            {item.status === 'missing' && (
                                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400">
                                                    Ausente
                                                </span>
                                            )}
                                        </div>

                                        <div>
                                            <h4 className="text-xs font-bold text-white truncate" title={item.label}>
                                                {item.label}
                                            </h4>
                                            <div className="flex items-center justify-between gap-2 mt-0.5">
                                                <span className="text-[10px] font-mono text-zinc-500 truncate" title={item.envVar}>
                                                    {item.envVar}
                                                </span>
                                                <span className="text-[10px] font-mono text-orange-300/90 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">
                                                    {item.maskedPreview}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Barra de progresso do ciclo */}
                                        <div className="space-y-1 pt-1">
                                            <div className="w-full h-1.5 rounded-full bg-zinc-950 overflow-hidden border border-zinc-800/80">
                                                <div
                                                    className={`h-full transition-all ${
                                                        isOverdue
                                                            ? 'bg-red-500'
                                                            : isDueSoon
                                                            ? 'bg-amber-500'
                                                            : 'bg-emerald-500'
                                                    }`}
                                                    style={{ width: `${progressPct}%` }}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                                                <span>
                                                    Última: {new Date(item.lastRotatedAt).toLocaleDateString('pt-BR')} ({item.ageDays}d)
                                                </span>
                                                <span>Ciclo: {item.intervalDays}d</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 pt-1 border-t border-zinc-800/60">
                                        <a
                                            href={item.providerUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 py-1.5 px-2.5 rounded-lg bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-orange-400 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                                        >
                                            <span>Painel da Chave</span>
                                            <ExternalLink className="w-3 h-3" />
                                        </a>

                                        <button
                                            onClick={() => handleMarkRotated(item.id, item.label)}
                                            disabled={rotatingKeyId === item.id}
                                            className="py-1.5 px-2.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                                            title="Confirmar que esta chave foi rotacionada hoje"
                                        >
                                            <Check className="w-3 h-3" />
                                            <span>Rotacionada</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* 4. RADAR DE CVEs & PACOTES NPM (AUDITORIA DE SEGURANÇA) */}
            <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <Activity className="w-4 h-4 text-orange-500" />
                        <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300">
                            4. Radar de CVEs & Dependências (npm audit + npm outdated)
                        </h3>
                    </div>

                    <div className="flex items-center gap-2">
                        {totalVulns > 0 && (
                            <button
                                onClick={handleRunAuditFix}
                                disabled={runningAuditFix || loadingAll}
                                className="py-1.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                            >
                                <Wrench className={`w-3.5 h-3.5 ${runningAuditFix ? 'animate-spin' : ''}`} />
                                {runningAuditFix ? 'Corrigindo (npm audit fix)...' : 'Corrigir CVEs (npm audit fix)'}
                            </button>
                        )}
                        <button
                            onClick={() => fetchHealthData('cve')}
                            disabled={loadingAll || loadingSection === 'cve'}
                            className="py-1.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${loadingSection === 'cve' ? 'animate-spin text-orange-400' : ''}`} />
                            Reescanear Pacotes
                        </button>
                    </div>
                </div>

                {/* Contadores de Severidade CVE */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80 flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-400">Críticas</span>
                        <span className={`text-lg font-black font-mono ${
                            (auditReport?.counts?.critical || 0) > 0 ? 'text-red-400' : 'text-zinc-500'
                        }`}>
                            {auditReport?.counts?.critical ?? '-'}
                        </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80 flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-400">Altas</span>
                        <span className={`text-lg font-black font-mono ${
                            (auditReport?.counts?.high || 0) > 0 ? 'text-orange-400' : 'text-zinc-500'
                        }`}>
                            {auditReport?.counts?.high ?? '-'}
                        </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80 flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-400">Moderadas</span>
                        <span className={`text-lg font-black font-mono ${
                            (auditReport?.counts?.moderate || 0) > 0 ? 'text-amber-400' : 'text-zinc-500'
                        }`}>
                            {auditReport?.counts?.moderate ?? '-'}
                        </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80 flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-400">Baixas</span>
                        <span className={`text-lg font-black font-mono ${
                            (auditReport?.counts?.low || 0) > 0 ? 'text-blue-400' : 'text-zinc-500'
                        }`}>
                            {auditReport?.counts?.low ?? '-'}
                        </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80 flex items-center justify-between col-span-2 sm:col-span-1">
                        <span className="text-xs font-bold text-zinc-400">Desatualizados</span>
                        <span className="text-lg font-black font-mono text-orange-400">
                            {outdatedPackages.length}
                        </span>
                    </div>
                </div>

                {/* Saída do npm audit fix se executado */}
                {auditFixOutput && (
                    <div className="p-4 rounded-xl bg-black/50 border border-emerald-500/30 font-mono text-[11px] text-emerald-300 space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                            <span className="flex items-center gap-1.5">
                                <Terminal className="w-3.5 h-3.5" /> Resultado do npm audit fix
                            </span>
                            <button
                                onClick={() => setAuditFixOutput(null)}
                                className="text-zinc-500 hover:text-zinc-300 text-[10px]"
                            >
                                Fechar
                            </button>
                        </div>
                        <pre className="whitespace-pre-wrap break-all max-h-40 overflow-y-auto custom-scrollbar">
                            {auditFixOutput}
                        </pre>
                    </div>
                )}

                {/* Lista de CVEs / Advisories */}
                <div className="space-y-2.5">
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
                        Vulnerabilidades Detectadas ({auditReport?.vulnerabilities?.length || 0})
                    </h4>

                    {loadingAll && !auditReport ? (
                        <div className="p-8 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin text-orange-500" />
                            Consultando banco de CVEs do GitHub Advisory...
                        </div>
                    ) : !auditReport?.vulnerabilities?.length ? (
                        <div className="p-6 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-3 text-emerald-400 text-xs font-bold">
                            <CheckCircle2 className="w-5 h-5 shrink-0" />
                            Zero vulnerabilidades CVE conhecidas na árvore de dependências atual!
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                            {auditReport.vulnerabilities.map((vuln, idx) => (
                                <div
                                    key={`${vuln.name}-${idx}`}
                                    className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                                >
                                    <div className="space-y-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${getSeverityBadge(vuln.severity)}`}>
                                                {getSeverityLabel(vuln.severity)}
                                            </span>
                                            <span className="font-mono font-bold text-white">
                                                {vuln.name}
                                            </span>
                                            {vuln.range && (
                                                <span className="font-mono text-[10px] text-zinc-500">
                                                    ({vuln.range})
                                                </span>
                                            )}
                                            {vuln.isDirect ? (
                                                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                                                    Direta
                                                </span>
                                            ) : (
                                                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-500">
                                                    Transitiva
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-zinc-400 text-xs truncate" title={vuln.title}>
                                            {vuln.title}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        {vuln.fixAvailable && (
                                            <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                                Patch Disponível
                                            </span>
                                        )}
                                        {vuln.url && (
                                            <a
                                                href={vuln.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-orange-400 font-mono text-[10px] flex items-center gap-1 transition-colors"
                                            >
                                                {vuln.cveId || 'Advisory'}
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Tabela de Pacotes com Nova Versão (npm outdated) */}
                {outdatedPackages.length > 0 && (() => {
                    const pendingCompatibleCount = outdatedPackages.filter(
                        (p) => !p.isAlreadyAtWanted && !p.isWantedSatisfiedInLock && p.current !== p.wanted
                    ).length;

                    return (
                    <div className="space-y-3 pt-3 border-t border-zinc-900">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                <Package className="w-3.5 h-3.5 text-orange-400" />
                                <h4 className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
                                    Pacotes com Nova Versão no Registro NPM ({outdatedPackages.length})
                                </h4>
                                {pendingCompatibleCount === 0 && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                                        ✔ 100% dos Compatíveis (Wanted) Instalados — Restam apenas saltos Major (Breaking)
                                    </span>
                                )}
                            </div>

                            {pendingCompatibleCount > 0 ? (
                                <button
                                    onClick={handleRunNpmUpdate}
                                    disabled={runningNpmUpdate || runningAuditFix || loadingAll}
                                    className="py-1.5 px-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-black font-black uppercase tracking-wider text-xs flex items-center gap-1.5 transition-all shadow-md shadow-orange-500/20 cursor-pointer disabled:opacity-50"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${runningNpmUpdate ? 'animate-spin' : ''}`} />
                                    {runningNpmUpdate ? 'Atualizando (npm update)...' : `Atualizar Compatíveis (${pendingCompatibleCount})`}
                                </button>
                            ) : (
                                <span className="py-1.5 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-emerald-400 font-bold text-[11px] flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Compatíveis em Dia
                                </span>
                            )}
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-zinc-800/80">
                            <table className="w-full text-left border-collapse text-xs font-mono">
                                <thead>
                                    <tr className="bg-zinc-900/80 text-zinc-400 text-[10px] uppercase tracking-wider border-b border-zinc-800">
                                        <th className="py-2.5 px-3.5">Pacote</th>
                                        <th className="py-2.5 px-3.5">Instalado</th>
                                        <th className="py-2.5 px-3.5">Compatível (Wanted)</th>
                                        <th className="py-2.5 px-3.5">Última (Latest / Major)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/50 bg-zinc-950/40">
                                    {outdatedPackages.map((pkg) => {
                                        const isMajorJump = pkg.wanted !== pkg.latest;
                                        const isAtWanted = pkg.isAlreadyAtWanted || pkg.current === pkg.wanted;
                                        return (
                                            <tr key={pkg.name} className="hover:bg-zinc-900/40 transition-colors">
                                                <td className="py-2 px-3.5 font-bold text-zinc-200">{pkg.name}</td>
                                                <td className="py-2 px-3.5 text-zinc-400">{pkg.current}</td>
                                                <td className="py-2 px-3.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-emerald-400 font-bold">{pkg.wanted}</span>
                                                        {isAtWanted ? (
                                                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                                                                ✔ Instalado
                                                            </span>
                                                        ) : pkg.isWantedSatisfiedInLock ? (
                                                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                                                                ✔ Salvo no package-lock
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </td>
                                                <td className="py-2 px-3.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className={isMajorJump ? 'text-amber-400 font-bold' : 'text-zinc-400'}>
                                                            {pkg.latest}
                                                        </span>
                                                        {isMajorJump && (
                                                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/25 text-amber-400">
                                                                Major
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    );
                })()}
            </div>
        </div>
    );
}
