import React from 'react';
import { motion } from 'framer-motion';

interface BrutalistSwitchProps {
    isEnabled: boolean;
    onToggle: () => void;
}

const BrutalistSwitch: React.FC<BrutalistSwitchProps> = ({ isEnabled, onToggle }) => {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={isEnabled}
            onClick={onToggle}
            className={`
                relative w-14 h-8 rounded-full p-1 transition-all duration-300
                ${isEnabled ? 'bg-[#CCFF00] shadow-[0_0_15px_rgba(204,255,0,0.3)]' : 'bg-white/10 hover:bg-white/20'}
            `}
            title={isEnabled ? "Disable Brutalist Mode" : "Enable Brutalist Mode"}
        >
            <motion.div
                className={`
                    w-6 h-6 rounded-full shadow-sm transform flex items-center justify-center
                    ${isEnabled ? 'bg-black translate-x-6' : 'bg-white translate-x-0'}
                `}
                layout
                transition={{ type: "spring", stiffness: 700, damping: 30 }}
            >
                {isEnabled && (
                    <span className="text-[10px]">⚡</span>
                )}
            </motion.div>
             <span className="sr-only">Toggle Brutalist Mode</span>
        </button>
    );
};

export default BrutalistSwitch;
