import jsPDF from 'jspdf';
import { BaseDimensions, ProductionConfig } from './types';

export interface PDFExportOptions {
    canvas: HTMLCanvasElement;
    dimensions: BaseDimensions;
    figureTitle?: string;
    studioName?: string;
    production: ProductionConfig;
}

/**
 * Gera um PDF A4 profissional em escala 1:1 pronta para impressão de vinil adesivo
 */
export async function exportToA4PDF({
    canvas,
    dimensions,
    figureTitle = 'Base Colecionável',
    studioName = 'Franga Toys',
    production
}: PDFExportOptions) {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = 210;
    const pageHeight = 297;

    const baseW = dimensions.widthMm;
    const baseL = dimensions.lengthMm;
    const bleed = production.bleedMm;

    // Tamanho total da imagem gerada pelo canvas (inclui margem de sangria)
    const marginMm = Math.max(bleed + 4, 8);
    const imgTotalW = baseW + marginMm * 2;
    const imgTotalL = baseL + marginMm * 2;

    const imgData = canvas.toDataURL('image/png', 1.0);

    // Determina posições das cópias na página A4
    const count = production.quantityPerSheet;
    const positions: Array<{ cx: number; cy: number }> = [];

    if (count === 1) {
        positions.push({ cx: pageWidth / 2, cy: pageHeight / 2 - 10 });
    } else if (count === 2) {
        positions.push(
            { cx: pageWidth / 2, cy: pageHeight * 0.28 },
            { cx: pageWidth / 2, cy: pageHeight * 0.70 }
        );
    } else {
        // 4 cópias em grade 2x2
        positions.push(
            { cx: pageWidth * 0.3, cy: pageHeight * 0.28 },
            { cx: pageWidth * 0.7, cy: pageHeight * 0.28 },
            { cx: pageWidth * 0.3, cy: pageHeight * 0.70 },
            { cx: pageWidth * 0.7, cy: pageHeight * 0.70 }
        );
    }

    // Desenha cada cópia da base
    positions.forEach((pos) => {
        const x = pos.cx - imgTotalW / 2;
        const y = pos.cy - imgTotalL / 2;

        doc.addImage(imgData, 'PNG', x, y, imgTotalW, imgTotalL, undefined, 'FAST');

        // Miras de corte nos 4 cantos da peça
        if (production.showRegistrationMarks) {
            drawCornerMarks(doc, pos.cx, pos.cy, baseW / 2, baseL / 2);
        }
    });

    // 1. Régua de calibração física (50 mm) para conferência com paquímetro
    if (production.showCalibrationRuler) {
        drawCalibrationRuler(doc, 20, pageHeight - 32);
    }

    // 2. Cabeçalho e Instruções de Produção no rodapé
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 30, 30);

    const safeTitle = figureTitle.replace(/[^\x20-\x7E]/g, '');
    doc.text(`FRANGA TOYS • ATELIE DE PRODUCAO • BASE 1:1 REAL`, 20, pageHeight - 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(90, 90, 90);
    const dateStr = new Date().toLocaleDateString('pt-BR');
    doc.text(`Figure: ${safeTitle} | Estudio: ${studioName} | Medida: ${baseW}mm x ${baseL}mm (Sangria: ${bleed}mm) | Gerado em: ${dateStr}`, 20, pageHeight - 12);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text(`ATENCAO: Configure a impressora para ESCALA 100% (Tamanho Real). NAO AJUSTAR A PAGINA.`, 20, pageHeight - 8);

    // Salva o PDF
    const cleanFileName = `base_${figureTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${baseW}mm.pdf`;
    doc.save(cleanFileName);
}

/**
 * Desenha miras de alinhamento nos cantos
 */
function drawCornerMarks(doc: jsPDF, cx: number, cy: number, halfW: number, halfL: number) {
    const markLength = 6;
    const offset = 2; // Distância além da borda física da base

    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.2);

    // Canto Superior Esquerdo
    const tlX = cx - halfW - offset;
    const tlY = cy - halfL - offset;
    doc.line(tlX - markLength, tlY, tlX, tlY);
    doc.line(tlX, tlY - markLength, tlX, tlY);

    // Canto Superior Direito
    const trX = cx + halfW + offset;
    const trY = cy - halfL - offset;
    doc.line(trX, trY, trX + markLength, trY);
    doc.line(trX, trY - markLength, trX, trY);

    // Canto Inferior Esquerdo
    const blX = cx - halfW - offset;
    const blY = cy + halfL + offset;
    doc.line(blX - markLength, blY, blX, blY);
    doc.line(blX, blY, blX, blY + markLength);

    // Canto Inferior Direito
    const brX = cx + halfW + offset;
    const brY = cy + halfL + offset;
    doc.line(brX, brY, brX + markLength, brY);
    doc.line(brX, brY, brX, brY + markLength);
}

/**
 * Desenha uma régua física precisa de 50mm no rodapé para medição com paquímetro
 */
function drawCalibrationRuler(doc: jsPDF, startX: number, startY: number) {
    doc.setDrawColor(50, 50, 50);
    doc.setLineWidth(0.3);

    const rulerLength = 50; // 50 mm
    doc.line(startX, startY, startX + rulerLength, startY);

    for (let mm = 0; mm <= rulerLength; mm += 5) {
        const isTen = mm % 10 === 0;
        const tickHeight = isTen ? 3.5 : 2;
        doc.line(startX + mm, startY, startX + mm, startY - tickHeight);

        if (isTen) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(5);
            doc.setTextColor(80, 80, 80);
            doc.text(`${mm}`, startX + mm - 1.5, startY - tickHeight - 1);
        }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(60, 60, 60);
    doc.text(`REGUA DE CALIBRACAO FISICA (50 mm)`, startX + rulerLength + 4, startY - 1);
}
