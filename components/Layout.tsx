import React from 'react';
import { LayoutDashboard, History, User, Search, PlayCircle, SkipBack } from 'lucide-react';
import { Button } from './UIComponents';

interface LayoutProps {
  children: React.ReactNode;
  user?: { name: string; image: string; product: string } | null;
  currentTrack?: { title: string; artist: string; cover: string } | null;
}

const Navbar = ({ user, currentTrack }: { user: any, currentTrack: any }) => (
  // Navbar removed as requested
  null
);

export const Layout: React.FC<LayoutProps> = ({ children, user, currentTrack }) => {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#FA2D48] selection:text-white font-[Inter] overflow-x-hidden relative">
      {/* Scroll Blur Effects - Top & Bottom */}
      <div className="fixed top-0 left-0 right-0 h-32 bg-gradient-to-b from-black via-black/60 to-transparent z-40 pointer-events-none touch-none" />
      <div className="fixed bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black via-black/60 to-transparent z-40 pointer-events-none touch-none" />

      {/* Navbar removed */}
      <main className="pt-12 pb-32 px-6 md:px-12 max-w-[1400px] mx-auto animate-fade-in-up w-full relative z-0">
        {children}
      </main>
      
      {/* Mobile Nav REMOVED as requested */}
    </div>
  );
};