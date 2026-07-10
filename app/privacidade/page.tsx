'use client';

import { useState } from 'react';
import { ShieldCheck, Download, Trash2, ArrowLeft, Loader2, FileText, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function PrivacidadePage() {
    const [activeTab, setActiveTab] = useState<'download' | 'forget'>('download');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [downloadedData, setDownloadedData] = useState<any | null>(null);

    const handleDownload = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage(null);
        setSuccessMessage(null);
        setDownloadedData(null);

        try {
            const res = await fetch('/api/public/consent/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao buscar dados');

            setDownloadedData(data);
            setSuccessMessage('Seus dados foram localizados com sucesso! Você pode visualizá-los ou baixá-los abaixo.');
        } catch (err: any) {
            setErrorMessage(err.message || 'Ocorreu um erro ao processar sua solicitação.');
        } finally {
            setLoading(false);
        }
    };

    const handleForget = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!confirm('Atenção: Esta ação é definitiva e apagará todos os seus dados cadastrais (nome, telefone, endereço, etc.) da nossa loja. Deseja prosseguir?')) {
            return;
        }

        setLoading(true);
        setErrorMessage(null);
        setSuccessMessage(null);

        try {
            const res = await fetch('/api/public/consent/forget', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao processar exclusão');

            setSuccessMessage('Seus dados pessoais foram excluídos/anonimizados do nosso banco de dados de acordo com as diretrizes da LGPD.');
            setPhone('');
        } catch (err: any) {
            setErrorMessage(err.message || 'Ocorreu um erro ao processar sua solicitação.');
        } finally {
            setLoading(false);
        }
    };

    const triggerFileDownload = () => {
        if (!downloadedData) return;
        const jsonStr = JSON.stringify(downloadedData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dados_frangatoys_${phone.replace(/\D/g, '')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center py-12 px-6">
            <div className="max-w-2xl w-full flex flex-col gap-8">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                    <Link href="/" className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 transition-colors text-sm font-medium">
                        <ArrowLeft className="w-4 h-4" /> Voltar para a loja
                    </Link>
                    <span className="text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium px-2 py-0.5 rounded-full flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5" /> LGPD Compliance
                    </span>
                </div>

                {/* Title */}
                <div className="flex flex-col gap-2 text-center md:text-left">
                    <h1 className="text-3xl font-black tracking-tight text-white">Central de Privacidade</h1>
                    <p className="text-sm text-zinc-400">
                        Gerencie seus dados pessoais coletados pela Franga Toys. Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-zinc-800 gap-4 text-sm font-semibold">
                    <button
                        onClick={() => {
                            setActiveTab('download');
                            setSuccessMessage(null);
                            setErrorMessage(null);
                            setDownloadedData(null);
                        }}
                        className={`pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                            activeTab === 'download' 
                                ? 'border-amber-500 text-amber-400' 
                                : 'border-transparent text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        <Download className="w-4 h-4" /> Download de Dados
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab('forget');
                            setSuccessMessage(null);
                            setErrorMessage(null);
                            setDownloadedData(null);
                        }}
                        className={`pb-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                            activeTab === 'forget' 
                                ? 'border-amber-500 text-amber-400' 
                                : 'border-transparent text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        <Trash2 className="w-4 h-4" /> Direito de Esquecimento
                    </button>
                </div>

                {/* Status Alerts */}
                {errorMessage && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-medium">
                        {errorMessage}
                    </div>
                )}
                {successMessage && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm font-medium flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{successMessage}</span>
                    </div>
                )}

                {/* Form Container */}
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 md:p-8 shadow-xl flex flex-col gap-6">
                    {activeTab === 'download' ? (
                        <form onSubmit={handleDownload} className="flex flex-col gap-5">
                            <div className="flex flex-col gap-2">
                                <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                                    Exportar minhas informações
                                </h3>
                                <p className="text-xs text-zinc-400 leading-relaxed">
                                    Insira o número do telefone cadastrado durante suas compras para puxar o relatório completo de seus dados de cadastro (CRM) e histórico de compras.
                                </p>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-zinc-300">Telefone do Cliente</label>
                                <input
                                    type="text"
                                    placeholder="Ex: (11) 99999-9999"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm rounded-xl px-4 py-3 text-zinc-200 outline-none transition-all"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 font-bold rounded-xl py-3.5 text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                Solicitar Download
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleForget} className="flex flex-col gap-5">
                            <div className="flex flex-col gap-2">
                                <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                                    Solicitar exclusão de dados pessoais
                                </h3>
                                <p className="text-xs text-zinc-400 leading-relaxed">
                                    De acordo com o Art. 18 da LGPD, você tem o direito de solicitar a eliminação dos seus dados pessoais tratados pela loja. Seus dados cadastrais serão permanentemente excluídos ou anonimizados.
                                </p>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-zinc-300">Telefone do Cliente</label>
                                <input
                                    type="text"
                                    placeholder="Ex: (11) 99999-9999"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm rounded-xl px-4 py-3 text-zinc-200 outline-none transition-all"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-xl py-3.5 text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md shadow-red-500/10"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                Solicitar Exclusão Definitiva
                            </button>
                        </form>
                    )}

                    {/* Data Display & Download Button */}
                    {downloadedData && (
                        <div className="border-t border-zinc-800 pt-6 flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-amber-500" /> Relatório de Dados Pessoais
                                </h4>
                                <button
                                    onClick={triggerFileDownload}
                                    className="text-xs font-bold text-amber-500 hover:text-amber-400 transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                    <Download className="w-3.5 h-3.5" /> Baixar Arquivo .json
                                </button>
                            </div>
                            <pre className="w-full max-h-60 overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-[10px] font-mono text-zinc-400 leading-relaxed scrollbar-thin scrollbar-thumb-zinc-800">
                                {JSON.stringify(downloadedData, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
