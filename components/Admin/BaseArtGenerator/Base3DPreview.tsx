'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { BaseShapeType, BaseDimensions } from './types';

interface Base3DPreviewProps {
    stlGeometry?: THREE.BufferGeometry | null;
    shape: BaseShapeType;
    dimensions: BaseDimensions;
    textureCanvas: HTMLCanvasElement | null;
}

export default function Base3DPreview({
    stlGeometry,
    shape,
    dimensions,
    textureCanvas
}: Base3DPreviewProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const meshRef = useRef<THREE.Mesh | null>(null);
    const textureRef = useRef<THREE.CanvasTexture | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;

        // 1. Cena e Câmera
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x09090b); // Fundo escuro zinc-950
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
        camera.position.set(0, -180, 160);
        cameraRef.current = camera;

        // 2. Renderizador
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        rendererRef.current = renderer;

        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(renderer.domElement);

        // 3. Iluminação
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
        scene.add(ambientLight);

        const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
        keyLight.position.set(100, 150, 200);
        keyLight.castShadow = true;
        scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(0xf97316, 0.8); // Luz de preenchimento âmbar/laranja
        fillLight.position.set(-100, -100, 100);
        scene.add(fillLight);

        // Grade de chão suave
        const grid = new THREE.GridHelper(300, 30, 0x27272a, 0x18181b);
        grid.rotation.x = Math.PI / 2;
        grid.position.z = -10;
        scene.add(grid);

        // 4. Controles de Órbita simples via Mouse Drag
        let isDragging = false;
        let prevMouse = { x: 0, y: 0 };
        let rotation = { x: -Math.PI / 6, z: 0 };

        const handleMouseDown = (e: MouseEvent) => {
            isDragging = true;
            prevMouse = { x: e.clientX, y: e.clientY };
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            const deltaX = e.clientX - prevMouse.x;
            const deltaY = e.clientY - prevMouse.y;
            prevMouse = { x: e.clientX, y: e.clientY };

            rotation.z += deltaX * 0.01;
            rotation.x += deltaY * 0.01;
            rotation.x = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, rotation.x));
        };

        const handleMouseUp = () => {
            isDragging = false;
        };

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const currentDist = camera.position.length();
            const newDist = Math.max(80, Math.min(600, currentDist + e.deltaY * 0.5));
            camera.position.setLength(newDist);
        };

        const dom = renderer.domElement;
        dom.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        dom.addEventListener('wheel', handleWheel, { passive: false });

        // Loop de Renderização
        let animationFrameId: number;
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);

            if (meshRef.current) {
                meshRef.current.rotation.x = rotation.x;
                meshRef.current.rotation.z = rotation.z;
            }

            camera.lookAt(0, 0, 0);
            renderer.render(scene, camera);
        };
        animate();

        // Resize
        const handleResize = () => {
            if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
            const newW = containerRef.current.clientWidth;
            const newH = containerRef.current.clientHeight;
            cameraRef.current.aspect = newW / newH;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(newW, newH);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(animationFrameId);
            dom.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            dom.removeEventListener('wheel', handleWheel);
            window.removeEventListener('resize', handleResize);
            renderer.dispose();
        };
    }, []);

    // Atualiza a malha 3D e a textura quando dimensões ou arte mudarem
    useEffect(() => {
        if (!sceneRef.current) return;
        const scene = sceneRef.current;

        // Remove malha anterior
        if (meshRef.current) {
            scene.remove(meshRef.current);
            meshRef.current.geometry.dispose();
            if (Array.isArray(meshRef.current.material)) {
                meshRef.current.material.forEach(m => m.dispose());
            } else {
                meshRef.current.material.dispose();
            }
            meshRef.current = null;
        }

        // Prepara textura a partir do Canvas de Arte
        let texture: THREE.CanvasTexture | null = null;
        if (textureCanvas) {
            texture = new THREE.CanvasTexture(textureCanvas);
            texture.colorSpace = THREE.SRGBColorSpace;
            textureRef.current = texture;
        }

        let geom: THREE.BufferGeometry;

        if (shape === 'stl' && stlGeometry) {
            geom = stlGeometry.clone();
            geom.center();
            geom.computeVertexNormals();

            // Mapeia coordenadas UV planares (Top-Down) para a arte projetar no topo do STL
            const pos = geom.attributes.position;
            const uvs = new Float32Array((pos.count) * 2);
            geom.computeBoundingBox();
            const bbox = geom.boundingBox!;
            const sizeX = bbox.max.x - bbox.min.x;
            const sizeY = bbox.max.y - bbox.min.y;

            for (let i = 0; i < pos.count; i++) {
                const x = pos.getX(i);
                const y = pos.getY(i);
                uvs[i * 2] = (x - bbox.min.x) / sizeX;
                uvs[i * 2 + 1] = (y - bbox.min.y) / sizeY;
            }
            geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

            const material = new THREE.MeshStandardMaterial({
                map: texture || undefined,
                color: texture ? 0xffffff : 0x27272a,
                roughness: 0.35,
                metalness: 0.1
            });

            const mesh = new THREE.Mesh(geom, material);
            scene.add(mesh);
            meshRef.current = mesh;
        } else {
            // Geometria Paramétrica (Cilindro ou Caixa com altura de base 3D realista)
            const height = dimensions.heightMm || 12;
            const w = dimensions.widthMm;
            const l = dimensions.lengthMm;

            const baseMat = new THREE.MeshStandardMaterial({
                color: 0x18181b,
                roughness: 0.6,
                metalness: 0.2
            });

            const topMat = new THREE.MeshStandardMaterial({
                map: texture || undefined,
                color: texture ? 0xffffff : 0x27272a,
                roughness: 0.25,
                metalness: 0.05
            });

            if (shape === 'rectangle') {
                geom = new THREE.BoxGeometry(w, l, height);
                // BoxGeometry: faces [px, nx, py, ny, pz, nz]
                const materials = [baseMat, baseMat, baseMat, baseMat, topMat, baseMat];
                const mesh = new THREE.Mesh(geom, materials);
                scene.add(mesh);
                meshRef.current = mesh;
            } else {
                // Cilindro / Círculo padrão
                const radius = Math.min(w, l) / 2;
                geom = new THREE.CylinderGeometry(radius, radius * 1.02, height, 48);
                geom.rotateX(Math.PI / 2); // Deita o cilindro no plano Z
                // Cylinder faces: [lado, topo, fundo]
                const materials = [baseMat, topMat, baseMat];
                const mesh = new THREE.Mesh(geom, materials);
                scene.add(mesh);
                meshRef.current = mesh;
            }
        }
    }, [stlGeometry, shape, dimensions, textureCanvas]);

    return (
        <div className="relative w-full h-full min-h-[380px] rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800">
            <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
            
            <div className="absolute top-3 left-3 pointer-events-none flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-zinc-900/90 text-orange-400 border border-orange-500/30 backdrop-blur-md shadow-lg">
                    Preview 3D Interativo
                </span>
                <span className="text-[10px] text-zinc-500 font-medium">
                    Arraste para girar • Scroll para zoom
                </span>
            </div>

            <div className="absolute bottom-3 right-3 pointer-events-none">
                <span className="text-[11px] font-mono text-zinc-400 bg-zinc-900/80 px-2 py-1 rounded-md border border-zinc-800">
                    {dimensions.widthMm}mm × {dimensions.lengthMm}mm
                </span>
            </div>
        </div>
    );
}
