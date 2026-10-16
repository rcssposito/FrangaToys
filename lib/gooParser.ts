/**
 * Parser de arquivos .goo (formato proprietário Elegoo Saturn 4 Ultra / Elegoo Mars)
 * Especificação V3.0 oficial Elegoo.
 */

export interface GooMetadata {
    fileName: string;
    version: string;
    printerName: string;
    profileName: string;
    totalLayers: number;
    layerThicknessMm: number;
    exposureTimeS: number;
    bottomExposureTimeS: number;
    printingTimeSeconds: number;
    printingTimeFormatted: string;
    totalVolumeMl: number;
    totalWeightG: number;
    totalPrice: number;
    previewBase64?: string;
}

export interface GooProductionSummary {
    totalMesas: number;
    horasImpressao: number; // Cada mesa = 5h
    pesoBrutoG: number;
    resinaKg: number; // Mínimo 0.1kg, arredondado para cima de 50g em 50g
    tempoRealFatiadorFormatted: string;
    mesas: GooMetadata[];
}

/**
 * Converte RGB565 em imagem BMP Base64
 */
function rgb565ToBmpBase64(rawBuffer: Buffer, rawOffset: number, width: number, height: number): string {
    const rowSize = width * 3;
    const padding = (4 - (rowSize % 4)) % 4;
    const imageSize = (rowSize + padding) * height;
    const fileSize = 54 + imageSize;

    const bmp = Buffer.alloc(fileSize);
    // Header BMP (14 bytes)
    bmp.write('BM', 0);
    bmp.writeInt32LE(fileSize, 2);
    bmp.writeInt32LE(54, 10); // offset pixels

    // DIB Header (40 bytes)
    bmp.writeInt32LE(40, 14);
    bmp.writeInt32LE(width, 18);
    bmp.writeInt32LE(height, 22); // positivo = bottom-up
    bmp.writeInt16LE(1, 26);
    bmp.writeInt16LE(24, 28); // 24-bit RGB
    bmp.writeInt32LE(0, 30);
    bmp.writeInt32LE(imageSize, 34);

    let writePos = 54;
    for (let y = height - 1; y >= 0; y--) {
        for (let x = 0; x < width; x++) {
            const pIndex = rawOffset + (y * width + x) * 2;
            if (pIndex + 1 < rawBuffer.length) {
                const val = rawBuffer.readUInt16BE(pIndex);
                const r = ((val >> 11) & 0x1F) * 255 / 31;
                const g = ((val >> 5) & 0x3F) * 255 / 63;
                const b = (val & 0x1F) * 255 / 31;
                bmp.writeUInt8(Math.round(b), writePos++);
                bmp.writeUInt8(Math.round(g), writePos++);
                bmp.writeUInt8(Math.round(r), writePos++);
            } else {
                writePos += 3;
            }
        }
        for (let p = 0; p < padding; p++) {
            bmp.writeUInt8(0, writePos++);
        }
    }

    return `data:image/bmp;base64,${bmp.toString('base64')}`;
}

/**
 * Faz parse do buffer binário de um arquivo .goo
 */
export function parseGooBuffer(buffer: Buffer, fileName: string = 'arquivo.goo'): GooMetadata {
    let offset = 0;

    const version = buffer.toString('ascii', offset, offset + 4).replace(/\0/g, '').trim();
    offset += 4;
    offset += 8; // magic tag

    offset += 32; // software_info
    offset += 24; // software_version
    offset += 24; // file_time

    const printerName = buffer.toString('ascii', offset, offset + 32).replace(/\0/g, '').trim();
    offset += 32;
    offset += 32; // printer_type

    const profileName = buffer.toString('ascii', offset, offset + 32).replace(/\0/g, '').trim();
    offset += 32;

    offset += 2; // anti-aliasing
    offset += 2; // grey
    offset += 2; // blur

    // Small preview (116x116 RGB565)
    offset += (2 * 116 * 116);
    offset += 2; // delimiter \r\n

    // Big preview (290x290 RGB565)
    const bigPreviewOffset = offset;
    const bigLen = 2 * 290 * 290;
    let previewBase64: string | undefined;

    if (buffer.length >= bigPreviewOffset + bigLen) {
        try {
            previewBase64 = rgb565ToBmpBase64(buffer, bigPreviewOffset, 290, 290);
        } catch (e) {
            console.error('Erro ao gerar preview BMP do .goo:', e);
        }
    }

    offset += bigLen;
    offset += 2; // delimiter \r\n

    const totalLayers = buffer.readInt32BE(offset); offset += 4;
    offset += 2; // x_res
    offset += 2; // y_res
    offset += 1; // x_mirror
    offset += 1; // y_mirror
    offset += 4; // x_size
    offset += 4; // y_size
    offset += 4; // z_size

    const layerThicknessMm = buffer.readFloatBE(offset); offset += 4;
    const exposureTimeS = buffer.readFloatBE(offset); offset += 4;
    offset += 1; // delay_mode
    offset += 4; // turn_off_time
    offset += 4; // bottom_before_lift
    offset += 4; // bottom_after_lift
    offset += 4; // bottom_after_retract
    offset += 4; // before_lift
    offset += 4; // after_lift
    offset += 4; // after_retract

    const bottomExposureTimeS = buffer.readFloatBE(offset); offset += 4;
    offset += 4; // bottom_layers
    offset += 4; // bottom_lift_dist
    offset += 4; // bottom_lift_speed
    offset += 4; // lift_dist
    offset += 4; // lift_speed
    offset += 4; // bottom_retract_dist
    offset += 4; // bottom_retract_speed
    offset += 4; // retract_dist
    offset += 4; // retract_speed
    offset += 4; // bottom_sec_lift_dist
    offset += 4; // bottom_sec_lift_speed
    offset += 4; // sec_lift_dist
    offset += 4; // sec_lift_speed
    offset += 4; // bottom_sec_retract_dist
    offset += 4; // bottom_sec_retract_speed
    offset += 4; // sec_retract_dist
    offset += 4; // sec_retract_speed
    offset += 2; // bottom_light_pwm
    offset += 2; // light_pwm
    offset += 1; // advance_mode

    const printingTimeSeconds = buffer.readInt32BE(offset); offset += 4;
    const totalVolumeMm3 = buffer.readFloatBE(offset); offset += 4;
    const totalWeightG = buffer.readFloatBE(offset); offset += 4;
    const totalPrice = buffer.readFloatBE(offset); offset += 4;

    const hours = Math.floor(printingTimeSeconds / 3600);
    const minutes = Math.floor((printingTimeSeconds % 3600) / 60);
    const seconds = printingTimeSeconds % 60;
    const printingTimeFormatted = hours > 0 
        ? `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`
        : `${minutes}m ${seconds.toString().padStart(2, '0')}s`;

    return {
        fileName,
        version,
        printerName,
        profileName,
        totalLayers,
        layerThicknessMm: Number(layerThicknessMm.toFixed(4)),
        exposureTimeS: Number(exposureTimeS.toFixed(2)),
        bottomExposureTimeS: Number(bottomExposureTimeS.toFixed(2)),
        printingTimeSeconds,
        printingTimeFormatted,
        totalVolumeMl: Number((totalVolumeMm3 / 1000).toFixed(2)),
        totalWeightG: Number(totalWeightG.toFixed(2)),
        totalPrice: Number(totalPrice.toFixed(2)),
        previewBase64,
    };
}

/**
 * Calcula o resumo de produção seguindo as regras de negócio da Franga Toys:
 * 1. Peças começam no mínimo em 0.1kg (100g).
 * 2. Arredondamento para cima em degraus de 50g (ex: 34.6g -> 35g -> 50g -> mínimo 100g = 0.10kg; 215g -> 250g = 0.25kg).
 * 3. Cada mesa de impressão recebe 5 horas (N mesas = N * 5h).
 */
export function calculateGooProduction(mesas: GooMetadata[]): GooProductionSummary {
    const totalMesas = mesas.length;
    const horasImpressao = totalMesas * 5; // 5h por mesa de impressão

    const pesoBrutoTotalG = mesas.reduce((acc, m) => acc + (m.totalWeightG || 0), 0);
    const tempoRealSegundos = mesas.reduce((acc, m) => acc + (m.printingTimeSeconds || 0), 0);

    // Regra 1: se for decimal em gramas (ex: 34.6), vira 35 (Math.ceil)
    const gramsCeil = Math.ceil(pesoBrutoTotalG);
    // Regra 2: degraus de 50g para cima
    const step = 50;
    const roundedGrams = Math.ceil(gramsCeil / step) * step;
    // Mínimo de 100g (0.1kg)
    const finalGrams = totalMesas > 0 ? Math.max(100, roundedGrams) : 0;
    const resinaKg = Number((finalGrams / 1000).toFixed(3));

    const hours = Math.floor(tempoRealSegundos / 3600);
    const minutes = Math.floor((tempoRealSegundos % 3600) / 60);
    const tempoRealFatiadorFormatted = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    return {
        totalMesas,
        horasImpressao,
        pesoBrutoG: Number(pesoBrutoTotalG.toFixed(2)),
        resinaKg,
        tempoRealFatiadorFormatted,
        mesas,
    };
}
