import { BaseDimensions, BaseShapeType, ProductionConfig } from './types';

export interface SVGExportOptions {
    canvas: HTMLCanvasElement;
    shape: BaseShapeType;
    dimensions: BaseDimensions;
    figureTitle?: string;
    studioName?: string;
    production: ProductionConfig;
    stlSilhouette?: HTMLCanvasElement | null;
}

/**
 * Gera e exporta um arquivo SVG vetorial em escala 1:1 física (milímetros reais).
 * Contém camada de arte em altíssima definição (600 DPI) e linhas de corte/sangria vetoriais
 * prontas para plotters de recorte (Silhouette, Cricut, Roland, laser) e CorelDRAW/Illustrator.
 */
export async function exportToSVG({
    canvas,
    shape,
    dimensions,
    figureTitle = 'Base Colecionável',
    studioName = 'Franga Toys',
    production,
    stlSilhouette
}: SVGExportOptions) {
    const baseW = dimensions.widthMm;
    const baseL = dimensions.lengthMm;
    const bleedMm = production.bleedMm;

    // Margem ao redor para abrigar sangria, miras e régua de aferição
    const marginMm = Math.max(bleedMm + 8, 14);
    const docWidthMm = Number((baseW + marginMm * 2).toFixed(2));
    const docHeightMm = Number((baseL + marginMm * 2).toFixed(2));

    const cx = Number((docWidthMm / 2).toFixed(2));
    const cy = Number((docHeightMm / 2).toFixed(2));

    // Converte a arte renderizada no Canvas em base64 PNG de 600 DPI
    const artworkDataUrl = canvas.toDataURL('image/png', 1.0);

    // Gera o caminho vetorial da linha de corte de acordo com o formato
    const generateCutPath = (w: number, l: number, extraOffsetMm = 0): string => {
        const ew = w + extraOffsetMm * 2;
        const el = l + extraOffsetMm * 2;

        switch (shape) {
            case 'circle': {
                const r = (Math.min(ew, el) / 2).toFixed(2);
                return `<circle cx="${cx}" cy="${cy}" r="${r}" />`;
            }
            case 'rectangle': {
                const rx = Math.max(0, (dimensions.borderRadiusMm || 8) + extraOffsetMm).toFixed(2);
                const x = (cx - ew / 2).toFixed(2);
                const y = (cy - el / 2).toFixed(2);
                return `<rect x="${x}" y="${y}" width="${ew.toFixed(2)}" height="${el.toFixed(2)}" rx="${rx}" ry="${rx}" />`;
            }
            case 'hexagon': {
                const r = Math.min(ew, el) / 2;
                const pts: string[] = [];
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 3) * i - Math.PI / 6;
                    const px = (cx + r * Math.cos(angle)).toFixed(2);
                    const py = (cy + r * Math.sin(angle)).toFixed(2);
                    pts.push(`${px},${py}`);
                }
                return `<polygon points="${pts.join(' ')}" />`;
            }
            case 'ellipse': {
                return `<ellipse cx="${cx}" cy="${cy}" rx="${(ew / 2).toFixed(2)}" ry="${(el / 2).toFixed(2)}" />`;
            }
            case 'd_shape': {
                const r = el / 2;
                const leftX = (cx - ew / 2).toFixed(2);
                const midX = cx.toFixed(2);
                const topY = (cy - r).toFixed(2);
                const botY = (cy + r).toFixed(2);
                const d = `M ${leftX} ${topY} L ${midX} ${topY} A ${r.toFixed(2)} ${r.toFixed(2)} 0 0 1 ${midX} ${botY} L ${leftX} ${botY} Z`;
                return `<path d="${d}" />`;
            }
            case 'stl':
            default: {
                // Fallback para STL: retângulo envolvente com cantos arredondados suaves
                const rx = 4;
                const x = (cx - ew / 2).toFixed(2);
                const y = (cy - el / 2).toFixed(2);
                return `<rect x="${x}" y="${y}" width="${ew.toFixed(2)}" height="${el.toFixed(2)}" rx="${rx}" ry="${rx}" />`;
            }
        }
    };

    // Gera elementos vetoriais da Régua de Precisão de 50mm
    let rulerSvg = '';
    if (production.showCalibrationRuler) {
        const rulerW = 50;
        const rx = Number((cx - rulerW / 2).toFixed(2));
        const ry = Number((docHeightMm - 8).toFixed(2));

        let ticks = '';
        for (let i = 0; i <= rulerW; i++) {
            const tx = Number((rx + i).toFixed(2));
            const tickH = i % 10 === 0 ? 3.5 : i % 5 === 0 ? 2.5 : 1.2;
            ticks += `<line x1="${tx}" y1="${ry}" x2="${tx}" y2="${(ry - tickH).toFixed(2)}" stroke="#ffffff" stroke-width="0.25" />\n`;
            if (i % 10 === 0) {
                ticks += `<text x="${tx}" y="${(ry - 4).toFixed(2)}" font-size="2" font-family="monospace" fill="#a1a1aa" text-anchor="middle">${i}</text>\n`;
            }
        }

        rulerSvg = `
        <g id="calibrador_paquimetro">
            <!-- Linha principal da régua de 50mm -->
            <line x1="${rx}" y1="${ry}" x2="${rx + rulerW}" y2="${ry}" stroke="#f97316" stroke-width="0.5" />
            ${ticks}
            <text x="${cx}" y="${(ry + 3.2).toFixed(2)}" font-size="1.8" font-family="sans-serif" font-weight="bold" fill="#f97316" text-anchor="middle">
                RÉGUA DE AFERIÇÃO COM PAQUÍMETRO (50.0 mm EXATOS)
            </text>
        </g>`;
    }

    // Miras de Registro de 4 Cantos (Para leitura óptica de plotters)
    let regMarksSvg = '';
    if (production.showRegistrationMarks) {
        const pad = 5;
        const corners = [
            { x: pad, y: pad },
            { x: docWidthMm - pad, y: pad },
            { x: pad, y: docHeightMm - pad },
            { x: docWidthMm - pad, y: docHeightMm - pad }
        ];

        regMarksSvg = `
        <g id="miras_de_registro" stroke="#ffffff" stroke-width="0.3" fill="none">
            ${corners.map(c => `
                <circle cx="${c.x}" cy="${c.y}" r="2.5" />
                <line x1="${c.x - 3.5}" y1="${c.y}" x2="${c.x + 3.5}" y2="${c.y}" />
                <line x1="${c.x}" y1="${c.y - 3.5}" x2="${c.x}" y2="${c.y + 3.5}" />
            `).join('\n')}
        </g>`;
    }

    // Camada de Corte Principal (Vermelho #ef4444)
    const cutElement = generateCutPath(baseW, baseL, 0);

    // Camada de Sangria (Ciano #06b6d4)
    const bleedElement = bleedMm > 0 ? generateCutPath(baseW, baseL, bleedMm) : '';

    const svgContent = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg 
    xmlns="http://www.w3.org/2000/svg" 
    xmlns:xlink="http://www.w3.org/1999/xlink"
    width="${docWidthMm}mm" 
    height="${docHeightMm}mm" 
    viewBox="0 0 ${docWidthMm} ${docHeightMm}"
    version="1.1"
>
    <!-- Metadados do Projeto Franga Toys -->
    <metadata>
        <title>${figureTitle} - Base Adesiva 1:1</title>
        <description>Gerado via Franga Toys Base Art Generator. Escala física exata de corte em mm.</description>
    </metadata>

    <!-- Fundo de contraste escuro para visualização em navegadores -->
    <rect width="${docWidthMm}" height="${docHeightMm}" fill="#09090b" />

    <!-- 1. CAMADA DE ARTE GRÁFICA (RASTER 600 DPI DE ALTA DEFINIÇÃO) -->
    <g id="camada_arte_impressao">
        <image 
            x="0" 
            y="0" 
            width="${docWidthMm}" 
            height="${docHeightMm}" 
            preserveAspectRatio="none"
            href="${artworkDataUrl}" 
        />
    </g>

    <!-- 2. CAMADA VETORIAL DE SANGRIA (BLEED - GUIA VISUAL CIANO) -->
    ${production.showBleedLine && bleedElement ? `
    <g id="camada_sangria_bleed" fill="none" stroke="#06b6d4" stroke-width="0.3" stroke-dasharray="2,1.5" opacity="0.85">
        ${bleedElement}
    </g>` : ''}

    <!-- 3. CAMADA VETORIAL DE CORTE REAL (PLOTTERS / LASER / SILHOUETTE) -->
    <!-- Esta camada possui o contorno exato para as lâminas de recorte automático -->
    <g id="camada_corte_lamina" fill="none" stroke="#ef4444" stroke-width="0.4" stroke-dasharray="3,1.5">
        ${cutElement}
    </g>

    <!-- 4. CRUZ DE ALINHAMENTO CENTRAL -->
    <g id="cruz_alinhamento" stroke="rgba(255,255,255,0.4)" stroke-width="0.25">
        <line x1="${cx - 4}" y1="${cy}" x2="${cx + 4}" y2="${cy}" />
        <line x1="${cx}" y1="${cy - 4}" x2="${cx}" y2="${cy + 4}" />
    </g>

    <!-- 5. MIRAS DE REGISTRO E RÉGUA -->
    ${regMarksSvg}
    ${rulerSvg}

    <!-- 6. IDENTIFICAÇÃO E INFORMAÇÕES DE PRODUÇÃO -->
    <text 
        x="${cx}" 
        y="${(marginMm / 2).toFixed(2)}" 
        font-size="2.4" 
        font-family="system-ui, -apple-system, sans-serif" 
        font-weight="bold" 
        fill="#f97316" 
        text-anchor="middle"
        letter-spacing="0.5"
    >
        FRANGA TOYS • ${figureTitle.toUpperCase()} • CORTE 1:1 (${baseW} × ${baseL} mm)
    </text>
</svg>`;

    // Dispara o download automático do arquivo SVG
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `base_${dimensions.widthMm}mm_corte_1_1.svg`;
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}
