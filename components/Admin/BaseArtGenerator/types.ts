export type BaseShapeType = 'stl' | 'circle' | 'rectangle' | 'hexagon' | 'ellipse' | 'd_shape';

export interface BaseDimensions {
    widthMm: number;        // Largura X em mm
    lengthMm: number;       // Profundidade Y em mm
    heightMm?: number;      // Altura Z em mm (para 3D)
    borderRadiusMm?: number; // Para retângulos
    diameterMm?: number;     // Para círculos
}

export interface ArtworkTransform {
    xMm: number;            // Posição X em mm relativo ao centro
    yMm: number;            // Posição Y em mm relativo ao centro
    scale: number;          // Escala (1 = 100%)
    rotationDeg: number;    // Rotação em graus (-180 a 180)
    flipH: boolean;         // Espelhamento Horizontal
    flipV: boolean;         // Espelhamento Vertical
    brightness: number;     // 50% a 150% (padrão 100)
    contrast: number;       // 50% a 150% (padrão 100)
    saturation: number;     // 0% a 200% (padrão 100)
    vignette: boolean;      // Vinheta escurecida nas bordas
}

export type LogoPosition = 'bottom_right' | 'bottom_center' | 'bottom_left' | 'top_right' | 'top_center' | 'top_left' | 'center' | 'custom';
export type LogoStyle = 'original' | 'white' | 'shadow';

export interface LogoConfig {
    enabled: boolean;
    type: 'franga' | 'studio' | 'custom' | 'none';
    customUrl?: string;
    position: LogoPosition;
    customXMm: number;
    customYMm: number;
    sizeMm: number;         // Largura da logo em mm
    opacity: number;        // 0 a 1
    style: LogoStyle;
}

export interface TextConfig {
    enabled: boolean;
    figureTitle: string;
    subtitle: string;
    editionText: string;
    showEdition: boolean;
    fontSizePt: number;
    textColor: string;
    position: 'bottom' | 'top' | 'sub_logo';
}

export interface ProductionConfig {
    bleedMm: number;        // Sangria em mm (ex: 2mm)
    showCutLine: boolean;   // Exibir linha de corte vermelha
    showBleedLine: boolean; // Exibir linha de sangria ciano
    showRegistrationMarks: boolean; // Miras de registro A4
    showCalibrationRuler: boolean;  // Régua de 50mm para paquímetro
    quantityPerSheet: 1 | 2 | 4;   // Cópias na mesma folha A4
}

export interface STLMetadata {
    fileName: string;
    triangleCount: number;
    originalBBox: {
        x: number;
        y: number;
        z: number;
    };
    rotationAxis: {
        x: number;
        y: number;
        z: number;
    };
}
