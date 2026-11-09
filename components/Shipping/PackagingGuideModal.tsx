'use client';

import React from 'react';
import { X, CheckCircle2, Box, Shield, FileText } from 'lucide-react';

interface PackagingGuideModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const PackagingGuideModal: React.FC<PackagingGuideModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
            <div
                className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Cabeçalho */}
                <div className="sticky top-0 bg-[var(--card-bg)] border-b border-[var(--card-border)] p-4 px-6 flex items-center justify-between z-10">
                    <div className="flex items-center gap-2.5">
                        <Box size={18} className="text-orange-500" />
                        <h2 className="text-sm font-black uppercase tracking-wider text-[var(--foreground)] m-0">
                            Procedimento de Embalagem e Expedição
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--input-bg)] rounded-lg transition-colors cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Conteúdo */}
                <div className="p-6 space-y-6 text-xs text-[var(--foreground)]">

                    {/* Checklist Operacional */}
                    <div className="space-y-3">
                        <span className="text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)] block">
                            Checklist de Preparação do Pacote
                        </span>

                        <div className="space-y-2.5">
                            <div className="p-3 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl flex items-start gap-3">
                                <span className="w-5 h-5 rounded-md bg-orange-500/15 text-orange-400 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                                    1
                                </span>
                                <div>
                                    <strong className="text-[var(--foreground)] block">Isolamento de partes sensíveis</strong>
                                    <span className="text-[var(--text-muted)] block mt-0.5">
                                        Calçar espadas, antenas, dedos ou mechas finas com papel de seda ou pequenos blocos de espuma antes do enrolamento principal.
                                    </span>
                                </div>
                            </div>

                            <div className="p-3 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl flex items-start gap-3">
                                <span className="w-5 h-5 rounded-md bg-orange-500/15 text-orange-400 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                                    2
                                </span>
                                <div>
                                    <strong className="text-[var(--foreground)] block">Camada de plástico bolha</strong>
                                    <span className="text-[var(--text-muted)] block mt-0.5">
                                        Envolver a peça com 2 a 3 voltas de plástico bolha. Prender a fita adesiva exclusivamente no plástico, nunca na superfície pintada.
                                    </span>
                                </div>
                            </div>

                            <div className="p-3 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl flex items-start gap-3">
                                <span className="w-5 h-5 rounded-md bg-orange-500/15 text-orange-400 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                                    3
                                </span>
                                <div>
                                    <strong className="text-[var(--foreground)] block">Calço na caixa</strong>
                                    <span className="text-[var(--text-muted)] block mt-0.5">
                                        Preencher o fundo e as laterais com papel kraft amassado ou flocos de proteção. Ao fechar e agitar levemente a caixa, o item não pode se deslocar.
                                    </span>
                                </div>
                            </div>

                            <div className="p-3 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl flex items-start gap-3">
                                <span className="w-5 h-5 rounded-md bg-orange-500/15 text-orange-400 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                                    4
                                </span>
                                <div>
                                    <strong className="text-[var(--foreground)] block">Posicionamento do Certificado</strong>
                                    <span className="text-[var(--text-muted)] block mt-0.5">
                                        Colocar o card de autenticidade (10x15 cm) dentro do envelope lacrado com adesivo Franga Toys no topo da embalagem, logo abaixo da abertura da tampa.
                                    </span>
                                </div>
                            </div>

                            <div className="p-3 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl flex items-start gap-3">
                                <span className="w-5 h-5 rounded-md bg-orange-500/15 text-orange-400 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                                    5
                                </span>
                                <div>
                                    <strong className="text-[var(--foreground)] block">Etiqueta de Envio Térmica</strong>
                                    <span className="text-[var(--text-muted)] block mt-0.5">
                                        Fixar a etiqueta 100x150 mm na parte superior da caixa sem cobrir ou dobrar o código de barras.
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Especificação de Materiais */}
                    <div className="pt-2 border-t border-[var(--card-border)] space-y-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)] block">
                            Padrão de Materiais de Expedição
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                            <div className="p-2.5 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg">
                                <span className="text-[var(--text-muted)] block">Certificado:</span>
                                <span className="font-bold text-[var(--foreground)]">Papel couché ou fotográfico fosco 10x15 cm (250g+)</span>
                            </div>
                            <div className="p-2.5 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg">
                                <span className="text-[var(--text-muted)] block">Envelope:</span>
                                <span className="font-bold text-[var(--foreground)]">Envelope 11x16 cm lacrado com adesivo redondo</span>
                            </div>
                            <div className="p-2.5 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg">
                                <span className="text-[var(--text-muted)] block">Proteção:</span>
                                <span className="font-bold text-[var(--foreground)]">Plástico bolha + papel kraft para preenchimento</span>
                            </div>
                            <div className="p-2.5 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg">
                                <span className="text-[var(--text-muted)] block">Identificação:</span>
                                <span className="font-bold text-[var(--foreground)]">Etiqueta térmica adesiva 100x150 mm</span>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Rodapé */}
                <div className="sticky bottom-0 bg-[var(--card-bg)] border-t border-[var(--card-border)] p-3.5 px-6 flex items-center justify-end z-10">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};
