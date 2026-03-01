import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export const BackToTop = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const toggleVisibility = () => {
            if (window.scrollY > 400) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        window.addEventListener('scroll', toggleVisibility);
        return () => window.removeEventListener('scroll', toggleVisibility);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    if (!isVisible) return null;

    return (
        <button
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 p-3 rounded-full bg-[#e8e6dc] hover:bg-[#b0aea5]/30 text-[#141413]  transition-all z-50 border border-[#e8e6dc] hover:scale-105 active:scale-95 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300"
            title="Back to Top"
        >
            <ArrowUp size={20} />
        </button>
    );
};
