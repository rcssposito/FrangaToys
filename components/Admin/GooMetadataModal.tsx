'use client';

import React, { useState, useEffect } from 'react';
import { 
    X, 
    Box, 
    Folder, 
    UploadCloud, 
    Check, 
    AlertCircle, 
    Layers, 
    Clock, 
    Scale, 
    Printer, 
    CheckCircle2, 
    RefreshCw, 
    Search,
    ChevronRight
} from 'lucide-react';
import { GooMetadata, GooProductionSummary } from '@/lib/gooParser';

interface GooMetadataModalProps {
    isOpen: boolean;
    onClose: () => void;
    figureName: string;
    figureId: number;
    currentResinaKg?: number | string | null;
    currentHorasImpressao?: number | string | null;
    onApply: (resinaKg: number, horasImpressao: number) => Promise<void>;
}

interface LocalGooFile {
    name: string;
    fullPath: string;
    sizeMb: string;
    modifiedAt: string;
}

export function GooMetadataModal({
    isOpen,
    onClose,
    figureName,
    figureId,
    currentResinaKg,
    currentHorasImpressao,
    onApply,
}: GooMetadataModalProps) {
    const [activeTab, setActiveTab] = useState<'local' | 'upload'>('local');
    const [searchTerm, setSearchTerm] = useState(figureName);
    const [localFiles, setLocalFiles] = useState<LocalGooFile[]>([]);
    const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
    const [isLoadingFiles, setIsLoadingFiles] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isApplying, setIsApplying] = useState(false);
    const [summary, setSummary] = useState<GooProductionSummary | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Carregar arquivos da pasta 2 - Meta ao abrir o modal
    useEffect(() => {
        if (isOpen) {
            setSearchTerm(figureName);
            setSelectedPaths([]);
            setSummary(null);
            setError(null);
            loadLocalFiles(figureName);
        }
    }, [isOpen, figureName]);

    const loadLocalFiles = async (query: string = '') => {
        setIsLoadingFiles(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/goo?search=${encodeURIComponent(query)}`);
            const data = await res.json();
            if (data.success) {
                setLocalFiles(data.files || []);
                // Se encontrou exatamente 1 arquivo com nome bem compatível, já pré-seleciona
                if (data.files?.length === 1) {
                    setSelectedPaths([data.files[0].fullPath]);
                }
            } else {
                setError(data.error || 'Erro ao carregar arquivos da pasta');
            }
        } catch (err: any) {
            setError(err.message || 'Erro de conexão ao buscar arquivos');
        } finally {
            setIsLoadingFiles(false);
        }
    };

    const toggleSelectPath = (path: string) => {
        setSelectedPaths(prev => 
            prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
        );
    };

    const handleAnalyzeSelected = async () => {
        if (selectedPaths.length === 0) return;
        setIsAnalyzing(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/goo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filePaths: selectedPaths })
            });
            const data = await res.json();
            if (data.success) {
                setSummary(data.summary);
            } else {
                setError(data.error || 'Falha ao analisar arquivos selecionados');
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao analisar arquivos');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsAnalyzing(true);
        setError(null);
        try {
            const formData = new FormData();
            for (let i = 0; i < files.length; i++) {
                formData.append('files', files[i]);
            }

            const res = await fetch('/api/admin/goo', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                setSummary(data.summary);
            } else {
                setError(data.error || 'Falha ao ler arquivos enviados');
            }
        } catch (err: any) {
            setError(err.message || 'Erro no upload dos arquivos');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleConfirmApply = async () => {
        if (!summary) return;
        setIsApplying(true);
        try {
            await onApply(summary.resinaKg, summary.horasImpressao);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Erro ao aplicar valores na figura');
        } finally {
            setIsApplying(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
                            <Box className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                                Importador de Metadados 3D (.goo)
                                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
                                    Saturn 4 Ultra 16K
                                </span>
                            </h2>
                            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-md">
                                Figura: <span className="font-semibold text-slate-200">{figureName}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Subheader / Tabs */}
                <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800 bg-slate-900/40">
                    <button
                        onClick={() => setActiveTab('local')}
                        className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition-all ${
                            activeTab === 'local'
                                ? 'border-amber-400 text-amber-400 bg-slate-800/60'
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <Folder className="w-4 h-4" />
                        Pasta Local (2 - Meta)
                    </button>
                    <button
                        onClick={() => setActiveTab('upload')}
                        className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition-all ${
                            activeTab === 'upload'
                                ? 'border-amber-400 text-amber-400 bg-slate-800/60'
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <UploadCloud className="w-4 h-4" />
                        Fazer Upload / Arrastar
                    </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {error && (
                        <div className="p-3.5 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-center gap-3">
                            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Tab: Local Folder */}
                    {activeTab === 'local' && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && loadLocalFiles(searchTerm)}
                                        placeholder="Buscar arquivo .goo na pasta..."
                                        className="w-full pl-9 pr-4 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                                    />
                                </div>
                                <button
                                    onClick={() => loadLocalFiles(searchTerm)}
                                    disabled={isLoadingFiles}
                                    className="px-3.5 py-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium transition-colors flex items-center gap-1.5"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                                    Buscar
                                </button>
                                <button
                                    onClick={() => loadLocalFiles('')}
                                    className="px-3 py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                                >
                                    Ver todos
                                </button>
                            </div>

                            {/* Files List */}
                            <div className="border border-slate-800 rounded-xl bg-slate-950/60 overflow-hidden max-h-52 overflow-y-auto divide-y divide-slate-800/80">
                                {isLoadingFiles ? (
                                    <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                                        <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
                                        Escaneando arquivos .goo em D:\rcssp\Downloads\3d\2 - Meta...
                                    </div>
                                ) : localFiles.length === 0 ? (
                                    <div className="p-8 text-center text-xs text-slate-500">
                                        Nenhum arquivo .goo encontrado com o termo informado.
                                    </div>
                                ) : (
                                    localFiles.map(file => {
                                        const isSelected = selectedPaths.includes(file.fullPath);
                                        return (
                                            <div
                                                key={file.fullPath}
                                                onClick={() => toggleSelectPath(file.fullPath)}
                                                className={`flex items-center justify-between p-3 text-xs cursor-pointer transition-colors ${
                                                    isSelected ? 'bg-amber-500/10 text-amber-200' : 'hover:bg-slate-900 text-slate-300'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 min-w-0 pr-4">
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                                        isSelected ? 'bg-amber-500 border-amber-500 text-slate-950' : 'border-slate-600 bg-slate-900'
                                                    }`}>
                                                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                                    </div>
                                                    <div className="truncate">
                                                        <div className="font-medium text-slate-200 truncate">{file.name}</div>
                                                        <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                                                            <span>{file.sizeMb} MB</span>
                                                            <span>•</span>
                                                            <span>{new Date(file.modifiedAt).toLocaleString('pt-BR')}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className="text-[11px] font-mono text-slate-400 flex-shrink-0">
                                                    {isSelected ? 'Selecionado' : 'Clique para marcar'}
                                                </span>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {selectedPaths.length > 0 && (
                                <div className="flex items-center justify-between pt-1">
                                    <span className="text-xs text-slate-400">
                                        <b className="text-amber-400">{selectedPaths.length}</b> mesa(s)/arquivo(s) selecionado(s)
                                    </span>
                                    <button
                                        onClick={handleAnalyzeSelected}
                                        disabled={isAnalyzing}
                                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2"
                                    >
                                        {isAnalyzing ? (
                                            <>
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                                Decodificando Metadados...
                                            </>
                                        ) : (
                                            <>
                                                <ChevronRight className="w-4 h-4" />
                                                Analisar Arquivos Selecionados
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab: Upload */}
                    {activeTab === 'upload' && (
                        <div className="space-y-4">
                            <label className="border-2 border-dashed border-slate-700 hover:border-amber-500/70 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-950/40 hover:bg-slate-900/60">
                                <input
                                    type="file"
                                    multiple
                                    accept=".goo"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                                <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl mb-3">
                                    <UploadCloud className="w-8 h-8" />
                                </div>
                                <div className="text-sm font-semibold text-slate-200">
                                    Arraste seus arquivos <span className="text-amber-400">.goo</span> aqui
                                </div>
                                <div className="text-xs text-slate-400 mt-1 max-w-sm">
                                    Ou clique para navegar no Windows Explorer. Você pode selecionar múltiplos arquivos caso a figura tenha mais de uma mesa.
                                </div>
                            </label>
                        </div>
                    )}

                    {/* Summary / Analysis Result */}
                    {summary && (
                        <div className="space-y-4 pt-2 border-t border-slate-800 animate-fade-in">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    Resultado do Fatiamento ({summary.totalMesas} mesa{summary.totalMesas > 1 ? 's' : ''})
                                </h3>
                                <span className="text-[11px] text-slate-400 font-mono">
                                    Tempo Fatiador Total: <b className="text-slate-200">{summary.tempoRealFatiadorFormatted}</b>
                                </span>
                            </div>

                            {/* Mesas Cards Carousel / Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {summary.mesas.map((mesa, idx) => (
                                    <div
                                        key={idx}
                                        className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex gap-3 items-center"
                                    >
                                        {/* 3D Preview Image */}
                                        <div className="w-20 h-20 rounded-lg bg-black border border-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                                            {mesa.previewBase64 ? (
                                                <img
                                                    src={mesa.previewBase64}
                                                    alt={mesa.fileName}
                                                    className="w-full h-full object-contain"
                                                />
                                            ) : (
                                                <Box className="w-8 h-8 text-slate-700" />
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0 text-xs space-y-1">
                                            <div className="font-semibold text-slate-200 truncate" title={mesa.fileName}>
                                                {mesa.fileName}
                                            </div>
                                            <div className="text-[11px] text-slate-400 flex items-center gap-2">
                                                <span className="text-amber-400 font-medium">Mesa {idx + 1}</span>
                                                <span>•</span>
                                                <span>{mesa.totalWeightG}g</span>
                                                <span>•</span>
                                                <span>{mesa.totalVolumeMl}ml</span>
                                            </div>
                                            <div className="text-[10px] text-slate-500 truncate">
                                                {mesa.printerName} | {mesa.profileName}
                                            </div>
                                            <div className="text-[10px] text-slate-500">
                                                {mesa.totalLayers} camadas ({mesa.layerThicknessMm}mm) • Exp: {mesa.exposureTimeS}s
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Franga Toys Official Rules Calculation Box */}
                            <div className="p-4 bg-gradient-to-r from-amber-500/10 via-slate-900 to-amber-500/5 border border-amber-500/30 rounded-2xl space-y-3">
                                <div className="text-xs font-bold text-amber-400 flex items-center justify-between">
                                    <span>Cálculo de Produção (Regras Oficiais Franga Toys)</span>
                                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                                        50g degrau • 5h por mesa
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                                    <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
                                        <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                                            <Scale className="w-3 h-3 text-amber-400" />
                                            Peso Bruto Real
                                        </div>
                                        <div className="text-sm font-bold text-slate-200 mt-0.5 font-mono">
                                            {summary.pesoBrutoG} g
                                        </div>
                                        <div className="text-[9px] text-slate-500">soma das peças</div>
                                    </div>

                                    <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
                                        <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                                            <Layers className="w-3 h-3 text-amber-400" />
                                            Mesas de Impressão
                                        </div>
                                        <div className="text-sm font-bold text-slate-200 mt-0.5 font-mono">
                                            {summary.totalMesas} mesa{summary.totalMesas > 1 ? 's' : ''}
                                        </div>
                                        <div className="text-[9px] text-slate-500">5h por cada mesa</div>
                                    </div>

                                    <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/40">
                                        <div className="text-[10px] text-amber-300 font-semibold flex items-center justify-center gap-1">
                                            <Scale className="w-3 h-3" />
                                            Resina Calculada
                                        </div>
                                        <div className="text-base font-extrabold text-amber-400 mt-0.5 font-mono">
                                            {summary.resinaKg.toFixed(3)} kg
                                        </div>
                                        <div className="text-[9px] text-amber-400/80">
                                            {currentResinaKg ? `Atual: ${currentResinaKg} kg` : 'Novo valor'}
                                        </div>
                                    </div>

                                    <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/40">
                                        <div className="text-[10px] text-amber-300 font-semibold flex items-center justify-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            Horas de Impressão
                                        </div>
                                        <div className="text-base font-extrabold text-amber-400 mt-0.5 font-mono">
                                            {summary.horasImpressao} h
                                        </div>
                                        <div className="text-[9px] text-amber-400/80">
                                            {currentHorasImpressao ? `Atual: ${currentHorasImpressao} h` : 'Novo valor'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                    >
                        Cancelar
                    </button>
                    {summary ? (
                        <button
                            onClick={handleConfirmApply}
                            disabled={isApplying}
                            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
                        >
                            {isApplying ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4 stroke-[3]" />
                                    Aplicar {summary.resinaKg.toFixed(3)}kg e {summary.horasImpressao}h ao Card
                                </>
                            )}
                        </button>
                    ) : (
                        <div className="text-xs text-slate-500">
                            Selecione ou envie arquivos .goo para calcular
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
