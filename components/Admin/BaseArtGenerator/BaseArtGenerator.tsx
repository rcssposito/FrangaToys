'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
    Upload, Disc, Layers, ZoomIn, ZoomOut, RotateCw, Move, 
    Download, FileText, Image as ImageIcon, Sparkles, Scissors, 
    Eye, Shield, RefreshCw, Check, ArrowRight, CornerDownRight,
    Maximize2, Sliders, Type, Grid, Undo2, ArrowUpDown, MousePointerClick
} from 'lucide-react';
import { toast } from 'sonner';
import { 
    BaseShapeType, 
    BaseDimensions, 
    ArtworkTransform, 
    LogoConfig, 
    TextConfig, 
    ProductionConfig,
    STLMetadata 
} from './types';
import { processSTLFile, orientSTLByNormal, ProcessedSTL } from './stlProcessor';
import { renderBaseComposition, getLogoBounds, getTextBounds, pixelsToMm } from './canvasRenderer';
import { exportToSVG } from './svgExporter';
import Base3DPreview from './Base3DPreview';
import FigureCatalogPickerModal from './FigureCatalogPickerModal';
import * as THREE from 'three';

const DEFAULT_DIMENSIONS: BaseDimensions = {
    widthMm: 100,
    lengthMm: 100,
    heightMm: 12,
    diameterMm: 100,
    borderRadiusMm: 8
};

const DEFAULT_TRANSFORM: ArtworkTransform = {
    xMm: 0,
    yMm: 0,
    scale: 1,
    rotationDeg: 0,
    flipH: false,
    flipV: false,
    brightness: 100,
    contrast: 100,
    saturation: 100,
    vignette: true
};

const DEFAULT_LOGO: LogoConfig = {
    enabled: true,
    type: 'franga',
    position: 'bottom_right',
    customXMm: 0,
    customYMm: 0,
    sizeMm: 24,
    opacity: 0.9,
    style: 'original'
};

const DEFAULT_TEXT: TextConfig = {
    enabled: false,
    figureTitle: '',
    subtitle: '',
    editionText: 'Colecionável 1/1',
    showEdition: true,
    fontSizePt: 10,
    textColor: '#ffffff',
    position: 'bottom'
};

const DEFAULT_PRODUCTION: ProductionConfig = {
    bleedMm: 2,
    showCutLine: true,
    showBleedLine: true,
    showRegistrationMarks: true,
    showCalibrationRuler: true,
    quantityPerSheet: 1
};

export default function BaseArtGenerator() {
    // Estado Principal
    const [shape, setShape] = useState<BaseShapeType>('circle');
    const [dimensions, setDimensions] = useState<BaseDimensions>(DEFAULT_DIMENSIONS);
    const [artTransform, setArtTransform] = useState<ArtworkTransform>(DEFAULT_TRANSFORM);
    const [logoConfig, setLogoConfig] = useState<LogoConfig>(DEFAULT_LOGO);
    const [textConfig, setTextConfig] = useState<TextConfig>(DEFAULT_TEXT);
    const [production, setProduction] = useState<ProductionConfig>(DEFAULT_PRODUCTION);

    // Recursos Carregados
    const [artImage, setArtImage] = useState<HTMLImageElement | null>(null);
    const [artPreviewUrl, setArtPreviewUrl] = useState<string>('');
    const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null);
    const [stlGeometry, setStlGeometry] = useState<THREE.BufferGeometry | null>(null);
    const [stlSilhouette, setStlSilhouette] = useState<HTMLCanvasElement | null>(null);
    const [stlMetadata, setStlMetadata] = useState<STLMetadata | null>(null);
    const [rawStlBuffer, setRawStlBuffer] = useState<ArrayBuffer | null>(null);

    // UI e Abas
    const [activeTab, setActiveTab] = useState<'shape' | 'art' | 'logo' | 'text' | 'production'>('shape');
    const [viewMode, setViewMode] = useState<'preview' | 'cut_guide' | '3d'>('cut_guide');
    const [zoomLevel, setZoomLevel] = useState<number>(1);
    const [isProcessingStl, setIsProcessingStl] = useState(false);
    const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
    const [dragTarget, setDragTarget] = useState<'art' | 'logo' | 'text' | null>(null);
    const [isHoveringLogo, setIsHoveringLogo] = useState(false);
    const [isHoveringText, setIsHoveringText] = useState(false);
    const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });

    // Referências aos Canvas e Workspace
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const workspaceRef = useRef<HTMLDivElement>(null);

    const searchParams = useSearchParams();

    // Desabilita o scroll da página enquanto o gerador de base estiver ativo para não interferir no zoom
    useEffect(() => {
        const prevOverflow = document.body.style.overflow;
        const prevHeight = document.body.style.height;
        document.body.style.overflow = 'hidden';
        document.body.style.height = '100vh';

        return () => {
            document.body.style.overflow = prevOverflow;
            document.body.style.height = prevHeight;
        };
    }, []);

    // Captura o scroll da roda do mouse de forma nativa e não-passiva para prevenir scroll da página
    useEffect(() => {
        const el = workspaceRef.current;
        if (!el) return;

        const handleNativeWheel = (e: WheelEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (viewMode === '3d') return;

            const delta = e.deltaY < 0 ? 0.05 : -0.05;
            setArtTransform(prev => ({
                ...prev,
                scale: Math.max(0.1, Math.min(5, Math.round((prev.scale + delta) * 100) / 100))
            }));
        };

        el.addEventListener('wheel', handleNativeWheel, { passive: false });
        return () => {
            el.removeEventListener('wheel', handleNativeWheel);
        };
    }, [viewMode]);

    // Carrega Logo Oficial Franga Toys diretamente da pasta local /public
    // Origem 100% idêntica ao site, prevenindo o erro de SecurityError / Tainted Canvas
    useEffect(() => {
        const img = new Image();
        img.onload = () => setLogoImage(img);
        img.src = '/franga-toys-logo.png';
    }, []);

    // Função robusta para carregar imagens de figuras evitando bloqueios de CORS no Canvas
    const loadArtworkImage = useCallback((imageUrl: string, title?: string, studio?: string) => {
        setArtPreviewUrl(imageUrl);
        if (title || studio) {
            setTextConfig(prev => ({
                ...prev,
                figureTitle: title || prev.figureTitle,
                subtitle: studio || prev.subtitle
            }));
        }

        // Se a imagem for remota (http/https), usa o proxy interno para garantir mesma origem
        const safeFetchUrl = (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))
            ? `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`
            : imageUrl;

        // Tenta buscar via fetch Blob local para garantir imagem de origem local segura
        fetch(safeFetchUrl)
            .then(res => {
                if (!res.ok) throw new Error('Status: ' + res.status);
                return res.blob();
            })
            .then(blob => {
                const objectUrl = URL.createObjectURL(blob);
                const img = new Image();
                img.onload = () => {
                    setArtImage(img);
                    setActiveTab('art');
                    toast.success(title ? `Arte de "${title}" carregada!` : 'Ilustração carregada!');
                };
                img.src = objectUrl;
            })
            .catch((err) => {
                console.warn('Tentando fallback com crossOrigin...', err);
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    setArtImage(img);
                    setActiveTab('art');
                    toast.success(title ? `Arte de "${title}" carregada!` : 'Ilustração carregada!');
                };
                img.onerror = () => {
                    toast.error('Erro ao carregar a imagem da figura. Experimente fazer o upload da imagem.');
                };
                img.src = safeFetchUrl;
            });
    }, []);

    // Auto-carrega dados passados por URL (ex: ?name=Luffy&img=...&studio=Nomnom)
    useEffect(() => {
        if (!searchParams) return;
        const imgParam = searchParams.get('img');
        const nameParam = searchParams.get('name');
        const studioParam = searchParams.get('studio');

        if (imgParam) {
            loadArtworkImage(imgParam, nameParam || undefined, studioParam || undefined);
        } else if (nameParam || studioParam) {
            setTextConfig(prev => ({
                ...prev,
                enabled: true,
                figureTitle: nameParam || prev.figureTitle,
                subtitle: studioParam || prev.subtitle
            }));
        }
    }, [searchParams, loadArtworkImage]);

    // Atualiza Renderização do Canvas 2D Interativo (140 DPI leve)
    const triggerRender = useCallback(() => {
        if (!canvasRef.current) return;

        renderBaseComposition({
            targetCanvas: canvasRef.current,
            shape,
            dimensions,
            artImage,
            artTransform,
            logoImage,
            logoConfig,
            textConfig,
            production,
            stlSilhouette,
            mode: viewMode === 'preview' ? 'preview' : 'cut_guide',
            dpi: 140,
            showLogoSelection: isHoveringLogo || dragTarget === 'logo',
            showTextSelection: isHoveringText || dragTarget === 'text'
        });
    }, [shape, dimensions, artImage, artTransform, logoImage, logoConfig, textConfig, production, stlSilhouette, viewMode, isHoveringLogo, isHoveringText, dragTarget]);

    // Gera versão em ultra alta resolução (600 DPI) sob demanda APENAS na exportação (evita vazamento de memória)
    const getHighResCanvas = useCallback((): HTMLCanvasElement => {
        const canvas = document.createElement('canvas');
        renderBaseComposition({
            targetCanvas: canvas,
            shape,
            dimensions,
            artImage,
            artTransform,
            logoImage,
            logoConfig,
            textConfig,
            production,
            stlSilhouette,
            mode: 'export_print',
            dpi: 600
        });
        return canvas;
    }, [shape, dimensions, artImage, artTransform, logoImage, logoConfig, textConfig, production, stlSilhouette]);

    // Gera textura 3D dedicada: 100% limpa, sem margens externas e sem linhas de corte na malha
    const get3DTextureCanvas = useCallback((): HTMLCanvasElement | null => {
        const canvas = document.createElement('canvas');
        renderBaseComposition({
            targetCanvas: canvas,
            shape,
            dimensions,
            artImage,
            artTransform,
            logoImage,
            logoConfig,
            textConfig,
            production: { ...production, bleedMm: 0, showCutLine: false, showBleedLine: false },
            stlSilhouette,
            mode: '3d_texture',
            dpi: 140
        });
        return canvas;
    }, [shape, dimensions, artImage, artTransform, logoImage, logoConfig, textConfig, production, stlSilhouette]);

    const [texture3DCanvas, setTexture3DCanvas] = useState<HTMLCanvasElement | null>(null);

    useEffect(() => {
        if (viewMode === '3d') {
            const tex = get3DTextureCanvas();
            setTexture3DCanvas(tex);
        }
    }, [viewMode, get3DTextureCanvas]);

    useEffect(() => {
        triggerRender();
    }, [triggerRender]);

    // Manipulador de Upload de STL com Nivelamento Automático (Snap to Grid)
    const handleSTLUpload = async (file: File) => {
        setIsProcessingStl(true);
        try {
            const buffer = await file.arrayBuffer();
            setRawStlBuffer(buffer);
            // Processa com detecção automática de face e assentamento na mesa
            const processed = await processSTLFile(buffer, file.name, undefined, true);

            setStlGeometry(processed.geometry);
            setStlDimensions(processed.dimensions);
            setStlMetadata(processed.metadata);
            setStlSilhouette(processed.silhouetteCanvas);
            setShape('stl');

            toast.success(`STL "${file.name}" assentado na mesa! (${processed.dimensions.widthMm}mm × ${processed.dimensions.lengthMm}mm)`);
        } catch (err: any) {
            console.error('Erro ao processar STL:', err);
            toast.error('Falha ao ler arquivo STL. Certifique-se de que é um STL válido.');
        } finally {
            setIsProcessingStl(false);
        }
    };

    const setStlDimensions = (dim: BaseDimensions) => {
        setDimensions(prev => ({
            ...prev,
            widthMm: dim.widthMm,
            lengthMm: dim.lengthMm,
            heightMm: dim.heightMm || 12
        }));
    };

    // Nivelar Automaticamente na Mesa (Snap to Grid / Orient by Face automático)
    const handleAutoSnapToGrid = async () => {
        if (!rawStlBuffer || !stlMetadata) return;
        setIsProcessingStl(true);
        try {
            const processed = await processSTLFile(rawStlBuffer, stlMetadata.fileName, undefined, true);
            setStlGeometry(processed.geometry);
            setStlDimensions(processed.dimensions);
            setStlMetadata(processed.metadata);
            setStlSilhouette(processed.silhouetteCanvas);
            toast.success(`Snap to Grid: base nivelada automaticamente na mesa! (${processed.dimensions.widthMm}mm × ${processed.dimensions.lengthMm}mm)`);
        } catch (err) {
            toast.error('Erro ao nivelar STL automaticamente');
        } finally {
            setIsProcessingStl(false);
        }
    };

    // Assentar na mesa pela face clicada no 3D (Orient by Face via Raycast)
    const handleOrientByFace = (normal: THREE.Vector3) => {
        if (!rawStlBuffer || !stlMetadata) return;
        setIsProcessingStl(true);
        try {
            const processed = orientSTLByNormal(rawStlBuffer, stlMetadata.fileName, normal);
            setStlGeometry(processed.geometry);
            setStlDimensions(processed.dimensions);
            setStlMetadata(processed.metadata);
            setStlSilhouette(processed.silhouetteCanvas);
            toast.success(`Orient by Face: face selecionada assentada na mesa! (${processed.dimensions.widthMm}mm × ${processed.dimensions.lengthMm}mm)`);
        } catch (err) {
            toast.error('Erro ao assentar pela face selecionada');
        } finally {
            setIsProcessingStl(false);
        }
    };

    // Inverter Base 180 graus (Topo / Fundo)
    const handleInvertSTL = async () => {
        if (!rawStlBuffer || !stlMetadata) return;
        setIsProcessingStl(true);
        try {
            const currentAngles = stlMetadata.rotationAxis || { x: 0, y: 0, z: 0 };
            const newAngles = {
                ...currentAngles,
                x: (currentAngles.x + 180) % 360
            };
            const processed = await processSTLFile(rawStlBuffer, stlMetadata.fileName, newAngles, false);
            setStlGeometry(processed.geometry);
            setStlDimensions(processed.dimensions);
            setStlMetadata(processed.metadata);
            setStlSilhouette(processed.silhouetteCanvas);
            toast.info('Base invertida 180° (Topo / Fundo)');
        } catch (err) {
            toast.error('Erro ao inverter STL');
        } finally {
            setIsProcessingStl(false);
        }
    };

    // Rotação Manual de Correção do STL nos eixos X/Y/Z em 90 graus
    const handleRotateSTL = async (axis: 'x' | 'y' | 'z') => {
        if (!rawStlBuffer || !stlMetadata) return;
        setIsProcessingStl(true);
        try {
            const newAngles = { ...stlMetadata.rotationAxis };
            newAngles[axis] = (newAngles[axis] + 90) % 360;

            const processed = await processSTLFile(rawStlBuffer, stlMetadata.fileName, newAngles, false);
            setStlGeometry(processed.geometry);
            setStlDimensions(processed.dimensions);
            setStlMetadata(processed.metadata);
            setStlSilhouette(processed.silhouetteCanvas);
            toast.info(`STL rotacionado no eixo ${axis.toUpperCase()} (+90°)`);
        } catch (err) {
            toast.error('Erro ao rotacionar STL');
        } finally {
            setIsProcessingStl(false);
        }
    };

    // Upload de Imagem de Arte do Computador
    const handleArtImageFile = (file: File) => {
        const objectUrl = URL.createObjectURL(file);
        setArtPreviewUrl(objectUrl);
        const img = new Image();
        img.onload = () => {
            setArtImage(img);
            setActiveTab('art');
            toast.success('Ilustração carregada com sucesso!');
        };
        img.onerror = () => toast.error('Falha ao processar arquivo de imagem');
        img.src = objectUrl;
    };

    // Seleção de Figure do Catálogo Franga
    const handleSelectFigureFromCatalog = (fig: { nome: string; studioName: string; imageUrl: string }) => {
        loadArtworkImage(fig.imageUrl, fig.nome, fig.studioName);
    };

    // Hit test para verificar se o cursor está em cima da Logo no Canvas
    const checkLogoHit = useCallback((clientX: number, clientY: number): boolean => {
        if (!canvasRef.current || !logoConfig.enabled || !logoImage || !logoImage.naturalWidth) return false;
        const rect = canvasRef.current.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;

        const scaleX = canvasRef.current.width / rect.width;
        const scaleY = canvasRef.current.height / rect.height;
        const canvasX = (clientX - rect.left) * scaleX;
        const canvasY = (clientY - rect.top) * scaleY;

        const dpi = 140;
        const cx = canvasRef.current.width / 2;
        const cy = canvasRef.current.height / 2;

        const bounds = getLogoBounds(logoConfig, logoImage, cx, cy, dimensions.widthMm, dimensions.lengthMm, dpi);
        if (!bounds) return false;

        const pad = 8;
        return (
            canvasX >= bounds.left - pad &&
            canvasX <= bounds.right + pad &&
            canvasY >= bounds.top - pad &&
            canvasY <= bounds.bottom + pad
        );
    }, [logoConfig, logoImage, dimensions.widthMm, dimensions.lengthMm]);

    // Hit test para verificar se o cursor está em cima da Caixa de Texto no Canvas
    const checkTextHit = useCallback((clientX: number, clientY: number): boolean => {
        if (!canvasRef.current || !textConfig.enabled || (!textConfig.figureTitle && !textConfig.subtitle)) return false;
        const rect = canvasRef.current.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;

        const scaleX = canvasRef.current.width / rect.width;
        const scaleY = canvasRef.current.height / rect.height;
        const canvasX = (clientX - rect.left) * scaleX;
        const canvasY = (clientY - rect.top) * scaleY;

        const dpi = 140;
        const cx = canvasRef.current.width / 2;
        const cy = canvasRef.current.height / 2;

        const bounds = getTextBounds(textConfig, cx, cy, dimensions.widthMm, dimensions.lengthMm, dpi);
        if (!bounds) return false;

        const pad = 8;
        return (
            canvasX >= bounds.left - pad &&
            canvasX <= bounds.right + pad &&
            canvasY >= bounds.top - pad &&
            canvasY <= bounds.bottom + pad
        );
    }, [textConfig, dimensions.widthMm, dimensions.lengthMm]);

    // Interatividade: Arrastar arte, logo ou texto com o mouse diretamente no Canvas
    const handleMouseDownCanvas = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (viewMode === '3d') return;

        const hitLogo = checkLogoHit(e.clientX, e.clientY);
        const hitText = checkTextHit(e.clientX, e.clientY);

        if (hitLogo) {
            // Se a logo estava em uma posição fixa de âncora, converte a posição visual atual para custom
            if (logoConfig.position !== 'custom' && canvasRef.current && logoImage) {
                const dpi = 140;
                const cx = canvasRef.current.width / 2;
                const cy = canvasRef.current.height / 2;
                const bounds = getLogoBounds(logoConfig, logoImage, cx, cy, dimensions.widthMm, dimensions.lengthMm, dpi);
                if (bounds) {
                    const currentXMm = Math.round(pixelsToMm(bounds.x - cx, dpi) * 10) / 10;
                    const currentYMm = Math.round(pixelsToMm(bounds.y - cy, dpi) * 10) / 10;
                    setLogoConfig(prev => ({
                        ...prev,
                        position: 'custom',
                        customXMm: currentXMm,
                        customYMm: currentYMm
                    }));
                }
            }
            setDragTarget('logo');
        } else if (hitText) {
            // Se o texto estava em posição predefinida (top/bottom), converte para custom ao iniciar arrasto
            if (textConfig.position !== 'custom' && canvasRef.current) {
                const dpi = 140;
                const cx = canvasRef.current.width / 2;
                const cy = canvasRef.current.height / 2;
                const bounds = getTextBounds(textConfig, cx, cy, dimensions.widthMm, dimensions.lengthMm, dpi);
                if (bounds) {
                    const currentXMm = Math.round(pixelsToMm(bounds.x - cx, dpi) * 10) / 10;
                    const currentYMm = Math.round(pixelsToMm(bounds.y - cy, dpi) * 10) / 10;
                    setTextConfig(prev => ({
                        ...prev,
                        position: 'custom',
                        customXMm: currentXMm,
                        customYMm: currentYMm
                    }));
                }
            }
            setDragTarget('text');
        } else {
            setDragTarget('art');
        }
        setDragStartPos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseMoveCanvas = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (viewMode === '3d') return;

        if (!dragTarget) {
            const hitLogo = checkLogoHit(e.clientX, e.clientY);
            const hitText = checkTextHit(e.clientX, e.clientY);
            if (hitLogo !== isHoveringLogo) setIsHoveringLogo(hitLogo);
            if (hitText !== isHoveringText) setIsHoveringText(hitText);
            return;
        }

        const deltaX = e.clientX - dragStartPos.x;
        const deltaY = e.clientY - dragStartPos.y;
        setDragStartPos({ x: e.clientX, y: e.clientY });

        if (dragTarget === 'logo') {
            if (!canvasRef.current) return;
            const rect = canvasRef.current.getBoundingClientRect();
            const screenToCanvasFactor = canvasRef.current.width / rect.width;
            const dpi = 140;
            const deltaXMm = pixelsToMm(deltaX * screenToCanvasFactor, dpi);
            const deltaYMm = pixelsToMm(deltaY * screenToCanvasFactor, dpi);

            setLogoConfig(prev => ({
                ...prev,
                position: 'custom',
                customXMm: Math.round((prev.customXMm + deltaXMm) * 10) / 10,
                customYMm: Math.round((prev.customYMm + deltaYMm) * 10) / 10
            }));
        } else if (dragTarget === 'text') {
            if (!canvasRef.current) return;
            const rect = canvasRef.current.getBoundingClientRect();
            const screenToCanvasFactor = canvasRef.current.width / rect.width;
            const dpi = 140;
            const deltaXMm = pixelsToMm(deltaX * screenToCanvasFactor, dpi);
            const deltaYMm = pixelsToMm(deltaY * screenToCanvasFactor, dpi);

            setTextConfig(prev => ({
                ...prev,
                position: 'custom',
                customXMm: Math.round(((prev.customXMm || 0) + deltaXMm) * 10) / 10,
                customYMm: Math.round(((prev.customYMm || 0) + deltaYMm) * 10) / 10
            }));
        } else if (dragTarget === 'art') {
            const sensitivity = 0.5 / zoomLevel;
            setArtTransform(prev => ({
                ...prev,
                xMm: Math.round((prev.xMm + deltaX * sensitivity) * 10) / 10,
                yMm: Math.round((prev.yMm + deltaY * sensitivity) * 10) / 10
            }));
        }
    };

    const handleMouseUpCanvas = () => {
        setDragTarget(null);
    };

    // Exportação em SVG Vetorial (Escala 1:1 Física em mm para Plotters de Recorte)
    const handleExportSVG = async () => {
        try {
            toast.loading('Gerando arquivo SVG vetorial 1:1 com contornos de corte...');
            const highResCanvas = getHighResCanvas();
            await exportToSVG({
                canvas: highResCanvas,
                shape,
                dimensions,
                figureTitle: textConfig.figureTitle || (stlMetadata?.fileName.replace(/\.stl$/i, '') || 'Base'),
                studioName: textConfig.subtitle || 'Franga Toys',
                production,
                stlSilhouette
            });
            toast.dismiss();
            toast.success('SVG Vetorial gerado com sucesso! Pronto para Silhouette, Cricut, Laser e Corel/Illustrator.');
        } catch (err) {
            toast.dismiss();
            console.error('Erro na exportação de SVG:', err);
            toast.error('Erro ao gerar SVG vetorial de corte.');
        }
    };

    // Exportação em PNG Ultra Resolução (600 DPI)
    const handleExportPNG = () => {
        try {
            toast.loading('Processando renderização em 600 DPI...');
            const highResCanvas = getHighResCanvas();
            const dataUrl = highResCanvas.toDataURL('image/png', 1.0);
            const link = document.createElement('a');
            link.download = `base_${dimensions.widthMm}mm_600dpi.png`;
            link.href = dataUrl;
            link.click();
            toast.dismiss();
            toast.success('PNG 600 DPI exportado com sucesso!');
        } catch (err: any) {
            toast.dismiss();
            console.error('Erro ao exportar PNG:', err);
            try {
                const highResCanvas = getHighResCanvas();
                highResCanvas.toBlob((blob) => {
                    if (!blob) throw new Error('Blob não gerado');
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.download = `base_${dimensions.widthMm}mm_600dpi.png`;
                    link.href = url;
                    link.click();
                    setTimeout(() => URL.revokeObjectURL(url), 1500);
                    toast.success('PNG 600 DPI exportado com sucesso!');
                }, 'image/png', 1.0);
            } catch (blobErr) {
                toast.error('Erro de segurança do Canvas. Faça o upload do arquivo de imagem do computador.');
            }
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-5 h-[calc(100vh-140px)] max-h-[calc(100vh-140px)] overflow-hidden items-stretch">
            {/* Modal de Catálogo */}
            <FigureCatalogPickerModal
                isOpen={isCatalogModalOpen}
                onClose={() => setIsCatalogModalOpen(false)}
                onSelectFigure={handleSelectFigureFromCatalog}
            />

            {/* PAINEL LATERAL ESQUERDO: CONTROLES & CONFIGURAÇÕES */}
            <div className="w-full lg:w-[400px] xl:w-[440px] bg-zinc-950 border border-zinc-800 rounded-3xl p-5 flex flex-col gap-4 shadow-2xl shrink-0 h-full overflow-hidden">
                {/* Header da Ferramenta */}
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-center">
                            <Disc size={20} className="animate-spin-slow" />
                        </div>
                        <div>
                            <h1 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                                GERADOR DE BASE <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full uppercase">1:1 Vinil</span>
                            </h1>
                            <p className="text-[11px] text-zinc-400">
                                Recorte milimétrico & Arte gráfica para impressão física
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tabs de Configuração */}
                <div className="grid grid-cols-5 gap-1 p-1 bg-zinc-900/60 border border-zinc-800 rounded-2xl">
                    <button
                        onClick={() => setActiveTab('shape')}
                        className={`py-2 text-[11px] font-black uppercase rounded-xl transition-all flex flex-col items-center gap-1 cursor-pointer ${
                            activeTab === 'shape' ? 'bg-orange-500 text-black shadow-md' : 'text-zinc-400 hover:text-white'
                        }`}
                        title="Formato da Base e STL"
                    >
                        <Disc size={14} />
                        <span>Base</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('art')}
                        className={`py-2 text-[11px] font-black uppercase rounded-xl transition-all flex flex-col items-center gap-1 cursor-pointer ${
                            activeTab === 'art' ? 'bg-orange-500 text-black shadow-md' : 'text-zinc-400 hover:text-white'
                        }`}
                        title="Arte e Imagem"
                    >
                        <ImageIcon size={14} />
                        <span>Arte</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('logo')}
                        className={`py-2 text-[11px] font-black uppercase rounded-xl transition-all flex flex-col items-center gap-1 cursor-pointer ${
                            activeTab === 'logo' ? 'bg-orange-500 text-black shadow-md' : 'text-zinc-400 hover:text-white'
                        }`}
                        title="Logos e Estúdios"
                    >
                        <Sparkles size={14} />
                        <span>Logo</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('text')}
                        className={`py-2 text-[11px] font-black uppercase rounded-xl transition-all flex flex-col items-center gap-1 cursor-pointer ${
                            activeTab === 'text' ? 'bg-orange-500 text-black shadow-md' : 'text-zinc-400 hover:text-white'
                        }`}
                        title="Identificação e Título"
                    >
                        <Type size={14} />
                        <span>Texto</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('production')}
                        className={`py-2 text-[11px] font-black uppercase rounded-xl transition-all flex flex-col items-center gap-1 cursor-pointer ${
                            activeTab === 'production' ? 'bg-orange-500 text-black shadow-md' : 'text-zinc-400 hover:text-white'
                        }`}
                        title="Sangria e Folha A4"
                    >
                        <Scissors size={14} />
                        <span>Corte</span>
                    </button>
                </div>

                {/* CONTEÚDO DA TAB ATIVA */}
                <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar min-h-0">
                    {/* TAB 1: FORMATO DA BASE & STL */}
                    {activeTab === 'shape' && (
                        <div className="space-y-4">
                            {/* Upload de STL */}
                            <div className="p-4 rounded-2xl bg-zinc-900/40 border border-dashed border-zinc-700 hover:border-orange-500/50 transition-all text-center relative group">
                                <input
                                    type="file"
                                    accept=".stl"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleSTLUpload(file);
                                    }}
                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                />
                                <div className="flex flex-col items-center gap-2 py-2">
                                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Upload size={20} />
                                    </div>
                                    <p className="text-xs font-bold text-white">
                                        {isProcessingStl ? 'Processando malha 3D...' : 'Importar arquivo STL da Base'}
                                    </p>
                                    <p className="text-[10px] text-zinc-500">
                                        Extração automática da silhueta em mm exatos
                                    </p>
                                </div>
                            </div>

                            {/* Informações do STL carregado */}
                            {stlMetadata && shape === 'stl' && (
                                <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl space-y-2.5">
                                    <div className="flex items-center justify-between text-xs font-mono">
                                        <span className="text-zinc-400 truncate max-w-[180px]" title={stlMetadata.fileName}>
                                            📄 {stlMetadata.fileName}
                                        </span>
                                        <span className="text-orange-400 font-bold">
                                            {dimensions.widthMm} × {dimensions.lengthMm} mm
                                        </span>
                                    </div>

                                    {/* Ações Principais de Nivelamento (Snap to Grid) */}
                                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                                        <button
                                            onClick={handleAutoSnapToGrid}
                                            disabled={isProcessingStl}
                                            className="px-2 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                                            title="Nivelar e assentar a base na mesa automaticamente (Snap to Grid)"
                                        >
                                            <Sparkles size={12} />
                                            <span>Snap to Grid</span>
                                        </button>
                                        <button
                                            onClick={handleInvertSTL}
                                            disabled={isProcessingStl}
                                            className="px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-zinc-700"
                                            title="Inverter Topo e Fundo (180°)"
                                        >
                                            <ArrowUpDown size={12} />
                                            <span>Inverter (180°)</span>
                                        </button>
                                    </div>

                                    {/* Ajustes Finos de Rotação Manual 90° */}
                                    <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80">
                                        <span className="text-[10px] text-zinc-500 uppercase font-black">Ajuste Fino:</span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleRotateSTL('x')}
                                                className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold rounded-lg cursor-pointer"
                                                title="Girar 90 graus no eixo X"
                                            >
                                                X 90°
                                            </button>
                                            <button
                                                onClick={() => handleRotateSTL('y')}
                                                className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold rounded-lg cursor-pointer"
                                                title="Girar 90 graus no eixo Y"
                                            >
                                                Y 90°
                                            </button>
                                            <button
                                                onClick={() => handleRotateSTL('z')}
                                                className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold rounded-lg cursor-pointer"
                                                title="Girar 90 graus no eixo Z"
                                            >
                                                Z 90°
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Divisor */}
                            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-zinc-600">
                                <div className="h-px bg-zinc-800 flex-1" />
                                <span>Ou Escolha uma Base Rápida</span>
                                <div className="h-px bg-zinc-800 flex-1" />
                            </div>

                            {/* Seletor de Shapes Paramétricos */}
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: 'circle', label: 'Circular' },
                                    { id: 'rectangle', label: 'Retangular' },
                                    { id: 'hexagon', label: 'Hexagonal' },
                                    { id: 'ellipse', label: 'Oval' },
                                    { id: 'd_shape', label: 'D-Shape' }
                                ].map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => setShape(item.id as BaseShapeType)}
                                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                            shape === item.id
                                                ? 'bg-orange-500/10 border-orange-500 text-orange-400 shadow-sm'
                                                : 'bg-zinc-900/50 border-zinc-800/80 text-zinc-400 hover:text-white'
                                        }`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>

                            {/* Controles de Dimensões em Milímetros */}
                            <div className="space-y-3 p-3 bg-zinc-900/40 rounded-2xl border border-zinc-800/80">
                                {shape === 'circle' ? (
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs">
                                            <span className="font-bold text-zinc-300">Diâmetro da Base</span>
                                            <span className="font-mono text-orange-400 font-bold">{dimensions.widthMm} mm</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={40}
                                            max={220}
                                            step={1}
                                            value={dimensions.widthMm}
                                            onChange={(e) => {
                                                const val = Number(e.target.value);
                                                setDimensions(prev => ({ ...prev, widthMm: val, lengthMm: val, diameterMm: val }));
                                            }}
                                            className="w-full accent-orange-500 cursor-pointer"
                                        />
                                        <div className="flex gap-1.5 pt-1">
                                            {[80, 100, 120, 140, 160].map(size => (
                                                <button
                                                    key={size}
                                                    onClick={() => setDimensions(prev => ({ ...prev, widthMm: size, lengthMm: size, diameterMm: size }))}
                                                    className={`flex-1 py-1 text-[10px] font-mono font-bold rounded-lg border transition-all cursor-pointer ${
                                                        dimensions.widthMm === size ? 'bg-orange-500 text-black border-orange-500' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                                                    }`}
                                                >
                                                    {size}mm
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-zinc-400">Largura (X)</span>
                                                <span className="font-mono text-orange-400 font-bold">{dimensions.widthMm} mm</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={40}
                                                max={250}
                                                value={dimensions.widthMm}
                                                onChange={(e) => setDimensions(prev => ({ ...prev, widthMm: Number(e.target.value) }))}
                                                className="w-full accent-orange-500 cursor-pointer"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-zinc-400">Comprimento (Y)</span>
                                                <span className="font-mono text-orange-400 font-bold">{dimensions.lengthMm} mm</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={40}
                                                max={250}
                                                value={dimensions.lengthMm}
                                                onChange={(e) => setDimensions(prev => ({ ...prev, lengthMm: Number(e.target.value) }))}
                                                className="w-full accent-orange-500 cursor-pointer"
                                            />
                                        </div>
                                        {shape === 'rectangle' && (
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-zinc-400">Cantos Arredondados (Raio)</span>
                                                    <span className="font-mono text-orange-400 font-bold">{dimensions.borderRadiusMm || 0} mm</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min={0}
                                                    max={30}
                                                    value={dimensions.borderRadiusMm || 0}
                                                    onChange={(e) => setDimensions(prev => ({ ...prev, borderRadiusMm: Number(e.target.value) }))}
                                                    className="w-full accent-orange-500 cursor-pointer"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB 2: ARTE & ILUSTRAÇÃO */}
                    {activeTab === 'art' && (
                        <div className="space-y-4">
                            {/* Ações de Origem da Arte */}
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => setIsCatalogModalOpen(true)}
                                    className="p-3 rounded-2xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 font-bold text-xs flex flex-col items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                                >
                                    <Sparkles size={18} />
                                    <span>Do Catálogo</span>
                                </button>
                                <label className="p-3 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold text-xs flex flex-col items-center gap-1.5 transition-all cursor-pointer">
                                    <Upload size={18} />
                                    <span>Fazer Upload</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleArtImageFile(file);
                                        }}
                                        className="hidden"
                                    />
                                </label>
                            </div>

                            {/* Controles de Escala e Posição */}
                            <div className="p-4 bg-zinc-900/40 rounded-2xl border border-zinc-800 space-y-3.5">
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-zinc-300">Escala / Zoom</span>
                                        <span className="font-mono text-orange-400">{Math.round(artTransform.scale * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={0.2}
                                        max={3}
                                        step={0.02}
                                        value={artTransform.scale}
                                        onChange={(e) => setArtTransform(prev => ({ ...prev, scale: Number(e.target.value) }))}
                                        className="w-full accent-orange-500 cursor-pointer"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-zinc-300">Rotação</span>
                                        <span className="font-mono text-orange-400">{artTransform.rotationDeg}°</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={-180}
                                        max={180}
                                        step={1}
                                        value={artTransform.rotationDeg}
                                        onChange={(e) => setArtTransform(prev => ({ ...prev, rotationDeg: Number(e.target.value) }))}
                                        className="w-full accent-orange-500 cursor-pointer"
                                    />
                                    <div className="flex gap-2 pt-1">
                                        <button
                                            onClick={() => setArtTransform(prev => ({ ...prev, rotationDeg: (prev.rotationDeg - 90) % 360 }))}
                                            className="flex-1 py-1 bg-zinc-800 hover:bg-zinc-700 text-[10px] font-bold text-zinc-300 rounded-lg cursor-pointer"
                                        >
                                            -90°
                                        </button>
                                        <button
                                            onClick={() => setArtTransform(prev => ({ ...prev, rotationDeg: 0 }))}
                                            className="flex-1 py-1 bg-zinc-800 hover:bg-zinc-700 text-[10px] font-bold text-zinc-300 rounded-lg cursor-pointer"
                                        >
                                            0°
                                        </button>
                                        <button
                                            onClick={() => setArtTransform(prev => ({ ...prev, rotationDeg: (prev.rotationDeg + 90) % 360 }))}
                                            className="flex-1 py-1 bg-zinc-800 hover:bg-zinc-700 text-[10px] font-bold text-zinc-300 rounded-lg cursor-pointer"
                                        >
                                            +90°
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-1">
                                    <button
                                        onClick={() => setArtTransform(prev => ({ ...prev, flipH: !prev.flipH }))}
                                        className={`py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                                            artTransform.flipH ? 'bg-orange-500 text-black border-orange-500' : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                                        }`}
                                    >
                                        Espelhar Horiz.
                                    </button>
                                    <button
                                        onClick={() => setArtTransform(prev => ({ ...prev, flipV: !prev.flipV }))}
                                        className={`py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                                            artTransform.flipV ? 'bg-orange-500 text-black border-orange-500' : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                                        }`}
                                    >
                                        Espelhar Vert.
                                    </button>
                                </div>

                                <div className="pt-2 border-t border-zinc-800/80">
                                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-zinc-300">
                                        <input
                                            type="checkbox"
                                            checked={artTransform.vignette}
                                            onChange={(e) => setArtTransform(prev => ({ ...prev, vignette: e.target.checked }))}
                                            className="rounded text-orange-500 focus:ring-orange-500 bg-zinc-900 border-zinc-700"
                                        />
                                        <span>Vinheta Suave nas Bordas (Destaca o Colecionável)</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: LOGO & ESTÚDIO */}
                    {activeTab === 'logo' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-zinc-900/60 rounded-2xl border border-zinc-800">
                                <span className="text-xs font-bold text-white">Exibir Logo na Base</span>
                                <input
                                    type="checkbox"
                                    checked={logoConfig.enabled}
                                    onChange={(e) => setLogoConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                                    className="rounded text-orange-500 focus:ring-orange-500 bg-zinc-900 border-zinc-700 w-4 h-4"
                                />
                            </div>

                            {logoConfig.enabled && (
                                <div className="space-y-3.5 p-4 bg-zinc-900/40 rounded-2xl border border-zinc-800">
                                    {/* Posição da Logo */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-zinc-300">Ancoragem da Logo</span>
                                            {logoConfig.position === 'custom' && (
                                                <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
                                                    Posição Livre (Arrastada no Canvas)
                                                </span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-4 gap-1.5">
                                            {[
                                                { id: 'top_left', label: 'Topo Esq.' },
                                                { id: 'top_center', label: 'Topo' },
                                                { id: 'top_right', label: 'Topo Dir.' },
                                                { id: 'center', label: 'Centro' },
                                                { id: 'bottom_left', label: 'Inf. Esq.' },
                                                { id: 'bottom_center', label: 'Inferior' },
                                                { id: 'bottom_right', label: 'Inf. Dir.' },
                                                { id: 'custom', label: 'Livre (Arrastar)' }
                                            ].map((pos) => (
                                                <button
                                                    key={pos.id}
                                                    onClick={() => setLogoConfig(prev => ({ ...prev, position: pos.id as any }))}
                                                    className={`py-1.5 text-[10px] font-bold rounded-xl border transition-all cursor-pointer ${
                                                        logoConfig.position === pos.id
                                                            ? 'bg-orange-500 text-black border-orange-500 font-black'
                                                            : 'bg-zinc-800/60 text-zinc-400 border-zinc-700/80 hover:text-white'
                                                    }`}
                                                >
                                                    {pos.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Ajuste fino de coordenadas quando posição for livre */}
                                    {logoConfig.position === 'custom' && (
                                        <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800 space-y-2.5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-bold text-zinc-400">Coordenadas da Logo (mm)</span>
                                                <button
                                                    onClick={() => setLogoConfig(prev => ({ ...prev, customXMm: 0, customYMm: 0 }))}
                                                    className="text-[10px] text-orange-400 hover:text-orange-300 font-bold underline cursor-pointer"
                                                >
                                                    Centralizar (0, 0)
                                                </button>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-zinc-500">Offset X:</span>
                                                    <span className="font-mono text-orange-400 font-bold">{logoConfig.customXMm} mm</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min={-Math.round(dimensions.widthMm / 2)}
                                                    max={Math.round(dimensions.widthMm / 2)}
                                                    step={0.5}
                                                    value={logoConfig.customXMm}
                                                    onChange={(e) => setLogoConfig(prev => ({ ...prev, customXMm: Number(e.target.value) }))}
                                                    className="w-full accent-orange-500 cursor-pointer"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-zinc-500">Offset Y:</span>
                                                    <span className="font-mono text-orange-400 font-bold">{logoConfig.customYMm} mm</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min={-Math.round(dimensions.lengthMm / 2)}
                                                    max={Math.round(dimensions.lengthMm / 2)}
                                                    step={0.5}
                                                    value={logoConfig.customYMm}
                                                    onChange={(e) => setLogoConfig(prev => ({ ...prev, customYMm: Number(e.target.value) }))}
                                                    className="w-full accent-orange-500 cursor-pointer"
                                                />
                                            </div>
                                        </div>
                                    )}


                                    {/* Tamanho da Logo */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-zinc-400">Largura da Logo</span>
                                            <span className="font-mono text-orange-400 font-bold">{logoConfig.sizeMm} mm</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={12}
                                            max={50}
                                            value={logoConfig.sizeMm}
                                            onChange={(e) => setLogoConfig(prev => ({ ...prev, sizeMm: Number(e.target.value) }))}
                                            className="w-full accent-orange-500 cursor-pointer"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 4: TEXTO & IDENTIFICAÇÃO */}
                    {activeTab === 'text' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-zinc-900/60 rounded-2xl border border-zinc-800">
                                <span className="text-xs font-bold text-white">Adicionar Texto / Placa</span>
                                <input
                                    type="checkbox"
                                    checked={textConfig.enabled}
                                    onChange={(e) => setTextConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                                    className="rounded text-orange-500 focus:ring-orange-500 bg-zinc-900 border-zinc-700 w-4 h-4"
                                />
                            </div>

                            {textConfig.enabled && (
                                <div className="space-y-3 p-4 bg-zinc-900/40 rounded-2xl border border-zinc-800">
                                    <div>
                                        <label className="text-xs font-bold text-zinc-300 block mb-1">
                                            Nome da Figure / Personagem
                                        </label>
                                        <input
                                            type="text"
                                            value={textConfig.figureTitle}
                                            onChange={(e) => setTextConfig(prev => ({ ...prev, figureTitle: e.target.value }))}
                                            placeholder="Ex: SON GOKU SSJ4"
                                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-zinc-300 block mb-1">
                                            Subtítulo / Estúdio
                                        </label>
                                        <input
                                            type="text"
                                            value={textConfig.subtitle}
                                            onChange={(e) => setTextConfig(prev => ({ ...prev, subtitle: e.target.value }))}
                                            placeholder="Ex: KD Collectibles"
                                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-zinc-300 block mb-1">
                                            Edição Especial
                                        </label>
                                        <input
                                            type="text"
                                            value={textConfig.editionText}
                                            onChange={(e) => setTextConfig(prev => ({ ...prev, editionText: e.target.value }))}
                                            placeholder="Ex: Colecionador • 1:6"
                                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                                        />
                                    </div>

                                    {/* Posição da Placa / Caixa de Texto */}
                                    <div className="space-y-1.5 pt-1 border-t border-zinc-800/80">
                                        <div className="flex items-center justify-between text-xs font-bold text-zinc-300">
                                            <span>Posicionamento</span>
                                            <span className="text-[10px] text-zinc-500">ou arraste no canvas</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-1.5">
                                            <button
                                                onClick={() => setTextConfig(prev => ({ ...prev, position: 'bottom', customXMm: 0, customYMm: 0 }))}
                                                className={`py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                                                    textConfig.position === 'bottom'
                                                        ? 'bg-orange-500 text-black border-orange-500'
                                                        : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white'
                                                }`}
                                            >
                                                Base
                                            </button>
                                            <button
                                                onClick={() => setTextConfig(prev => ({ ...prev, position: 'top', customXMm: 0, customYMm: 0 }))}
                                                className={`py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                                                    textConfig.position === 'top'
                                                        ? 'bg-orange-500 text-black border-orange-500'
                                                        : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white'
                                                }`}
                                            >
                                                Topo
                                            </button>
                                            <button
                                                onClick={() => setTextConfig(prev => ({ ...prev, position: 'custom', customXMm: prev.customXMm || 0, customYMm: prev.customYMm || 0 }))}
                                                className={`py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                                                    textConfig.position === 'custom'
                                                        ? 'bg-orange-500 text-black border-orange-500'
                                                        : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white'
                                                }`}
                                            >
                                                Livre ✥
                                            </button>
                                        </div>

                                        {textConfig.position === 'custom' && (
                                            <div className="p-2.5 bg-zinc-950/60 rounded-xl border border-zinc-800 space-y-2 mt-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-sky-400">Posição Livre (Arrastável)</span>
                                                    <button
                                                        onClick={() => setTextConfig(prev => ({ ...prev, customXMm: 0, customYMm: 0 }))}
                                                        className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
                                                    >
                                                        Centralizar
                                                    </button>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-[11px]">
                                                        <span className="text-zinc-500">Offset X:</span>
                                                        <span className="font-mono text-orange-400 font-bold">{textConfig.customXMm || 0} mm</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min={-Math.round(dimensions.widthMm / 2)}
                                                        max={Math.round(dimensions.widthMm / 2)}
                                                        step={0.5}
                                                        value={textConfig.customXMm || 0}
                                                        onChange={(e) => setTextConfig(prev => ({ ...prev, customXMm: Number(e.target.value) }))}
                                                        className="w-full accent-orange-500 cursor-pointer"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-[11px]">
                                                        <span className="text-zinc-500">Offset Y:</span>
                                                        <span className="font-mono text-orange-400 font-bold">{textConfig.customYMm || 0} mm</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min={-Math.round(dimensions.lengthMm / 2)}
                                                        max={Math.round(dimensions.lengthMm / 2)}
                                                        step={0.5}
                                                        value={textConfig.customYMm || 0}
                                                        onChange={(e) => setTextConfig(prev => ({ ...prev, customYMm: Number(e.target.value) }))}
                                                        className="w-full accent-orange-500 cursor-pointer"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Tamanho da Fonte */}
                                    <div className="space-y-1 pt-1 border-t border-zinc-800/80">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-zinc-400">Tamanho da Fonte</span>
                                            <span className="font-mono text-orange-400 font-bold">{textConfig.fontSizePt || 14} pt</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={8}
                                            max={28}
                                            value={textConfig.fontSizePt || 14}
                                            onChange={(e) => setTextConfig(prev => ({ ...prev, fontSizePt: Number(e.target.value) }))}
                                            className="w-full accent-orange-500 cursor-pointer"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 5: PRODUÇÃO & CORTE */}
                    {activeTab === 'production' && (
                        <div className="space-y-4">
                            <div className="p-4 bg-zinc-900/40 rounded-2xl border border-zinc-800 space-y-3.5">
                                {/* Sangria / Bleed */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-zinc-300">Sangria (Bleed para corte)</span>
                                        <span className="font-mono text-orange-400">{production.bleedMm} mm</span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-1.5">
                                        {[0, 1, 2, 3].map(mm => (
                                            <button
                                                key={mm}
                                                onClick={() => setProduction(prev => ({ ...prev, bleedMm: mm }))}
                                                className={`py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                                                    production.bleedMm === mm ? 'bg-orange-500 text-black border-orange-500' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                                                }`}
                                            >
                                                {mm}mm {mm === 2 && '★'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Cópias por Folha A4 */}
                                <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                                    <span className="text-xs font-bold text-zinc-300 block">
                                        Cópias na Folha A4 (Aproveitamento)
                                    </span>
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {[
                                            { q: 1, label: '1 Base' },
                                            { q: 2, label: '2 Bases' },
                                            { q: 4, label: '4 Bases' }
                                        ].map(item => (
                                            <button
                                                key={item.q}
                                                onClick={() => setProduction(prev => ({ ...prev, quantityPerSheet: item.q as any }))}
                                                className={`py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                                                    production.quantityPerSheet === item.q ? 'bg-orange-500 text-black border-orange-500' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                                                }`}
                                            >
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Opções de Guias */}
                                <div className="space-y-2 pt-2 border-t border-zinc-800 text-xs font-medium text-zinc-300">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={production.showCutLine}
                                            onChange={(e) => setProduction(prev => ({ ...prev, showCutLine: e.target.checked }))}
                                            className="rounded text-orange-500 focus:ring-orange-500 bg-zinc-900 border-zinc-700"
                                        />
                                        <span>Exibir Linha de Corte Vermelha (Perímetro da Base)</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={production.showCalibrationRuler}
                                            onChange={(e) => setProduction(prev => ({ ...prev, showCalibrationRuler: e.target.checked }))}
                                            className="rounded text-orange-500 focus:ring-orange-500 bg-zinc-900 border-zinc-700"
                                        />
                                        <span>Régua de 50mm para Conferência com Paquímetro</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={production.showRegistrationMarks}
                                            onChange={(e) => setProduction(prev => ({ ...prev, showRegistrationMarks: e.target.checked }))}
                                            className="rounded text-orange-500 focus:ring-orange-500 bg-zinc-900 border-zinc-700"
                                        />
                                        <span>Miras de Alinhamento nos 4 Cantos</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* BOTÕES DE EXPORTAÇÃO NO RODAPÉ */}
                <div className="pt-3 border-t border-zinc-800/80 space-y-2">
                    <button
                        onClick={handleExportSVG}
                        className="w-full py-3.5 bg-orange-500 hover:bg-orange-400 text-black font-black uppercase tracking-wider text-xs rounded-2xl transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                        <Scissors size={16} />
                        <span>Exportar SVG Vetorial (Corte 1:1)</span>
                    </button>
                    <button
                        onClick={handleExportPNG}
                        className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <Download size={14} />
                        <span>Baixar Imagem PNG (600 DPI)</span>
                    </button>
                </div>
            </div>

            {/* ÁREA CENTRAL DO WORKSPACE: MESA DE COMPOSIÇÃO / 3D */}
            <div className="flex-1 flex flex-col bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl relative">
                {/* Topbar do Workspace */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/40">
                    {/* View Modes */}
                    <div className="flex items-center gap-1.5 p-1 bg-zinc-900 rounded-2xl border border-zinc-800">
                        <button
                            onClick={() => setViewMode('cut_guide')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                                viewMode === 'cut_guide' ? 'bg-orange-500 text-black shadow-md' : 'text-zinc-400 hover:text-white'
                            }`}
                        >
                            <Scissors size={14} />
                            <span>Mesa de Corte</span>
                        </button>
                        <button
                            onClick={() => setViewMode('preview')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                                viewMode === 'preview' ? 'bg-orange-500 text-black shadow-md' : 'text-zinc-400 hover:text-white'
                            }`}
                        >
                            <Eye size={14} />
                            <span>Produto Final</span>
                        </button>
                        <button
                            onClick={() => setViewMode('3d')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                                viewMode === '3d' ? 'bg-orange-500 text-black shadow-md' : 'text-zinc-400 hover:text-white'
                            }`}
                        >
                            <Layers size={14} />
                            <span>3D Realista</span>
                        </button>
                    </div>

                    {/* Ações Rápidas no Topbar do Workspace */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => setIsCatalogModalOpen(true)}
                            className="px-3 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                            title="Escolher uma figure do catálogo Franga"
                        >
                            <Sparkles size={14} />
                            <span>Do Catálogo</span>
                        </button>
                        <label className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer">
                            <Upload size={14} />
                            <span>Upload Arte</span>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleArtImageFile(file);
                                }}
                                className="hidden"
                            />
                        </label>
                        {artImage && (
                            <button
                                onClick={() => setArtTransform(prev => ({ ...prev, xMm: 0, yMm: 0, scale: 1 }))}
                                className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 text-xs font-bold transition-all cursor-pointer"
                                title="Resetar Posição e Zoom da Arte"
                            >
                                Centralizar
                            </button>
                        )}
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-zinc-900/80 rounded-xl border border-zinc-800 text-xs font-mono">
                            <span className="text-zinc-500">Corte:</span>
                            <span className="text-orange-400 font-bold">{dimensions.widthMm}×{dimensions.lengthMm}mm</span>
                        </div>
                    </div>
                </div>

                {/* Área de Visualização Principal */}
                <div 
                    ref={workspaceRef}
                    className="flex-1 flex items-center justify-center p-6 bg-zinc-950/70 overflow-hidden relative select-none h-full"
                >
                    {viewMode === '3d' ? (
                        <div className="w-full h-full max-w-4xl max-h-[680px]">
                            <Base3DPreview
                                stlGeometry={stlGeometry}
                                shape={shape}
                                dimensions={dimensions}
                                textureCanvas={texture3DCanvas}
                                onAutoSnapToGrid={handleAutoSnapToGrid}
                                onOrientByFace={handleOrientByFace}
                                onInvert={handleInvertSTL}
                            />
                        </div>
                    ) : (
                        <div className="relative flex flex-col items-center justify-center">
                            {/* Dica de Interatividade */}
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-zinc-900/90 border border-zinc-800 rounded-full text-[10px] text-zinc-400 font-medium pointer-events-none z-10 shadow-lg whitespace-nowrap">
                                💡 Arraste a arte, a logo ou o texto para reposicionar • Use a roda do mouse para zoom
                            </div>

                            {/* Canvas Principal */}
                            <div
                                style={{ transform: `scale(${zoomLevel})` }}
                                className="transition-transform duration-75 ease-out shadow-2xl rounded-2xl overflow-hidden border border-zinc-800/60"
                            >
                                <canvas
                                    ref={canvasRef}
                                    onMouseDown={handleMouseDownCanvas}
                                    onMouseMove={handleMouseMoveCanvas}
                                    onMouseUp={handleMouseUpCanvas}
                                    onMouseLeave={handleMouseUpCanvas}
                                    className={`touch-none ${
                                        dragTarget
                                            ? 'cursor-grabbing'
                                            : (isHoveringLogo || isHoveringText)
                                            ? 'cursor-move'
                                            : 'cursor-grab'
                                    }`}
                                />
                            </div>

                            {/* Controles Flutuantes de Zoom do Viewport */}
                            <div className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-zinc-900/90 border border-zinc-800 p-1 rounded-2xl shadow-xl z-20">
                                <button
                                    onClick={() => setZoomLevel(prev => Math.max(0.4, prev - 0.1))}
                                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
                                    title="Diminuir Zoom"
                                >
                                    <ZoomOut size={16} />
                                </button>
                                <span className="text-xs font-mono font-bold text-zinc-300 px-1">
                                    {Math.round(zoomLevel * 100)}%
                                </span>
                                <button
                                    onClick={() => setZoomLevel(prev => Math.min(2.5, prev + 0.1))}
                                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
                                    title="Aumentar Zoom"
                                >
                                    <ZoomIn size={16} />
                                </button>
                                <button
                                    onClick={() => setZoomLevel(1)}
                                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-all cursor-pointer text-[10px] font-bold"
                                    title="Resetar Zoom"
                                >
                                    100%
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
