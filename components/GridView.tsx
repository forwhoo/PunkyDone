import React, { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

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

// Trend score thresholds for glow color coding
const HIGH_TREND_THRESHOLD = 60;
const MEDIUM_TREND_THRESHOLD = 30;

// Compute similarity between two items based on listening patterns and graph theory
function computeSimilarity(a: GridItem, b: GridItem, plays: any[]): number {
    let score = 0;

    // 1. Shared artist bonus
    const aArtist = a.type === 'artist' ? a.name : (a.subName || '');
    const bArtist = b.type === 'artist' ? b.name : (b.subName || '');
    if (aArtist && bArtist && aArtist === bArtist) score += 0.3;

    // 2. Listening time pattern similarity (hour-of-day distribution)
    const aPlays = plays.filter(p => {
        if (a.type === 'artist') return p.artist_name === a.name;
        return p.album_name === a.name && p.artist_name === a.subName;
    });
    const bPlays = plays.filter(p => {
        if (b.type === 'artist') return p.artist_name === b.name;
        return p.album_name === b.name && p.artist_name === b.subName;
    });

    if (aPlays.length > 0 && bPlays.length > 0) {
        // Hour distribution similarity (cosine similarity)
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

        // Day-of-week distribution similarity
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

        // Play volume similarity (normalized)
        const maxPlays = Math.max(aPlays.length, bPlays.length);
        const minPlays = Math.min(aPlays.length, bPlays.length);
        if (maxPlays > 0) score += (minPlays / maxPlays) * 0.1;

        // Duration pattern similarity
        const aAvgDur = aPlays.reduce((s, p) => s + (p.duration_ms || 180000), 0) / aPlays.length;
        const bAvgDur = bPlays.reduce((s, p) => s + (p.duration_ms || 180000), 0) / bPlays.length;
        const durDiff = Math.abs(aAvgDur - bAvgDur) / Math.max(aAvgDur, bAvgDur, 1);
        score += (1 - durDiff) * 0.05;

        // 3. Co-listening session adjacency (graph theory: temporal edge weight)
        // Items played within 30 minutes of each other form a session edge
        const sessionGap = 30 * 60 * 1000; // 30 min = 1,800,000ms
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

    // Find peak hour overlap
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

    // Find day pattern
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

    // Count co-listening sessions (played within 30 min of each other)
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

// Position items in 3D space using force-directed layout
function computePositions(items: GridItem[], plays: any[]): THREE.Vector3[] {
    const n = items.length;
    if (n === 0) return [];

    // Compute similarity matrix
    const similarities: number[][] = [];
    for (let i = 0; i < n; i++) {
        similarities[i] = [];
        for (let j = 0; j < n; j++) {
            similarities[i][j] = i === j ? 1 : computeSimilarity(items[i], items[j], plays);
        }
    }

    // Initialize positions on a sphere surface
    const positions: THREE.Vector3[] = [];
    const spread = 15;
    for (let i = 0; i < n; i++) {
        const phi = Math.acos(-1 + (2 * i + 1) / n);
        const theta = Math.sqrt(n * Math.PI) * phi;
        positions.push(new THREE.Vector3(
            spread * Math.cos(theta) * Math.sin(phi),
            spread * Math.sin(theta) * Math.sin(phi),
            spread * Math.cos(phi)
        ));
    }

    // Simple force-directed refinement (a few iterations)
    const iterations = 80;
    const repulsion = 3.0;
    const attraction = 0.15;

    for (let iter = 0; iter < iterations; iter++) {
        const forces: THREE.Vector3[] = positions.map(() => new THREE.Vector3());
        const cooling = 1 - iter / iterations;

        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const diff = new THREE.Vector3().subVectors(positions[i], positions[j]);
                const dist = Math.max(diff.length(), 0.5);

                // Repulsion (all pairs)
                const repForce = diff.clone().normalize().multiplyScalar(repulsion / (dist * dist));
                forces[i].add(repForce);
                forces[j].sub(repForce);

                // Attraction (proportional to similarity)
                const sim = similarities[i][j];
                if (sim > 0.1) {
                    const idealDist = (1 - sim) * spread * 1.5;
                    const attForce = diff.clone().normalize().multiplyScalar(-attraction * (dist - idealDist) * sim);
                    forces[i].add(attForce);
                    forces[j].sub(attForce);
                }
            }
        }

        for (let i = 0; i < n; i++) {
            forces[i].multiplyScalar(cooling);
            forces[i].clampLength(0, 2);
            positions[i].add(forces[i]);
        }
    }

    return positions;
}

export const GridView: React.FC<GridViewProps> = ({ items, plays, onItemClick }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isRendering, setIsRendering] = useState(false);
    const sceneRef = useRef<{
        scene: THREE.Scene;
        camera: THREE.PerspectiveCamera;
        renderer: THREE.WebGLRenderer;
        controls: any;
        animationId: number;
        meshes: THREE.Mesh[];
        lines: THREE.Line[];
        lineEdges: { i: number; j: number; sim: number }[];
        tooltipDiv: HTMLDivElement | null;
        raycaster: THREE.Raycaster;
        mouse: THREE.Vector2;
        hoveredIndex: number;
        hoveredLineIndex: number;
    } | null>(null);

    const positions = useMemo(() => computePositions(items, plays), [items, plays]);

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

    const handleMouseMove = useCallback((e: MouseEvent) => {
        const ctx = sceneRef.current;
        if (!ctx || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        ctx.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        ctx.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        ctx.raycaster.setFromCamera(ctx.mouse, ctx.camera);
        const intersects = ctx.raycaster.intersectObjects(ctx.meshes);

        if (intersects.length > 0) {
            const idx = ctx.meshes.indexOf(intersects[0].object as THREE.Mesh);
            if (idx !== -1 && idx !== ctx.hoveredIndex) {
                ctx.hoveredIndex = idx;
                ctx.hoveredLineIndex = -1;
                const item = items[idx];
                if (ctx.tooltipDiv) {
                    ctx.tooltipDiv.style.display = 'block';
                    ctx.tooltipDiv.innerHTML = `<div style="font-weight:700;font-size:13px">${item.name}</div>${item.subName ? `<div style="opacity:0.6;font-size:11px">${item.subName}</div>` : ''}<div style="opacity:0.5;font-size:10px;margin-top:2px">${item.recentPlays} plays</div>`;
                }
            }
            if (ctx.tooltipDiv) {
                ctx.tooltipDiv.style.left = `${e.clientX - rect.left + 12}px`;
                ctx.tooltipDiv.style.top = `${e.clientY - rect.top - 10}px`;
            }
            containerRef.current.style.cursor = 'pointer';
        } else {
            // Check for line hover
            ctx.hoveredIndex = -1;
            const lineIntersects = ctx.raycaster.intersectObjects(ctx.lines, false);
            if (lineIntersects.length > 0) {
                const lineIdx = ctx.lines.indexOf(lineIntersects[0].object as THREE.Line);
                if (lineIdx !== -1 && lineIdx !== ctx.hoveredLineIndex) {
                    ctx.hoveredLineIndex = lineIdx;
                    const edge = ctx.lineEdges[lineIdx];
                    if (edge && ctx.tooltipDiv) {
                        const itemA = items[edge.i];
                        const itemB = items[edge.j];
                        const simPct = Math.round(edge.sim * 100);
                        const details = getSimilarityDetails(itemA, itemB, plays);
                        ctx.tooltipDiv.style.display = 'block';
                        ctx.tooltipDiv.innerHTML = `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><div style="width:6px;height:6px;border-radius:50%;background:#FA2D48"></div><span style="font-weight:700;font-size:11px;color:#FA2D48">Connection</span></div><div style="font-weight:600;font-size:12px">${itemA.name}</div><div style="font-size:10px;opacity:0.4;margin:2px 0">↔</div><div style="font-weight:600;font-size:12px">${itemB.name}</div><div style="opacity:0.5;font-size:10px;margin-top:4px">Similarity: ${simPct}%</div><div style="font-size:9px;opacity:0.4;margin-top:3px;line-height:1.4">📍 Peak: ${details.peakHour}<br/>📅 ${details.dayPattern}${details.coSessions > 0 ? `<br/>🔗 ${details.coSessions} co-sessions` : ''}</div>`;
                    }
                }
                if (ctx.tooltipDiv) {
                    ctx.tooltipDiv.style.left = `${e.clientX - rect.left + 12}px`;
                    ctx.tooltipDiv.style.top = `${e.clientY - rect.top - 10}px`;
                }
                containerRef.current.style.cursor = 'pointer';
            } else {
                ctx.hoveredLineIndex = -1;
                if (ctx.tooltipDiv) ctx.tooltipDiv.style.display = 'none';
                containerRef.current.style.cursor = 'grab';
            }
        }
    }, [items]);

    const handleClick = useCallback((e: MouseEvent) => {
        const ctx = sceneRef.current;
        if (!ctx || !onItemClick) return;

        if (ctx.hoveredIndex >= 0 && ctx.hoveredIndex < items.length) {
            onItemClick(items[ctx.hoveredIndex]);
        }
    }, [items, onItemClick]);

    useEffect(() => {
        if (!containerRef.current || items.length === 0 || positions.length === 0) return;

        // Start rendering with fade effect
        setIsRendering(true);

        const container = containerRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Scene setup
        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x000000, 0.008);

        const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 200);
        camera.position.set(0, 8, 28);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        // Fully transparent background so the site background shows through
        renderer.setClearColor(0x000000, 0);
        container.appendChild(renderer.domElement);

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.minDistance = 8;
        controls.maxDistance = 60;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.3;

        // Lighting - Bright and clear
        const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
        scene.add(ambientLight);
        const pointLight = new THREE.PointLight(0xfa2d48, 3.0, 80);
        pointLight.position.set(10, 15, 10);
        scene.add(pointLight);
        const pointLight2 = new THREE.PointLight(0x4488ff, 2.0, 60);
        pointLight2.position.set(-10, -5, -10);
        scene.add(pointLight2);
        const pointLight3 = new THREE.PointLight(0xffffff, 2.5, 90);
        pointLight3.position.set(0, 20, 15);
        scene.add(pointLight3);
        const pointLight4 = new THREE.PointLight(0xffffff, 1.5, 60);
        pointLight4.position.set(-5, -15, 20);
        scene.add(pointLight4);

        // Texture loader
        const textureLoader = new THREE.TextureLoader();
        textureLoader.crossOrigin = 'anonymous';

        // Create meshes for each item
        const meshes: THREE.Mesh[] = [];

        items.forEach((item, i) => {
            const pos = positions[i];
            const size = 0.6 + (item.trendScore / 100) * 0.8;

            // Sphere geometry
            const geometry = new THREE.SphereGeometry(size, 32, 32);

            // Try loading image texture, fallback to color
            const material = new THREE.MeshStandardMaterial({
                color: 0x333333,
                roughness: 0.4,
                metalness: 0.3,
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.copy(pos);
            scene.add(mesh);
            meshes.push(mesh);

            // Load texture - skip placeholder avatar URLs
            const isPlaceholder = item.image ? new URL(item.image, 'https://placeholder.local').hostname === 'ui-avatars.com' : true;
            if (item.image && !isPlaceholder) {
                textureLoader.load(
                    item.image,
                    (texture) => {
                        texture.colorSpace = THREE.SRGBColorSpace;
                        (mesh.material as THREE.MeshStandardMaterial).map = texture;
                        (mesh.material as THREE.MeshStandardMaterial).color.set(0xffffff);
                        (mesh.material as THREE.MeshStandardMaterial).needsUpdate = true;
                    },
                    undefined,
                    () => {
                        // On error, use a colored sphere
                        const hue = (i / items.length);
                        (mesh.material as THREE.MeshStandardMaterial).color.setHSL(hue, 0.7, 0.5);
                    }
                );
            } else {
                const hue = (i / items.length);
                material.color.setHSL(hue, 0.7, 0.5);
            }
        });

        // Connection lines between highly similar items
        const lines: THREE.Line[] = [];
        const lineEdges: { i: number; j: number; sim: number }[] = [];
        const n = items.length;
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const sim = similarities[i][j];
                if (sim > 0.25) {
                    const lineGeo = new THREE.BufferGeometry().setFromPoints([positions[i], positions[j]]);
                    const lineMat = new THREE.LineBasicMaterial({
                        color: 0xfa2d48,
                        transparent: true,
                        opacity: Math.min(0.4, sim * 0.5),
                    });
                    const line = new THREE.Line(lineGeo, lineMat);
                    scene.add(line);
                    lines.push(line);
                    lineEdges.push({ i, j, sim });
                }
            }
        }

        // Particle field background
        const particleCount = 200;
        const particleGeo = new THREE.BufferGeometry();
        const particlePositions = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount; i++) {
            particlePositions[i * 3] = (Math.random() - 0.5) * 80;
            particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 80;
            particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 80;
        }
        particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        const particleMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.08, transparent: true, opacity: 0.3 });
        const particles = new THREE.Points(particleGeo, particleMat);
        scene.add(particles);

        // Tooltip element
        const tooltipDiv = document.createElement('div');
        tooltipDiv.style.cssText = 'position:absolute;display:none;background:rgba(28,28,30,0.95);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:8px 12px;color:white;font-size:12px;pointer-events:none;z-index:50;backdrop-filter:blur(8px);box-shadow:0 4px 20px rgba(0,0,0,0.5)';
        container.appendChild(tooltipDiv);

        // Raycaster
        const raycaster = new THREE.Raycaster();
        // Set a generous line intersection threshold (in world units) so users can
        // hover near a connection line without needing pixel-perfect aim.
        raycaster.params.Line = { threshold: 0.5 };
        const mouse = new THREE.Vector2();

        sceneRef.current = {
            scene, camera, renderer, controls,
            animationId: 0, meshes, lines, lineEdges, tooltipDiv,
            raycaster, mouse, hoveredIndex: -1, hoveredLineIndex: -1
        };

        // Event listeners
        container.addEventListener('mousemove', handleMouseMove);
        container.addEventListener('click', handleClick);

        // Animation loop
        const clock = new THREE.Clock();
        const animate = () => {
            const ctx = sceneRef.current;
            if (!ctx) return;
            ctx.animationId = requestAnimationFrame(animate);

            const elapsed = clock.getElapsedTime();

            // Gentle floating animation for spheres
            meshes.forEach((mesh, i) => {
                const basePos = positions[i];
                mesh.position.y = basePos.y + Math.sin(elapsed * 0.5 + i * 0.7) * 0.15;
                mesh.rotation.y = elapsed * 0.1 + i;
            });

            // Pulse particles
            particles.rotation.y = elapsed * 0.01;

            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        // Fade in after scene is ready
        setTimeout(() => setIsRendering(true), 50);

        // Handle resize
        const handleResize = () => {
            if (!containerRef.current) return;
            const w = containerRef.current.clientWidth;
            const h = containerRef.current.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            setIsRendering(false);
            window.removeEventListener('resize', handleResize);
            container.removeEventListener('mousemove', handleMouseMove);
            container.removeEventListener('click', handleClick);

            const ctx = sceneRef.current;
            if (ctx) {
                cancelAnimationFrame(ctx.animationId);
                ctx.renderer.dispose();
                ctx.meshes.forEach(m => { m.geometry.dispose(); (m.material as THREE.Material).dispose(); });
                ctx.lines.forEach(l => { l.geometry.dispose(); (l.material as THREE.Material).dispose(); });
                particleGeo.dispose();
                particleMat.dispose();
                if (ctx.tooltipDiv && ctx.tooltipDiv.parentNode) ctx.tooltipDiv.parentNode.removeChild(ctx.tooltipDiv);
                if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
                ctx.controls.dispose();
            }
            sceneRef.current = null;
        };
    }, [items, positions, similarities, handleMouseMove, handleClick]);

    // Compute connection stats for display
    const connectionStats = useMemo(() => {
        const n = items.length;
        let totalConnections = 0;
        let strongConnections = 0;
        let totalSim = 0;
        let connectionCount = 0;
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const sim = similarities[i]?.[j] || 0;
                if (sim > 0.25) {
                    totalConnections++;
                    totalSim += sim;
                    connectionCount++;
                }
                if (sim > 0.5) strongConnections++;
            }
        }
        const avgSim = connectionCount > 0 ? Math.round((totalSim / connectionCount) * 100) : 0;
        // Spread = how dispersed the items are (inverse of avg similarity)
        const spread = 100 - avgSim;
        return { totalConnections, strongConnections, avgSim, spread, nodeCount: n };
    }, [items, similarities]);

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <p className="text-white/30 text-sm font-medium">No data available</p>
            </div>
        );
    }

    return (
        <div className="relative">
            <div
                ref={containerRef}
                className={`relative w-full aspect-square max-w-[480px] mx-auto overflow-hidden transition-opacity duration-300 ${isRendering ? 'opacity-100' : 'opacity-0'}`}
                style={{ cursor: 'grab', minHeight: 400 }}
            />
            {/* Connection Stats Overlay */}
            {isRendering && connectionStats.nodeCount > 0 && (
                <div className="absolute bottom-3 left-3 right-3 flex gap-2 pointer-events-none">
                    <div className="bg-black/60 backdrop-blur-md rounded-lg px-2.5 py-1.5 border border-white/5">
                        <div className="text-[9px] uppercase tracking-wider text-white/40 font-bold">Connections</div>
                        <div className="text-sm font-bold text-white">{connectionStats.totalConnections}</div>
                    </div>
                    <div className="bg-black/60 backdrop-blur-md rounded-lg px-2.5 py-1.5 border border-white/5">
                        <div className="text-[9px] uppercase tracking-wider text-white/40 font-bold">Strong</div>
                        <div className="text-sm font-bold text-[#FA2D48]">{connectionStats.strongConnections}</div>
                    </div>
                    <div className="bg-black/60 backdrop-blur-md rounded-lg px-2.5 py-1.5 border border-white/5">
                        <div className="text-[9px] uppercase tracking-wider text-white/40 font-bold">Spread</div>
                        <div className="text-sm font-bold text-white">{connectionStats.spread}%</div>
                    </div>
                    <div className="bg-black/60 backdrop-blur-md rounded-lg px-2.5 py-1.5 border border-white/5">
                        <div className="text-[9px] uppercase tracking-wider text-white/40 font-bold">Avg Sim</div>
                        <div className="text-sm font-bold text-white">{connectionStats.avgSim}%</div>
                    </div>
                </div>
            )}
        </div>
    );
};
