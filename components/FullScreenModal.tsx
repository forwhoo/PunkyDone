import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { createPortal } from "react-dom";

interface FullScreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  color?: string;
  image?: string;
  className?: string;
}

// Samples a grid of pixels, buckets them into coarse RGB bins,
// and returns the most frequently occurring bucket as an rgb() string.
// Far more reliable than a 1×1 scaled average.
const extractColor = async (imgUrl: string): Promise<string> => {
  if (!imgUrl) return "#000000";

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imgUrl;

    img.onload = () => {
      const SIZE = 80; // sample at 80×80
      const BUCKET = 32; // quantize each channel into 32-step buckets

      const canvas = document.createElement("canvas");
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        resolve("#000000");
        return;
      }

      ctx.drawImage(img, 0, 0, SIZE, SIZE);
      const { data } = ctx.getImageData(0, 0, SIZE, SIZE);

      const freq: Record<string, { count: number; r: number; g: number; b: number }> = {};

      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a < 128) continue; // skip transparent pixels

        // Quantize to reduce noise
        const r = Math.round(data[i] / BUCKET) * BUCKET;
        const g = Math.round(data[i + 1] / BUCKET) * BUCKET;
        const b = Math.round(data[i + 2] / BUCKET) * BUCKET;

        // Skip near-black and near-white (usually backgrounds, not dominant colour)
        const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
        if (brightness < 20 || brightness > 235) continue;

        const key = `${r},${g},${b}`;
        if (!freq[key]) {
          freq[key] = { count: 0, r, g, b };
        }
        freq[key].count++;
      }

      const entries = Object.values(freq);

      if (entries.length === 0) {
        resolve("#1a1a1a");
        return;
      }

      // Pick the most common bucket
      entries.sort((a, b) => b.count - a.count);
      const { r, g, b } = entries[0];

      // Darken slightly so it works as a background
      const darken = (v: number) => Math.round(v * 0.55);
      resolve(`rgb(${darken(r)},${darken(g)},${darken(b)})`);
    };

    img.onerror = () => resolve("#000000");
  });
};

export const FullScreenModal: React.FC<FullScreenModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  color,
  image,
  className = "",
}) => {
  const [bgColor, setBgColor] = useState(color || "#000000");

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      if (image && !color) {
        extractColor(image).then(setBgColor);
      } else if (color) {
        setBgColor(color);
      }
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, image, color]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex flex-col bg-[#050505] text-[#F5F5F5] font-body overflow-hidden"
        >
          {/* Dynamic color background layer */}
          <motion.div
            className="absolute inset-0 z-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            style={{ backgroundColor: bgColor }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-[#121212]/30 via-[#050505]/80 to-[#050505]" />
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
                className="w-10 h-10 rounded-full bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] flex items-center justify-center transition-all active:scale-95"
              >
                <ChevronLeft className="w-6 h-6 text-[#F5F5F5]" />
              </button>
              {title && (
                <h2 className="text-lg font-bold tracking-tight uppercase text-[#A0A0A0]">
                  {title}
                </h2>
              )}
              <div className="w-10" /> {/* Spacer for centering */}
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-10">
              <div className="w-full max-w-4xl mx-auto">{children}</div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
