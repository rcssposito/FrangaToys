'use client';

import { motion } from 'framer-motion';
import { Eye, RotateCcw } from 'lucide-react';

interface EmptyStateProps {
    onClearFilters: () => void;
}

export const EmptyState = ({ onClearFilters }: EmptyStateProps) => {
    return (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center min-h-[50vh]">
            <div className="relative mb-8">
                {/* Ethereal Glow */}
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="absolute inset-0 bg-blue-500/20 blur-[60px] rounded-full"
                />
                
                {/* The Void Icon */}
                <motion.div
                    initial={{ rotate: 0, scale: 0.8, opacity: 0 }}
                    animate={{ rotate: 360, scale: 1, opacity: 1 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-zinc-900/40 backdrop-blur-3xl border border-white/5 flex items-center justify-center shadow-2xl"
                >
                    <Eye size={48} className="text-blue-400 opacity-80 drop-shadow-[0_0_15px_rgba(96,165,250,0.5)]" />
                    
                    {/* Minimalist Tentacles (Decorative pseudo-elements or similar) */}
                    <div className="absolute inset-0 border-2 border-dashed border-blue-500/10 rounded-full animate-[spin_20s_linear_infinite]" />
                </motion.div>
            </div>

            <motion.h3 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="text-lg sm:text-xl font-black text-zinc-300 uppercase tracking-[0.4em] mb-3"
            >
                O abismo não devolveu nada...
            </motion.h3>

            <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.8 }}
                className="text-xs sm:text-sm text-zinc-600 font-bold uppercase tracking-widest leading-relaxed mb-8 max-w-xs mx-auto"
            >
                Nenhum segredo antigo revelado nas brumas de R'lyeh. Tente recalcular os filtros para retornar à realidade.
            </motion.p>

            <motion.button
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ delay: 0.9, duration: 0.5 }}
                onClick={onClearFilters}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl hover:shadow-blue-500/10"
            >
                <RotateCcw size={14} className="text-blue-400" />
                Recalcular a Realidade
            </motion.button>
        </div>
    );
};
