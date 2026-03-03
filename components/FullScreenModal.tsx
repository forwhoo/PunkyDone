import React, { useEffect, useState, useRef } from "react";
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

// Proper dominant color extractor — samples 50×50 grid, skips near-black/near-white
const extractColor = (imgUrl: string): Promise<string> => {
  return new Promise((resolve) => {
    if (!imgUrl) return resolve("#1a1a1a");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imgUrl;
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 50;
        canvas.height = 50;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve("#1a1a1a");
        ctx.drawImage(img, 0, 0, 50, 50);
        const data = ctx.getImageData(0, 0, 50, 50).data;
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 16) {
          const pr = data[i], pg = data[i + 1], pb = data[i + 2];
          const brightness = pr + pg + pb;
          const max = Math.max(pr, pg, pb);
          const min = Math.min(pr, pg, pb);
          // Skip near-black, near-white, and desaturated pixels
          if (brightness > 60 && brightness < 680 && max - min > 25) {
            r += pr; g += pg; b += pb; count++;
          }
        }
        if (count === 0) return resolve("#1a1a1a");
        const toHex = (v: number) => Math.round(v / count).toString(16).padStart(2, "0");
        resolve(`#${toHex(r)}${toHex(g)}${toHex(b)}`);
      } catch {
        resolve("#1a1a1a");
      }
    };
    img.onerror = () => resolve("#1a1a1a");
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
  const [bgColor, setBgColor] = useState<string>(color || "#1a1a1a");
  const prevColor = useRef<string>(color || "#1a1a1a");

  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = "unset";
      return;
    }
    document.body.style.overflow = "hidden";

    if (color && color !== "#1a1a1a") {
      setBgColor(color);
      prevColor.current = color;
    } else if (image) {
      extractColor(image).then((c) => {
        setBgColor(c);
        prevColor.current = c;
      });
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, color, image]);

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="fsmodal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[100] flex flex-col overflow-hidden text-foreground font-body"
          style={{ backgroundColor: "#050505" }}
        >
          {/* === DYNAMIC COLOR LAYER === */}
          {/* Radial glow at top – the aura */}
          <motion.div
            className="absolute inset-0 z-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{
              background: `
                radial-gradient(ellipse 80% 50% at 50% -10%, ${bgColor}55 0%, transparent 70%),
                radial-gradient(ellipse 60% 40% at 20% 0%, ${bgColor}30 0%, transparent 60%),
                radial-gradient(ellipse 60% 40% at 80% 0%, ${bgColor}20 0%, transparent 60%)
              `,
            }}
          />

          {/* Blurred image backdrop – very subtle */}
          {image && (
            <motion.div
              className="absolute inset-0 z-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.06 }}
              transition={{ duration: 1 }}
              style={{
                backgroundImage: `url(${image})`,
                backgroundSize: "cover",
                backgroundPosition: "center top",
                filter: "blur(40px) saturate(1.4)",
              }}
            />
          )}

          {/* Dark fade vignette so content stays readable */}
          <div
            className="absolute inset-0 z-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(to bottom, rgba(5,5,5,0.3) 0%, rgba(5,5,5,0.7) 40%, rgba(5,5,5,0.95) 100%)",
            }}
          />

          {/* Bottom color bleed */}
          <div
            className="absolute bottom-0 left-0 right-0 h-64 z-0 pointer-events-none"
            style={{
              background: `linear-gradient(to top, ${bgColor}18 0%, transparent 100%)`,
            }}
          />

          {/* === CONTENT LAYER === */}
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className={`relative z-10 flex flex-col w-full h-full ${className}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 md:p-8 flex-shrink-0">
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.1] flex items-center justify-center transition-all active:scale-95 backdrop-blur-sm"
              >
                <ChevronLeft className="w-5 h-5 text-foreground" />
              </button>
              {title && (
                <h2 className="text-sm font-bold tracking-widest uppercase text-foreground/40">
                  {title}
                </h2>
              )}
              <div className="w-10" />
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-12">
              <div className="w-full max-w-5xl mx-auto">{children}</div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
