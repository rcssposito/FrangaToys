import {
    BaseShapeType,
    BaseDimensions,
    ArtworkTransform,
    LogoConfig,
    TextConfig,
    ProductionConfig
} from './types';

export interface RenderCanvasOptions {
    targetCanvas: HTMLCanvasElement;
    shape: BaseShapeType;
    dimensions: BaseDimensions;
    artImage: HTMLImageElement | null;
    artTransform: ArtworkTransform;
    logoImage: HTMLImageElement | null;
    logoConfig: LogoConfig;
    textConfig: TextConfig;
    production: ProductionConfig;
    stlSilhouette?: HTMLCanvasElement | null;
    mode: 'preview' | 'cut_guide' | 'export_print' | '3d_texture';
    dpi?: number;
    showLogoSelection?: boolean;
    showTextSelection?: boolean;
}

/**
 * Converte milímetros em pixels com base no DPI
 */
export function mmToPixels(mm: number, dpi = 150): number {
    return (mm * dpi) / 25.4;
}

/**
 * Converte pixels em milímetros com base no DPI
 */
export function pixelsToMm(px: number, dpi = 150): number {
    return (px * 25.4) / dpi;
}

/**
 * Renderiza toda a composição da base no Canvas
 */
export function renderBaseComposition({
    targetCanvas,
    shape,
    dimensions,
    artImage,
    artTransform,
    logoImage,
    logoConfig,
    textConfig,
    production,
    stlSilhouette,
    mode,
    dpi = 150,
    showLogoSelection = false,
    showTextSelection = false
}: RenderCanvasOptions) {
    const ctx = targetCanvas.getContext('2d');
    if (!ctx) return;

    const baseWidthMm = dimensions.widthMm;
    const baseLengthMm = dimensions.lengthMm;
    const bleedMm = production.bleedMm;

    // Margem ao redor da base (no modo 3d_texture é zero para mapeamento 1:1 perfeito na malha 3D)
    const marginMm = mode === '3d_texture' ? 0 : mode === 'preview' ? 3 : Math.max(bleedMm + 4, 8);
    const totalWidthMm = baseWidthMm + marginMm * 2;
    const totalLengthMm = baseLengthMm + marginMm * 2;

    const canvasWidthPx = Math.round(mmToPixels(totalWidthMm, dpi));
    const canvasLengthPx = Math.round(mmToPixels(totalLengthMm, dpi));

    if (targetCanvas.width !== canvasWidthPx || targetCanvas.height !== canvasLengthPx) {
        targetCanvas.width = canvasWidthPx;
        targetCanvas.height = canvasLengthPx;
    }

    ctx.clearRect(0, 0, canvasWidthPx, canvasLengthPx);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const centerX = canvasWidthPx / 2;
    const centerY = canvasLengthPx / 2;

    // 1. MESA DE CORTE: Fundo do workspace escuro neutro com grade técnica milimétrica
    if (mode === 'cut_guide') {
        ctx.fillStyle = '#09090b';
        ctx.fillRect(0, 0, canvasWidthPx, canvasLengthPx);

        // Grade milimétrica suave no fundo
        ctx.strokeStyle = '#18181b';
        ctx.lineWidth = 1;
        const gridStep = mmToPixels(10, dpi);
        for (let x = 0; x < canvasWidthPx; x += gridStep) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvasLengthPx);
            ctx.stroke();
        }
        for (let y = 0; y < canvasLengthPx; y += gridStep) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvasWidthPx, y);
            ctx.stroke();
        }

        // Se houver arte carregada, desenha uma versão suave (30% opacidade) fora do corte
        // para o usuário ver o enquadramento completo da imagem
        if (artImage && artImage.complete && artImage.naturalWidth > 0) {
            ctx.save();
            ctx.globalAlpha = 0.28;
            drawArtImage(ctx, artImage, artTransform, centerX, centerY, baseWidthMm, dpi);
            ctx.restore();
        }
    }

    // 2. COMPOSIÇÃO DA ARTE CLIPPADA NA BASE (100% OPACIDADE)
    const compCanvas = document.createElement('canvas');
    compCanvas.width = canvasWidthPx;
    compCanvas.height = canvasLengthPx;
    const compCtx = compCanvas.getContext('2d');
    if (!compCtx) return;

    compCtx.imageSmoothingEnabled = true;
    compCtx.imageSmoothingQuality = 'high';

    if (artImage && artImage.complete && artImage.naturalWidth > 0) {
        // Desenha a arte completa com filtros visuais
        drawArtImage(compCtx, artImage, artTransform, centerX, centerY, baseWidthMm, dpi);

        // Vinheta opcional nas bordas
        if (artTransform.vignette) {
            compCtx.save();
            const grad = compCtx.createRadialGradient(
                centerX, centerY, mmToPixels(baseWidthMm * 0.25, dpi),
                centerX, centerY, mmToPixels(baseWidthMm * 0.6, dpi)
            );
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(1, 'rgba(0,0,0,0.6)');
            compCtx.fillStyle = grad;
            compCtx.fillRect(0, 0, canvasWidthPx, canvasLengthPx);
            compCtx.restore();
        }
    } else {
        // Nenhuma arte carregada: exibe superfície blueprint escura agradável
        compCtx.fillStyle = '#1c1917';
        compCtx.fillRect(0, 0, canvasWidthPx, canvasLengthPx);

        // Padrão de textura sutil
        compCtx.strokeStyle = 'rgba(249, 115, 22, 0.15)';
        compCtx.lineWidth = 1;
        const step = mmToPixels(8, dpi);
        for (let x = 0; x < canvasWidthPx; x += step) {
            compCtx.beginPath();
            compCtx.moveTo(x, 0);
            compCtx.lineTo(x, canvasLengthPx);
            compCtx.stroke();
        }
        for (let y = 0; y < canvasLengthPx; y += step) {
            compCtx.beginPath();
            compCtx.moveTo(0, y);
            compCtx.lineTo(canvasWidthPx, y);
            compCtx.stroke();
        }

        // Texto informativo central
        compCtx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        compCtx.font = `bold ${Math.round(mmToPixels(3.5, dpi))}px Inter, sans-serif`;
        compCtx.textAlign = 'center';
        compCtx.fillText('NENHUMA IMAGEM SELECIONADA', centerX, centerY - mmToPixels(2, dpi));
        compCtx.font = `500 ${Math.round(mmToPixels(2.5, dpi))}px Inter, sans-serif`;
        compCtx.fillStyle = 'rgba(249, 115, 22, 0.7)';
        compCtx.fillText('Clique em "Do Catálogo" ou faça Upload de uma arte', centerX, centerY + mmToPixels(4, dpi));
    }

    // 3. APLICAÇÃO DA MÁSCARA DE RECORTE (SHAPE OU SILHUETA STL)
    // No modo preview: corta exatamente no perímetro físico da base (bleed = 0)
    // No modo cut_guide / export_print: corta na linha de sangria (bleedMm)
    const clipBleed = mode === 'preview' ? 0 : bleedMm;
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = canvasWidthPx;
    maskCanvas.height = canvasLengthPx;
    const maskCtx = maskCanvas.getContext('2d');

    if (maskCtx) {
        maskCtx.fillStyle = '#ffffff';
        applyShapeMask(maskCtx, shape, centerX, centerY, baseWidthMm, baseLengthMm, clipBleed, dimensions, dpi, stlSilhouette);

        // Aplica o recorte na compCanvas via destination-in
        compCtx.globalCompositeOperation = 'destination-in';
        compCtx.drawImage(maskCanvas, 0, 0);
        compCtx.globalCompositeOperation = 'source-over';
    }

    // 4. DESENHO DA LOGO (FRANGA TOYS OU ESTÚDIO)
    if (logoConfig.enabled && logoImage && logoImage.complete && logoImage.naturalWidth > 0) {
        drawLogo(compCtx, logoImage, logoConfig, centerX, centerY, baseWidthMm, baseLengthMm, dpi, showLogoSelection);
    }

    // 5. DESENHO DO TEXTO / IDENTIFICAÇÃO DE COLECIONADOR
    if (textConfig.enabled && (textConfig.figureTitle || textConfig.subtitle)) {
        drawText(compCtx, textConfig, centerX, centerY, baseWidthMm, baseLengthMm, dpi, showTextSelection);
    }

    // Copia a composição final para o canvas principal
    ctx.drawImage(compCanvas, 0, 0);

    // 6. LINHAS GUIAS DE CORTE E SANGRIA (APENAS CONTORNOS VAZADOS, SEM PREENCHIMENTO BRANCO!)
    if (mode === 'cut_guide' || (mode === 'preview' && (production.showCutLine || production.showBleedLine))) {
        // Linha de Sangria (Bleed - Ciano Suave Pontilhado)
        if (production.showBleedLine && bleedMm > 0) {
            if (shape === 'stl' && stlSilhouette) {
                const w = mmToPixels(baseWidthMm + bleedMm * 2, dpi);
                const h = mmToPixels(baseLengthMm + bleedMm * 2, dpi);
                drawSilhouetteContour(ctx, stlSilhouette, centerX - w / 2, centerY - h / 2, w, h, '#06b6d4', Math.max(1.5, mmToPixels(0.3, dpi)));
            } else {
                ctx.save();
                ctx.strokeStyle = '#06b6d4';
                ctx.lineWidth = Math.max(1, Math.round(mmToPixels(0.35, dpi)));
                ctx.setLineDash([mmToPixels(3, dpi), mmToPixels(2, dpi)]);
                drawShapePath(ctx, shape, centerX, centerY, baseWidthMm, baseLengthMm, bleedMm, dimensions, dpi);
                ctx.stroke();
                ctx.restore();
            }
        }

        // Linha de Corte Real da Base (Vermelho Vivo / Âmbar Pontilhado)
        if (production.showCutLine || mode === 'cut_guide') {
            if (shape === 'stl' && stlSilhouette) {
                const w = mmToPixels(baseWidthMm, dpi);
                const h = mmToPixels(baseLengthMm, dpi);
                drawSilhouetteContour(ctx, stlSilhouette, centerX - w / 2, centerY - h / 2, w, h, '#ef4444', Math.max(2, mmToPixels(0.4, dpi)));
            } else {
                ctx.save();
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = Math.max(1.5, Math.round(mmToPixels(0.45, dpi)));
                ctx.setLineDash([mmToPixels(4, dpi), mmToPixels(3, dpi)]);
                drawShapePath(ctx, shape, centerX, centerY, baseWidthMm, baseLengthMm, 0, dimensions, dpi);
                ctx.stroke();
                ctx.restore();
            }
        }

        // Cruz de Alinhamento Central
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        const cross = mmToPixels(4, dpi);
        ctx.beginPath();
        ctx.moveTo(centerX - cross, centerY);
        ctx.lineTo(centerX + cross, centerY);
        ctx.moveTo(centerX, centerY - cross);
        ctx.lineTo(centerX, centerY + cross);
        ctx.stroke();
        ctx.restore();
    }
}

/**
 * Desenha a arte gráfica com translações, escala, rotação e filtros
 */
function drawArtImage(
    ctx: CanvasRenderingContext2D,
    artImage: HTMLImageElement,
    artTransform: ArtworkTransform,
    centerX: number,
    centerY: number,
    baseWidthMm: number,
    dpi: number
) {
    ctx.save();
    ctx.translate(
        centerX + mmToPixels(artTransform.xMm, dpi),
        centerY + mmToPixels(artTransform.yMm, dpi)
    );

    ctx.rotate((artTransform.rotationDeg * Math.PI) / 180);
    ctx.scale(
        artTransform.flipH ? -artTransform.scale : artTransform.scale,
        artTransform.flipV ? -artTransform.scale : artTransform.scale
    );

    const b = artTransform.brightness;
    const c = artTransform.contrast;
    const s = artTransform.saturation;
    ctx.filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%)`;

    const imgW = mmToPixels(baseWidthMm, dpi);
    const aspect = artImage.naturalHeight / artImage.naturalWidth;
    const imgH = imgW * aspect;

    ctx.drawImage(artImage, -imgW / 2, -imgH / 2, imgW, imgH);
    ctx.restore();
}

/**
 * Aplica a máscara geométrica ou do STL sobre o canvas da máscara
 */
function applyShapeMask(
    maskCtx: CanvasRenderingContext2D,
    shape: BaseShapeType,
    cx: number,
    cy: number,
    widthMm: number,
    lengthMm: number,
    bleedMm: number,
    dimensions: BaseDimensions,
    dpi: number,
    stlSilhouette?: HTMLCanvasElement | null
) {
    const w = mmToPixels(widthMm + bleedMm * 2, dpi);
    const h = mmToPixels(lengthMm + bleedMm * 2, dpi);

    if (shape === 'stl' && stlSilhouette) {
        // Desenha a silhueta STL no canvas da máscara (apenas para destination-in)
        maskCtx.drawImage(stlSilhouette, cx - w / 2, cy - h / 2, w, h);
        return;
    }

    maskCtx.beginPath();
    drawShapePath(maskCtx, shape, cx, cy, widthMm, lengthMm, bleedMm, dimensions, dpi);
    maskCtx.fill();
}

/**
 * Desenha o contorno vazado (borda) da silhueta STL sem nenhum preenchimento sólido
 */
function drawSilhouetteContour(
    ctx: CanvasRenderingContext2D,
    silhouetteCanvas: HTMLCanvasElement,
    destX: number,
    destY: number,
    destW: number,
    destH: number,
    strokeColor: string,
    lineWidth = 2
) {
    const w = Math.round(destW);
    const h = Math.round(destH);
    if (w <= 0 || h <= 0) return;

    const strokeCanvas = document.createElement('canvas');
    strokeCanvas.width = w;
    strokeCanvas.height = h;
    const sCtx = strokeCanvas.getContext('2d');
    if (!sCtx) return;

    // 1. Desenha silhueta escalada
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tCtx = tempCanvas.getContext('2d');
    if (!tCtx) return;
    tCtx.drawImage(silhouetteCanvas, 0, 0, w, h);

    // 2. Dilatação morfológica com a cor do contorno
    const r = Math.max(1, Math.round(lineWidth));
    for (let dx = -r; dx <= r; dx += r) {
        for (let dy = -r; dy <= r; dy += r) {
            sCtx.drawImage(tempCanvas, dx, dy);
        }
    }

    sCtx.globalCompositeOperation = 'source-in';
    sCtx.fillStyle = strokeColor;
    sCtx.fillRect(0, 0, w, h);

    // 3. Subtrai o interior original para deixar apenas o contorno vazado
    sCtx.globalCompositeOperation = 'destination-out';
    sCtx.drawImage(tempCanvas, 0, 0);

    // 4. Copia o contorno com sombra para destaque visual
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 3;
    ctx.drawImage(strokeCanvas, destX, destY);
    ctx.restore();
}

/**
 * Traça o caminho vetorial geométrico para formas paramétricas
 */
function drawShapePath(
    ctx: CanvasRenderingContext2D,
    shape: BaseShapeType,
    cx: number,
    cy: number,
    widthMm: number,
    lengthMm: number,
    bleedMm: number,
    dimensions: BaseDimensions,
    dpi: number
) {
    const w = mmToPixels(widthMm + bleedMm * 2, dpi);
    const h = mmToPixels(lengthMm + bleedMm * 2, dpi);

    ctx.beginPath();

    if (shape === 'circle') {
        const radius = Math.min(w, h) / 2;
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    } else if (shape === 'rectangle') {
        const radius = mmToPixels((dimensions.borderRadiusMm || 0) + bleedMm, dpi);
        ctx.roundRect(cx - w / 2, cy - h / 2, w, h, radius);
    } else if (shape === 'hexagon') {
        const r = Math.min(w, h) / 2;
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6;
            const x = cx + r * Math.cos(angle);
            const y = cy + r * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
    } else if (shape === 'ellipse') {
        ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
    } else if (shape === 'd_shape') {
        const radius = h / 2;
        ctx.moveTo(cx - w / 2, cy - radius);
        ctx.lineTo(cx, cy - radius);
        ctx.arc(cx, cy, radius, -Math.PI / 2, Math.PI / 2);
        ctx.lineTo(cx - w / 2, cy + radius);
        ctx.closePath();
    } else {
        ctx.arc(cx, cy, Math.min(w, h) / 2, 0, Math.PI * 2);
    }
}

/**
 * Calcula os limites e a posição em pixels da logo no Canvas
 */
export function getLogoBounds(
    config: LogoConfig,
    logoImg: HTMLImageElement | null,
    cx: number,
    cy: number,
    baseWidthMm: number,
    baseLengthMm: number,
    dpi: number
) {
    if (!config.enabled || !logoImg || !logoImg.naturalWidth) return null;

    const logoWPx = mmToPixels(config.sizeMm, dpi);
    const aspect = logoImg.naturalHeight / logoImg.naturalWidth;
    const logoHPx = logoWPx * aspect;

    const marginX = mmToPixels(baseWidthMm * 0.25, dpi);
    const marginY = mmToPixels(baseLengthMm * 0.25, dpi);

    let x = cx;
    let y = cy;

    switch (config.position) {
        case 'bottom_right':
            x = cx + marginX;
            y = cy + marginY;
            break;
        case 'bottom_center':
            x = cx;
            y = cy + marginY;
            break;
        case 'bottom_left':
            x = cx - marginX;
            y = cy + marginY;
            break;
        case 'top_right':
            x = cx + marginX;
            y = cy - marginY;
            break;
        case 'top_center':
            x = cx;
            y = cy - marginY;
            break;
        case 'top_left':
            x = cx - marginX;
            y = cy - marginY;
            break;
        case 'center':
            x = cx;
            y = cy;
            break;
        case 'custom':
            x = cx + mmToPixels(config.customXMm, dpi);
            y = cy + mmToPixels(config.customYMm, dpi);
            break;
    }

    return {
        x,
        y,
        width: logoWPx,
        height: logoHPx,
        left: x - logoWPx / 2,
        right: x + logoWPx / 2,
        top: y - logoHPx / 2,
        bottom: y + logoHPx / 2
    };
}

/**
 * Posiciona e renderiza a logo com controle de estilo e ancoragem
 */
function drawLogo(
    ctx: CanvasRenderingContext2D,
    logoImg: HTMLImageElement,
    config: LogoConfig,
    cx: number,
    cy: number,
    baseWidthMm: number,
    baseLengthMm: number,
    dpi: number,
    showSelection = false
) {
    const bounds = getLogoBounds(config, logoImg, cx, cy, baseWidthMm, baseLengthMm, dpi);
    if (!bounds) return;

    const { x, y, width: logoWPx, height: logoHPx } = bounds;

    ctx.save();
    ctx.globalAlpha = config.opacity;

    if (config.style === 'shadow') {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
        ctx.shadowBlur = mmToPixels(1.5, dpi);
        ctx.shadowOffsetX = mmToPixels(0.5, dpi);
        ctx.shadowOffsetY = mmToPixels(0.8, dpi);
    }

    if (config.style === 'white') {
        const whiteCanvas = document.createElement('canvas');
        whiteCanvas.width = logoImg.naturalWidth;
        whiteCanvas.height = logoImg.naturalHeight;
        const wCtx = whiteCanvas.getContext('2d');
        if (wCtx) {
            wCtx.drawImage(logoImg, 0, 0);
            wCtx.globalCompositeOperation = 'source-in';
            wCtx.fillStyle = '#ffffff';
            wCtx.fillRect(0, 0, whiteCanvas.width, whiteCanvas.height);
            ctx.drawImage(whiteCanvas, x - logoWPx / 2, y - logoHPx / 2, logoWPx, logoHPx);
        }
    } else {
        ctx.drawImage(logoImg, x - logoWPx / 2, y - logoHPx / 2, logoWPx, logoHPx);
    }

    // Desenha caixa de seleção pontilhada se o mouse estiver sobre a logo ou arrastando
    if (showSelection) {
        ctx.save();
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(x - logoWPx / 2 - 3, y - logoHPx / 2 - 3, logoWPx + 6, logoHPx + 6);

        // Pontos de ancoragem nos 4 cantos
        ctx.fillStyle = '#f97316';
        const s = 4;
        ctx.fillRect(x - logoWPx / 2 - 3 - s / 2, y - logoHPx / 2 - 3 - s / 2, s, s);
        ctx.fillRect(x + logoWPx / 2 + 3 - s / 2, y - logoHPx / 2 - 3 - s / 2, s, s);
        ctx.fillRect(x - logoWPx / 2 - 3 - s / 2, y + logoHPx / 2 + 3 - s / 2, s, s);
        ctx.fillRect(x + logoWPx / 2 + 3 - s / 2, y + logoHPx / 2 + 3 - s / 2, s, s);
        ctx.restore();
    }

    ctx.restore();
}

/**
 * Calcula os limites e a posição em pixels da caixa de texto no Canvas
 */
export function getTextBounds(
    config: TextConfig,
    cx: number,
    cy: number,
    baseWidthMm: number,
    baseLengthMm: number,
    dpi: number
) {
    if (!config.enabled || (!config.figureTitle && !config.subtitle)) return null;

    let posX = cx;
    let posY = cy;

    if (config.position === 'custom' && config.customXMm !== undefined && config.customYMm !== undefined) {
        posX = cx + mmToPixels(config.customXMm, dpi);
        posY = cy + mmToPixels(config.customYMm, dpi);
    } else if (config.position === 'top') {
        posX = cx;
        posY = cy - mmToPixels(baseLengthMm * 0.32, dpi);
    } else {
        // 'bottom' ou padrão
        posX = cx;
        posY = cy + mmToPixels(baseLengthMm * 0.36, dpi);
    }

    const titleFontSize = Math.round(mmToPixels((config.fontSizePt || 14) * 0.3527, dpi));
    const subFontSize = Math.max(9, Math.round(titleFontSize * 0.65));

    const titleLen = config.figureTitle ? config.figureTitle.length : 0;
    const subText = [config.subtitle, config.showEdition ? config.editionText : ''].filter(Boolean).join(' • ');
    const subLen = subText ? subText.length : 0;

    const approxTitleWidth = titleLen * (titleFontSize * 0.62);
    const approxSubWidth = subLen * (subFontSize * 0.55);
    const boxWidth = Math.max(approxTitleWidth, approxSubWidth, mmToPixels(28, dpi));

    const hasSub = Boolean(subText);
    const boxHeight = hasSub ? (titleFontSize + subFontSize * 1.5) : titleFontSize * 1.2;

    return {
        x: posX,
        y: posY,
        width: boxWidth,
        height: boxHeight,
        left: posX - boxWidth / 2 - 6,
        right: posX + boxWidth / 2 + 6,
        top: posY - titleFontSize - 4,
        bottom: posY + (hasSub ? subFontSize * 1.6 : 4)
    };
}

/**
 * Desenha tipografia e identificação de colecionador na base com suporte a arrastar
 */
function drawText(
    ctx: CanvasRenderingContext2D,
    config: TextConfig,
    cx: number,
    cy: number,
    baseWidthMm: number,
    baseLengthMm: number,
    dpi: number,
    showSelection = false
) {
    const bounds = getTextBounds(config, cx, cy, baseWidthMm, baseLengthMm, dpi);
    if (!bounds) return;

    const posX = bounds.x;
    const posY = bounds.y;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = config.textColor || '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = mmToPixels(1, dpi);
    ctx.shadowOffsetY = mmToPixels(0.5, dpi);

    const titleFontSize = Math.round(mmToPixels((config.fontSizePt || 14) * 0.3527, dpi));
    ctx.font = `900 ${titleFontSize}px Inter, sans-serif`;

    if (config.figureTitle) {
        ctx.fillText(config.figureTitle.toUpperCase(), posX, posY);
    }

    if (config.subtitle || (config.showEdition && config.editionText)) {
        const subFontSize = Math.max(9, Math.round(titleFontSize * 0.65));
        ctx.font = `600 ${subFontSize}px Inter, sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        const textToDisplay = [config.subtitle, config.showEdition ? config.editionText : '']
            .filter(Boolean)
            .join(' • ');
        ctx.fillText(textToDisplay, posX, posY + subFontSize * 1.3);
    }

    // Desenha caixa de seleção pontilhada se o mouse estiver sobre o texto ou arrastando
    if (showSelection) {
        ctx.save();
        ctx.strokeStyle = '#38bdf8'; // Ciano para diferenciar da logo laranja
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        const w = bounds.right - bounds.left;
        const h = bounds.bottom - bounds.top;
        ctx.strokeRect(bounds.left, bounds.top, w, h);

        // Pontos de ancoragem nos 4 cantos
        ctx.fillStyle = '#38bdf8';
        const s = 4;
        ctx.fillRect(bounds.left - s / 2, bounds.top - s / 2, s, s);
        ctx.fillRect(bounds.right - s / 2, bounds.top - s / 2, s, s);
        ctx.fillRect(bounds.left - s / 2, bounds.bottom - s / 2, s, s);
        ctx.fillRect(bounds.right - s / 2, bounds.bottom - s / 2, s, s);
        ctx.restore();
    }

    ctx.restore();
}
