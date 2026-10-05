'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { 
    forceSimulation, 
    forceLink, 
    forceManyBody, 
    forceCenter, 
    forceCollide,
    forceRadial,
    SimulationNodeDatum,
    SimulationLinkDatum
} from 'd3-force';
import { 
    ArrowLeft, 
    Search, 
    Play, 
    Pause, 
    RotateCcw, 
    ZoomIn, 
    ZoomOut, 
    Compass, 
    Layers, 
    ExternalLink, 
    X, 
    HelpCircle, 
    Loader2, 
    Palette, 
    Flame,
    Sparkles
} from 'lucide-react';

interface GraphNode extends SimulationNodeDatum {
    id: string;
    type: 'root' | 'category' | 'studio' | 'serie' | 'figure';
    name: string;
    subtitle?: string;
    color: string;
    size: number;
    logoUrl?: string;
    imageUrl?: string;
    serieId?: string;
    serieName?: string;
    studioId?: string;
    studioName?: string;
    itemCount?: number;
    orbitRing?: number;
    lane?: 1 | 2 | 3;
    categoryId?: string;
    categoryName?: string;
    pulse?: boolean;
    x?: number;
    y?: number;
    vx?: number;
    vy?: number;
    fx?: number | null;
    fy?: number | null;
}

interface GraphLink extends SimulationLinkDatum<GraphNode> {
    source: string | GraphNode;
    target: string | GraphNode;
    type?: 'root-category' | 'root-studio' | 'category-studio' | 'category-serie' | 'studio-serie' | 'serie-figure' | 'studio-figure';
    distance?: number;
}

interface CategoryBubbleGeo {
    cx: number;
    cy: number;
    r: number;
    label: string;
    color: string;
    categoryId: string;
    lane: 1 | 2 | 3;
}

interface FigureBubbleGeo {
    cx: number;
    cy: number;
    r: number;
    label: string;
    color: string;
    categoryId: string;
    lane: 1 | 2 | 3;
}

function getAllCategoriesFigureGeometries(categories: GraphNode[], allNodes?: GraphNode[]): Record<string, Record<number, FigureBubbleGeo>> {
    const map: Record<string, Record<number, FigureBubbleGeo>> = {};

    const getFigureCount = (catId: string, laneNum: number) => {
        if (!allNodes) return 0;
        return allNodes.filter(n => n.type === 'figure' && n.categoryId === catId && n.lane === laneNum).length;
    };

    categories.forEach(cat => {
        const catAngle = (cat.x !== undefined && cat.y !== undefined) 
            ? Math.atan2(cat.y, cat.x) 
            : 0;
        const name = (cat.name || '').toLowerCase();

        map[cat.id] = {};

        if (name.includes('anime')) {
            const c1 = getFigureCount(cat.id, 1) || 390;
            const c2 = getFigureCount(cat.id, 2) || 121;
            const c3 = getFigureCount(cat.id, 3) || 104;
            map[cat.id][1] = {
                cx: Math.cos(catAngle - 0.52) * 755,
                cy: Math.sin(catAngle - 0.52) * 755,
                r: 165,
                label: `ANIME • FIGURAS TITÃS (${c1})`,
                color: '#f472b6',
                categoryId: cat.id,
                lane: 1
            };
            map[cat.id][2] = {
                cx: Math.cos(catAngle) * 840,
                cy: Math.sin(catAngle) * 840,
                r: 120,
                label: `ANIME • FIGURAS POPULARES (${c2})`,
                color: '#f472b6',
                categoryId: cat.id,
                lane: 2
            };
            map[cat.id][3] = {
                cx: Math.cos(catAngle + 0.54) * 970,
                cy: Math.sin(catAngle + 0.54) * 970,
                r: 120,
                label: `ANIME • FIGURAS NICHO (${c3})`,
                color: '#f472b6',
                categoryId: cat.id,
                lane: 3
            };
        } else if (name.includes('game') || name.includes('jogo')) {
            const c1 = getFigureCount(cat.id, 1) || 200;
            const c2 = getFigureCount(cat.id, 2) || 91;
            const c3 = getFigureCount(cat.id, 3) || 158;
            map[cat.id][1] = {
                cx: Math.cos(catAngle - 0.52) * 750,
                cy: Math.sin(catAngle - 0.52) * 750,
                r: 145,
                label: `GAMES • FIGURAS TITÃS (${c1})`,
                color: '#34d399',
                categoryId: cat.id,
                lane: 1
            };
            map[cat.id][2] = {
                cx: Math.cos(catAngle) * 830,
                cy: Math.sin(catAngle) * 830,
                r: 115,
                label: `GAMES • FIGURAS POPULARES (${c2})`,
                color: '#34d399',
                categoryId: cat.id,
                lane: 2
            };
            map[cat.id][3] = {
                cx: Math.cos(catAngle + 0.54) * 970,
                cy: Math.sin(catAngle + 0.54) * 970,
                r: 135,
                label: `GAMES • FIGURAS NICHO (${c3})`,
                color: '#34d399',
                categoryId: cat.id,
                lane: 3
            };
        } else if (name.includes('marvel')) {
            const c1 = getFigureCount(cat.id, 1) || 54;
            map[cat.id][1] = {
                cx: Math.cos(catAngle) * 640,
                cy: Math.sin(catAngle) * 640,
                r: 95,
                label: `FIGURAS MARVEL (${c1})`,
                color: '#f87171',
                categoryId: cat.id,
                lane: 1
            };
        } else if (name.includes('dc')) {
            const c1 = getFigureCount(cat.id, 1) || 24;
            map[cat.id][1] = {
                cx: Math.cos(catAngle) * 570,
                cy: Math.sin(catAngle) * 570,
                r: 80,
                label: `FIGURAS DC (${c1})`,
                color: '#38bdf8',
                categoryId: cat.id,
                lane: 1
            };
        } else {
            // Cinema & Filmes / Random / Geek
            const c1 = getFigureCount(cat.id, 1) || 202;
            map[cat.id][1] = {
                cx: Math.cos(catAngle) * 730,
                cy: Math.sin(catAngle) * 730,
                r: 140,
                label: `FIGURAS CINEMA & GEEK (${c1})`,
                color: '#c084fc',
                categoryId: cat.id,
                lane: 1
            };
        }
    });

    return map;
}

function hexToRgba(hex: string, alpha: number): string {
    const clean = (hex || '#ffffff').replace('#', '');
    if (clean.length === 6) {
        const r = parseInt(clean.substring(0, 2), 16);
        const g = parseInt(clean.substring(2, 4), 16);
        const b = parseInt(clean.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return hex;
}

function getAllCategoriesGeometries(categories: GraphNode[], allNodes?: GraphNode[]): Record<string, Record<number, CategoryBubbleGeo>> {
    const map: Record<string, Record<number, CategoryBubbleGeo>> = {};

    const getSeriesCount = (catId: string, laneNum: number) => {
        if (!allNodes) return 0;
        return allNodes.filter(n => n.type === 'serie' && n.categoryId === catId && n.lane === laneNum).length;
    };

    categories.forEach(cat => {
        const catAngle = (cat.x !== undefined && cat.y !== undefined) 
            ? Math.atan2(cat.y, cat.x) 
            : 0;
        const name = (cat.name || '').toLowerCase();

        map[cat.id] = {};

        if (name.includes('anime')) {
            const c1 = getSeriesCount(cat.id, 1) || 10;
            const c2 = getSeriesCount(cat.id, 2) || 19;
            const c3 = getSeriesCount(cat.id, 3) || 54;
            map[cat.id][1] = {
                cx: Math.cos(catAngle - 0.52) * 430,
                cy: Math.sin(catAngle - 0.52) * 430,
                r: 110,
                label: `ANIME • TITÃS (${c1})`,
                color: '#ec4899',
                categoryId: cat.id,
                lane: 1
            };
            map[cat.id][2] = {
                cx: Math.cos(catAngle) * 520,
                cy: Math.sin(catAngle) * 520,
                r: 130,
                label: `ANIME • POPULARES (${c2})`,
                color: '#ec4899',
                categoryId: cat.id,
                lane: 2
            };
            map[cat.id][3] = {
                cx: Math.cos(catAngle + 0.54) * 610,
                cy: Math.sin(catAngle + 0.54) * 610,
                r: 165,
                label: `ANIME • NICHO (${c3})`,
                color: '#ec4899',
                categoryId: cat.id,
                lane: 3
            };
        } else if (name.includes('game') || name.includes('jogo')) {
            const c1 = getSeriesCount(cat.id, 1) || 9;
            const c2 = getSeriesCount(cat.id, 2) || 17;
            const c3 = getSeriesCount(cat.id, 3) || 86;
            map[cat.id][1] = {
                cx: Math.cos(catAngle - 0.52) * 430,
                cy: Math.sin(catAngle - 0.52) * 430,
                r: 110,
                label: `GAMES • TITÃS (${c1})`,
                color: '#10b981',
                categoryId: cat.id,
                lane: 1
            };
            map[cat.id][2] = {
                cx: Math.cos(catAngle) * 520,
                cy: Math.sin(catAngle) * 520,
                r: 130,
                label: `GAMES • POPULARES (${c2})`,
                color: '#10b981',
                categoryId: cat.id,
                lane: 2
            };
            map[cat.id][3] = {
                cx: Math.cos(catAngle + 0.54) * 620,
                cy: Math.sin(catAngle + 0.54) * 620,
                r: 180,
                label: `GAMES • NICHO (${c3})`,
                color: '#10b981',
                categoryId: cat.id,
                lane: 3
            };
        } else if (name.includes('marvel')) {
            const c1 = getSeriesCount(cat.id, 1) || 9;
            map[cat.id][1] = {
                cx: Math.cos(catAngle) * 420,
                cy: Math.sin(catAngle) * 420,
                r: 100,
                label: `SÉRIES MARVEL (${c1})`,
                color: '#ef4444',
                categoryId: cat.id,
                lane: 1
            };
        } else if (name.includes('dc')) {
            const c1 = getSeriesCount(cat.id, 1) || 3;
            map[cat.id][1] = {
                cx: Math.cos(catAngle) * 400,
                cy: Math.sin(catAngle) * 400,
                r: 75,
                label: `SÉRIES DC (${c1})`,
                color: '#06b6d4',
                categoryId: cat.id,
                lane: 1
            };
        } else {
            // Cinema & Filmes / Random / Geek
            const c1 = getSeriesCount(cat.id, 1) || 21;
            map[cat.id][1] = {
                cx: Math.cos(catAngle) * 440,
                cy: Math.sin(catAngle) * 440,
                r: 115,
                label: `CINEMA & GEEK (${c1})`,
                color: '#a855f7',
                categoryId: cat.id,
                lane: 1
            };
        }
    });

    return map;
}

export default function ThematicUniversePage() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const minimapRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    const [loading, setLoading] = useState(true);
    const [rawNodes, setRawNodes] = useState<GraphNode[]>([]);
    const [rawLinks, setRawLinks] = useState<GraphLink[]>([]);
    const [stats, setStats] = useState<any>(null);

    // Viewport (Pan & Zoom)
    const [transform, setTransform] = useState({ x: 0, y: 0, k: 0.48 });
    const transformRef = useRef({ x: 0, y: 0, k: 0.48 });
    transformRef.current = transform;

    // Física
    const [isRunning, setIsRunning] = useState(true);
    const simulationRef = useRef<any>(null);

    // Seleção e Hover
    const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
    const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showHelp, setShowHelp] = useState(false);

    // Arraste
    const isDraggingCanvasRef = useRef(false);
    const isDraggingNodeRef = useRef<GraphNode | null>(null);
    const lastMousePosRef = useRef({ x: 0, y: 0 });

    // 1. Carregar dados da API
    useEffect(() => {
        let isMounted = true;
        async function loadUniverse() {
            try {
                setLoading(true);
                const res = await fetch('/api/public/universo');
                if (!res.ok) throw new Error('Falha ao obter dados do universo');
                const data = await res.json();

                const nodes: GraphNode[] = (data.nodes || []).map((n: GraphNode) => ({ ...n }));
                const links: GraphLink[] = (data.links || []).map((l: GraphLink) => ({ ...l }));

                // 1. Centro: Franga Toys
                const root = nodes.find(n => n.type === 'root');
                if (root) {
                    root.x = 0;
                    root.y = 0;
                    root.fx = 0;
                    root.fy = 0;
                }

                // 2. Órbita 1: Categorias (R = 145)
                const categories = nodes.filter(n => n.type === 'category');
                const catCount = categories.length;
                let animeAngle = -Math.PI / 2; // Padrão no topo

                categories.forEach((cat, idx) => {
                    const angle = (idx / catCount) * 2 * Math.PI - Math.PI / 2;
                    cat.x = Math.cos(angle) * 145;
                    cat.y = Math.sin(angle) * 145;
                    if (cat.name.toLowerCase() === 'anime') {
                        animeAngle = angle;
                    }
                });

                // 3. Órbita 2: Estúdios (R = 265)
                const studios = nodes.filter(n => n.type === 'studio');
                studios.sort((a, b) => {
                    const linkA = links.find(l => (typeof l.target === 'object' ? (l.target as any).id : l.target) === a.id);
                    const linkB = links.find(l => (typeof l.target === 'object' ? (l.target as any).id : l.target) === b.id);
                    const sA = linkA ? (typeof linkA.source === 'object' ? (linkA.source as any).id : linkA.source) : '';
                    const sB = linkB ? (typeof linkB.source === 'object' ? (linkB.source as any).id : linkB.source) : '';
                    return sA.localeCompare(sB);
                });

                const stuCount = studios.length;
                studios.forEach((stu, idx) => {
                    const angle = (idx / stuCount) * 2 * Math.PI - Math.PI / 2;
                    stu.x = Math.cos(angle) * 265;
                    stu.y = Math.sin(angle) * 265;
                });

                // 4. Órbita 3 (Micro-Órbitas): Distribuir séries dentro das bolhas de cada categoria
                const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle ~2.39996 rad
                const allGeos = getAllCategoriesGeometries(categories, nodes);

                categories.forEach(cat => {
                    const catSeries = nodes.filter(n => n.type === 'serie' && n.categoryId === cat.id);
                    const catGeos = allGeos[cat.id];
                    if (!catGeos) return;

                    const byLane = {
                        1: catSeries.filter(s => s.lane === 1),
                        2: catSeries.filter(s => s.lane === 2),
                        3: catSeries.filter(s => s.lane === 3)
                    };

                    [1, 2, 3].forEach(laneNum => {
                        const laneSeries = (byLane as any)[laneNum] as GraphNode[];
                        const bubble = catGeos[laneNum];
                        if (bubble && laneSeries && laneSeries.length > 0) {
                            laneSeries.forEach((s, idx) => {
                                const maxR = bubble.r - s.size - 4;
                                const r = maxR * Math.sqrt((idx + 0.5) / laneSeries.length);
                                const theta = idx * phi;
                                s.x = bubble.cx + Math.cos(theta) * r;
                                s.y = bubble.cy + Math.sin(theta) * r;
                            });
                        }
                    });
                });

                // 5. Órbita 4: Distribuir figuras dentro das bolhas de cada categoria
                const allFigGeos = getAllCategoriesFigureGeometries(categories, nodes);

                categories.forEach(cat => {
                    const catFigures = nodes.filter(n => n.type === 'figure' && n.categoryId === cat.id);
                    const catFigGeos = allFigGeos[cat.id];
                    if (!catFigGeos) return;

                    const byLane = {
                        1: catFigures.filter(f => f.lane === 1),
                        2: catFigures.filter(f => f.lane === 2),
                        3: catFigures.filter(f => f.lane === 3)
                    };

                    [1, 2, 3].forEach(laneNum => {
                        const laneFigures = (byLane as any)[laneNum] as GraphNode[];
                        const figBubble = catFigGeos[laneNum];
                        if (figBubble && laneFigures && laneFigures.length > 0) {
                            laneFigures.forEach((fig, idx) => {
                                const maxR = figBubble.r - fig.size - 3;
                                const r = maxR * Math.sqrt((idx + 0.5) / laneFigures.length);
                                const theta = idx * phi;
                                fig.x = figBubble.cx + Math.cos(theta) * r;
                                fig.y = figBubble.cy + Math.sin(theta) * r;
                            });
                        }
                    });
                });

                if (isMounted) {
                    setRawNodes(nodes);
                    setRawLinks(links);
                    setStats(data.stats || null);
                }
            } catch (err) {
                console.error('Erro ao carregar dados do universo:', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        loadUniverse();
        return () => { isMounted = false; };
    }, []);

    // 2. Inicializar Física Orbital com Micro-Órbitas Travadas
    useEffect(() => {
        if (!rawNodes.length || !containerRef.current) return;

        const width = containerRef.current.clientWidth || 1200;
        const height = containerRef.current.clientHeight || 800;

        if (transformRef.current.x === 0 && transformRef.current.y === 0) {
            setTransform({ x: width / 2, y: height / 2, k: 0.48 });
        }

        const categories = rawNodes.filter(n => n.type === 'category');
        const initialGeos = getAllCategoriesGeometries(categories, rawNodes);
        const initialFigGeos = getAllCategoriesFigureGeometries(categories, rawNodes);

        // Criar simulação
        const sim = forceSimulation<GraphNode>(rawNodes)
            .velocityDecay(0.72)
            .alphaDecay(0.04)
            .force('radialCore', forceRadial<GraphNode>(
                d => {
                    if (d.type === 'root') return 0;
                    if (d.type === 'category') return 145;
                    if (d.type === 'studio') return 265;
                    return 0;
                },
                0,
                0
            ).strength(d => (d.type === 'serie' || d.type === 'figure') ? 0 : 0.98))
            .force('seriesRadial', forceRadial<GraphNode>(
                0,
                d => {
                    if (d.type === 'serie' && d.categoryId) {
                        const bubble = initialGeos[d.categoryId]?.[d.lane || 1];
                        return bubble ? bubble.cx : 0;
                    }
                    return 0;
                },
                d => {
                    if (d.type === 'serie' && d.categoryId) {
                        const bubble = initialGeos[d.categoryId]?.[d.lane || 1];
                        return bubble ? bubble.cy : 0;
                    }
                    return 0;
                }
            ).strength(d => d.type === 'serie' ? 0.05 : 0))
            .force('figuresRadial', forceRadial<GraphNode>(
                0,
                d => {
                    if (d.type === 'figure' && d.categoryId && d.lane) {
                        const bubble = initialFigGeos[d.categoryId]?.[d.lane];
                        return bubble ? bubble.cx : 0;
                    }
                    return 0;
                },
                d => {
                    if (d.type === 'figure' && d.categoryId && d.lane) {
                        const bubble = initialFigGeos[d.categoryId]?.[d.lane];
                        return bubble ? bubble.cy : 0;
                    }
                    return 0;
                }
            ).strength(d => d.type === 'figure' ? 0.04 : 0))
            .force('link', forceLink<GraphNode, GraphLink>(rawLinks)
                .id(d => d.id)
                .distance(d => {
                    if (d.type === 'root-category') return 145;
                    if (d.type === 'category-studio') return 120;
                    return 200;
                })
                .strength(d => {
                    if (d.type === 'root-category') return 0.2;
                    if (d.type === 'category-studio') return 0.05;
                    // Links visuais para séries e figuras não puxam os nós para fora dos círculos
                    if (d.type === 'category-serie' || d.type === 'studio-serie' || d.type === 'serie-figure' || d.type === 'studio-figure') return 0;
                    return 0.02;
                })
            )
            .force('charge', forceManyBody<GraphNode>()
                .strength(d => {
                    if (d.type === 'root') return -160;
                    if (d.type === 'category') return -140;
                    if (d.type === 'studio') return -50;
                    if (d.type === 'serie') return d.lane === 1 ? -35 : (d.lane === 2 ? -20 : -10);
                    if (d.type === 'figure') return -4;
                    return -20;
                })
            )
            .force('collision', forceCollide<GraphNode>().radius(d => {
                if (d.type === 'serie') {
                    if (d.lane === 1) return d.size + 13;
                    if (d.lane === 2) return d.size + 7;
                    return d.size + 3.5;
                }
                if (d.type === 'figure') return d.size + 1.2;
                return d.size + 14;
            }));

        // Trava matemática estrita a cada tick: impede nós de saírem do seu círculo/órbita
        sim.on('tick', () => {
            const currentCats = rawNodes.filter(n => n.type === 'category');
            const currentGeos = getAllCategoriesGeometries(currentCats, rawNodes);
            const currentFigGeos = getAllCategoriesFigureGeometries(currentCats, rawNodes);

            rawNodes.forEach(node => {
                if (node.type === 'root') {
                    node.x = 0;
                    node.y = 0;
                    return;
                }
                if (node.type === 'category') {
                    const angle = Math.atan2(node.y || 0, node.x || 0);
                    node.x = Math.cos(angle) * 145;
                    node.y = Math.sin(angle) * 145;
                } else if (node.type === 'studio') {
                    const angle = Math.atan2(node.y || 0, node.x || 0);
                    node.x = Math.cos(angle) * 265;
                    node.y = Math.sin(angle) * 265;
                } else if (node.type === 'serie' && node.categoryId) {
                    const geo = currentGeos[node.categoryId]?.[node.lane || 1];
                    if (geo) {
                        const dx = (node.x || 0) - geo.cx;
                        const dy = (node.y || 0) - geo.cy;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        const maxR = geo.r - node.size - 2;
                        if (dist > maxR && dist > 0) {
                            const scale = maxR / dist;
                            node.x = geo.cx + dx * scale;
                            node.y = geo.cy + dy * scale;
                            node.vx = 0;
                            node.vy = 0;
                        }
                    }
                } else if (node.type === 'figure' && node.categoryId && node.lane) {
                    const geo = currentFigGeos[node.categoryId]?.[node.lane];
                    if (geo) {
                        const dx = (node.x || 0) - geo.cx;
                        const dy = (node.y || 0) - geo.cy;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        const maxR = geo.r - node.size - 2;
                        if (dist > maxR && dist > 0) {
                            const scale = maxR / dist;
                            node.x = geo.cx + dx * scale;
                            node.y = geo.cy + dy * scale;
                            node.vx = 0;
                            node.vy = 0;
                        }
                    }
                }
            });
        });

        simulationRef.current = sim;

        return () => {
            sim.stop();
        };
    }, [rawNodes, rawLinks]);

    // 3. Zoom Suave no Canvas (Listener Nativo não-passivo)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleWheelEvent = (e: WheelEvent) => {
            e.preventDefault();
            e.stopPropagation();

            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const clampedDelta = Math.max(-50, Math.min(50, e.deltaY));
            const zoomFactor = Math.exp(-clampedDelta * 0.002);

            setTransform(prev => {
                const nextK = Math.max(0.18, Math.min(3.5, prev.k * zoomFactor));
                return {
                    x: mouseX - (mouseX - prev.x) * (nextK / prev.k),
                    y: mouseY - (mouseY - prev.y) * (nextK / prev.k),
                    k: nextK
                };
            });
        };

        canvas.addEventListener('wheel', handleWheelEvent, { passive: false });
        return () => {
            canvas.removeEventListener('wheel', handleWheelEvent);
        };
    }, []);

    // 4. Renderização do Canvas 2D
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;

        const render = () => {
            const { width, height } = canvas;
            const { x: panX, y: panY, k: scale } = transformRef.current;

            ctx.clearRect(0, 0, width, height);

            // Fundo espacial profundo
            ctx.save();
            ctx.fillStyle = '#09090b';
            ctx.fillRect(0, 0, width, height);

            // Grade estelar sutil
            const gridSize = 45 * scale;
            const offsetX = panX % gridSize;
            const offsetY = panY % gridSize;

            ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
            for (let x = offsetX; x < width; x += gridSize) {
                for (let y = offsetY; y < height; y += gridSize) {
                    ctx.beginPath();
                    ctx.arc(x, y, 1, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Aplicar transformações de câmera
            ctx.translate(panX, panY);
            ctx.scale(scale, scale);

            // A. Desenhar Anéis Orbitais Celestes
            ctx.save();
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 6]);

            // Órbita 1 (Categorias - r = 145)
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.beginPath();
            ctx.arc(0, 0, 145, 0, Math.PI * 2);
            ctx.stroke();

            // Órbita 2 (Estúdios - r = 265)
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.1)';
            ctx.beginPath();
            ctx.arc(0, 0, 265, 0, Math.PI * 2);
            ctx.stroke();

            // Micro-Órbitas: Desenhar as bolhas fechadas para todas as categorias
            const allCats = rawNodes.filter(n => n.type === 'category');
            const allGeos = getAllCategoriesGeometries(allCats, rawNodes);

            allCats.forEach(cat => {
                if (cat.x === undefined || cat.y === undefined) return;
                const catGeos = allGeos[cat.id];
                if (!catGeos) return;

                const bubbles = Object.values(catGeos);

                // Linhas guias conectando a categoria aos centros dos seus círculos
                ctx.strokeStyle = hexToRgba(cat.color, 0.14);
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 5]);
                bubbles.forEach(geo => {
                    ctx.beginPath();
                    ctx.moveTo(cat.x!, cat.y!);
                    ctx.lineTo(geo.cx, geo.cy);
                    ctx.stroke();
                });

                // Desenhar cada círculo fechado da categoria
                bubbles.forEach(geo => {
                    // Trilho circular fechado
                    ctx.strokeStyle = hexToRgba(geo.color, 0.25);
                    ctx.lineWidth = 1;
                    ctx.setLineDash([4, 4]);
                    ctx.beginPath();
                    ctx.arc(geo.cx, geo.cy, geo.r, 0, Math.PI * 2);
                    ctx.stroke();

                    // Preenchimento com halo suave
                    const grad = ctx.createRadialGradient(geo.cx, geo.cy, 0, geo.cx, geo.cy, geo.r);
                    grad.addColorStop(0, hexToRgba(geo.color, 0.04));
                    grad.addColorStop(0.85, hexToRgba(geo.color, 0.012));
                    grad.addColorStop(1, 'transparent');
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(geo.cx, geo.cy, geo.r, 0, Math.PI * 2);
                    ctx.fill();

                    // Tag/Título acima de cada círculo
                    ctx.setLineDash([]);
                    ctx.fillStyle = hexToRgba(geo.color, 0.85);
                    ctx.font = '600 10px system-ui, -apple-system, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(geo.label, geo.cx, geo.cy - geo.r - 8);
                });
            });

            // Micro-Órbitas de Figuras (Órbita 4 - Todas as Categorias)
            const figGeosMap = getAllCategoriesFigureGeometries(allCats, rawNodes);
            allCats.forEach(cat => {
                const catFigGeos = figGeosMap[cat.id];
                const catSeriesGeos = allGeos[cat.id];
                if (!catFigGeos) return;

                Object.values(catFigGeos).forEach(figGeo => {
                    const serieGeo = catSeriesGeos?.[figGeo.lane];

                    // Linha guia conectando a bolha de séries à bolha de figuras
                    if (serieGeo) {
                        ctx.strokeStyle = hexToRgba(figGeo.color, 0.12);
                        ctx.lineWidth = 1;
                        ctx.setLineDash([2, 5]);
                        ctx.beginPath();
                        ctx.moveTo(serieGeo.cx, serieGeo.cy);
                        ctx.lineTo(figGeo.cx, figGeo.cy);
                        ctx.stroke();
                    }

                    // Trilho circular fechado
                    ctx.strokeStyle = hexToRgba(figGeo.color, 0.22);
                    ctx.lineWidth = 1;
                    ctx.setLineDash([3, 4]);
                    ctx.beginPath();
                    ctx.arc(figGeo.cx, figGeo.cy, figGeo.r, 0, Math.PI * 2);
                    ctx.stroke();

                    // Preenchimento com halo suave
                    const grad = ctx.createRadialGradient(figGeo.cx, figGeo.cy, 0, figGeo.cx, figGeo.cy, figGeo.r);
                    grad.addColorStop(0, hexToRgba(figGeo.color, 0.035));
                    grad.addColorStop(0.85, hexToRgba(figGeo.color, 0.008));
                    grad.addColorStop(1, 'transparent');
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(figGeo.cx, figGeo.cy, figGeo.r, 0, Math.PI * 2);
                    ctx.fill();

                    // Tag/Título acima de cada círculo de figuras
                    ctx.setLineDash([]);
                    ctx.fillStyle = hexToRgba(figGeo.color, 0.75);
                    ctx.font = '600 10px system-ui, -apple-system, sans-serif';
                    ctx.textAlign = 'center';

                    let labelToDraw = figGeo.label;
                    const activeSerieForLabel = selectedNode?.type === 'serie' 
                        ? selectedNode.id 
                        : (selectedNode?.type === 'figure' ? selectedNode.serieId : null);
                    if (activeSerieForLabel) {
                        const countInLane = rawNodes.filter(n => 
                            n.type === 'figure' && 
                            n.serieId === activeSerieForLabel && 
                            n.categoryId === figGeo.categoryId && 
                            n.lane === figGeo.lane
                        ).length;
                        if (countInLane > 0) {
                            const serieName = selectedNode?.type === 'serie' ? selectedNode.name : (selectedNode?.serieName || 'Franquia');
                            labelToDraw = `${figGeo.label.split('(')[0].trim()} • ${serieName} (${countInLane} peças)`;
                        }
                    }
                    ctx.fillText(labelToDraw, figGeo.cx, figGeo.cy - figGeo.r - 8);
                });
            });

            ctx.restore();

            // Foco e Destaques
            const activeFocus = hoveredNode || selectedNode;
            const connectedIds = new Set<string>();
            const highlightedLinks = new Set<GraphLink>();

            if (activeFocus) {
                connectedIds.add(activeFocus.id);
                rawLinks.forEach(l => {
                    const sId = typeof l.source === 'object' ? (l.source as any).id : l.source;
                    const tId = typeof l.target === 'object' ? (l.target as any).id : l.target;
                    if (sId === activeFocus.id) {
                        connectedIds.add(tId);
                        highlightedLinks.add(l);
                    }
                    if (tId === activeFocus.id) {
                        connectedIds.add(sId);
                        highlightedLinks.add(l);
                    }
                });
            }

            // B. Desenhar Linhas de Conexão
            rawLinks.forEach(link => {
                const s = link.source as GraphNode;
                const t = link.target as GraphNode;
                if (!s || !t || s.x === undefined || s.y === undefined || t.x === undefined || t.y === undefined) return;

                const isLinkHighlighted = highlightedLinks.has(link);
                const isDimmed = activeFocus && !isLinkHighlighted;
                const isStudioLink = link.type === 'category-studio';
                const isCategorySerieLink = link.type === 'category-serie';
                const isStudioSerieLink = link.type === 'studio-serie';
                const isSerieFigureLink = link.type === 'serie-figure';
                const isStudioFigureLink = link.type === 'studio-figure';

                // Para manter a galáxia esteticamente limpa, links de figuras só acendem no foco/hover/seleção
                if ((isSerieFigureLink || isStudioFigureLink) && !isLinkHighlighted) {
                    return;
                }

                ctx.beginPath();
                ctx.moveTo(s.x, s.y);
                ctx.lineTo(t.x, t.y);

                if (isLinkHighlighted) {
                    if (isStudioSerieLink || isStudioLink || isStudioFigureLink) {
                        ctx.strokeStyle = '#38bdf8'; // Ciano para conexões de estúdio
                        ctx.lineWidth = isStudioFigureLink ? 1.8 : 2.4;
                        ctx.shadowColor = '#38bdf8';
                        ctx.shadowBlur = 10;
                    } else if (isSerieFigureLink) {
                        ctx.strokeStyle = '#f472b6'; // Rosa suave para conexões série-figura
                        ctx.lineWidth = 2.0;
                        ctx.shadowColor = '#f472b6';
                        ctx.shadowBlur = 10;
                    } else if (isCategorySerieLink) {
                        ctx.strokeStyle = t.color || s.color || '#ec4899';
                        ctx.lineWidth = 2.4;
                        ctx.shadowColor = ctx.strokeStyle;
                        ctx.shadowBlur = 10;
                    } else {
                        ctx.strokeStyle = activeFocus?.color || '#f97316';
                        ctx.lineWidth = 2.4;
                        ctx.shadowColor = ctx.strokeStyle;
                        ctx.shadowBlur = 10;
                    }
                } else if (isDimmed) {
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.012)';
                    ctx.lineWidth = 0.5;
                    ctx.shadowBlur = 0;
                } else {
                    if (isStudioSerieLink) {
                        // Linhas de estúdio para série são muito sutis por padrão
                        ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
                        ctx.setLineDash([2, 4]);
                        ctx.lineWidth = 0.8;
                    } else if (isStudioLink) {
                        ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';
                        ctx.setLineDash([3, 4]);
                        ctx.lineWidth = 1.1;
                    } else if (isCategorySerieLink) {
                        ctx.strokeStyle = hexToRgba(t.color || s.color || '#ffffff', 0.04);
                        ctx.setLineDash([2, 5]);
                        ctx.lineWidth = 0.6;
                    } else {
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
                        ctx.setLineDash([]);
                        ctx.lineWidth = 1.3;
                    }
                    ctx.shadowBlur = 0;
                }
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.shadowBlur = 0;
            });

            // C. Desenhar Discos e Rótulos
            const now = Date.now();
            const activeSerieId = selectedNode?.type === 'serie' 
                ? selectedNode.id 
                : (selectedNode?.type === 'figure' ? selectedNode.serieId : null);
            const activeStudioId = selectedNode?.type === 'studio' ? selectedNode.id : null;

            rawNodes.forEach(node => {
                if (node.x === undefined || node.y === undefined) return;

                // FILTRO INTELIGENTE: Quando uma franquia estiver selecionada,
                // sumir 100% com as figuras de outras séries para permitir clique e visualização limpos!
                if (activeSerieId && node.type === 'figure' && node.serieId !== activeSerieId) {
                    return;
                }
                // Quando um estúdio estiver selecionado, ocultar figuras não modeladas por ele
                if (activeStudioId && node.type === 'figure' && node.studioId !== activeStudioId) {
                    return;
                }

                const isHovered = hoveredNode?.id === node.id;
                const isSelected = selectedNode?.id === node.id;
                const isConnected = activeFocus ? connectedIds.has(node.id) : true;
                const isFigureOfActiveSerie = !!(activeSerieId && node.type === 'figure' && node.serieId === activeSerieId);
                const opacity = isConnected ? 1 : (node.type === 'figure' ? 0.08 : 0.18);

                ctx.save();
                ctx.globalAlpha = opacity;

                const nodeRenderSize = node.type === 'figure' 
                    ? (isHovered || isSelected ? 8 : (isFigureOfActiveSerie ? 5.5 : node.size)) 
                    : node.size;

                // 1. Halo / Glow
                if (isHovered || isSelected || node.pulse || (isFigureOfActiveSerie && isConnected)) {
                    const pulseRadius = nodeRenderSize + (node.pulse ? Math.sin(now / 350) * 3 + 4 : (isFigureOfActiveSerie ? 6 : 8));
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, pulseRadius, 0, Math.PI * 2);
                    ctx.fillStyle = `${node.color}35`;
                    ctx.fill();

                    ctx.beginPath();
                    ctx.arc(node.x, node.y, nodeRenderSize + 3, 0, Math.PI * 2);
                    ctx.strokeStyle = node.color;
                    ctx.lineWidth = isFigureOfActiveSerie ? 2 : 1.5;
                    ctx.stroke();
                }

                // 2. Disco
                ctx.beginPath();
                ctx.arc(node.x, node.y, nodeRenderSize, 0, Math.PI * 2);
                ctx.fillStyle = node.color;
                ctx.shadowColor = node.color;
                ctx.shadowBlur = isHovered ? 20 : (node.type === 'root' ? 14 : (isFigureOfActiveSerie ? 10 : (node.lane === 1 ? 10 : (node.type === 'figure' ? 2 : 4))));
                ctx.fill();
                ctx.shadowBlur = 0;

                // Borda de contraste
                ctx.beginPath();
                ctx.arc(node.x, node.y, nodeRenderSize, 0, Math.PI * 2);
                ctx.strokeStyle = node.type === 'studio' ? '#93c5fd' : (node.type === 'figure' ? '#ffffff' : (node.type === 'serie' ? hexToRgba(node.color, 0.6) : 'rgba(0, 0, 0, 0.4)'));
                ctx.lineWidth = node.type === 'studio' ? 1.5 : (node.type === 'figure' ? (isFigureOfActiveSerie ? 1.2 : 0.8) : (node.type === 'serie' ? 1 : 2));
                ctx.stroke();

                // 3. Rótulos
                const shouldShowLabel = 
                    node.type === 'root' || 
                    node.type === 'category' || 
                    node.type === 'studio' || 
                    (node.type === 'serie' && node.lane === 1) || 
                    isHovered || 
                    isSelected || 
                    (isFigureOfActiveSerie && (scale > 0.75 || isHovered || isSelected)) ||
                    (node.type === 'serie' && node.lane === 2 && scale > 0.95) || 
                    (node.type === 'serie' && node.lane === 3 && scale > 1.35) ||
                    (node.type === 'figure' && scale > 1.8);

                if (shouldShowLabel) {
                    ctx.font = node.type === 'root' 
                        ? 'bold 13px system-ui, sans-serif' 
                        : (node.type === 'category' || node.type === 'studio')
                        ? 'bold 11px system-ui, sans-serif'
                        : (node.type === 'serie' && node.lane === 1 ? 'bold 10px system-ui, sans-serif' : (node.type === 'figure' ? 'bold 9px system-ui, sans-serif' : '9px system-ui, sans-serif'));
                    
                    ctx.fillStyle = isHovered 
                        ? '#ffffff' 
                        : (node.type === 'studio' ? '#93c5fd' : (node.type === 'figure' ? '#fdf2f8' : (node.type === 'serie' ? '#f1f5f9' : 'rgba(255, 255, 255, 0.9)')));
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top';

                    const label = node.name.length > 22 ? `${node.name.slice(0, 20)}...` : node.name;
                    ctx.shadowColor = '#000000';
                    ctx.shadowBlur = 4;
                    ctx.fillText(label, node.x, node.y + nodeRenderSize + 3);
                    ctx.shadowBlur = 0;

                    if (node.itemCount && (node.type === 'category' || node.type === 'studio' || (node.type === 'serie' && (node.lane === 1 || isHovered)))) {
                        ctx.font = 'bold 8px system-ui, sans-serif';
                        ctx.fillStyle = node.type === 'studio' ? '#60a5fa' : (node.type === 'serie' ? hexToRgba(node.color, 0.9) : 'rgba(255, 255, 255, 0.55)');
                        ctx.fillText(`${node.itemCount} peças`, node.x, node.y + nodeRenderSize + 16);
                    }
                }

                ctx.restore();
            });

            ctx.restore();

            // D. Desenhar Minimapa
            drawMinimap();

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [rawNodes, rawLinks, hoveredNode, selectedNode]);

    // 5. Desenhar Minimapa
    const drawMinimap = () => {
        const mini = minimapRef.current;
        if (!mini || !rawNodes.length) return;
        const mCtx = mini.getContext('2d');
        if (!mCtx) return;

        const w = mini.width;
        const h = mini.height;

        mCtx.clearRect(0, 0, w, h);
        mCtx.fillStyle = 'rgba(15, 15, 20, 0.9)';
        mCtx.fillRect(0, 0, w, h);

        mCtx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        mCtx.lineWidth = 1;
        mCtx.strokeRect(0, 0, w, h);

        let minX = -550, maxX = 550, minY = -550, maxY = 550;
        rawNodes.forEach(n => {
            if (n.x !== undefined && n.y !== undefined) {
                if (n.x < minX) minX = n.x;
                if (n.x > maxX) maxX = n.x;
                if (n.y < minY) minY = n.y;
                if (n.y > maxY) maxY = n.y;
            }
        });

        const spanX = Math.max(maxX - minX, 100);
        const spanY = Math.max(maxY - minY, 100);
        const scaleMini = Math.min((w - 20) / spanX, (h - 20) / spanY);

        const toMiniX = (val: number) => (val - minX) * scaleMini + 10;
        const toMiniY = (val: number) => (val - minY) * scaleMini + 10;

        rawNodes.forEach(n => {
            if (n.x === undefined || n.y === undefined) return;
            mCtx.beginPath();
            const r = n.type === 'root' ? 3.5 : (n.type === 'category' ? 2.5 : (n.type === 'studio' ? 1.5 : (n.type === 'figure' ? 0.6 : (n.lane === 1 ? 1.4 : 0.8))));
            mCtx.arc(toMiniX(n.x), toMiniY(n.y), r, 0, Math.PI * 2);
            mCtx.fillStyle = n.color;
            mCtx.fill();
        });

        if (canvasRef.current) {
            const { x: panX, y: panY, k: scale } = transformRef.current;
            const cW = canvasRef.current.width;
            const cH = canvasRef.current.height;

            const rx = toMiniX(-panX / scale);
            const ry = toMiniY(-panY / scale);
            const rw = (cW / scale) * scaleMini;
            const rh = (cH / scale) * scaleMini;

            mCtx.strokeStyle = '#f97316';
            mCtx.lineWidth = 1.2;
            mCtx.strokeRect(rx, ry, rw, rh);
        }
    };

    // 6. Redimensionar Canvas
    useEffect(() => {
        const updateSize = () => {
            if (!containerRef.current || !canvasRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            canvasRef.current.width = rect.width * dpr;
            canvasRef.current.height = rect.height * dpr;
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) ctx.scale(dpr, dpr);
        };
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    // 7. Tecla Escape para encerrar a seleção e voltar a exibir todas as figuras
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (selectedNode) {
                    setSelectedNode(null);
                }
                if (searchQuery) {
                    setSearchQuery('');
                }
                if (showHelp) {
                    setShowHelp(false);
                }
                if (document.activeElement instanceof HTMLElement) {
                    document.activeElement.blur();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedNode, searchQuery, showHelp]);

    // 8. Coordenadas e Detecção
    const screenToWorld = useCallback((screenX: number, screenY: number) => {
        const { x: panX, y: panY, k: scale } = transformRef.current;
        return {
            x: (screenX - panX) / scale,
            y: (screenY - panY) / scale
        };
    }, []);

    const getNodeAtPosition = useCallback((worldX: number, worldY: number) => {
        const activeSerieId = selectedNode?.type === 'serie' 
            ? selectedNode.id 
            : (selectedNode?.type === 'figure' ? selectedNode.serieId : null);
        const activeStudioId = selectedNode?.type === 'studio' ? selectedNode.id : null;

        // 1. PRIORIDADE MÁXIMA: Se uma franquia ou estúdio estiver selecionado,
        // checar primeiro as figuras ativas com raio de acerto generoso (14px)
        if (activeSerieId) {
            for (let i = rawNodes.length - 1; i >= 0; i--) {
                const node = rawNodes[i];
                if (node.type === 'figure' && node.serieId === activeSerieId) {
                    if (node.x === undefined || node.y === undefined) continue;
                    const dx = node.x - worldX;
                    const dy = node.y - worldY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist <= 14) {
                        return node;
                    }
                }
            }
        } else if (activeStudioId) {
            for (let i = rawNodes.length - 1; i >= 0; i--) {
                const node = rawNodes[i];
                if (node.type === 'figure' && node.studioId === activeStudioId) {
                    if (node.x === undefined || node.y === undefined) continue;
                    const dx = node.x - worldX;
                    const dy = node.y - worldY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist <= 14) {
                        return node;
                    }
                }
            }
        }

        // 2. Busca padrão para os demais nós da galáxia
        for (let i = rawNodes.length - 1; i >= 0; i--) {
            const node = rawNodes[i];
            if (node.x === undefined || node.y === undefined) continue;

            // Se uma franquia ou estúdio estiver selecionado, ignorar COMPLETAMENTE
            // qualquer figura oculta/não relacionada (evita clique fantasma)
            if (activeSerieId && node.type === 'figure' && node.serieId !== activeSerieId) {
                continue;
            }
            if (activeStudioId && node.type === 'figure' && node.studioId !== activeStudioId) {
                continue;
            }

            const dx = node.x - worldX;
            const dy = node.y - worldY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const hitRadius = node.type === 'figure' ? 12 : node.size + 8;
            if (dist <= hitRadius) {
                return node;
            }
        }
        return null;
    }, [rawNodes, selectedNode]);

    // 8. Eventos de Mouse
    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const world = screenToWorld(screenX, screenY);
        const node = getNodeAtPosition(world.x, world.y);

        lastMousePosRef.current = { x: e.clientX, y: e.clientY };

        if (node) {
            isDraggingNodeRef.current = node;
            if (node.type !== 'root') {
                if (node.type === 'category') {
                    const angle = Math.atan2(node.y || 0, node.x || 0);
                    node.fx = Math.cos(angle) * 145;
                    node.fy = Math.sin(angle) * 145;
                } else if (node.type === 'studio') {
                    const angle = Math.atan2(node.y || 0, node.x || 0);
                    node.fx = Math.cos(angle) * 265;
                    node.fy = Math.sin(angle) * 265;
                } else if (node.type === 'serie' || node.type === 'figure') {
                    node.fx = node.x;
                    node.fy = node.y;
                }
            }
            if (simulationRef.current) simulationRef.current.alphaTarget(0.06).restart();
        } else {
            isDraggingCanvasRef.current = true;
        }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const world = screenToWorld(screenX, screenY);

        if (isDraggingNodeRef.current) {
            const node = isDraggingNodeRef.current;
            if (node.type === 'root') return; // Franga permanece fixa no centro

            if (node.type === 'category') {
                const angle = Math.atan2(world.y, world.x);
                node.fx = Math.cos(angle) * 145;
                node.fy = Math.sin(angle) * 145;
            } else if (node.type === 'studio') {
                const angle = Math.atan2(world.y, world.x);
                node.fx = Math.cos(angle) * 265;
                node.fy = Math.sin(angle) * 265;
            } else if (node.type === 'serie' && node.categoryId) {
                const currentCats = rawNodes.filter(n => n.type === 'category');
                const currentGeos = getAllCategoriesGeometries(currentCats, rawNodes);
                const geo = currentGeos[node.categoryId]?.[node.lane || 1];
                if (geo) {
                    const dx = world.x - geo.cx;
                    const dy = world.y - geo.cy;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const maxR = geo.r - node.size - 2;
                    if (dist > maxR && dist > 0) {
                        const scale = maxR / dist;
                        node.fx = geo.cx + dx * scale;
                        node.fy = geo.cy + dy * scale;
                    } else {
                        node.fx = world.x;
                        node.fy = world.y;
                    }
                }
            } else if (node.type === 'figure' && node.categoryId && node.lane) {
                const currentCats = rawNodes.filter(n => n.type === 'category');
                const currentFigGeos = getAllCategoriesFigureGeometries(currentCats, rawNodes);
                const geo = currentFigGeos[node.categoryId]?.[node.lane];
                if (geo) {
                    const dx = world.x - geo.cx;
                    const dy = world.y - geo.cy;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const maxR = geo.r - node.size - 2;
                    if (dist > maxR && dist > 0) {
                        const scale = maxR / dist;
                        node.fx = geo.cx + dx * scale;
                        node.fy = geo.cy + dy * scale;
                    } else {
                        node.fx = world.x;
                        node.fy = world.y;
                    }
                }
            }
            return;
        }

        if (isDraggingCanvasRef.current) {
            const dx = e.clientX - lastMousePosRef.current.x;
            const dy = e.clientY - lastMousePosRef.current.y;
            lastMousePosRef.current = { x: e.clientX, y: e.clientY };

            setTransform(prev => ({
                ...prev,
                x: prev.x + dx,
                y: prev.y + dy
            }));
            return;
        }

        const node = getNodeAtPosition(world.x, world.y);
        setHoveredNode(node);
        if (canvasRef.current) {
            canvasRef.current.style.cursor = node ? 'pointer' : 'grab';
        }
    };

    const handleMouseUp = () => {
        if (isDraggingNodeRef.current) {
            const node = isDraggingNodeRef.current;
            if (node.type === 'root') {
                node.fx = 0;
                node.fy = 0;
            } else if (node.type === 'serie' && node.categoryId) {
                const currentCats = rawNodes.filter(n => n.type === 'category');
                const currentGeos = getAllCategoriesGeometries(currentCats, rawNodes);
                const geo = currentGeos[node.categoryId]?.[node.lane || 1];
                if (geo && node.x !== undefined && node.y !== undefined) {
                    const dx = node.x - geo.cx;
                    const dy = node.y - geo.cy;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const maxR = geo.r - node.size - 2;
                    if (dist > maxR && dist > 0) {
                        node.x = geo.cx + (dx / dist) * maxR;
                        node.y = geo.cy + (dy / dist) * maxR;
                    }
                }
                node.fx = null;
                node.fy = null;
            } else if (node.type === 'figure' && node.categoryId && node.lane) {
                const currentCats = rawNodes.filter(n => n.type === 'category');
                const currentFigGeos = getAllCategoriesFigureGeometries(currentCats, rawNodes);
                const geo = currentFigGeos[node.categoryId]?.[node.lane];
                if (geo && node.x !== undefined && node.y !== undefined) {
                    const dx = node.x - geo.cx;
                    const dy = node.y - geo.cy;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const maxR = geo.r - node.size - 2;
                    if (dist > maxR && dist > 0) {
                        node.x = geo.cx + (dx / dist) * maxR;
                        node.y = geo.cy + (dy / dist) * maxR;
                    }
                }
                node.fx = null;
                node.fy = null;
            } else {
                node.fx = null;
                node.fy = null;
            }
            isDraggingNodeRef.current = null;
            if (simulationRef.current) simulationRef.current.alphaTarget(0);
        }
        isDraggingCanvasRef.current = false;
        if (canvasRef.current) {
            canvasRef.current.style.cursor = hoveredNode ? 'pointer' : 'default';
        }
    };

    const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const world = screenToWorld(screenX, screenY);
        const node = getNodeAtPosition(world.x, world.y);

        if (node) {
            setSelectedNode(node);
            if (node.x !== undefined && node.y !== undefined && canvasRef.current) {
                const cW = canvasRef.current.clientWidth;
                const cH = canvasRef.current.clientHeight;
                setTransform(prev => ({
                    ...prev,
                    x: cW / 2 - node.x! * prev.k,
                    y: cH / 2 - node.y! * prev.k
                }));
            }
        }
    };

    const handleZoom = (factor: number) => {
        if (!canvasRef.current) return;
        const cW = canvasRef.current.clientWidth;
        const cH = canvasRef.current.clientHeight;
        setTransform(prev => {
            const nextK = Math.max(0.18, Math.min(3.5, prev.k * factor));
            return {
                x: cW / 2 - (cW / 2 - prev.x) * (nextK / prev.k),
                y: cH / 2 - (cH / 2 - prev.y) * (nextK / prev.k),
                k: nextK
            };
        });
    };

    const handleResetView = () => {
        if (!containerRef.current) return;
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        setTransform({ x: w / 2, y: h / 2, k: 0.48 });
    };

    const toggleSimulation = () => {
        if (isRunning) {
            simulationRef.current?.stop();
            setIsRunning(false);
        } else {
            simulationRef.current?.restart();
            setIsRunning(true);
        }
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        const q = searchQuery.toLowerCase();
        const matched = rawNodes.find(n => n.name.toLowerCase().includes(q));
        if (matched && matched.x !== undefined && matched.y !== undefined && canvasRef.current) {
            setSelectedNode(matched);
            setHoveredNode(matched);
            const cW = canvasRef.current.clientWidth;
            const cH = canvasRef.current.clientHeight;
            setTransform({
                x: cW / 2 - matched.x * 1.3,
                y: cH / 2 - matched.y * 1.3,
                k: 1.3
            });
        }
    };

    // Obter estúdios vinculados para a série selecionada
    const linkedStudiosForSelected = useMemo(() => {
        if (!selectedNode || selectedNode.type !== 'serie') return [];
        const stuMap = new Map<string, string>();
        rawLinks.forEach(l => {
            const sId = typeof l.source === 'object' ? (l.source as any).id : l.source;
            const tId = typeof l.target === 'object' ? (l.target as any).id : l.target;
            if (tId === selectedNode.id && sId.startsWith('studio-')) {
                const sNode = rawNodes.find(n => n.id === sId);
                if (sNode) stuMap.set(sNode.id, sNode.name);
            }
        });
        return Array.from(stuMap.entries()).map(([id, name]) => ({ id, name }));
    }, [selectedNode, rawLinks, rawNodes]);

    // Obter franquias modeladas pelo estúdio selecionado
    const linkedSeriesForSelectedStudio = useMemo(() => {
        if (!selectedNode || selectedNode.type !== 'studio') return [];
        const serMap = new Map<string, { id: string; name: string }>();
        rawLinks.forEach(l => {
            const sId = typeof l.source === 'object' ? (l.source as any).id : l.source;
            const tId = typeof l.target === 'object' ? (l.target as any).id : l.target;
            if (sId === selectedNode.id && tId.startsWith('serie-')) {
                const sNode = rawNodes.find(n => n.id === tId);
                if (sNode) serMap.set(sNode.id, { id: sNode.id, name: sNode.name });
            }
        });
        return Array.from(serMap.values());
    }, [selectedNode, rawLinks, rawNodes]);

    const handleSelectAndFocusNode = (nodeId: string) => {
        const targetNode = rawNodes.find(n => n.id === nodeId);
        if (targetNode) {
            setSelectedNode(targetNode);
            setHoveredNode(targetNode);
            if (canvasRef.current && targetNode.x !== undefined && targetNode.y !== undefined) {
                const cW = canvasRef.current.clientWidth;
                const cH = canvasRef.current.clientHeight;
                setTransform({
                    x: cW / 2 - targetNode.x * 1.2,
                    y: cH / 2 - targetNode.y * 1.2,
                    k: 1.2
                });
            }
        }
    };

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-zinc-950 text-white select-none touch-none">
            {/* Header Flutuante / HUD Superior */}
            <div className="absolute top-4 left-4 right-4 z-30 flex flex-col md:flex-row items-center justify-between gap-3 pointer-events-none">
                {/* Brand & Voltar */}
                <div className="flex items-center gap-3 bg-zinc-900/90 backdrop-blur-xl border border-zinc-800/80 px-4 py-2.5 rounded-2xl shadow-2xl pointer-events-auto">
                    <Link 
                        href="/" 
                        className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-bold mr-1"
                    >
                        <ArrowLeft size={16} />
                        Loja
                    </Link>
                    <div className="h-4 w-px bg-zinc-800" />
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
                            <Compass size={14} className="animate-spin-slow" />
                        </div>
                        <div>
                            <h1 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                                Universo Franga Toys
                                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] px-1.5 py-0.5 rounded-full font-mono">
                                    GALÁXIA COMPLETA
                                </span>
                            </h1>
                            <p className="text-[10px] text-zinc-400 font-medium">
                                {stats ? `${stats.totalSeries} franquias em 5 temáticas • ${stats.totalStudios} estúdios • ${stats.totalCatalogFigures} peças no catálogo` : 'Mapeando galáxia...'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Barra de Busca Interativa */}
                <form 
                    onSubmit={handleSearchSubmit} 
                    className="flex-1 max-w-md w-full pointer-events-auto bg-zinc-900/90 backdrop-blur-xl border border-zinc-800/80 rounded-2xl px-3.5 py-2 flex items-center gap-2 shadow-2xl focus-within:border-orange-500/50 transition-all"
                >
                    <Search size={14} className="text-zinc-400 shrink-0" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Buscar franquia, anime, jogo ou estúdio..."
                        className="w-full bg-transparent text-xs text-white placeholder-zinc-500 outline-none font-medium"
                    />
                    {searchQuery && (
                        <button type="button" onClick={() => setSearchQuery('')} className="text-zinc-500 hover:text-white">
                            <X size={12} />
                        </button>
                    )}
                </form>
            </div>

            {/* Pill Indicador de Filtro Ativo por Franquia ou Estúdio */}
            {selectedNode && (selectedNode.type === 'serie' || (selectedNode.type === 'figure' && selectedNode.serieName) || selectedNode.type === 'studio') && (
                <div className="absolute top-20 left-4 z-30 pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="bg-zinc-900/90 backdrop-blur-xl border border-pink-500/40 px-3.5 py-1.5 rounded-2xl shadow-2xl flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
                        <span className="text-xs font-bold text-zinc-200">
                            Foco exclusivo: <strong className="text-pink-400">
                                {selectedNode.type === 'serie' ? selectedNode.name : (selectedNode.type === 'figure' ? selectedNode.serieName : selectedNode.name)}
                            </strong>
                            <span className="text-zinc-500 text-[10px] ml-1.5 font-normal hidden sm:inline">
                                (demais figuras ocultas para navegação limpa)
                            </span>
                        </span>
                        <button
                            type="button"
                            onClick={() => setSelectedNode(null)}
                            className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white px-2 py-0.5 rounded-lg transition-colors font-bold flex items-center gap-1.5 cursor-pointer border border-zinc-700"
                            title="Limpar foco e voltar a exibir todas as figuras da galáxia (Atalho: ESC)"
                        >
                            <X size={10} /> Ver todas
                            <kbd className="px-1 py-0.2 bg-zinc-900 border border-zinc-700 text-[9px] rounded font-mono text-zinc-400">ESC</kbd>
                        </button>
                    </div>
                </div>
            )}

            {/* Canvas Principal */}
            <div ref={containerRef} className="w-full h-full relative cursor-grab active:cursor-grabbing">
                {loading && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-md gap-3">
                        <Loader2 size={32} className="animate-spin text-orange-500" />
                        <p className="text-xs font-bold text-zinc-300 uppercase tracking-widest">
                            Mapeando micro-órbitas de todas as categorias...
                        </p>
                    </div>
                )}
                <canvas
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onClick={handleClick}
                    className="w-full h-full block"
                />
            </div>

            {/* Controles Flutuantes da Física e Câmera */}
            <div className="absolute left-4 bottom-4 z-30 flex flex-col gap-2">
                <div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-1.5 flex flex-col gap-1 shadow-2xl">
                    <button
                        onClick={toggleSimulation}
                        title={isRunning ? 'Pausar Física' : 'Retomar Física'}
                        className="p-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                        {isRunning ? <Pause size={16} /> : <Play size={16} className="text-orange-400" />}
                    </button>
                    <button
                        onClick={() => handleZoom(1.25)}
                        title="Aproximar (Zoom In)"
                        className="p-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                        <ZoomIn size={16} />
                    </button>
                    <button
                        onClick={() => handleZoom(0.8)}
                        title="Afastar (Zoom Out)"
                        className="p-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                        <ZoomOut size={16} />
                    </button>
                    <button
                        onClick={handleResetView}
                        title="Resetar Câmera"
                        className="p-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                        <RotateCcw size={16} />
                    </button>
                    <button
                        onClick={() => setShowHelp(!showHelp)}
                        title="Guia das Micro-Órbitas"
                        className="p-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                        <HelpCircle size={16} />
                    </button>
                </div>
            </div>

            {/* Modal de Ajuda */}
            {showHelp && (
                <div className="absolute left-16 bottom-4 z-40 bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-2xl p-4 shadow-2xl max-w-sm text-xs space-y-2.5">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                        <span className="font-black text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                            <Compass size={14} className="text-orange-400" />
                            Guia do Universo Franga Toys
                        </span>
                        <button onClick={() => setShowHelp(false)} className="text-zinc-500 hover:text-white">
                            <X size={12} />
                        </button>
                    </div>
                    <div className="space-y-1.5 text-zinc-300 text-[11px]">
                        <p><strong>• Franga Toys</strong>: Núcleo central que alimenta todo o acervo.</p>
                        <p><strong>• Categorias</strong>: 5 grandes universos temáticos.</p>
                        <p><strong>• Estúdios</strong>: 16 estúdios parceiros modeladores 3D.</p>
                        <p><strong>• Franquias</strong>: 228 séries e universos colecionáveis.</p>
                        <p><strong>• Figuras</strong>: Mais de 1.300 modelos colecionáveis detalhados.</p>
                    </div>
                    <div className="pt-2 border-t border-zinc-800 text-[10px] text-zinc-500">
                        Clique em qualquer figura ou série para ver feixes de luz conectando modelos, estúdios e franquias!
                    </div>
                </div>
            )}

            {/* Minimapa */}
            <div className="absolute right-4 bottom-4 z-30 flex flex-col items-end gap-2 pointer-events-none">
                <div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-2 shadow-2xl pointer-events-auto">
                    <div className="flex items-center justify-between px-1 pb-1 mb-1 border-b border-zinc-800/60">
                        <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                            <Layers size={10} className="text-orange-400" />
                            Minimap
                        </span>
                        <span className="text-[9px] font-mono text-zinc-500">{Math.round(transform.k * 100)}%</span>
                    </div>
                    <canvas
                        ref={minimapRef}
                        width={140}
                        height={100}
                        className="rounded-xl block bg-zinc-950/80"
                    />
                </div>
            </div>

            {/* Drawer Lateral com Detalhes da Categoria, Estúdio, Franquia ou Figura */}
            {selectedNode && selectedNode.type !== 'root' && (
                <div className="absolute right-4 top-20 bottom-36 z-40 w-80 max-w-[calc(100vw-2rem)] bg-zinc-900/95 backdrop-blur-2xl border border-zinc-800 rounded-3xl p-5 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span 
                                className="text-[9px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider border"
                                style={{
                                    backgroundColor: `${selectedNode.color}20`,
                                    color: selectedNode.color,
                                    borderColor: `${selectedNode.color}40`
                                }}
                            >
                                {selectedNode.type === 'category' 
                                    ? 'Categoria' 
                                    : (selectedNode.type === 'studio' 
                                    ? 'Estúdio' 
                                    : (selectedNode.type === 'figure'
                                    ? (selectedNode.categoryName || 'Figura')
                                    : (selectedNode.categoryName || 'Franquia')))}
                            </span>
                            <button
                                onClick={() => setSelectedNode(null)}
                                className="w-7 h-7 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        <div>
                            <h3 className="text-base font-black text-white leading-tight mb-1">
                                {selectedNode.name}
                            </h3>
                            <div className="text-xs text-zinc-400 space-y-0.5">
                                {selectedNode.type === 'figure' ? (
                                    <>
                                        <p>Franquia: <strong className="text-white">{selectedNode.serieName || selectedNode.categoryName || 'Colecionável'}</strong></p>
                                        {selectedNode.studioName && (
                                            <p className="flex items-center gap-1.5">
                                                <span>Estúdio Modelador:</span>
                                                <button
                                                    type="button"
                                                    onClick={() => selectedNode.studioId && handleSelectAndFocusNode(selectedNode.studioId)}
                                                    className="font-bold text-sky-400 hover:text-sky-300 underline underline-offset-2 transition-colors cursor-pointer"
                                                    title="Ver detalhes do estúdio"
                                                >
                                                    {selectedNode.studioName}
                                                </button>
                                            </p>
                                        )}
                                    </>
                                ) : (
                                    <p>Total de peças no acervo: <strong className="text-white">{selectedNode.itemCount || 0} modelos</strong></p>
                                )}
                            </div>
                        </div>

                        {selectedNode.type === 'figure' && selectedNode.imageUrl && (
                            <div className="relative w-full h-[340px] rounded-2xl overflow-hidden border border-zinc-800/80 bg-zinc-950 flex items-center justify-center shadow-lg">
                                <img 
                                    src={selectedNode.imageUrl} 
                                    alt={selectedNode.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                    }}
                                />
                            </div>
                        )}

                        {selectedNode.type === 'serie' && linkedStudiosForSelected.length > 0 && (
                            <div className="p-3.5 bg-sky-950/20 border border-sky-800/40 rounded-2xl space-y-2">
                                <p className="text-[10px] font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Palette size={12} className="text-sky-400" />
                                    Estúdios que Modelam Esta Franquia
                                </p>
                                <div className="flex flex-wrap gap-1.5 pt-0.5">
                                    {linkedStudiosForSelected.map(st => (
                                        <button 
                                            key={st.id} 
                                            type="button"
                                            onClick={() => handleSelectAndFocusNode(st.id)}
                                            className="text-[10px] font-bold bg-sky-950/80 hover:bg-sky-900 border border-sky-500/40 hover:border-sky-400 text-sky-200 hover:text-white px-2.5 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                                            title={`Navegar até o estúdio ${st.name}`}
                                        >
                                            {st.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {selectedNode.type === 'studio' && linkedSeriesForSelectedStudio.length > 0 && (
                            <div className="p-3.5 bg-zinc-800/40 border border-zinc-800 rounded-2xl space-y-2">
                                <p className="text-[10px] font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Palette size={12} className="text-sky-400" />
                                    Franquias Modeladas por este Estúdio ({linkedSeriesForSelectedStudio.length})
                                </p>
                                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1 pt-0.5">
                                    {linkedSeriesForSelectedStudio.map(ser => (
                                        <button 
                                            key={ser.id} 
                                            type="button"
                                            onClick={() => handleSelectAndFocusNode(ser.id)}
                                            className="text-[10px] font-bold bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-300 hover:text-white px-2.5 py-1 rounded-xl transition-all cursor-pointer"
                                            title={`Navegar até a franquia ${ser.name}`}
                                        >
                                            {ser.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t border-zinc-800/80 space-y-2">
                        <Link
                            href={
                                selectedNode.type === 'category' 
                                    ? `/?categoria=${encodeURIComponent(selectedNode.name)}` 
                                    : (selectedNode.type === 'studio' 
                                    ? `/parceiros` 
                                    : `/?q=${encodeURIComponent(selectedNode.name)}`)
                            }
                            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs uppercase tracking-wider py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
                        >
                            <ExternalLink size={14} />
                            {selectedNode.type === 'category' ? 'Ver Peças da Categoria' : (selectedNode.type === 'studio' ? 'Ver Estúdio na Loja' : (selectedNode.type === 'figure' ? 'Ver Figura na Loja' : `Ver Peças de ${selectedNode.name}`))}
                        </Link>
                        <button
                            onClick={() => setSelectedNode(null)}
                            className="w-full bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-white font-bold text-[11px] py-2 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                            title="Fechar gaveta e desmarcar seleção (ESC)"
                        >
                            <span>Fechar</span>
                            <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-700 text-[9px] rounded font-mono text-zinc-400">ESC</kbd>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
