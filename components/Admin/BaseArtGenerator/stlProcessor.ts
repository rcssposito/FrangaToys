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
export async function processSTLFile(
    file: File | ArrayBuffer,
    fileName = 'base.stl',
    rotationAngles = { x: 0, y: 0, z: 0 }
): Promise<ProcessedSTL> {
    let buffer: ArrayBuffer;
    if (file instanceof File) {
        buffer = await file.arrayBuffer();
    } else {
        buffer = file;
    }

    const loader = new STLLoader();
    const geometry = loader.parse(buffer);

    // Aplica rotações de correção (caso o STL tenha sido exportado deitado ou invertido)
    if (rotationAngles.x !== 0) geometry.rotateX(THREE.MathUtils.degToRad(rotationAngles.x));
    if (rotationAngles.y !== 0) geometry.rotateY(THREE.MathUtils.degToRad(rotationAngles.y));
    if (rotationAngles.z !== 0) geometry.rotateZ(THREE.MathUtils.degToRad(rotationAngles.z));

    geometry.computeBoundingBox();
    geometry.center(); // Centraliza no ponto (0,0,0)
    geometry.computeVertexNormals();

    const bbox = geometry.boundingBox!;
    const sizeX = Math.max(0.1, bbox.max.x - bbox.min.x);
    const sizeY = Math.max(0.1, bbox.max.y - bbox.min.y);
    const sizeZ = Math.max(0.1, bbox.max.z - bbox.min.z);

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
            rotationAxis: rotationAngles
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
    sizeZ: number,
    resolution = 1024
): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = resolution;
    canvas.height = resolution;

    const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true
    });
    renderer.setSize(resolution, resolution);
    renderer.setClearColor(0x000000, 0); // Fundo transparente

    const scene = new THREE.Scene();

    // Material branco puro sólido não afetado por luz para silhueta perfeita
    const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Câmera ortográfica perfeitamente ajustada ao Bounding Box XY (Top-Down: olhando no eixo -Z)
    // Deixamos uma margem de segurança de 2% para não cortar bordas
    const maxDim = Math.max(sizeX, sizeY);
    const halfSize = (maxDim / 2) * 1.02;

    const camera = new THREE.OrthographicCamera(
        -halfSize,
        halfSize,
        halfSize,
        -halfSize,
        -sizeZ * 2,
        sizeZ * 2
    );

    // Posiciona câmera acima no eixo Z olhando para baixo
    camera.position.set(0, 0, sizeZ * 1.5);
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);

    // Limpeza de recursos Three.js
    mesh.geometry.dispose();
    material.dispose();
    renderer.dispose();

    return canvas;
}
