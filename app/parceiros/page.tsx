'use client';

import { useState, useEffect } from 'react';
import { Loader2, ArrowLeft, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface Studio {
    id: number;
    nome: string;
    logo_url?: string;
    qualidade?: number;
}

export default function PartnersPage() {
    const [studios, setStudios] = useState<Studio[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStudios = async () => {
            try {
                const res = await fetch('/api/estudios');
                const data = await res.json();
                // Filter only studios with logo
                if (res.ok) {
                    setStudios(data.filter((s: Studio) => s.logo_url && s.logo_url.trim() !== ''));
                }
            } catch (err) {
                console.error('Failed to fetch partners:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchStudios();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
                <Loader2 className="animate-spin text-orange-500 w-10 h-10" />
                <p className="text-zinc-500 font-mono text-xs tracking-widest uppercase">Carregando Elite Partners...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-12 selection:bg-orange-500/30">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
                    <div className="space-y-4">
                        <Link href="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-orange-500 transition-colors text-sm font-bold group">
                            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                            VOLTAR PARA A LOJA
                        </Link>
                        <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase italic">
                            Estúdios <span className="text-orange-500 not-italic">Parceiros</span>
                        </h1>
                        <p className="text-zinc-500 max-w-xl text-lg font-medium leading-relaxed">
                            Trabalhamos com os maiores artistas e estúdios de colecionáveis do mundo para garantir 
                            precisão anatômica e fidelidade absoluta em cada peça.
                        </p>
                    </div>
                </div>

                {/* Grid de Logos */}
                {studios.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
                        {studios.map((studio) => (
                            <div 
                                key={studio.id}
                                className="group relative aspect-square bg-zinc-900/10 border border-zinc-800 rounded-2xl overflow-hidden flex items-center justify-center p-8 hover:border-orange-500/50 transition-all duration-500 hover:shadow-[0_0_30px_-10px_rgba(249,115,22,0.3)]"
                            >
                                {/* Background Glow */}
                                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                
                                {/* Logo */}
                                <img 
                                    src={studio.logo_url} 
                                    alt={studio.nome}
                                    className="max-w-full max-h-full object-contain filter grayscale group-hover:grayscale-0 transition-all duration-500 scale-90 group-hover:scale-100"
                                />

                                {/* Overlay Label */}
                                <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-black via-black/80 to-transparent">
                                    <p className="text-center text-[10px] font-black tracking-widest uppercase text-white">
                                        {studio.nome}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="border border-dashed border-zinc-800 rounded-3xl p-20 text-center">
                        <p className="text-zinc-600 font-bold uppercase tracking-widest">Nenhum parceiro com logo cadastrado.</p>
                        <p className="text-zinc-700 text-sm mt-3">Adicione as URLs de imagem na gestão de Estúdios do Admin.</p>
                    </div>
                )}

                {/* Footer Decorativo */}
                <div className="mt-32 pt-12 border-t border-zinc-900 flex flex-col md:flex-row justify-between items-center gap-8 text-zinc-600">
                    <div className="flex gap-12 font-black text-[10px] tracking-widest uppercase">
                        <div>Qualidade Premium garantida</div>
                        <div>Esculturas Digitais de Elite</div>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-bold text-zinc-400">
                        <div className="w-12 h-px bg-zinc-800" />
                        CURATED BY FRANGATOYS
                    </div>
                </div>
            </div>
        </div>
    );
}
