import React, { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { Search } from 'lucide-react';

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

// 2D force-directed layout
function compute2DPositions(items: GridItem[], similarities: number[][], width: number, height: number): { x: number; y: number }[] {
    const n = items.length;
    if (n === 0) return [];

    const padding = 60;
    const w = width - padding * 2;
    const h = height - padding * 2;

    // Initialize positions in a circle
    const positions: { x: number; y: number }[] = [];
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(w, h) * 0.35;

    for (let i = 0; i < n; i++) {
        const angle = (i / n) * Math.PI * 2;
        positions.push({
            x: cx + Math.cos(angle) * radius,
            y: cy + Math.sin(angle) * radius
        });
    }

    // Force-directed refinement
    const iterations = 100;
    const repulsion = 5000;
    const attraction = 0.005;
    const idealDist = Math.min(w, h) / Math.sqrt(n);

    for (let iter = 0; iter < iterations; iter++) {
        const forces: { x: number; y: number }[] = positions.map(() => ({ x: 0, y: 0 }));
        const cooling = 1 - iter / iterations;

        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const dx = positions[i].x - positions[j].x;
                const dy = positions[i].y - positions[j].y;
                const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
                const nx = dx / dist;
                const ny = dy / dist;

                // Repulsion
                const repForce = repulsion / (dist * dist);
                forces[i].x += nx * repForce;
                forces[i].y += ny * repForce;
                forces[j].x -= nx * repForce;
                forces[j].y -= ny * repForce;

                // Attraction based on similarity
                const sim = similarities[i]?.[j] || 0;
                if (sim > 0.15) {
                    const target = idealDist * (1 - sim) * 1.5;
                    const attForce = (dist - target) * attraction * sim;
                    forces[i].x -= nx * attForce;
                    forces[i].y -= ny * attForce;
                    forces[j].x += nx * attForce;
                    forces[j].y += ny * attForce;
                }
            }
        }

        for (let i = 0; i < n; i++) {
            const maxForce = 8 * cooling;
            const fx = Math.max(-maxForce, Math.min(maxForce, forces[i].x * cooling));
            const fy = Math.max(-maxForce, Math.min(maxForce, forces[i].y * cooling));
            positions[i].x = Math.max(padding, Math.min(width - padding, positions[i].x + fx));
            positions[i].y = Math.max(padding, Math.min(height - padding, positions[i].y + fy));
        }
    }

    return positions;
}

export const GridView: React.FC<GridViewProps> = ({ items, plays, onItemClick }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEdge, setSelectedEdge] = useState<{ i: number; j: number; sim: number } | null>(null);
    const [hoveredNode, setHoveredNode] = useState<number>(-1);
    const [hoveredEdge, setHoveredEdge] = useState<number>(-1);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const [containerSize, setContainerSize] = useState({ width: 480, height: 480 });
    const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

    const similarities = useMemo(() => {
        const n = items.length;
        const sims: number[][] = [];
        for (let i = 0; i < n; i++) {
            sims[i] = [];
            for (let j = 0; j < n; j++) {
                sims[i][j] = i === j ? 1 : computeSimilarity(items[i], items[j], plays);
            }
        }
        return sims;
    }, [items, plays]);

    const edges = useMemo(() => {
        const n = items.length;
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
    }, [items, similarities]);

    const positions = useMemo(() => 
        compute2DPositions(items, similarities, containerSize.width, containerSize.height),
    [items, similarities, containerSize]);

    // Items matching search
    const searchMatches = useMemo(() => {
        if (!searchQuery.trim()) return new Set<number>();
        const q = searchQuery.toLowerCase();
        const matches = new Set<number>();
        items.forEach((item, i) => {
            if (item.name.toLowerCase().includes(q) || (item.subName && item.subName.toLowerCase().includes(q))) {
                matches.add(i);
            }
        });
        return matches;
    }, [items, searchQuery]);

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
        items.forEach(item => {
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
    }, [items]);

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

    const NODE_SIZE = 36;

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

        const hasSearch = searchQuery.trim().length > 0;
        const hasSelection = selectedEdge !== null;

        // Draw edges
        edges.forEach((edge, idx) => {
            const from = positions[edge.i];
            const to = positions[edge.j];
            if (!from || !to) return;

            const isSearchHighlighted = hasSearch && searchConnections.edges.has(idx);
            const isSelectedPath = hasSelection && selectedPath.edges.has(idx);
            const isHovered = hoveredEdge === idx;

            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);

            if (isSelectedPath || isHovered) {
                ctx.strokeStyle = '#FA2D48';
                ctx.lineWidth = 2.5;
                ctx.globalAlpha = 1;
            } else if (isSearchHighlighted) {
                ctx.strokeStyle = '#FA2D48';
                ctx.lineWidth = 1.5;
                ctx.globalAlpha = 0.8;
            } else if (hasSearch || hasSelection) {
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 0.5;
                ctx.globalAlpha = 0.05;
            } else {
                ctx.strokeStyle = '#FA2D48';
                ctx.lineWidth = 1;
                ctx.globalAlpha = Math.min(0.4, edge.sim * 0.5);
            }

            ctx.stroke();
            ctx.globalAlpha = 1;
        });

        // Draw nodes
        items.forEach((item, i) => {
            const pos = positions[i];
            if (!pos) return;

            const isSearchMatch = hasSearch && searchMatches.has(i);
            const isSearchConnected = hasSearch && searchConnections.nodes.has(i);
            const isSelectedNode = hasSelection && selectedPath.nodes.has(i);
            const isHovered = hoveredNode === i;
            const halfSize = NODE_SIZE / 2;

            // Determine opacity
            let alpha = 1;
            if (hasSearch && !isSearchMatch && !isSearchConnected) alpha = 0.15;
            if (hasSelection && !isSelectedNode) alpha = 0.2;
            
            ctx.globalAlpha = alpha;

            // Draw border/glow
            if (isSearchMatch || isSelectedNode || isHovered) {
                ctx.save();
                ctx.shadowColor = '#FA2D48';
                ctx.shadowBlur = 12;
                ctx.fillStyle = '#FA2D48';
                ctx.fillRect(pos.x - halfSize - 2, pos.y - halfSize - 2, NODE_SIZE + 4, NODE_SIZE + 4);
                ctx.restore();
            }

            // Draw image or fallback
            const cachedImg = imageCache.current.get(item.image);
            if (cachedImg) {
                ctx.save();
                // Rounded corners
                const r = 4;
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
                ctx.drawImage(cachedImg, pos.x - halfSize, pos.y - halfSize, NODE_SIZE, NODE_SIZE);
                ctx.restore();
            } else {
                // Fallback colored square
                const hue = (i / items.length) * 360;
                ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
                ctx.fillRect(pos.x - halfSize, pos.y - halfSize, NODE_SIZE, NODE_SIZE);
            }

            // Border
            ctx.strokeStyle = isSearchMatch || isSelectedNode || isHovered ? '#FA2D48' : 'rgba(255,255,255,0.15)';
            ctx.lineWidth = isSearchMatch || isSelectedNode || isHovered ? 2 : 1;
            ctx.strokeRect(pos.x - halfSize, pos.y - halfSize, NODE_SIZE, NODE_SIZE);

            // Name label below node
            if (isHovered || isSearchMatch || isSelectedNode) {
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(item.name.length > 14 ? item.name.slice(0, 13) + '…' : item.name, pos.x, pos.y + halfSize + 12);
            }

            ctx.globalAlpha = 1;
        });
    }, [items, positions, edges, searchQuery, searchMatches, searchConnections, selectedEdge, selectedPath, hoveredNode, hoveredEdge, containerSize]);

    // Redraw on state changes
    useEffect(() => { drawCanvas(); }, [drawCanvas]);

    // Hit testing
    const getNodeAt = useCallback((x: number, y: number): number => {
        const halfSize = NODE_SIZE / 2;
        for (let i = items.length - 1; i >= 0; i--) {
            const pos = positions[i];
            if (!pos) continue;
            if (x >= pos.x - halfSize && x <= pos.x + halfSize && y >= pos.y - halfSize && y <= pos.y + halfSize) {
                return i;
            }
        }
        return -1;
    }, [items, positions]);

    const getEdgeAt = useCallback((x: number, y: number): number => {
        const threshold = 8;
        for (let idx = 0; idx < edges.length; idx++) {
            const edge = edges[idx];
            const from = positions[edge.i];
            const to = positions[edge.j];
            if (!from || !to) continue;

            // Point-to-line-segment distance
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
    }, [edges, positions]);

    const handleCanvasMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const nodeIdx = getNodeAt(x, y);
        if (nodeIdx >= 0) {
            setHoveredNode(nodeIdx);
            setHoveredEdge(-1);
            setTooltipPos({ x: e.clientX - rect.left + 12, y: e.clientY - rect.top - 10 });
            canvas.style.cursor = 'pointer';
            return;
        }

        const edgeIdx = getEdgeAt(x, y);
        if (edgeIdx >= 0) {
            setHoveredNode(-1);
            setHoveredEdge(edgeIdx);
            setTooltipPos({ x: e.clientX - rect.left + 12, y: e.clientY - rect.top - 10 });
            canvas.style.cursor = 'pointer';
            return;
        }

        setHoveredNode(-1);
        setHoveredEdge(-1);
        canvas.style.cursor = 'default';
    }, [getNodeAt, getEdgeAt]);

    const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const nodeIdx = getNodeAt(x, y);
        if (nodeIdx >= 0) {
            if (onItemClick) onItemClick(items[nodeIdx]);
            return;
        }

        const edgeIdx = getEdgeAt(x, y);
        if (edgeIdx >= 0) {
            const edge = edges[edgeIdx];
            setSelectedEdge(prev => 
                prev && prev.i === edge.i && prev.j === edge.j ? null : edge
            );
            return;
        }

        setSelectedEdge(null);
    }, [getNodeAt, getEdgeAt, items, edges, onItemClick]);

    // Tooltip content
    const tooltipContent = useMemo(() => {
        if (hoveredNode >= 0 && hoveredNode < items.length) {
            const item = items[hoveredNode];
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
            const itemA = items[edge.i];
            const itemB = items[edge.j];
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
    }, [hoveredNode, hoveredEdge, items, edges, plays]);

    // Selected edge details panel
    const selectedEdgeDetails = useMemo(() => {
        if (!selectedEdge) return null;
        const itemA = items[selectedEdge.i];
        const itemB = items[selectedEdge.j];
        const simPct = Math.round(selectedEdge.sim * 100);
        const details = getSimilarityDetails(itemA, itemB, plays);
        return { itemA, itemB, simPct, details };
    }, [selectedEdge, items, plays]);

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <p className="text-white/30 text-sm font-medium">No data available</p>
            </div>
        );
    }

    return (
        <div className="relative">
            {/* Search Bar */}
            <div className="relative mb-3">
                <div className="relative flex items-center bg-[#1C1C1E] border border-white/10 rounded-xl px-3 py-2">
                    <Search size={14} className="text-[#8E8E93] mr-2 flex-shrink-0" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setSelectedEdge(null); }}
                        placeholder="Search connections..."
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
            </div>

            {/* Canvas Container */}
            <div 
                ref={containerRef}
                className="relative w-full aspect-square max-w-[520px] mx-auto overflow-hidden rounded-xl bg-black/30 border border-white/5"
                style={{ minHeight: 350 }}
            >
                <canvas
                    ref={canvasRef}
                    width={containerSize.width}
                    height={containerSize.height}
                    style={{ width: '100%', height: '100%' }}
                    onMouseMove={handleCanvasMove}
                    onClick={handleCanvasClick}
                    onMouseLeave={() => { setHoveredNode(-1); setHoveredEdge(-1); }}
                />

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
