import React, { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { Search, Mic2, Disc, Music, Sun, Moon, Sunset, Coffee } from 'lucide-react';

interface GridItem {
    id: string;
    name: string;
    subName?: string;
    image: string;
    trendScore: number;
    recentPlays: number;
    type: 'artist' | 'album' | 'song';
    tracks?: any[];
}

interface GridViewProps {
    items: GridItem[];
    plays: any[];
    onItemClick?: (item: GridItem) => void;
}

type TypeFilter = 'all' | 'artist' | 'album' | 'song';
type TimeFilter = 'all' | 'morning' | 'afternoon' | 'evening' | 'night';

// Compute similarity between two items based on listening patterns
function computeSimilarity(a: GridItem, b: GridItem, plays: any[]): number {
    let score = 0;

    const aArtist = a.type === 'artist' ? a.name : (a.subName || '');
    const bArtist = b.type === 'artist' ? b.name : (b.subName || '');
    if (aArtist && bArtist && aArtist === bArtist) score += 0.3;

    const aPlays = plays.filter(p => {
        if (a.type === 'artist') return p.artist_name === a.name;
        return p.album_name === a.name && p.artist_name === a.subName;
    });
    const bPlays = plays.filter(p => {
        if (b.type === 'artist') return p.artist_name === b.name;
        return p.album_name === b.name && p.artist_name === b.subName;
    });

    if (aPlays.length > 0 && bPlays.length > 0) {
        const aHours = new Float32Array(24);
        const bHours = new Float32Array(24);
        aPlays.forEach(p => { const h = new Date(p.played_at).getHours(); aHours[h]++; });
        bPlays.forEach(p => { const h = new Date(p.played_at).getHours(); bHours[h]++; });

        let dot = 0, magA = 0, magB = 0;
        for (let i = 0; i < 24; i++) {
            dot += aHours[i] * bHours[i];
            magA += aHours[i] * aHours[i];
            magB += bHours[i] * bHours[i];
        }
        const cosSim = (magA > 0 && magB > 0) ? dot / (Math.sqrt(magA) * Math.sqrt(magB)) : 0;
        score += cosSim * 0.2;

        const aDays = new Float32Array(7);
        const bDays = new Float32Array(7);
        aPlays.forEach(p => { const d = new Date(p.played_at).getDay(); aDays[d]++; });
        bPlays.forEach(p => { const d = new Date(p.played_at).getDay(); bDays[d]++; });

        let dotD = 0, magAD = 0, magBD = 0;
        for (let i = 0; i < 7; i++) {
            dotD += aDays[i] * bDays[i];
            magAD += aDays[i] * aDays[i];
            magBD += bDays[i] * bDays[i];
        }
        const cosSimD = (magAD > 0 && magBD > 0) ? dotD / (Math.sqrt(magAD) * Math.sqrt(magBD)) : 0;
        score += cosSimD * 0.15;

        const maxPlays = Math.max(aPlays.length, bPlays.length);
        const minPlays = Math.min(aPlays.length, bPlays.length);
        if (maxPlays > 0) score += (minPlays / maxPlays) * 0.1;

        const aAvgDur = aPlays.reduce((s, p) => s + (p.duration_ms || 180000), 0) / aPlays.length;
        const bAvgDur = bPlays.reduce((s, p) => s + (p.duration_ms || 180000), 0) / bPlays.length;
        const durDiff = Math.abs(aAvgDur - bAvgDur) / Math.max(aAvgDur, bAvgDur, 1);
        score += (1 - durDiff) * 0.05;

        const sessionGap = 30 * 60 * 1000;
        const aTimestamps = aPlays.map(p => new Date(p.played_at).getTime()).sort((x, y) => x - y);
        const bTimestamps = bPlays.map(p => new Date(p.played_at).getTime()).sort((x, y) => x - y);
        let coListenCount = 0;
        let bi = 0;
        for (let ai = 0; ai < aTimestamps.length; ai++) {
            while (bi < bTimestamps.length && bTimestamps[bi] < aTimestamps[ai] - sessionGap) bi++;
            let bj = bi;
            while (bj < bTimestamps.length && bTimestamps[bj] <= aTimestamps[ai] + sessionGap) {
                coListenCount++;
                bj++;
            }
        }
        const maxCoListen = Math.min(aTimestamps.length, bTimestamps.length);
        if (maxCoListen > 0) {
            score += Math.min(0.2, (coListenCount / maxCoListen) * 0.2);
        }
    }

    return Math.min(1, score);
}

// Get detailed similarity breakdown for tooltip
function getSimilarityDetails(a: GridItem, b: GridItem, plays: any[]): { peakHour: string; dayPattern: string; coSessions: number } {
    const aPlays = plays.filter(p => {
        if (a.type === 'artist') return p.artist_name === a.name;
        return p.album_name === a.name && p.artist_name === a.subName;
    });
    const bPlays = plays.filter(p => {
        if (b.type === 'artist') return p.artist_name === b.name;
        return p.album_name === b.name && p.artist_name === b.subName;
    });

    const aHours = new Float32Array(24);
    const bHours = new Float32Array(24);
    aPlays.forEach(p => { const h = new Date(p.played_at).getHours(); aHours[h]++; });
    bPlays.forEach(p => { const h = new Date(p.played_at).getHours(); bHours[h]++; });
    
    let maxOverlap = 0;
    let peakHourIdx = 0;
    for (let i = 0; i < 24; i++) {
        const overlap = Math.min(aHours[i], bHours[i]);
        if (overlap > maxOverlap) {
            maxOverlap = overlap;
            peakHourIdx = i;
        }
    }
    
    const formatHour = (h: number) => {
        if (h === 0) return '12 AM';
        if (h < 12) return `${h} AM`;
        if (h === 12) return '12 PM';
        return `${h - 12} PM`;
    };

    const aDays = new Float32Array(7);
    const bDays = new Float32Array(7);
    aPlays.forEach(p => { const d = new Date(p.played_at).getDay(); aDays[d]++; });
    bPlays.forEach(p => { const d = new Date(p.played_at).getDay(); bDays[d]++; });
    
    let maxDayOverlap = 0;
    let peakDayIdx = 0;
    for (let i = 0; i < 7; i++) {
        const overlap = Math.min(aDays[i], bDays[i]);
        if (overlap > maxDayOverlap) {
            maxDayOverlap = overlap;
            peakDayIdx = i;
        }
    }
    
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const sessionGap = 30 * 60 * 1000;
    const aTs = aPlays.map(p => new Date(p.played_at).getTime()).sort((x, y) => x - y);
    const bTs = bPlays.map(p => new Date(p.played_at).getTime()).sort((x, y) => x - y);
    let coSessions = 0;
    let bi = 0;
    for (let ai = 0; ai < aTs.length; ai++) {
        while (bi < bTs.length && bTs[bi] < aTs[ai] - sessionGap) bi++;
        if (bi < bTs.length && bTs[bi] <= aTs[ai] + sessionGap) coSessions++;
    }
    
    return {
        peakHour: maxOverlap > 0 ? formatHour(peakHourIdx) : 'Various',
        dayPattern: maxDayOverlap > 0 ? days[peakDayIdx] : 'All days',
        coSessions
    };
}

// Determine time-of-day category for a play
function getTimeOfDay(playedAt: string): TimeFilter {
    const h = new Date(playedAt).getHours();
    if (h >= 5 && h < 12) return 'morning';
    if (h >= 12 && h < 17) return 'afternoon';
    if (h >= 17 && h < 21) return 'evening';
    return 'night';
}

// 2D force-directed layout — expanded to use full space
function compute2DPositions(items: GridItem[], similarities: number[][], width: number, height: number, nodeSizes: number[]): { x: number; y: number }[] {
    const n = items.length;
    if (n === 0) return [];

    const padding = 30;

    // Initialize positions spread widely across the canvas
    const positions: { x: number; y: number }[] = [];
    const cx = width / 2;
    const cy = height / 2;
    const spreadX = (width - padding * 2) * 0.45;
    const spreadY = (height - padding * 2) * 0.45;

    for (let i = 0; i < n; i++) {
        const angle = (i / n) * Math.PI * 2;
        const jitter = 0.7 + Math.random() * 0.6;
        positions.push({
            x: cx + Math.cos(angle) * spreadX * jitter,
            y: cy + Math.sin(angle) * spreadY * jitter
        });
    }

    // Force-directed refinement with strong repulsion
    const iterations = 150;
    const repulsion = 80000;
    const attraction = 0.003;
    const minDist = 180;
    const centerGravity = 0.002;

    for (let iter = 0; iter < iterations; iter++) {
        const forces: { x: number; y: number }[] = positions.map(() => ({ x: 0, y: 0 }));
        const cooling = 1 - (iter / iterations) * 0.8;

        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const dx = positions[i].x - positions[j].x;
                const dy = positions[i].y - positions[j].y;
                const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
                const nx = dx / dist;
                const ny = dy / dist;

                // Repulsion — strong push to spread nodes
                const repForce = repulsion / (dist * dist);
                forces[i].x += nx * repForce;
                forces[i].y += ny * repForce;
                forces[j].x -= nx * repForce;
                forces[j].y -= ny * repForce;

                // Minimum distance enforcement
                if (dist < minDist) {
                    const pushForce = (minDist - dist) * 0.5;
                    forces[i].x += nx * pushForce;
                    forces[i].y += ny * pushForce;
                    forces[j].x -= nx * pushForce;
                    forces[j].y -= ny * pushForce;
                }

                // Attraction based on similarity
                const sim = similarities[i]?.[j] || 0;
                if (sim > 0.15) {
                    const idealDist = Math.max(minDist, (1 - sim) * Math.min(width, height) * 0.4);
                    const attForce = (dist - idealDist) * attraction * sim;
                    forces[i].x -= nx * attForce;
                    forces[i].y -= ny * attForce;
                    forces[j].x += nx * attForce;
                    forces[j].y += ny * attForce;
                }
            }

            // Weak center gravity — allow natural drift
            const dxC = cx - positions[i].x;
            const dyC = cy - positions[i].y;
            forces[i].x += dxC * centerGravity;
            forces[i].y += dyC * centerGravity;
        }

        for (let i = 0; i < n; i++) {
            const maxForce = 12 * cooling;
            const fx = Math.max(-maxForce, Math.min(maxForce, forces[i].x * cooling));
            const fy = Math.max(-maxForce, Math.min(maxForce, forces[i].y * cooling));
            const halfNode = (nodeSizes[i] || 48) / 2;
            positions[i].x = Math.max(padding + halfNode, Math.min(width - padding - halfNode, positions[i].x + fx));
            positions[i].y = Math.max(padding + halfNode, Math.min(height - padding - halfNode, positions[i].y + fy));
        }
    }

    return positions;
}

export const GridView: React.FC<GridViewProps> = ({ items, plays, onItemClick }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const minimapRef = useRef<HTMLCanvasElement>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEdge, setSelectedEdge] = useState<{ i: number; j: number; sim: number } | null>(null);
    const [hoveredNode, setHoveredNode] = useState<number>(-1);
    const [hoveredEdge, setHoveredEdge] = useState<number>(-1);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
    const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

    // Filters
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');

    // Pan and zoom state
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const isPanning = useRef(false);
    const lastPanPos = useRef({ x: 0, y: 0 });

    // Filter items by type
    const filteredItems = useMemo(() => {
        let result = items;
        if (typeFilter !== 'all') {
            result = result.filter(item => item.type === typeFilter);
        }
        if (timeFilter !== 'all') {
            const itemsWithTimePlays = result.filter(item => {
                const itemPlays = plays.filter(p => {
                    if (item.type === 'artist') return p.artist_name === item.name;
                    return p.album_name === item.name && p.artist_name === item.subName;
                });
                return itemPlays.some(p => getTimeOfDay(p.played_at) === timeFilter);
            });
            if (itemsWithTimePlays.length > 0) result = itemsWithTimePlays;
        }
        return result;
    }, [items, plays, typeFilter, timeFilter]);

    // Progressive disclosure — node size based on play frequency
    const nodeSizes = useMemo(() => {
        if (filteredItems.length === 0) return [];
        const maxPlays = Math.max(...filteredItems.map(i => i.recentPlays), 1);
        return filteredItems.map(item => {
            const ratio = item.recentPlays / maxPlays;
            return Math.round(32 + ratio * 28); // 32px to 60px
        });
    }, [filteredItems]);

    const similarities = useMemo(() => {
        const n = filteredItems.length;
        const sims: number[][] = [];
        for (let i = 0; i < n; i++) {
            sims[i] = [];
            for (let j = 0; j < n; j++) {
                sims[i][j] = i === j ? 1 : computeSimilarity(filteredItems[i], filteredItems[j], plays);
            }
        }
        return sims;
    }, [filteredItems, plays]);

    const edges = useMemo(() => {
        const n = filteredItems.length;
        const result: { i: number; j: number; sim: number }[] = [];
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const sim = similarities[i]?.[j] || 0;
                if (sim > 0.25) {
                    result.push({ i, j, sim });
                }
            }
        }
        return result;
    }, [filteredItems, similarities]);

    const positions = useMemo(() => 
        compute2DPositions(filteredItems, similarities, containerSize.width, containerSize.height, nodeSizes),
    [filteredItems, similarities, containerSize, nodeSizes]);

    // Hover neighbor connections
    const hoverConnections = useMemo(() => {
        if (hoveredNode < 0) return { nodes: new Set<number>(), edges: new Set<number>() };
        const connNodes = new Set<number>([hoveredNode]);
        const connEdges = new Set<number>();
        edges.forEach((edge, idx) => {
            if (edge.i === hoveredNode || edge.j === hoveredNode) {
                connNodes.add(edge.i);
                connNodes.add(edge.j);
                connEdges.add(idx);
            }
        });
        return { nodes: connNodes, edges: connEdges };
    }, [hoveredNode, edges]);

    // Items matching search
    const searchMatches = useMemo(() => {
        if (!searchQuery.trim()) return new Set<number>();
        const q = searchQuery.toLowerCase();
        const matches = new Set<number>();
        filteredItems.forEach((item, i) => {
            if (item.name.toLowerCase().includes(q) || (item.subName && item.subName.toLowerCase().includes(q))) {
                matches.add(i);
            }
        });
        return matches;
    }, [filteredItems, searchQuery]);

    // Connected nodes/edges for search highlights
    const searchConnections = useMemo(() => {
        if (searchMatches.size === 0) return { nodes: new Set<number>(), edges: new Set<number>() };
        const connNodes = new Set<number>(searchMatches);
        const connEdges = new Set<number>();
        edges.forEach((edge, idx) => {
            if (searchMatches.has(edge.i) || searchMatches.has(edge.j)) {
                connNodes.add(edge.i);
                connNodes.add(edge.j);
                connEdges.add(idx);
            }
        });
        return { nodes: connNodes, edges: connEdges };
    }, [searchMatches, edges]);

    // Selected edge path highlight
    const selectedPath = useMemo(() => {
        if (!selectedEdge) return { nodes: new Set<number>(), edges: new Set<number>() };
        const nodes = new Set<number>([selectedEdge.i, selectedEdge.j]);
        const edgeSet = new Set<number>();
        edges.forEach((edge, idx) => {
            if (edge.i === selectedEdge.i && edge.j === selectedEdge.j) {
                edgeSet.add(idx);
            }
        });
        return { nodes, edges: edgeSet };
    }, [selectedEdge, edges]);

    // Load images
    useEffect(() => {
        filteredItems.forEach(item => {
            if (item.image && !imageCache.current.has(item.image)) {
                const isPlaceholder = (() => {
                    try { return new URL(item.image, 'https://placeholder.local').hostname === 'ui-avatars.com'; } 
                    catch { return false; }
                })();
                if (!isPlaceholder) {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => {
                        imageCache.current.set(item.image, img);
                        drawCanvas();
                    };
                    img.src = item.image;
                }
            }
        });
    }, [filteredItems]);

    // Observe container size
    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver(entries => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                if (width > 0 && height > 0) {
                    setContainerSize({ width, height });
                }
            }
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // Transform screen coords to canvas coords (accounting for pan/zoom)
    const screenToCanvas = useCallback((sx: number, sy: number) => {
        return {
            x: (sx - pan.x) / zoom,
            y: (sy - pan.y) / zoom
        };
    }, [pan, zoom]);

    const drawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || positions.length === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = containerSize.width * dpr;
        canvas.height = containerSize.height * dpr;
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, containerSize.width, containerSize.height);

        // Apply pan and zoom
        ctx.save();
        ctx.translate(pan.x, pan.y);
        ctx.scale(zoom, zoom);

        const hasSearch = searchQuery.trim().length > 0;
        const hasSelection = selectedEdge !== null;
        const hasHover = hoveredNode >= 0;

        // Draw edges
        edges.forEach((edge, idx) => {
            const from = positions[edge.i];
            const to = positions[edge.j];
            if (!from || !to) return;

            const isSearchHighlighted = hasSearch && searchConnections.edges.has(idx);
            const isSelectedPath = hasSelection && selectedPath.edges.has(idx);
            const isHoveredEdge = hoveredEdge === idx;
            const isHoverNeighbor = hasHover && hoverConnections.edges.has(idx);

            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);

            if (isSelectedPath || isHoveredEdge || isSearchHighlighted) {
                ctx.strokeStyle = '#FA2D48';
                ctx.lineWidth = isSelectedPath || isHoveredEdge ? 2.5 : 1.5;
                ctx.globalAlpha = isSelectedPath || isHoveredEdge ? 1 : 0.8;
            } else if (isHoverNeighbor) {
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.5;
                ctx.globalAlpha = 0.5;
            } else if (hasSearch || hasSelection || hasHover) {
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                ctx.globalAlpha = 0.05;
            } else {
                // Default: thin semi-transparent white lines
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                ctx.globalAlpha = 0.2;
            }

            ctx.stroke();
            ctx.globalAlpha = 1;
        });

        // Draw nodes
        filteredItems.forEach((item, i) => {
            const pos = positions[i];
            if (!pos) return;

            const nodeSize = nodeSizes[i] || 48;
            const isSearchMatch = hasSearch && searchMatches.has(i);
            const isSearchConnected = hasSearch && searchConnections.nodes.has(i);
            const isSelectedNode = hasSelection && selectedPath.nodes.has(i);
            const isHovered = hoveredNode === i;
            const isHoverNeighbor = hasHover && hoverConnections.nodes.has(i);
            const halfSize = nodeSize / 2;

            // Determine opacity
            let alpha = 1;
            if (hasSearch && !isSearchMatch && !isSearchConnected) alpha = 0.15;
            if (hasSelection && !isSelectedNode) alpha = 0.2;
            if (hasHover && !isHovered && !isHoverNeighbor) alpha = 0.25;
            
            ctx.globalAlpha = alpha;

            // Draw shadow for depth
            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            ctx.fillStyle = '#1C1C1E';
            ctx.fillRect(pos.x - halfSize, pos.y - halfSize, nodeSize, nodeSize);
            ctx.restore();
            ctx.globalAlpha = alpha;

            // Draw border/glow for highlighted nodes
            if (isSearchMatch || isSelectedNode || isHovered) {
                ctx.save();
                ctx.shadowColor = '#FA2D48';
                ctx.shadowBlur = 16;
                ctx.fillStyle = '#FA2D48';
                ctx.fillRect(pos.x - halfSize - 2, pos.y - halfSize - 2, nodeSize + 4, nodeSize + 4);
                ctx.restore();
                ctx.globalAlpha = alpha;
            } else if (isHoverNeighbor) {
                ctx.save();
                ctx.shadowColor = 'rgba(255,255,255,0.3)';
                ctx.shadowBlur = 10;
                ctx.fillStyle = 'rgba(255,255,255,0.15)';
                ctx.fillRect(pos.x - halfSize - 1, pos.y - halfSize - 1, nodeSize + 2, nodeSize + 2);
                ctx.restore();
                ctx.globalAlpha = alpha;
            }

            // Draw image or fallback
            const cachedImg = imageCache.current.get(item.image);
            if (cachedImg) {
                ctx.save();
                const r = 6;
                ctx.beginPath();
                ctx.moveTo(pos.x - halfSize + r, pos.y - halfSize);
                ctx.lineTo(pos.x + halfSize - r, pos.y - halfSize);
                ctx.quadraticCurveTo(pos.x + halfSize, pos.y - halfSize, pos.x + halfSize, pos.y - halfSize + r);
                ctx.lineTo(pos.x + halfSize, pos.y + halfSize - r);
                ctx.quadraticCurveTo(pos.x + halfSize, pos.y + halfSize, pos.x + halfSize - r, pos.y + halfSize);
                ctx.lineTo(pos.x - halfSize + r, pos.y + halfSize);
                ctx.quadraticCurveTo(pos.x - halfSize, pos.y + halfSize, pos.x - halfSize, pos.y + halfSize - r);
                ctx.lineTo(pos.x - halfSize, pos.y - halfSize + r);
                ctx.quadraticCurveTo(pos.x - halfSize, pos.y - halfSize, pos.x - halfSize + r, pos.y - halfSize);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(cachedImg, pos.x - halfSize, pos.y - halfSize, nodeSize, nodeSize);
                ctx.restore();
            } else {
                const hue = (i / filteredItems.length) * 360;
                ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
                ctx.fillRect(pos.x - halfSize, pos.y - halfSize, nodeSize, nodeSize);
            }

            // Border
            ctx.strokeStyle = isSearchMatch || isSelectedNode || isHovered ? '#FA2D48' : 'rgba(255,255,255,0.12)';
            ctx.lineWidth = isSearchMatch || isSelectedNode || isHovered ? 2 : 1;
            ctx.strokeRect(pos.x - halfSize, pos.y - halfSize, nodeSize, nodeSize);

            // Name label below node
            if (isHovered || isSearchMatch || isSelectedNode || isHoverNeighbor) {
                ctx.fillStyle = '#ffffff';
                ctx.font = `bold ${isHovered ? 12 : 10}px -apple-system, BlinkMacSystemFont, sans-serif`;
                ctx.textAlign = 'center';
                const label = item.name.length > 16 ? item.name.slice(0, 15) + '…' : item.name;
                
                // Label background
                const metrics = ctx.measureText(label);
                const lblW = metrics.width + 8;
                const lblH = 16;
                const lblY = pos.y + halfSize + 6;
                ctx.fillStyle = 'rgba(0,0,0,0.7)';
                ctx.fillRect(pos.x - lblW / 2, lblY - 2, lblW, lblH);
                ctx.fillStyle = '#ffffff';
                ctx.fillText(label, pos.x, lblY + 10);
            }

            ctx.globalAlpha = 1;
        });

        ctx.restore();

        // Draw minimap
        drawMinimap();
    }, [filteredItems, positions, edges, searchQuery, searchMatches, searchConnections, selectedEdge, selectedPath, hoveredNode, hoveredEdge, hoverConnections, containerSize, zoom, pan, nodeSizes]);

    // Minimap drawing
    const drawMinimap = useCallback(() => {
        const minimap = minimapRef.current;
        if (!minimap || positions.length === 0) return;

        const mW = 120;
        const mH = 90;
        const ctx = minimap.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        minimap.width = mW * dpr;
        minimap.height = mH * dpr;
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, mW, mH);

        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, mW, mH);

        const scaleX = mW / containerSize.width;
        const scaleY = mH / containerSize.height;

        // Draw edges on minimap
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 0.5;
        edges.forEach(edge => {
            const from = positions[edge.i];
            const to = positions[edge.j];
            if (!from || !to) return;
            ctx.beginPath();
            ctx.moveTo(from.x * scaleX, from.y * scaleY);
            ctx.lineTo(to.x * scaleX, to.y * scaleY);
            ctx.stroke();
        });

        // Draw nodes on minimap
        filteredItems.forEach((_, i) => {
            const pos = positions[i];
            if (!pos) return;
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.fillRect(pos.x * scaleX - 1.5, pos.y * scaleY - 1.5, 3, 3);
        });

        // Draw viewport rectangle
        const vpX = (-pan.x / zoom) * scaleX;
        const vpY = (-pan.y / zoom) * scaleY;
        const vpW = (containerSize.width / zoom) * scaleX;
        const vpH = (containerSize.height / zoom) * scaleY;
        ctx.strokeStyle = '#FA2D48';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(vpX, vpY, vpW, vpH);
    }, [positions, edges, filteredItems, containerSize, zoom, pan]);

    // Redraw on state changes
    useEffect(() => { drawCanvas(); }, [drawCanvas]);

    // Hit testing with pan/zoom transform
    const getNodeAt = useCallback((sx: number, sy: number): number => {
        const { x, y } = screenToCanvas(sx, sy);
        for (let i = filteredItems.length - 1; i >= 0; i--) {
            const pos = positions[i];
            if (!pos) continue;
            const halfSize = (nodeSizes[i] || 48) / 2;
            if (x >= pos.x - halfSize && x <= pos.x + halfSize && y >= pos.y - halfSize && y <= pos.y + halfSize) {
                return i;
            }
        }
        return -1;
    }, [filteredItems, positions, nodeSizes, screenToCanvas]);

    const getEdgeAt = useCallback((sx: number, sy: number): number => {
        const { x, y } = screenToCanvas(sx, sy);
        const threshold = 8 / zoom;
        for (let idx = 0; idx < edges.length; idx++) {
            const edge = edges[idx];
            const from = positions[edge.i];
            const to = positions[edge.j];
            if (!from || !to) continue;

            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const lenSq = dx * dx + dy * dy;
            if (lenSq === 0) continue;

            let t = ((x - from.x) * dx + (y - from.y) * dy) / lenSq;
            t = Math.max(0, Math.min(1, t));
            const px = from.x + t * dx;
            const py = from.y + t * dy;
            const dist = Math.sqrt((x - px) * (x - px) + (y - py) * (y - py));
            if (dist < threshold) return idx;
        }
        return -1;
    }, [edges, positions, zoom, screenToCanvas]);

    const handleCanvasMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Handle panning
        if (isPanning.current) {
            const dx = e.clientX - lastPanPos.current.x;
            const dy = e.clientY - lastPanPos.current.y;
            lastPanPos.current = { x: e.clientX, y: e.clientY };
            setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
            canvas.style.cursor = 'grabbing';
            return;
        }

        const rect = canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;

        const nodeIdx = getNodeAt(sx, sy);
        if (nodeIdx >= 0) {
            setHoveredNode(nodeIdx);
            setHoveredEdge(-1);
            setTooltipPos({ x: sx + 12, y: sy - 10 });
            canvas.style.cursor = 'pointer';
            return;
        }

        const edgeIdx = getEdgeAt(sx, sy);
        if (edgeIdx >= 0) {
            setHoveredNode(-1);
            setHoveredEdge(edgeIdx);
            setTooltipPos({ x: sx + 12, y: sy - 10 });
            canvas.style.cursor = 'pointer';
            return;
        }

        setHoveredNode(-1);
        setHoveredEdge(-1);
        canvas.style.cursor = 'grab';
    }, [getNodeAt, getEdgeAt]);

    const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;

        // Check if clicking a node or edge first
        if (getNodeAt(sx, sy) >= 0 || getEdgeAt(sx, sy) >= 0) return;

        // Start panning
        isPanning.current = true;
        lastPanPos.current = { x: e.clientX, y: e.clientY };
        canvas.style.cursor = 'grabbing';
    }, [getNodeAt, getEdgeAt]);

    const handleCanvasMouseUp = useCallback(() => {
        isPanning.current = false;
    }, []);

    const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        if (isPanning.current) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;

        const nodeIdx = getNodeAt(sx, sy);
        if (nodeIdx >= 0) {
            if (onItemClick) onItemClick(filteredItems[nodeIdx]);
            return;
        }

        const edgeIdx = getEdgeAt(sx, sy);
        if (edgeIdx >= 0) {
            const edge = edges[edgeIdx];
            setSelectedEdge(prev => 
                prev && prev.i === edge.i && prev.j === edge.j ? null : edge
            );
            return;
        }

        setSelectedEdge(null);
    }, [getNodeAt, getEdgeAt, filteredItems, edges, onItemClick]);

    // Mouse wheel zoom
    const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.3, Math.min(5, zoom * delta));

        // Zoom toward mouse position
        const newPanX = mx - (mx - pan.x) * (newZoom / zoom);
        const newPanY = my - (my - pan.y) * (newZoom / zoom);

        setZoom(newZoom);
        setPan({ x: newPanX, y: newPanY });
    }, [zoom, pan]);

    // Tooltip content
    const tooltipContent = useMemo(() => {
        if (hoveredNode >= 0 && hoveredNode < filteredItems.length) {
            const item = filteredItems[hoveredNode];
            return (
                <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{item.name}</div>
                    {item.subName && <div style={{ opacity: 0.6, fontSize: 11 }}>{item.subName}</div>}
                    <div style={{ opacity: 0.5, fontSize: 10, marginTop: 2 }}>{item.recentPlays} plays</div>
                </div>
            );
        }
        if (hoveredEdge >= 0 && hoveredEdge < edges.length) {
            const edge = edges[hoveredEdge];
            const itemA = filteredItems[edge.i];
            const itemB = filteredItems[edge.j];
            const simPct = Math.round(edge.sim * 100);
            const details = getSimilarityDetails(itemA, itemB, plays);
            return (
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FA2D48' }} />
                        <span style={{ fontWeight: 700, fontSize: 11, color: '#FA2D48' }}>Connection</span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{itemA.name}</div>
                    <div style={{ fontSize: 10, opacity: 0.4, margin: '2px 0' }}>↔</div>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{itemB.name}</div>
                    <div style={{ opacity: 0.5, fontSize: 10, marginTop: 4 }}>Similarity: {simPct}%</div>
                    <div style={{ fontSize: 9, opacity: 0.4, marginTop: 3, lineHeight: 1.4 }}>
                        📍 Peak: {details.peakHour}<br/>
                        📅 {details.dayPattern}
                        {details.coSessions > 0 && <><br/>🔗 {details.coSessions} co-sessions</>}
                    </div>
                </div>
            );
        }
        return null;
    }, [hoveredNode, hoveredEdge, filteredItems, edges, plays]);

    // Selected edge details panel
    const selectedEdgeDetails = useMemo(() => {
        if (!selectedEdge) return null;
        const itemA = filteredItems[selectedEdge.i];
        const itemB = filteredItems[selectedEdge.j];
        if (!itemA || !itemB) return null;
        const simPct = Math.round(selectedEdge.sim * 100);
        const details = getSimilarityDetails(itemA, itemB, plays);
        return { itemA, itemB, simPct, details };
    }, [selectedEdge, filteredItems, plays]);

    // Search autocomplete suggestions
    const searchSuggestions = useMemo(() => {
        if (!searchQuery.trim() || searchQuery.length < 2) return [];
        const q = searchQuery.toLowerCase();
        const suggestions: { item: GridItem; index: number; connectionCount: number }[] = [];
        filteredItems.forEach((item, i) => {
            if (item.name.toLowerCase().includes(q) || (item.subName && item.subName.toLowerCase().includes(q))) {
                const connectionCount = edges.filter(e => e.i === i || e.j === i).length;
                suggestions.push({ item, index: i, connectionCount });
            }
        });
        return suggestions.sort((a, b) => b.connectionCount - a.connectionCount).slice(0, 6);
    }, [filteredItems, edges, searchQuery]);

    // Check which type filters have items
    const hasType = useMemo(() => ({
        artist: items.some(i => i.type === 'artist'),
        album: items.some(i => i.type === 'album'),
        song: items.some(i => i.type === 'song'),
    }), [items]);

    if (filteredItems.length === 0 && items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <p className="text-white/30 text-sm font-medium">No data available</p>
            </div>
        );
    }

    return (
        <div className="relative">
            {/* Search Bar + Filters */}
            <div className="relative mb-3 space-y-2">
                <div className="relative flex items-center bg-[#1C1C1E] border border-white/10 rounded-xl px-3 py-2">
                    <Search size={14} className="text-[#8E8E93] mr-2 flex-shrink-0" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setSelectedEdge(null); }}
                        placeholder="Search artists, albums, connections..."
                        className="flex-1 bg-transparent text-[13px] text-white focus:outline-none placeholder:text-[#666666]"
                    />
                    {searchQuery && (
                        <button 
                            onClick={() => setSearchQuery('')}
                            className="text-[#8E8E93] hover:text-white text-xs ml-2"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* Autocomplete suggestions */}
                {searchSuggestions.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#1C1C1E] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                        {searchSuggestions.map((s) => (
                            <button
                                key={s.item.id}
                                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors text-left"
                                onClick={() => {
                                    setSearchQuery(s.item.name);
                                }}
                            >
                                <div className="w-7 h-7 rounded overflow-hidden bg-white/10 flex-shrink-0">
                                    {s.item.image && <img src={s.item.image} className="w-full h-full object-cover" alt="" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[12px] font-medium text-white truncate">{s.item.name}</div>
                                    {s.item.subName && <div className="text-[10px] text-white/40 truncate">{s.item.subName}</div>}
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    <span className="text-[9px] text-white/30">{s.connectionCount} connections</span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Filter Pills */}
                <div className="flex flex-wrap gap-1.5">
                    {/* Type filters */}
                    {hasType.artist && (
                        <button
                            onClick={() => setTypeFilter(typeFilter === 'artist' ? 'all' : 'artist')}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all border ${
                                typeFilter === 'artist' 
                                    ? 'bg-[#FA2D48]/20 border-[#FA2D48]/50 text-[#FA2D48]' 
                                    : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80 hover:bg-white/10'
                            }`}
                        >
                            <Mic2 size={10} /> Artists
                        </button>
                    )}
                    {hasType.album && (
                        <button
                            onClick={() => setTypeFilter(typeFilter === 'album' ? 'all' : 'album')}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all border ${
                                typeFilter === 'album' 
                                    ? 'bg-[#FA2D48]/20 border-[#FA2D48]/50 text-[#FA2D48]' 
                                    : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80 hover:bg-white/10'
                            }`}
                        >
                            <Disc size={10} /> Albums
                        </button>
                    )}
                    {hasType.song && (
                        <button
                            onClick={() => setTypeFilter(typeFilter === 'song' ? 'all' : 'song')}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all border ${
                                typeFilter === 'song' 
                                    ? 'bg-[#FA2D48]/20 border-[#FA2D48]/50 text-[#FA2D48]' 
                                    : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80 hover:bg-white/10'
                            }`}
                        >
                            <Music size={10} /> Tracks
                        </button>
                    )}

                    <div className="w-px h-5 bg-white/10 self-center mx-0.5" />

                    {/* Time-of-day filters */}
                    <button
                        onClick={() => setTimeFilter(timeFilter === 'morning' ? 'all' : 'morning')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all border ${
                            timeFilter === 'morning' 
                                ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' 
                                : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80 hover:bg-white/10'
                        }`}
                    >
                        <Coffee size={10} /> Morning
                    </button>
                    <button
                        onClick={() => setTimeFilter(timeFilter === 'afternoon' ? 'all' : 'afternoon')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all border ${
                            timeFilter === 'afternoon' 
                                ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400' 
                                : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80 hover:bg-white/10'
                        }`}
                    >
                        <Sun size={10} /> Afternoon
                    </button>
                    <button
                        onClick={() => setTimeFilter(timeFilter === 'evening' ? 'all' : 'evening')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all border ${
                            timeFilter === 'evening' 
                                ? 'bg-orange-500/20 border-orange-500/50 text-orange-400' 
                                : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80 hover:bg-white/10'
                        }`}
                    >
                        <Sunset size={10} /> Evening
                    </button>
                    <button
                        onClick={() => setTimeFilter(timeFilter === 'night' ? 'all' : 'night')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all border ${
                            timeFilter === 'night' 
                                ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' 
                                : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80 hover:bg-white/10'
                        }`}
                    >
                        <Moon size={10} /> Night
                    </button>
                </div>

                {/* Active filters display */}
                {(typeFilter !== 'all' || timeFilter !== 'all') && (
                    <div className="flex items-center gap-2 text-[10px] text-white/40">
                        <span>Showing {filteredItems.length} of {items.length} items</span>
                        <button
                            onClick={() => { setTypeFilter('all'); setTimeFilter('all'); }}
                            className="text-[#FA2D48] hover:text-[#FF6B82] font-medium"
                        >
                            Clear filters
                        </button>
                    </div>
                )}
            </div>

            {/* Canvas Container — Full width, no square constraint */}
            <div 
                ref={containerRef}
                className="relative w-full overflow-hidden rounded-xl bg-black/30 border border-white/5"
                style={{ height: 'min(70vh, 700px)', minHeight: 400 }}
            >
                <canvas
                    ref={canvasRef}
                    width={containerSize.width}
                    height={containerSize.height}
                    style={{ width: '100%', height: '100%', cursor: 'grab' }}
                    onMouseMove={handleCanvasMove}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={() => { setHoveredNode(-1); setHoveredEdge(-1); isPanning.current = false; }}
                    onClick={handleCanvasClick}
                    onWheel={handleWheel}
                />

                {/* Minimap */}
                <div className="absolute bottom-3 right-3 rounded-lg overflow-hidden border border-white/10 shadow-lg" style={{ width: 120, height: 90 }}>
                    <canvas
                        ref={minimapRef}
                        width={120}
                        height={90}
                        style={{ width: 120, height: 90 }}
                    />
                </div>

                {/* Zoom controls */}
                <div className="absolute bottom-3 left-3 flex flex-col gap-1">
                    <button
                        onClick={() => setZoom(z => Math.min(5, z * 1.2))}
                        className="w-7 h-7 rounded-lg bg-black/60 border border-white/10 text-white/60 hover:text-white hover:bg-black/80 flex items-center justify-center text-sm font-bold transition-colors"
                    >
                        +
                    </button>
                    <button
                        onClick={() => setZoom(z => Math.max(0.3, z / 1.2))}
                        className="w-7 h-7 rounded-lg bg-black/60 border border-white/10 text-white/60 hover:text-white hover:bg-black/80 flex items-center justify-center text-sm font-bold transition-colors"
                    >
                        −
                    </button>
                    <button
                        onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                        className="w-7 h-7 rounded-lg bg-black/60 border border-white/10 text-white/60 hover:text-white hover:bg-black/80 flex items-center justify-center text-[9px] font-bold transition-colors"
                    >
                        1:1
                    </button>
                </div>

                {/* Tooltip */}
                {tooltipContent && (hoveredNode >= 0 || hoveredEdge >= 0) && (
                    <div 
                        className="absolute pointer-events-none z-50"
                        style={{ 
                            left: tooltipPos.x, 
                            top: tooltipPos.y,
                        }}
                    >
                        <div className="bg-[rgba(28,28,30,0.95)] backdrop-blur-lg border border-white/10 rounded-[10px] px-3 py-2 shadow-2xl text-white">
                            {tooltipContent}
                        </div>
                    </div>
                )}
            </div>

            {/* Selected Edge Details Panel */}
            {selectedEdgeDetails && (
                <div className="mt-3 bg-[#1C1C1E] border border-white/10 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#FA2D48]" />
                        <span className="text-[11px] font-bold text-[#FA2D48] uppercase tracking-wider">Connection Path</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex-1 text-center">
                            <div className="text-[13px] font-semibold text-white truncate">{selectedEdgeDetails.itemA.name}</div>
                            {selectedEdgeDetails.itemA.subName && <div className="text-[10px] text-white/40 truncate">{selectedEdgeDetails.itemA.subName}</div>}
                        </div>
                        <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                            <div className="text-[14px] font-bold text-[#FA2D48]">{selectedEdgeDetails.simPct}%</div>
                            <div className="text-[9px] text-white/40">similarity</div>
                        </div>
                        <div className="flex-1 text-center">
                            <div className="text-[13px] font-semibold text-white truncate">{selectedEdgeDetails.itemB.name}</div>
                            {selectedEdgeDetails.itemB.subName && <div className="text-[10px] text-white/40 truncate">{selectedEdgeDetails.itemB.subName}</div>}
                        </div>
                    </div>
                    <div className="flex gap-3 mt-2 text-[9px] text-white/40 justify-center">
                        <span>📍 {selectedEdgeDetails.details.peakHour}</span>
                        <span>📅 {selectedEdgeDetails.details.dayPattern}</span>
                        {selectedEdgeDetails.details.coSessions > 0 && <span>🔗 {selectedEdgeDetails.details.coSessions} co-sessions</span>}
                    </div>
                </div>
            )}
        </div>
    );
};
