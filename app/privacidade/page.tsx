'use client';

import { useState } from 'react';
import { ShieldCheck, Download, Trash2, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function PrivacidadePage() {
    const [activeTab, setActiveTab] = useState<'download' | 'forget'>('download');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage(null);
        setSuccessMessage(null);

        try {
            const res = await fetch('/api/public/consent/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome: name, telefone: phone, tipo: activeTab })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao registrar solicitação');

            if (activeTab === 'download') {
                setSuccessMessage(
                    'Solicitação de Exportação de Dados registrada com sucesso! Para sua segurança, nossa equipe analisará o pedido e entrará em contato via WhatsApp/Telefone para confirmar sua identidade antes do envio das informações. Prazo de resposta: até 3 dias úteis.'
                );
            } else {
                setSuccessMessage(
                    'Solicitação de Exclusão de Cadastro registrada com sucesso! Para sua segurança, nossa equipe fará uma verificação manual de identidade. Entraremos em contato via WhatsApp/Telefone para confirmar a solicitação antes de realizar o wipe dos dados cadastrais.'
                );
            }

            setName('');
            setPhone('');
        } catch (err: any) {
            setErrorMessage(err.message || 'Ocorreu um erro ao processar sua solicitação.');
        } finally {
            setLoading(false);
        }
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
                    <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-sm leading-relaxed flex items-start gap-3 shadow-lg shadow-emerald-500/5">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{successMessage}</span>
                    </div>
                )}

                {/* Form Container */}
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 md:p-8 shadow-xl flex flex-col gap-6">
                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                        <div className="flex flex-col gap-2">
                            <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                                {activeTab === 'download' ? 'Exportar minhas informações' : 'Solicitar exclusão de dados pessoais'}
                            </h3>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                {activeTab === 'download' 
                                    ? 'Preencha o formulário abaixo. Nossa equipe gerará o relatório das suas compras e cadastro, e entrará em contato para confirmar a identidade antes de compartilhá-lo.'
                                    : 'De acordo com o Art. 18 da LGPD, você tem o direito de solicitar a eliminação dos seus dados tratados. Para sua segurança, a exclusão será efetuada após confirmação humana pela nossa equipe.'}
                            </p>
                        </div>
                        
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-zinc-300">Nome Completo</label>
                            <input
                                type="text"
                                placeholder="Digite seu nome completo"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm rounded-xl px-4 py-3 text-zinc-200 outline-none transition-all"
                                required
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-zinc-300">Telefone para Contato (WhatsApp)</label>
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
                            className={`w-full font-bold rounded-xl py-3.5 text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                                activeTab === 'download' 
                                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-zinc-950 shadow-md shadow-amber-500/10'
                                    : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md shadow-red-500/10'
                            }`}
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : activeTab === 'download' ? (
                                <Download className="w-4 h-4" />
                            ) : (
                                <Trash2 className="w-4 h-4" />
                            )}
                            {activeTab === 'download' ? 'Enviar Solicitação de Download' : 'Enviar Solicitação de Exclusão'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
