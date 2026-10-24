import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { STLMetadata, BaseDimensions } from './types';

export interface ProcessedSTL {
    geometry: THREE.BufferGeometry;
    dimensions: BaseDimensions;
    metadata: STLMetadata;
    silhouetteCanvas: HTMLCanvasElement;
}

/**
 * Carrega e processa um arquivo STL (binário ou ASCII) diretamente no navegador
 */
/**
 * Detecta automaticamente a orientação ideal para nivelar a base sobre a mesa.
 * Analisa as 6 direções cardinais procurando a face com maior área de contato plana
 * na parte inferior e a menor altura relativa (espessura menor que diâmetro).
 */
export function detectAutoLevelAngles(geometry: THREE.BufferGeometry): { x: number; y: number; z: number } {
    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox!;
    const dimX = Math.max(0.1, bbox.max.x - bbox.min.x);
    const dimY = Math.max(0.1, bbox.max.y - bbox.min.y);
    const dimZ = Math.max(0.1, bbox.max.z - bbox.min.z);

    const candidates = [
        { name: '+Z', up: new THREE.Vector3(0, 0, 1), down: new THREE.Vector3(0, 0, -1), minD: bbox.min.z, maxD: bbox.max.z, height: dimZ, w: dimX, l: dimY, angles: { x: 0, y: 0, z: 0 } },
        { name: '-Z', up: new THREE.Vector3(0, 0, -1), down: new THREE.Vector3(0, 0, 1), minD: -bbox.max.z, maxD: -bbox.min.z, height: dimZ, w: dimX, l: dimY, angles: { x: 180, y: 0, z: 0 } },
        { name: '+Y', up: new THREE.Vector3(0, 1, 0), down: new THREE.Vector3(0, -1, 0), minD: bbox.min.y, maxD: bbox.max.y, height: dimY, w: dimX, l: dimZ, angles: { x: 90, y: 0, z: 0 } },
        { name: '-Y', up: new THREE.Vector3(0, -1, 0), down: new THREE.Vector3(0, 1, 0), minD: -bbox.max.y, maxD: -bbox.min.y, height: dimY, w: dimX, l: dimZ, angles: { x: -90, y: 0, z: 0 } },
        { name: '+X', up: new THREE.Vector3(1, 0, 0), down: new THREE.Vector3(-1, 0, 0), minD: bbox.min.x, maxD: bbox.max.x, height: dimX, w: dimY, l: dimZ, angles: { x: 0, y: -90, z: 0 } },
        { name: '-X', up: new THREE.Vector3(-1, 0, 0), down: new THREE.Vector3(1, 0, 0), minD: -bbox.max.x, maxD: -bbox.min.x, height: dimX, w: dimY, l: dimZ, angles: { x: 0, y: 90, z: 0 } },
    ];

    const pos = geometry.attributes.position;
    const count = pos.count;
    const bottomAreas = [0, 0, 0, 0, 0, 0];
    const pA = new THREE.Vector3();
    const pB = new THREE.Vector3();
    const pC = new THREE.Vector3();
    const cb = new THREE.Vector3();
    const ab = new THREE.Vector3();
    const normal = new THREE.Vector3();
    const centroid = new THREE.Vector3();

    for (let i = 0; i < count; i += 3) {
        pA.fromBufferAttribute(pos, i);
        pB.fromBufferAttribute(pos, i + 1);
        pC.fromBufferAttribute(pos, i + 2);

        cb.subVectors(pC, pB);
        ab.subVectors(pA, pB);
        normal.crossVectors(cb, ab);
        const area2 = normal.length();
        if (area2 < 1e-6) continue;
        const area = area2 * 0.5;
        normal.divideScalar(area2);

        centroid.set(
            (pA.x + pB.x + pC.x) / 3,
            (pA.y + pB.y + pC.y) / 3,
            (pA.z + pB.z + pC.z) / 3
        );

        for (let c = 0; c < candidates.length; c++) {
            const cand = candidates[c];
            const dotDown = normal.dot(cand.down);
            if (dotDown > 0.85) {
                const coordAlongUp = centroid.dot(cand.up);
                if (coordAlongUp <= cand.minD + cand.height * 0.2) {
                    bottomAreas[c] += area * dotDown;
                }
            }
        }
    }

    let bestScore = -Infinity;
    let bestIndex = 0;

    for (let c = 0; c < candidates.length; c++) {
        const cand = candidates[c];
        const footprint = Math.max(cand.w, cand.l);
        const height = Math.max(0.1, cand.height);
        const flatnessRatio = footprint / height;
        const bottomArea = bottomAreas[c];

        // Combina área da face plana do fundo e a proporção de espessura mínima
        const score = (bottomArea * 5.0) + (flatnessRatio * 80.0);

        if (score > bestScore) {
            bestScore = score;
            bestIndex = c;
        }
    }

    return candidates[bestIndex].angles;
}

/**
 * Carrega e processa um arquivo STL (binário ou ASCII) diretamente no navegador,
 * com nivelamento automático opcional ou obrigatório para assentar perfeitamente na mesa.
 */
export async function processSTLFile(
    file: File | ArrayBuffer,
    fileName = 'base.stl',
    rotationAngles?: { x: number; y: number; z: number },
    autoLevel = false
): Promise<ProcessedSTL> {
    let buffer: ArrayBuffer;
    if (file instanceof File) {
        buffer = await file.arrayBuffer();
    } else {
        buffer = file;
    }

    const loader = new STLLoader();
    const rawGeometry = loader.parse(buffer);

    let effectiveAngles = { x: 0, y: 0, z: 0 };

    if (autoLevel || !rotationAngles) {
        // Detecta a orientação ótima para assentar a base na mesa
        const autoAngles = detectAutoLevelAngles(rawGeometry);
        effectiveAngles = { ...autoAngles };
    } else {
        effectiveAngles = { ...rotationAngles };
    }

    const geometry = rawGeometry.clone();

    // Aplica rotações nos eixos X, Y e Z
    if (effectiveAngles.x !== 0) geometry.rotateX(THREE.MathUtils.degToRad(effectiveAngles.x));
    if (effectiveAngles.y !== 0) geometry.rotateY(THREE.MathUtils.degToRad(effectiveAngles.y));
    if (effectiveAngles.z !== 0) geometry.rotateZ(THREE.MathUtils.degToRad(effectiveAngles.z));

    geometry.computeBoundingBox();
    geometry.center(); // Centraliza nos eixos X e Y
    geometry.computeVertexNormals();

    const bbox = geometry.boundingBox!;
    const sizeX = Math.max(0.1, bbox.max.x - bbox.min.x);
    const sizeY = Math.max(0.1, bbox.max.y - bbox.min.y);
    const sizeZ = Math.max(0.1, bbox.max.z - bbox.min.z);

    // Nivelamento no plano Z = 0 (fundo encostando exatamente na mesa)
    geometry.translate(0, 0, -bbox.min.z);
    geometry.computeBoundingBox();

    const triangleCount = geometry.attributes.position.count / 3;

    // Gera a máscara de silhueta ortográfica vista de cima (top-down)
    const silhouetteCanvas = generateSilhouetteMask(geometry, sizeX, sizeY, sizeZ);

    return {
        geometry,
        dimensions: {
            widthMm: Math.round(sizeX * 10) / 10,
            lengthMm: Math.round(sizeY * 10) / 10,
            heightMm: Math.round(sizeZ * 10) / 10
        },
        metadata: {
            fileName,
            triangleCount,
            originalBBox: { x: sizeX, y: sizeY, z: sizeZ },
            rotationAxis: effectiveAngles
        },
        silhouetteCanvas
    };
}

/**
 * Assenta a geometria na mesa (Snap to Grid / Orient by Face)
 * alinhando o vetor normal da face selecionada para baixo (0, 0, -1).
 */
export function orientSTLByNormal(
    buffer: ArrayBuffer,
    fileName: string,
    targetFaceNormal: THREE.Vector3
): ProcessedSTL {
    const loader = new STLLoader();
    const rawGeometry = loader.parse(buffer);
    const geometry = rawGeometry.clone();

    // Cria quaternion que alinha targetFaceNormal com o vetor para baixo (0, 0, -1)
    const downVector = new THREE.Vector3(0, 0, -1);
    const normalUnit = targetFaceNormal.clone().normalize();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(normalUnit, downVector);

    geometry.applyQuaternion(quaternion);
    geometry.computeBoundingBox();
    geometry.center(); // Centraliza no plano XY
    geometry.computeVertexNormals();

    const bbox = geometry.boundingBox!;
    const sizeX = Math.max(0.1, bbox.max.x - bbox.min.x);
    const sizeY = Math.max(0.1, bbox.max.y - bbox.min.y);
    const sizeZ = Math.max(0.1, bbox.max.z - bbox.min.z);

    // Snap to Grid no plano Z = 0 (mesa/grid de impressão)
    geometry.translate(0, 0, -bbox.min.z);
    geometry.computeBoundingBox();

    const triangleCount = geometry.attributes.position.count / 3;
    const silhouetteCanvas = generateSilhouetteMask(geometry, sizeX, sizeY, sizeZ);

    return {
        geometry,
        dimensions: {
            widthMm: Math.round(sizeX * 10) / 10,
            lengthMm: Math.round(sizeY * 10) / 10,
            heightMm: Math.round(sizeZ * 10) / 10
        },
        metadata: {
            fileName,
            triangleCount,
            originalBBox: { x: sizeX, y: sizeY, z: sizeZ },
            rotationAxis: { x: 0, y: 0, z: 0 }
        },
        silhouetteCanvas
    };
}

/**
 * Renderiza a geometria 3D com câmera ortográfica olhando de cima para baixo
 * gerando um Canvas preto e branco que funciona como máscara de recorte 2D de alta definição.
 */
function generateSilhouetteMask(
    geometry: THREE.BufferGeometry,
    sizeX: number,
    sizeY: number,
    sizeZ: number
): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    // Resolução proporcional às dimensões reais (evita achatamento e distorção)
    const resX = 1024;
    const resY = Math.max(64, Math.round((1024 * sizeY) / sizeX));
    canvas.width = resX;
    canvas.height = resY;

    const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true
    });
    renderer.setSize(resX, resY);
    renderer.setClearColor(0x000000, 0); // Fundo transparente

    const scene = new THREE.Scene();

    // Material branco puro sólido não afetado por luz para silhueta perfeita
    const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Câmera ortográfica perfeitamente ajustada ao Bounding Box XY exato (Top-Down: olhando no eixo -Z)
    // Sem margem extra (* 1.02) e sem maxDim forçado, para o contorno bater 100% nos limites da base 3D
    const halfW = sizeX / 2;
    const halfH = sizeY / 2;

    const camera = new THREE.OrthographicCamera(
        -halfW,
        halfW,
        halfH,
        -halfH,
        -sizeZ * 3,
        sizeZ * 3
    );

    // Posiciona câmera acima no eixo Z olhando para baixo
    camera.position.set(0, 0, sizeZ * 2);
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);

    // Limpeza de recursos Three.js
    mesh.geometry.dispose();
    material.dispose();
    renderer.dispose();

    return canvas;
}
