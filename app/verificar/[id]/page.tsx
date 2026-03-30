import { createClient } from '@supabase/supabase-js';
import Image from 'next/image';
import { CheckCircle2, ShieldCheck, Calendar, Hash, ExternalLink, Package, Palette, AlertCircle } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function VerificarPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    // Fetch detailed sale info
    const { data: sale } = await supabase
        .from('vendas')
        .select(`
            id,
            data_venda,
            figuras (
                nome,
                imagem_url,
                studios ( nome ),
                series ( 
                    nome, 
                    categorias ( nome ) 
                )
            )
        `)
        .eq('id', id)
        .single();

    if (!sale) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
                <div className="max-w-md w-full flex flex-col items-center text-center">
                    <img
                        src="/Reprovado.png"
                        alt="Não Encontrado"
                        className="w-full h-auto mb-8 opacity-80"
                    />
                    <h1 className="text-2xl font-bold mb-2">Certificado Não Encontrado</h1>
                    <p className="text-zinc-400 text-sm mb-12">O código de autenticação informado não consta em nossa base de dados oficial.</p>
                    <a href="https://frangatoys.com.br" className="inline-flex items-center gap-2 text-zinc-300 hover:text-white transition-colors text-sm font-medium border-b border-zinc-800 pb-1">
                        Voltar para a Loja <ExternalLink size={14} />
                    </a>
                </div>
            </div>
        );
    }

    const figura = sale.figuras as any;
    const studioNome = Array.isArray(figura?.studios) ? figura.studios[0]?.nome : figura?.studios?.nome;
    const serieNome = Array.isArray(figura?.series) ? figura.series[0]?.nome : figura?.series?.nome;
    const categoriaNome = Array.isArray(figura?.series?.categorias) ? figura.series.categorias[0]?.nome : figura?.series?.categorias?.nome;

    return (
        <div className="min-h-screen bg-black text-white selection:bg-emerald-500/30">
            {/* Background Decorative Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-orange-500/5 rounded-full blur-[120px]" />
            </div>

            <main className="relative z-10 max-w-2xl mx-auto px-6 py-12 md:py-20 flex flex-col items-center">

                {/* Header Logo */}
                <div className="mb-12 transition-transform hover:scale-105 duration-500">
                    <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/50 shadow-2xl backdrop-blur-xl">
                        <img src="/logobranca.png" alt="FrangaToys" className="h-8 w-auto opacity-90" />
                    </div>
                </div>

                {/* Certificate Card - WHITE BACKGROUND */}
                <div className="w-full bg-white rounded-[2.5rem] overflow-hidden shadow-[0_30px_100px_-20px_rgba(0,0,0,0.6)] border border-white/10">

                    {/* Visual Status Header */}
                    <div className="bg-emerald-50 px-8 py-6 border-b border-emerald-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_4px_15px_rgba(16,185,129,0.3)]">
                                <ShieldCheck size={24} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-emerald-700 font-black uppercase tracking-tighter text-lg leading-none">Autêntico</h2>
                                <p className="text-emerald-600/60 text-[10px] font-bold uppercase tracking-widest mt-0.5">Certificado Verificado</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-zinc-400 text-[10px] uppercase font-black tracking-widest leading-none">Emissão</p>
                            <p className="text-zinc-900 text-sm font-black mt-0.5">{new Date(sale.data_venda).toLocaleDateString('pt-BR')}</p>
                        </div>
                    </div>

                    {/* Figure Visual and Details */}
                    <div className="p-8 md:p-10">
                        <div className="grid md:grid-cols-2 gap-10 items-center">
                            {/* Product Image */}
                            <div className="relative group">
                                <div className="absolute inset-0 bg-emerald-100 rounded-3xl blur-xl group-hover:bg-emerald-200 transition-all duration-700 scale-90 opacity-40" />
                                <div className="relative aspect-square rounded-3xl bg-zinc-50 border border-zinc-100 flex items-center justify-center p-6 overflow-hidden shadow-inner">
                                    {figura?.imagem_url ? (
                                        <img
                                            src={figura.imagem_url}
                                            alt={figura.nome}
                                            className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-110"
                                        />
                                    ) : (
                                        <Package size={64} className="text-zinc-200" />
                                    )}
                                </div>
                            </div>

                            {/* Product Info */}
                            <div className="space-y-6">
                                <div>
                                    <h1 className="text-3xl font-black tracking-tight leading-tight mb-1 text-zinc-900">{figura?.nome}</h1>
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-100 rounded-full text-[10px] font-black text-orange-600 uppercase tracking-widest">
                                        <Palette size={12} /> {studioNome || 'Exclusivo Franguinha'}
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-zinc-100">
                                    <div className="flex items-center gap-4 text-sm">
                                        <span className="text-zinc-400 uppercase text-[10px] font-black w-20 leading-none">Categoria</span>
                                        <span className="font-bold text-zinc-800">{categoriaNome || 'Action Figure'}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm">
                                        <span className="text-zinc-400 uppercase text-[10px] font-black w-20 leading-none">Coleção</span>
                                        <span className="font-bold text-zinc-800">{serieNome || 'Original Collection'}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm">
                                        <span className="text-zinc-400 uppercase text-[10px] font-black w-20 leading-none">Identidade</span>
                                        <div className="flex items-center gap-1 font-mono text-xs text-zinc-900 font-black px-2 py-0.5 bg-zinc-100 rounded">
                                            <Hash size={12} /> FT-{sale.id.toString().padStart(5, '0')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Seal and Footer */}
                    <div className="px-8 py-10 bg-zinc-50 border-t border-zinc-100 flex flex-col items-center gap-8">
                        <div className="relative group cursor-default">
                            <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500" />
                            <img src="/Aprovado.png" alt="Aprovado" className="w-24 h-24 relative opacity-100 transition-opacity" />
                        </div>

                        <div className="text-center space-y-2">
                            <p className="text-zinc-500 text-[11px] font-medium leading-relaxed max-w-xs mx-auto">
                                Este documento comprova a autenticidade deste colecionável impresso e finalizado manualmente com excelência pelo Ateliê FrangaToys.
                            </p>
                            <div className="pt-4 flex items-center justify-center gap-6 opacity-40 text-[10px] uppercase font-black tracking-[0.2em] grayscale text-zinc-600">
                                <span>Impresso 3D</span>
                                <span>•</span>
                                <span>Pintura Manual</span>
                                <span>•</span>
                                <span>3DCure Acqua Art</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Return button */}
                <a
                    href="https://frangatoys.com.br"
                    target="_blank"
                    className="mt-12 group flex items-center gap-3 bg-zinc-900 hover:bg-white text-zinc-400 hover:text-black px-6 py-3 rounded-2xl border border-zinc-800 hover:border-white transition-all duration-300 font-bold text-sm shadow-xl"
                >
                    Explorar Novos Modelos
                    <ExternalLink size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>

            </main>
        </div>
    );
}


