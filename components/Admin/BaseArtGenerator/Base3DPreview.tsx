'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BaseShapeType, BaseDimensions } from './types';
import { Compass, RotateCcw, Eye, Layers, Sparkles, MousePointerClick, ArrowUpDown } from 'lucide-react';

interface Base3DPreviewProps {
    stlGeometry?: THREE.BufferGeometry | null;
    shape: BaseShapeType;
    dimensions: BaseDimensions;
    textureCanvas: HTMLCanvasElement | null;
    onAutoSnapToGrid?: () => void;
    onOrientByFace?: (faceNormal: THREE.Vector3) => void;
    onInvert?: () => void;
}

export default function Base3DPreview({
    stlGeometry,
    shape,
    dimensions,
    textureCanvas,
    onAutoSnapToGrid,
    onOrientByFace,
    onInvert
}: Base3DPreviewProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const meshRef = useRef<THREE.Mesh | null>(null);
    const textureRef = useRef<THREE.CanvasTexture | null>(null);
    const gridRef = useRef<THREE.GridHelper | null>(null);

    const [isOrientByFaceActive, setIsOrientByFaceActive] = useState(false);
    const [hoveredFaceNormal, setHoveredFaceNormal] = useState<THREE.Vector3 | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;

        // 1. Cena e Câmera
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x09090b); // Fundo escuro zinc-950
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(40, width / height, 1, 3000);
        camera.position.set(0, -180, 140);
        cameraRef.current = camera;

        // 2. Renderizador WebGL
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        rendererRef.current = renderer;

        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(renderer.domElement);

        // 3. Controles de Órbita Suaves (OrbitControls)
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.06;
        controls.maxPolarAngle = Math.PI / 2 + 0.05; // Impede que a câmera passe abaixo da mesa/chão
        controls.minDistance = 40;
        controls.maxDistance = 600;
        controls.target.set(0, 0, (dimensions.heightMm || 12) / 2);
        controlsRef.current = controls;

        // 4. Iluminação Realista de Produto
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
        scene.add(ambientLight);

        const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
        keyLight.position.set(120, 160, 220);
        keyLight.castShadow = true;
        scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(0xf97316, 0.9); // Luz suave âmbar Franga Toys
        fillLight.position.set(-120, -120, 120);
        scene.add(fillLight);

        const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.4); // Rim light ciano suave nas bordas
        rimLight.position.set(0, 180, 40);
        scene.add(rimLight);

        // 5. Grade de Mesa de Impressão / Grid Perfeitamente Nivelado em Z = 0
        const grid = new THREE.GridHelper(300, 30, 0xf97316, 0x27272a);
        grid.rotation.x = Math.PI / 2;
        grid.position.set(0, 0, 0); // Exato plano zero da mesa
        scene.add(grid);
        gridRef.current = grid;

        // Loop de Renderização Contínuo
        let animationFrameId: number;
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        // Redimensionamento de Janela
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
            window.removeEventListener('resize', handleResize);
            controls.dispose();
            renderer.dispose();
        };
    }, []);

    // Atualiza a malha 3D e a textura quando dimensões ou arte mudarem
    useEffect(() => {
        if (!sceneRef.current) return;
        const scene = sceneRef.current;

        // Remove malha anterior para liberar memória
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

        // Prepara textura a partir do Canvas de Arte 2D
        let texture: THREE.CanvasTexture | null = null;
        if (textureCanvas) {
            texture = new THREE.CanvasTexture(textureCanvas);
            texture.colorSpace = THREE.SRGBColorSpace;
            textureRef.current = texture;
        }

        let geom: THREE.BufferGeometry;
        const height = dimensions.heightMm || 12;
        const w = dimensions.widthMm;
        const l = dimensions.lengthMm;

        const baseMat = new THREE.MeshStandardMaterial({
            color: 0x18181b,
            roughness: 0.6,
            metalness: 0.2
        });

        const topMat = new THREE.MeshStandardMaterial({
            ...(texture ? { map: texture } : {}),
            color: texture ? 0xffffff : 0x27272a,
            roughness: 0.25,
            metalness: 0.05
        });

        if (shape === 'stl' && stlGeometry) {
            geom = stlGeometry.clone();
            geom.center(); // Centraliza nos eixos X e Y
            geom.computeVertexNormals();

            // Mapeia coordenadas UV planares (Top-Down) para a arte projetar perfeitamente no topo
            const pos = geom.attributes.position;
            const uvs = new Float32Array((pos.count) * 2);
            geom.computeBoundingBox();
            const bbox = geom.boundingBox!;
            const sizeX = Math.max(0.1, bbox.max.x - bbox.min.x);
            const sizeY = Math.max(0.1, bbox.max.y - bbox.min.y);

            for (let i = 0; i < pos.count; i++) {
                const x = pos.getX(i);
                const y = pos.getY(i);
                uvs[i * 2] = (x - bbox.min.x) / sizeX;
                uvs[i * 2 + 1] = (y - bbox.min.y) / sizeY;
            }
            geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

            // NIVELA A BASE COM A MESA (Z = 0):
            // Desloca toda a geometria verticalmente para que a face inferior encoste exatamente no plano Z = 0
            const zMin = bbox.min.z;
            geom.translate(0, 0, -zMin);

            const material = new THREE.MeshStandardMaterial({
                ...(texture ? { map: texture } : {}),
                color: texture ? 0xffffff : 0x27272a,
                roughness: 0.35,
                metalness: 0.1
            });

            const mesh = new THREE.Mesh(geom, material);
            scene.add(mesh);
            meshRef.current = mesh;
        } else if (shape === 'rectangle') {
            geom = new THREE.BoxGeometry(w, l, height);
            // Nivelamento perfeito com a mesa em Z = 0
            geom.translate(0, 0, height / 2);

            const materials = [baseMat, baseMat, baseMat, baseMat, topMat, baseMat];
            const mesh = new THREE.Mesh(geom, materials);
            scene.add(mesh);
            meshRef.current = mesh;
        } else if (shape === 'hexagon') {
            const radius = Math.min(w, l) / 2;
            geom = new THREE.CylinderGeometry(radius, radius, height, 6);
            geom.rotateX(Math.PI / 2);
            // Nivelamento com a mesa em Z = 0
            geom.translate(0, 0, height / 2);

            const materials = [baseMat, topMat, baseMat];
            const mesh = new THREE.Mesh(geom, materials);
            scene.add(mesh);
            meshRef.current = mesh;
        } else {
            // Cilindro / Círculo padrão
            const radius = Math.min(w, l) / 2;
            geom = new THREE.CylinderGeometry(radius, radius * 1.01, height, 64);
            geom.rotateX(Math.PI / 2);
            // Nivelamento com a mesa em Z = 0
            geom.translate(0, 0, height / 2);

            const materials = [baseMat, topMat, baseMat];
            const mesh = new THREE.Mesh(geom, materials);
            scene.add(mesh);
            meshRef.current = mesh;
        }

        // Ajusta o ponto focal da câmera no centro da base nivelada
        if (controlsRef.current) {
            controlsRef.current.target.set(0, 0, height / 2);
        }
    }, [stlGeometry, shape, dimensions, textureCanvas]);

    // Manipulador de clique para Orient by Face (Lay on face / Snap to grid)
    const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isOrientByFaceActive || !containerRef.current || !cameraRef.current || !meshRef.current || !onOrientByFace) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);
        const intersects = raycaster.intersectObject(meshRef.current, false);

        if (intersects.length > 0 && intersects[0].face) {
            const worldNormal = intersects[0].face.normal.clone();
            worldNormal.transformDirection(meshRef.current.matrixWorld);
            onOrientByFace(worldNormal);
            setIsOrientByFaceActive(false);
        }
    };

    // Ações Rápidas de Câmera / Nivelamento
    const setCameraView = (type: 'iso' | 'top' | 'front') => {
        if (!cameraRef.current || !controlsRef.current) return;
        const height = dimensions.heightMm || 12;

        if (type === 'iso') {
            cameraRef.current.position.set(0, -180, 140);
            controlsRef.current.target.set(0, 0, height / 2);
        } else if (type === 'top') {
            cameraRef.current.position.set(0, 0, 220);
            controlsRef.current.target.set(0, 0, 0);
        } else if (type === 'front') {
            cameraRef.current.position.set(0, -220, height / 2);
            controlsRef.current.target.set(0, 0, height / 2);
        }
        controlsRef.current.update();
    };

    const pxW = Math.round((dimensions.widthMm / 25.4) * 600);
    const pxH = Math.round((dimensions.lengthMm / 25.4) * 600);

    return (
        <div className="relative w-full h-full min-h-[380px] rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800">
            <div
                ref={containerRef}
                onClick={handleContainerClick}
                className={`w-full h-full ${isOrientByFaceActive ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
            />

            {/* Aviso de Modo Orient by Face Ativo */}
            {isOrientByFaceActive && (
                <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 px-3.5 py-1.5 rounded-full bg-orange-500 text-black font-bold text-xs shadow-2xl flex items-center gap-2 animate-pulse border border-orange-300 pointer-events-none">
                    <MousePointerClick size={14} />
                    <span>Clique em qualquer face da base 3D para assentá-la na mesa</span>
                </div>
            )}
            
            {/* Header com Status de Nivelamento & Ações de Snap to Grid */}
            <div className="absolute top-3 left-3 flex items-center gap-2 z-10 flex-wrap max-w-[65%]">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-zinc-900/90 text-orange-400 border border-orange-500/30 backdrop-blur-md shadow-lg flex items-center gap-1.5">
                    <Layers size={13} />
                    <span>Base Nivelada na Mesa (Z = 0.0 mm)</span>
                </span>

                {shape === 'stl' && (
                    <div className="flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 p-0.5 rounded-xl backdrop-blur-md shadow-lg">
                        {onAutoSnapToGrid && (
                            <button
                                onClick={onAutoSnapToGrid}
                                className="px-2 py-1 text-[10px] font-bold text-orange-400 hover:text-white hover:bg-orange-500/20 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                                title="Nivelar automaticamente e assentar na grade da mesa (Snap to Grid)"
                            >
                                <Sparkles size={11} />
                                <span>Snap to Grid</span>
                            </button>
                        )}
                        {onOrientByFace && (
                            <button
                                onClick={() => setIsOrientByFaceActive(prev => !prev)}
                                className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                                    isOrientByFaceActive
                                        ? 'bg-orange-500 text-black shadow-md'
                                        : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
                                }`}
                                title="Ativar modo Orient by Face: clique em qualquer face da base para ela assentar na mesa"
                            >
                                <MousePointerClick size={11} />
                                <span>Orient by Face</span>
                            </button>
                        )}
                        {onInvert && (
                            <button
                                onClick={onInvert}
                                className="px-2 py-1 text-[10px] font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                                title="Inverter Topo e Fundo (180°)"
                            >
                                <ArrowUpDown size={11} />
                                <span>Inverter</span>
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Controles Rápidos de Câmera */}
            <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-zinc-900/90 border border-zinc-800 p-1 rounded-xl shadow-xl z-10 backdrop-blur-md">
                <button
                    onClick={() => setCameraView('top')}
                    className="px-2 py-1 text-[10px] font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                    title="Vista Superior (Planta da Base)"
                >
                    <Eye size={12} />
                    <span>Topo</span>
                </button>
                <button
                    onClick={() => setCameraView('iso')}
                    className="px-2 py-1 text-[10px] font-bold text-orange-400 hover:text-orange-300 hover:bg-zinc-800 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                    title="Vista Isométrica 3D"
                >
                    <Compass size={12} />
                    <span>3D</span>
                </button>
                <button
                    onClick={() => setCameraView('front')}
                    className="px-2 py-1 text-[10px] font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                    title="Vista Lateral / Nivelamento da Mesa"
                >
                    <RotateCcw size={12} />
                    <span>Mesa</span>
                </button>
            </div>

            {/* Painel Inferior de Dimensões e Resolução de Exportação (como no fatiador/Instagram) */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono font-bold text-zinc-300 bg-zinc-900/90 px-2.5 py-1 rounded-lg border border-zinc-800 backdrop-blur-md shadow-lg">
                        INÍCIO: <span className="text-orange-400">{dimensions.widthMm} × {dimensions.lengthMm} mm</span> (Alt: {dimensions.heightMm || 12}mm)
                    </span>
                    <span className="text-[10px] font-mono font-bold text-zinc-300 bg-zinc-900/90 px-2.5 py-1 rounded-lg border border-zinc-800 backdrop-blur-md shadow-lg">
                        EXPORTAÇÃO: <span className="text-emerald-400">{pxW} × {pxH} px</span> (600 DPI)
                    </span>
                </div>
                <span className="hidden sm:inline text-[10px] text-zinc-500 font-medium bg-zinc-900/80 px-2 py-1 rounded-md border border-zinc-800">
                    Arraste para orbitar • Roda para zoom
                </span>
            </div>
        </div>
    );
}
