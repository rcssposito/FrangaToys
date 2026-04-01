'use client';

import { useState, useEffect } from 'react';
import { Loader2, ArrowLeft, ExternalLink, Instagram, Globe, Sparkles, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { clsx } from 'clsx';

interface Studio {
    id: number;
    nome: string;
    logo_url?: string;
    instagram_handle?: string;
    social_url?: string;
    qualidade?: number;
    ativo?: boolean;
    merchant?: boolean;
}

export default function PartnersPage() {
    const [studios, setStudios] = useState<Studio[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInactive, setShowInactive] = useState(false);

    useEffect(() => {
        const fetchStudios = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/estudios?incluirInativos=${showInactive}`);
                const data = await res.json();
                if (res.ok) {
                    setStudios(data);
                }
            } catch (err) {
                console.error('Failed to fetch partners:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchStudios();
    }, [showInactive]);

    if (loading && studios.length === 0) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
                <Loader2 className="animate-spin text-blue-500 w-10 h-10" />
                <p className="text-zinc-600 font-bold text-[10px] tracking-[0.3em] uppercase animate-pulse">Sincronizando com a Elite...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-12 selection:bg-blue-500/30 overflow-x-hidden">
            {/* Background Decorative Elements */}
            <div className="fixed top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="fixed bottom-[-10%] left-[-10%] w-[45%] h-[45%] bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Header Section */}
                <div className="flex flex-col gap-6 mb-20">
                    <div className="flex justify-between items-start">
                        <Link href="/" className="inline-flex items-center gap-3 text-zinc-500 hover:text-white transition-all text-[11px] font-black tracking-widest group">
                            <div className="p-2 bg-zinc-900 rounded-xl border border-zinc-800 group-hover:border-blue-500/30 group-hover:bg-blue-500/10 group-hover:text-blue-400 transition-all">
                                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                            </div>
                            VOLTAR PARA A LOJA
                        </Link>

                        <button 
                            onClick={() => setShowInactive(!showInactive)}
                            className={clsx(
                                "flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest",
                                showInactive 
                                    ? "bg-blue-500/10 border-blue-500/40 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.1)]" 
                                    : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                            )}
                        >
                            {showInactive ? <EyeOff size={14} /> : <Eye size={14} />}
                            {showInactive ? "Ocultar Arquivo" : "Ver Todos"}
                        </button>
                    </div>
                    
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-[10px] font-black tracking-widest uppercase">
                                <Sparkles size={12} fill="currentColor" />
                                Curadoria FrangaToys
                            </div>
                            <h1 className="text-6xl md:text-8xl font-black tracking-tighter uppercase italic leading-[0.9]">
                                Nossos <span className="text-blue-500 not-italic">Parceiros</span>
                            </h1>
                        </div>
                    </div>
                </div>

                {/* Grid de Parceiros */}
                {studios.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {studios.map((studio) => (
                            <div key={studio.id} className={clsx(
                                "group relative flex flex-col gap-6 transition-all duration-700",
                                !studio.merchant && "opacity-60 saturate-50 grayscale-[0.8] hover:grayscale-0"
                            )}>
                                {/* The Card wrapper - links to catalog */}
                                <Link 
                                    href={`/?studioIds=${studio.id}&incluirNaoVendaveis=true`} 
                                    className={clsx(
                                        "block relative aspect-square bg-zinc-900/30 backdrop-blur-xl border rounded-[2.5rem] overflow-hidden p-10 transition-all duration-700 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,1)] group-hover:-translate-y-2",
                                        studio.merchant ? "border-zinc-800/80 hover:border-blue-500/40" : "border-zinc-900"
                                    )}
                                >
                                    {/* Inner Gradient Glow */}
                                    {studio.merchant && (
                                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                    )}
                                    
                                    {/* Logo Container */}
                                    <div className="relative w-full h-full flex items-center justify-center">
                                        <img 
                                            src={studio.logo_url} 
                                            alt={studio.nome}
                                            className={clsx(
                                                "max-w-full max-h-full object-contain filter group-hover:grayscale-0 transition-all duration-700 scale-95 group-hover:scale-100",
                                                studio.merchant ? "grayscale group-hover:opacity-100 opacity-60" : "grayscale opacity-30"
                                            )}
                                        />
                                    </div>

                                    {/* Status Badge for inactive merchant */}
                                    {!studio.merchant && (
                                        <div className="absolute top-8 right-8 bg-zinc-800/80 backdrop-blur px-3 py-1 rounded-full border border-zinc-700/50">
                                            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Inativo</span>
                                        </div>
                                    )}

                                    {/* Link Action Indicator */}
                                    <div className="absolute inset-x-0 bottom-8 flex justify-center opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500">
                                        <div className={clsx(
                                            "text-black text-[9px] font-black tracking-widest uppercase px-5 py-2 rounded-full shadow-2xl flex items-center gap-2",
                                            studio.merchant ? "bg-white" : "bg-zinc-400"
                                        )}>
                                            Ver Acervo <ExternalLink size={10} />
                                        </div>
                                    </div>
                                </Link>

                                {/* Footer Data & Socials */}
                                <div className="px-4 flex items-center justify-between">
                                    <div className="flex flex-col gap-0.5">
                                        <h3 className={clsx(
                                            "text-sm font-black tracking-widest uppercase",
                                            studio.merchant ? "text-zinc-300" : "text-zinc-500"
                                        )}>{studio.nome}</h3>
                                        <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-tighter">Artista / Parceiro</p>
                                    </div>
                                    <div className="flex gap-2">
                                        {studio.instagram_handle && (
                                            <a 
                                                href={`https://instagram.com/${studio.instagram_handle.replace('@', '')}`} 
                                                target="_blank" 
                                                className="p-2.5 bg-zinc-900 border border-zinc-800 hover:border-pink-500/50 hover:bg-pink-500/10 hover:text-pink-500 rounded-xl transition-all"
                                                title="Siga no Instagram"
                                            >
                                                <Instagram size={14} />
                                            </a>
                                        )}
                                        {studio.social_url && (
                                            <a 
                                                href={studio.social_url} 
                                                target="_blank" 
                                                className="p-2.5 bg-zinc-900 border border-zinc-800 hover:border-blue-400/50 hover:bg-blue-400/10 hover:text-blue-400 rounded-xl transition-all"
                                                title="Visite o Site"
                                            >
                                                <Globe size={14} />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-40 bg-zinc-900/10 border-2 border-dashed border-zinc-900 rounded-[3rem] flex flex-col items-center justify-center gap-4">
                        <p className="text-zinc-700 font-black text-xs tracking-[0.4em] uppercase">Nenhum parceiro encontrado</p>
                    </div>
                )}
            </div>
        </div>
    );
}
