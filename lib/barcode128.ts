/**
 * Utilitário de Geração de Código de Barras Code 128 (Subconjunto B e C)
 * Padrão oficial GS1 / SEFAZ para Chave de Acesso de NF-e (44 dígitos numéricos)
 * Gera caminhos e elementos SVG vetoriais nítidos em qualquer resolução/DPI sem dependências externas.
 */

// Padrões de barras do Code 128 (cada caractere tem 11 módulos, exceto stop que tem 13)
// 1 = barra preta, 0 = espaço em branco
const CODE128_PATTERNS: string[] = [
    '11011001100', '11001101100', '11001100110', '10010011000', '10010001100', // 00-04
    '10001001100', '10011001000', '10011000100', '10001100100', '11001001000', // 05-09
    '11001000100', '11000100100', '10110011100', '10011011100', '10011001110', // 10-14
    '10111001100', '10011101100', '10011100110', '11001110010', '11001011100', // 15-19
    '11001001110', '11011100100', '11001110100', '11101101110', '11101001100', // 20-24
    '11100101100', '11100100110', '11101100100', '11100110100', '11100110010', // 25-29
    '11011011000', '11011000110', '11000110110', '10100011000', '10001011000', // 30-34
    '10001000110', '10110001000', '10001101000', '10001100010', '11010001000', // 35-39
    '11000101000', '11000100010', '10110111000', '10110001110', '10001101110', // 40-44
    '10111011000', '10111000110', '10001110110', '11101110110', '11010001110', // 45-49
    '11000101110', '11011101000', '11011100010', '11011101110', '11101011000', // 50-54
    '11101000110', '11100010110', '11101101000', '11101100010', '11100011010', // 55-59
    '11101111010', '11001000010', '11110001010', '10100110000', '10100001100', // 60-64
    '10010110000', '10010000110', '10000101100', '10000100110', '10110010000', // 65-69
    '10110000100', '10011010000', '10011000010', '10000110100', '10000110010', // 70-74
    '11000010010', '11001010000', '11110111010', '11000010100', '10001111010', // 75-79
    '10100111100', '10010111100', '10010011110', '10111100100', '10011110100', // 80-84
    '10011110010', '11110100100', '11110010100', '11110010010', '11011011110', // 85-89
    '11011110110', '11110110110', '10101111000', '10100011110', '10001011110', // 90-94
    '10111101000', '10111100010', '11110101000', '11110100010', '10111011110', // 95-99
    '10111101110', '11101011110', '11110101110', '11010000100', '11010010000', // 100-104 (103 = START A, 104 = START B, 105 = START C)
    '11010011100', '1100011101011' // 105 (START C), 106 (STOP - 13 módulos)
];

const START_CODE_B = 104;
const START_CODE_C = 105;
const STOP_CODE = 106;

export interface BarcodeResult {
    modules: string;
    totalWidth: number;
    svgBars: { x: number; width: number }[];
}

/**
 * Codifica uma string numérica ou alfanumérica em Code 128 (otimizado para números pares via Subconjunto C, padrão NF-e)
 */
export function encodeCode128(text: string): BarcodeResult {
    const cleanText = text.trim();
    const isPureDigits = /^\d+$/.test(cleanText);
    const isEvenDigits = isPureDigits && cleanText.length % 2 === 0;

    const codes: number[] = [];

    if (isEvenDigits && cleanText.length > 0) {
        // Modo Code 128C (Altamente denso e compacto para números, ex: 44 dígitos da NF-e)
        codes.push(START_CODE_C);
        for (let i = 0; i < cleanText.length; i += 2) {
            const pair = cleanText.substring(i, i + 2);
            codes.push(parseInt(pair, 10));
        }
    } else {
        // Modo Code 128B (Alfanumérico)
        codes.push(START_CODE_B);
        for (let i = 0; i < cleanText.length; i++) {
            const charCode = cleanText.charCodeAt(i);
            codes.push(charCode - 32);
        }
    }

    // Cálculo do Checksum obrigatório do Code 128
    let checksum = codes[0];
    for (let i = 1; i < codes.length; i++) {
        checksum += codes[i] * i;
    }
    const checkDigit = checksum % 103;
    codes.push(checkDigit);
    codes.push(STOP_CODE);

    // Converte os códigos numéricos na sequência binária de módulos (1 = barra, 0 = espaço)
    let moduleString = '0000000000'; // Margem de silêncio inicial (Quiet zone)
    for (const code of codes) {
        if (code >= 0 && code < CODE128_PATTERNS.length) {
            moduleString += CODE128_PATTERNS[code];
        }
    }
    moduleString += '0000000000'; // Margem de silêncio final

    // Agrupa módulos pretos ('1') contíguos em retângulos SVG eficientes
    const svgBars: { x: number; width: number }[] = [];
    let currentBarStart = -1;

    for (let i = 0; i < moduleString.length; i++) {
        if (moduleString[i] === '1') {
            if (currentBarStart === -1) {
                currentBarStart = i;
            }
        } else {
            if (currentBarStart !== -1) {
                svgBars.push({ x: currentBarStart, width: i - currentBarStart });
                currentBarStart = -1;
            }
        }
    }
    if (currentBarStart !== -1) {
        svgBars.push({ x: currentBarStart, width: moduleString.length - currentBarStart });
    }

    return {
        modules: moduleString,
        totalWidth: moduleString.length,
        svgBars
    };
}

/**
 * Formata chave de acesso de 44 dígitos em grupos de 4 dígitos para legibilidade humana padrão DANFE
 * Ex: 3526 1167 5664 9900 0170 5500 1000 0000 0111 7620 6742
 */
export function formatChaveAcesso(chave: string): string {
    const clean = chave.replace(/\D/g, '');
    if (clean.length === 0) return '';
    return clean.match(/.{1,4}/g)?.join(' ') || clean;
}

/**
 * Gera uma chave de acesso NF-e válida de 44 dígitos para simulação e identificação única
 */
export function generateMockChaveNFe(params?: {
    uf?: string;
    data?: Date;
    cnpj?: string;
    numeroNFe?: number;
    serie?: number;
}): string {
    const ufCode = params?.uf === 'DF' ? '53' : params?.uf === 'RJ' ? '33' : params?.uf === 'MG' ? '31' : '35'; // 35 = SP
    const now = params?.data || new Date();
    const ano = String(now.getFullYear()).slice(-2);
    const mes = String(now.getMonth() + 1).padStart(2, '0');
    const cnpjClean = (params?.cnpj || '67566499000170').replace(/\D/g, '').padStart(14, '0');
    const modelo = '55'; // NF-e 55
    const serie = String(params?.serie || 1).padStart(3, '0');
    const nNFe = String(params?.numeroNFe || Math.floor(1000 + Math.random() * 9000)).padStart(9, '0');
    const tipoEmissao = '1'; // 1 = Normal
    const codigoAleatorio = String(Math.floor(10000000 + Math.random() * 90000000)).slice(0, 8);

    const base43 = `${ufCode}${ano}${mes}${cnpjClean}${modelo}${serie}${nNFe}${tipoEmissao}${codigoAleatorio}`;

    // Cálculo do dígito verificador módulo 11
    let peso = 2;
    let soma = 0;
    for (let i = base43.length - 1; i >= 0; i--) {
        soma += parseInt(base43[i], 10) * peso;
        peso++;
        if (peso > 9) peso = 2;
    }
    const resto = soma % 11;
    const dv = (resto === 0 || resto === 1) ? 0 : 11 - resto;

    return `${base43}${dv}`;
}

