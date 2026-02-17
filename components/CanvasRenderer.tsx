import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCcw, Maximize2, Minimize2 } from 'lucide-react';

interface CanvasRendererProps {
    html: string;
    title: string;
    description: string;
    retryCount?: number;
    error?: string;
    onRetry?: () => void;
    maxRetries?: number;
}

export const CanvasRenderer: React.FC<CanvasRendererProps> = ({
    html,
    title,
    description,
    retryCount = 0,
    error,
    onRetry,
    maxRetries = 5
}) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [renderError, setRenderError] = useState<string | null>(error || null);
    const [iframeHeight, setIframeHeight] = useState(400);
    const [expanded, setExpanded] = useState(false);
    const [loaded, setLoaded] = useState(false);

    const canRetry = retryCount < maxRetries && !!onRetry;

    // Inject HTML into sandboxed iframe
    const renderContent = useCallback(() => {
        if (!iframeRef.current || !html) return;

        try {
            setRenderError(null);
            setLoaded(false);

            const iframe = iframeRef.current;
            const doc = iframe.contentDocument || iframe.contentWindow?.document;
            if (!doc) {
                setRenderError('Could not access iframe document');
                return;
            }

            // Wrap HTML with error catching
            const wrappedHtml = html.includes('<!DOCTYPE html>')
                ? html.replace('</body>', `
                    <script>
                        window.onerror = function(msg, url, line) {
                            window.parent.postMessage({ type: 'canvas-error', message: msg + ' (line ' + line + ')' }, '*');
                            return true;
                        };
                        window.parent.postMessage({ type: 'canvas-loaded', height: document.body.scrollHeight }, '*');
                        new ResizeObserver(function() {
                            window.parent.postMessage({ type: 'canvas-resize', height: document.body.scrollHeight }, '*');
                        }).observe(document.body);
                    </script>
                    </body>`)
                : `<!DOCTYPE html>
                    <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
                    <style>body{margin:0;padding:16px;background:#0a0a0a;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',sans-serif;}</style>
                    </head><body>${html}
                    <script>
                        window.onerror = function(msg, url, line) {
                            window.parent.postMessage({ type: 'canvas-error', message: msg + ' (line ' + line + ')' }, '*');
                            return true;
                        };
                        window.parent.postMessage({ type: 'canvas-loaded', height: document.body.scrollHeight }, '*');
                        new ResizeObserver(function() {
                            window.parent.postMessage({ type: 'canvas-resize', height: document.body.scrollHeight }, '*');
                        }).observe(document.body);
                    </script>
                    </body></html>`;

            doc.open();
            doc.write(wrappedHtml);
            doc.close();

        } catch (err: any) {
            setRenderError(err.message || 'Failed to render component');
        }
    }, [html]);

    // Listen for messages from iframe
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (!event.data || !event.data.type) return;

            if (event.data.type === 'canvas-error') {
                setRenderError(event.data.message);
            }
            if (event.data.type === 'canvas-loaded') {
                setLoaded(true);
                if (event.data.height && event.data.height > 100) {
                    setIframeHeight(Math.min(event.data.height + 32, 800));
                }
            }
            if (event.data.type === 'canvas-resize') {
                if (event.data.height && event.data.height > 100) {
                    setIframeHeight(Math.min(event.data.height + 32, 800));
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Render when html changes
    useEffect(() => {
        if (html) {
            renderContent();
        }
    }, [html, renderContent]);

    // Error state - no HTML or generation failed
    if (!html || error) {
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
                    {retryCount > 0 && (
                        <p className="text-[#666] text-xs mb-3">Attempted {retryCount} of {maxRetries} retries</p>
                    )}
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
            className="w-full max-w-2xl mx-auto"
        >
            <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#1C1C1E]">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="flex gap-1.5">
                            <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                            <span className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
                            <span className="w-3 h-3 rounded-full bg-[#28C840]" />
                        </div>
                        <div className="min-w-0">
                            <h4 className="text-white text-sm font-semibold truncate">{title}</h4>
                            {description && (
                                <p className="text-[#8E8E93] text-[11px] truncate">{description}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {retryCount > 0 && (
                            <span className="text-[10px] text-[#666] bg-white/5 px-2 py-1 rounded-full">
                                Retry #{retryCount}
                            </span>
                        )}
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="p-1.5 rounded-lg text-[#8E8E93] hover:text-white hover:bg-white/10 transition-all"
                        >
                            {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                        </button>
                    </div>
                </div>

                {/* Render Error Banner */}
                {renderError && (
                    <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 flex items-center gap-2">
                        <AlertTriangle size={12} className="text-red-400 flex-shrink-0" />
                        <p className="text-red-400 text-xs truncate">{renderError}</p>
                        {canRetry && (
                            <button
                                onClick={onRetry}
                                className="ml-auto text-xs text-red-400 hover:text-red-300 underline flex-shrink-0"
                            >
                                Retry
                            </button>
                        )}
                    </div>
                )}

                {/* Loading overlay */}
                {!loaded && !renderError && (
                    <div className="flex items-center justify-center py-8">
                        <div className="flex items-center gap-2 text-[#8E8E93] text-sm">
                            <RefreshCcw size={14} className="animate-spin" />
                            Rendering...
                        </div>
                    </div>
                )}

                {/* Iframe */}
                <iframe
                    ref={iframeRef}
                    title={title}
                    sandbox="allow-scripts"
                    className="w-full border-0 bg-[#0a0a0a] transition-all duration-300"
                    style={{
                        height: expanded ? '80vh' : `${iframeHeight}px`,
                        display: loaded || renderError ? 'block' : 'none'
                    }}
                />
            </div>
        </motion.div>
    );
};
