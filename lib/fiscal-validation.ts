/**
 * Validações fiscais e cadastrais para emissão de NF-e (SEFAZ / Receita Federal)
 */

export const BRAZILIAN_UFS = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
    'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
    'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
] as const;

export const VALID_UFS_SET = new Set<string>(BRAZILIAN_UFS);

/**
 * Validação dos dígitos verificadores do CPF (módulo 11)
 */
export function isValidCPF(cpf: string): boolean {
    const clean = (cpf || '').replace(/\D/g, '');
    if (clean.length !== 11) return false;
    // Rejeita sequências repetidas como 111.111.111-11, 000.000.000-00
    if (/^(\d)\1{10}$/.test(clean)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(clean.charAt(i), 10) * (10 - i);
    }
    let rev = 11 - (sum % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(clean.charAt(9), 10)) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(clean.charAt(i), 10) * (11 - i);
    }
    rev = 11 - (sum % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(clean.charAt(10), 10)) return false;

    return true;
}

/**
 * Validação dos dígitos verificadores do CNPJ
 */
export function isValidCNPJ(cnpj: string): boolean {
    const clean = (cnpj || '').replace(/\D/g, '');
    if (clean.length !== 14) return false;
    if (/^(\d)\1{13}$/.test(clean)) return false;

    let size = clean.length - 2;
    let numbers = clean.substring(0, size);
    const digits = clean.substring(size);
    let sum = 0;
    let pos = size - 7;
    for (let i = size; i >= 1; i--) {
        sum += parseInt(numbers.charAt(size - i), 10) * pos--;
        if (pos < 2) pos = 9;
    }
    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(0), 10)) return false;

    size = size + 1;
    numbers = clean.substring(0, size);
    sum = 0;
    pos = size - 7;
    for (let i = size; i >= 1; i--) {
        sum += parseInt(numbers.charAt(size - i), 10) * pos--;
        if (pos < 2) pos = 9;
    }
    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(1), 10)) return false;

    return true;
}

/**
 * Valida se é um CPF ou CNPJ com formato e dígitos verificadores válidos
 */
export function isValidCpfOrCnpj(value: string): boolean {
    const clean = (value || '').replace(/\D/g, '');
    if (clean.length === 11) return isValidCPF(clean);
    if (clean.length === 14) return isValidCNPJ(clean);
    return false;
}

/**
 * Validação de Nome Completo para a SEFAZ (mínimo de nome e sobrenome)
 */
export function isValidFullName(name: string): boolean {
    const trimmed = (name || '').trim();
    const parts = trimmed.split(/\s+/);
    return parts.length >= 2 && parts.every(p => p.length >= 1) && trimmed.length >= 3;
}
