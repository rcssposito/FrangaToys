'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Download, Sparkles, ShieldCheck, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

function MemberDownloadContent() {
    const searchParams = useSearchParams();
    const fileNameParam = searchParams.get('file') || 'pack-modelos-3d-fevereiro.zip';
    const realUrlParam = searchParams.get('url') || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
    const packTitleParam = searchParams.get('title') || 'Pack Exclusivo do Mês';

    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [downloadSuccess, setDownloadSuccess] = useState(false);

    const handleDirectStreamDownload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) {
            toast.error('Informe seu e-mail do Patreon para continuar.');
            return;
        }

        setLoading(true);

        try {
            // Dispara o download em tempo real via Stream seguro (sem gerar links prévios)
            const res = await fetch('/api/public/patreon/stream-download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email.trim(),
                    fileName: fileNameParam,
                    realFileUrl: realUrlParam,
                    allowFree: true
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Não encontramos uma assinatura ativa para este e-mail.');
            }

            // Transforma a resposta HTTP diretamente no arquivo baixado pelo navegador
            const blob = await res.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = fileNameParam;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(blobUrl);

            setDownloadSuccess(true);
            toast.success('Download concluído com sucesso!');

        } catch (err: any) {
            toast.error(err.message || 'Erro ao processar o download.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen bg-[#060608] text-white flex items-center justify-center p-4 md:p-8 font-sans overflow-hidden">
            
            {/* Ambient Background Glows */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

            {/* Main Minimalist Card */}
            <div className="relative z-10 w-full max-w-md bg-zinc-950/80 border border-white/10 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8)] space-y-6 text-center">
                
                {/* Brand / Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[10px] font-black uppercase tracking-widest">
                    <Sparkles size={12} className="text-purple-400 animate-pulse" />
                    Patreon Exclusive Release
                </div>

                {/* Cover Art / Icon */}
                <div className="relative w-24 h-24 mx-auto rounded-2xl bg-gradient-to-tr from-purple-900/40 via-zinc-900 to-amber-900/20 border border-white/10 flex items-center justify-center shadow-2xl overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-t from-purple-600/20 to-transparent opacity-50" />
                    <Download size={38} className="text-purple-300 group-hover:scale-110 transition-transform duration-300 relative z-10" />
                </div>

                {/* Package Info */}
                <div className="space-y-1">
                    <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white leading-tight">
                        {packTitleParam}
                    </h1>
                    <p className="text-xs font-mono text-zinc-400 font-medium">
                        {fileNameParam}
                    </p>
                </div>

                {/* State: Download Completed */}
                {downloadSuccess ? (
                    <div className="py-6 space-y-4 animate-in fade-in zoom-in duration-300">
                        <div className="w-14 h-14 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-500/10">
                            <CheckCircle2 size={32} />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-white uppercase tracking-wider">Download Concluído!</h3>
                            <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto leading-relaxed">
                                Seu arquivo STL/ZIP foi baixado diretamente. Esta sessão de download foi registrada para sua segurança.
                            </p>
                        </div>
                    </div>
                ) : (
                    /* State: Enter Email & Click (Direct On-Demand Stream) */
                    <form onSubmit={handleDirectStreamDownload} className="space-y-4 pt-2">
                        <div className="space-y-1.5 text-left">
                            <label htmlFor="member-email-input" className="block text-[10px] uppercase font-black tracking-widest text-zinc-400 pl-1">
                                E-mail da Conta do Patreon
                            </label>
                            <input
                                id="member-email-input"
                                type="email"
                                placeholder="seu-email@patreon.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                disabled={loading}
                                className="w-full bg-zinc-900/90 border border-zinc-800 focus:border-purple-500/80 rounded-2xl px-4 py-3.5 text-sm font-medium text-white placeholder-zinc-600 outline-none transition-all shadow-inner"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-[0.98] text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Validando & Baixando...</span>
                                </>
                            ) : (
                                <>
                                    <span>BAIXAR MODELO STL</span>
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </form>
                )}

                {/* Footer Security Note */}
                <div className="pt-2 border-t border-zinc-900 flex items-center justify-center gap-1.5 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                    <ShieldCheck size={13} className="text-emerald-400" />
                    <span>Download Rastreável • Transmissão Direta em Tempo Real</span>
                </div>
            </div>
        </div>
    );
}

export default function MemberDownloadPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#060608] flex items-center justify-center text-white">
                <Loader2 className="animate-spin text-purple-500" size={32} />
            </div>
        }>
            <MemberDownloadContent />
        </Suspense>
    );
}
