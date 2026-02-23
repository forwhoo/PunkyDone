import React, { useRef, useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, RefreshCcw, Maximize2, Minimize2, Code } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import * as Recharts from 'recharts';
import * as ShadcnUI from './ui';
import { cn } from '@/lib/utils';

// Import Babel dynamically to keep bundle size small
let Babel: any = null;

interface CanvasRendererProps {
    code: string; // Changed from html to code (TSX)
    title: string;
    description: string;
    retryCount?: number;
    error?: string;
    onRetry?: () => void;
    maxRetries?: number;
}

export const CanvasRenderer: React.FC<CanvasRendererProps> = ({
    code,
    title,
    description,
    retryCount = 0,
    error,
    onRetry,
    maxRetries = 5
}) => {
    const [renderError, setRenderError] = useState<string | null>(error || null);
    const [expanded, setExpanded] = useState(false);
    const [transpiling, setTranspiling] = useState(false);
    const [Component, setComponent] = useState<React.ComponentType | null>(null);

    const canRetry = retryCount < maxRetries && !!onRetry;

    useEffect(() => {
        const loadBabelAndTranspile = async () => {
            if (!code) return;

            setTranspiling(true);
            setRenderError(null);

            try {
                // Load Babel if not already loaded
                if (!Babel) {
                    const babelModule = await import('@babel/standalone');
                    Babel = babelModule.default || babelModule;
                }

                // Transpile TSX to JS
                // We wrap the code to return a default export or a specific component
                const transpiled = Babel.transform(code, {
                    presets: ['react', ['typescript', { isTSX: true, allExtensions: true }]],
                    filename: 'component.tsx'
                }).code;

                // Create a function that executes the code in a sandbox with our scope
                const scope = {
                    React,
                    useState,
                    useEffect,
                    useMemo,
                    useRef,
                    motion,
                    AnimatePresence,
                    cn,
                    ...LucideIcons,
                    ...Recharts,
                    ...ShadcnUI
                };

                const keys = Object.keys(scope);
                const values = Object.values(scope);

                // We assume the AI provides a component as a default export or a variable named 'App'
                // To handle both, we can append a return statement if it's missing
                let finalCode = transpiled;
                if (!finalCode.includes('return') && !finalCode.includes('export default')) {
                    // Try to find a defined component name
                    const match = finalCode.match(/function\s+(\w+)/) || finalCode.match(/const\s+(\w+)\s*=/);
                    if (match && match[1]) {
                        finalCode += `\nreturn ${match[1]};`;
                    }
                } else if (finalCode.includes('export default')) {
                    // Replace export default with a return
                    finalCode = finalCode.replace(/export\s+default\s+/, 'return ');
                }

                const renderFn = new Function(...keys, finalCode);
                const ResultComponent = renderFn(...values);

                if (typeof ResultComponent !== 'function') {
                    throw new Error('The generated code did not return a valid React component.');
                }

                setComponent(() => ResultComponent);
            } catch (err: any) {
                console.error('Transpilation error:', err);
                setRenderError(err.message || 'Failed to transpile component');
            } finally {
                setTranspiling(false);
            }
        };

        loadBabelAndTranspile();
    }, [code]);

    if (!code || error) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-2xl mx-auto"
            >
                <div className="bg-[#1C1C1E] border border-red-500/20 rounded-2xl p-6 text-center">
                    <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
                    <p className="text-red-400 text-sm font-medium mb-1">Component Generation Failed</p>
                    <p className="text-[#8E8E93] text-xs mb-4">{error || renderError || 'Unknown error'}</p>
                    {canRetry && (
                        <button
                            onClick={onRetry}
                            className="px-5 py-2 bg-[#FA2D48] text-white rounded-lg text-sm font-semibold hover:brightness-110 transition-all flex items-center gap-2 mx-auto"
                        >
                            <RefreshCcw size={14} /> Try Again
                        </button>
                    )}
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-4xl mx-auto"
        >
            <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#1C1C1E]">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="flex gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
                            <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
                            <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h4 className="text-white text-sm font-semibold truncate">{title}</h4>
                                <span className="text-[10px] bg-white/5 text-white/40 px-1.5 py-0.5 rounded border border-white/5 font-mono">TSX</span>
                            </div>
                            {description && (
                                <p className="text-[#8E8E93] text-[11px] truncate">{description}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="p-1.5 rounded-lg text-[#8E8E93] hover:text-white hover:bg-white/10 transition-all"
                        >
                            {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                        </button>
                    </div>
                </div>

                {/* Content Container */}
                <div
                    className={cn(
                        "w-full bg-[#0a0a0a] transition-all duration-300 overflow-auto relative min-h-[200px]",
                        expanded ? "h-[80vh]" : "max-h-[600px]"
                    )}
                >
                    {transpiling ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0a0a0a]/80 backdrop-blur-sm z-10">
                            <RefreshCcw size={24} className="animate-spin text-[#FA2D48]" />
                            <p className="text-white/50 text-xs font-medium">Transpiling TypeScript...</p>
                        </div>
                    ) : renderError ? (
                        <div className="p-8 text-center">
                            <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
                            <p className="text-red-400 text-sm font-medium mb-1">Runtime Error</p>
                            <pre className="text-white/40 text-[10px] bg-black/40 p-4 rounded-xl mt-4 overflow-x-auto text-left border border-white/5">
                                {renderError}
                            </pre>
                            {canRetry && (
                                <button
                                    onClick={onRetry}
                                    className="mt-6 px-4 py-2 bg-white/5 text-white rounded-lg text-xs font-semibold hover:bg-white/10 transition-all"
                                >
                                    Re-generate
                                </button>
                            )}
                        </div>
                    ) : Component ? (
                        <div className="p-6">
                            <React.Suspense fallback={<div>Loading...</div>}>
                                <Component />
                            </React.Suspense>
                        </div>
                    ) : null}
                </div>
            </div>
        </motion.div>
    );
};
