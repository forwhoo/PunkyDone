import React from 'react';
import { motion } from 'framer-motion';

interface BrutalistToggleProps {
  isOn: boolean;
  onToggle: () => void;
  className?: string;
  label?: string; // Optional label to show next to it
}

const BrutalistToggle: React.FC<BrutalistToggleProps> = ({ isOn, onToggle, className = '', label = 'BRUTALIST' }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
        {label && (
            <span className={`text-[10px] font-black uppercase tracking-[0.2em] hidden sm:block transition-colors ${isOn ? 'text-black' : 'text-white/50'}`}>
                {label}
            </span>
        )}
        <button
          onClick={onToggle}
          className={`relative w-16 h-8 border-[3px] border-black transition-all duration-300 ease-out focus:outline-none group overflow-hidden ${isOn ? 'bg-[#CCFF00]' : 'bg-[#222]'}`}
          style={{
            boxShadow: '4px 4px 0px 0px #000',
          }}
          aria-label={`Toggle ${label} Mode`}
        >
          {/* Track Texture */}
          <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,#000_2px,#000_4px)] pointer-events-none" />

          {/* Thumb */}
          <motion.div
            className="absolute top-0 bottom-0 w-8 border-r-2 border-white/20 flex items-center justify-center z-10 shadow-md"
            initial={false}
            animate={{
                x: isOn ? 32 : 0,
                backgroundColor: isOn ? '#000000' : '#ffffff'
            }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
              {/* Thumb Detail */}
              <div className={`w-1 h-4 ${isOn ? 'bg-[#CCFF00]' : 'bg-black'} rounded-full`} />
          </motion.div>

          {/* Status Text (Behind Thumb) */}
           <div className={`absolute left-2 top-1/2 -translate-y-1/2 text-[8px] font-black uppercase text-black transition-opacity ${isOn ? 'opacity-100' : 'opacity-0'}`}>
               ON
           </div>
           <div className={`absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-black uppercase text-white transition-opacity ${!isOn ? 'opacity-100' : 'opacity-0'}`}>
               OFF
           </div>
        </button>
    </div>
  );
};

export default BrutalistToggle;
