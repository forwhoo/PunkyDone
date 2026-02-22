import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft } from 'lucide-react';
import { createPortal } from 'react-dom';

interface FullScreenModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    color?: string; // Dominant color for background
    image?: string; // Image to extract color from if color not provided
    className?: string;
}

// Helper to extract color (simplified version of App.tsx logic)
const extractColor = async (imgUrl: string): Promise<string> => {
    if (!imgUrl) return '#000000';
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = imgUrl;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve('#000000'); return; }
            canvas.width = 1;
            canvas.height = 1;
            ctx.drawImage(img, 0, 0, 1, 1);
            const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
            resolve(`rgb(${r},${g},${b})`);
        };
        img.onerror = () => resolve('#000000');
    });
};

export const FullScreenModal: React.FC<FullScreenModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    color,
    image,
    className = ''
}) => {
    const [bgColor, setBgColor] = useState(color || '#000000');

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            if (image && !color) {
                extractColor(image).then(setBgColor);
            } else if (color) {
                setBgColor(color);
            }
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen, image, color]);

    if (!isOpen) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex flex-col bg-black text-white font-sans overflow-hidden"
                >
                    {/* Dynamic Background Layer */}
                    <motion.div
                        className="absolute inset-0 z-0 pointer-events-none"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1 }}
                    >
                        {/* Apple Music Style Mesh Gradient */}
                        <div
                            className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full blur-[120px] mix-blend-screen opacity-40 animate-pulse-slow"
                            style={{ backgroundColor: bgColor }}
                        />
                        <div
                            className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] rounded-full blur-[120px] mix-blend-screen opacity-30 animate-pulse-slow"
                            style={{ backgroundColor: bgColor, animationDelay: '2s' }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/80 to-black" />
                    </motion.div>

                    {/* Content Layer */}
                    <motion.div
                        initial={{ y: 50, opacity: 0, scale: 0.95 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 50, opacity: 0, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className={`relative z-10 flex flex-col w-full h-full ${className}`}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 md:p-8">
                            <button
                                onClick={onClose}
                                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center transition-all active:scale-95"
                            >
                                <ChevronLeft className="w-6 h-6 text-white" />
                            </button>

                            {title && (
                                <h2 className="text-lg font-bold tracking-tight uppercase text-white/80">
                                    {title}
                                </h2>
                            )}

                            <div className="w-10" /> {/* Spacer for centering */}
                        </div>

                        {/* Scrollable Content Area */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-10">
                            <div className="w-full max-w-4xl mx-auto">
                                {children}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};
