/**
 * Utilitários e regras de negócio para Pintores e Ateliê
 */

export function isRodrigoPintor(nameOrEmail?: string | null): boolean {
    if (!nameOrEmail) return false;
    const lower = nameOrEmail.trim().toLowerCase();
    return (
        lower.includes('rodrigo') ||
        lower.includes('sposito') ||
        lower === 'rcssposito@gmail.com'
    );
}

/**
 * Retorna o nome de exibição formatado e humanizado do pintor para o cliente no Rastreio
 */
export function formatPainterDisplayName(nameOrEmail?: string | null): string {
    if (!nameOrEmail) return 'Ateliê Franga Toys';
    if (isRodrigoPintor(nameOrEmail)) {
        return 'Rodrigo Sposito (Ateliê Principal)';
    }
    if (nameOrEmail.includes('@')) {
        return nameOrEmail.split('@')[0];
    }
    return nameOrEmail.trim();
}
