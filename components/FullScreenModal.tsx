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

const extractDominantColor = async (imgUrl: string): Promise<string> => {
  if (!imgUrl) return "#000000";
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imgUrl;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve("#000000");
        return;
      }

      const SIZE = 64;
      canvas.width = SIZE;
      canvas.height = SIZE;
      ctx.drawImage(img, 0, 0, SIZE, SIZE);

      const { data } = ctx.getImageData(0, 0, SIZE, SIZE);
      const buckets: Record<string, { r: number; g: number; b: number; count: number }> = {};

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        if (a < 128) continue;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const saturation = max === 0 ? 0 : (max - min) / max;
        const lightness = (max + min) / 2 / 255;

        if (saturation < 0.15 || lightness < 0.08 || lightness > 0.92) continue;

        const qr = Math.round(r / 32) * 32;
        const qg = Math.round(g / 32) * 32;
        const qb = Math.round(b / 32) * 32;
        const key = `${qr},${qg},${qb}`;

        if (!buckets[key]) {
          buckets[key] = { r: 0, g: 0, b: 0, count: 0 };
        }
        buckets[key].r += r;
        buckets[key].g += g;
        buckets[key].b += b;
        buckets[key].count += 1;
      }

      const entries = Object.values(buckets).sort((a, b) => b.count - a.count);

      if (entries.length === 0) {
        resolve("#111111");
        return;
      }

      const top = entries[0];
      const avgR = Math.round(top.r / top.count);
      const avgG = Math.round(top.g / top.count);
      const avgB = Math.round(top.b / top.count);

      const darken = 0.55;
      const finalR = Math.round(avgR * darken);
      const finalG = Math.round(avgG * darken);
      const finalB = Math.round(avgB * darken);

      resolve(`rgb(${finalR},${finalG},${finalB})`);
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
        extractDominantColor(image).then(setBgColor);
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

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex flex-col bg-[#050505] text-[#F5F5F5] font-body overflow-hidden"
        >
          <motion.div
            className="absolute inset-0 z-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to bottom, ${bgColor} 0%, #050505 60%)`,
              }}
            />
          </motion.div>

          <motion.div
            initial={{ y: 50, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 50, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`relative z-10 flex flex-col w-full h-full ${className}`}
          >
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
              <div className="w-10" />
            </div>

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
