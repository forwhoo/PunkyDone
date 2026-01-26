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
      
      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#1C1C1E]/95 backdrop-blur-md border-t border-[#2C2C2E] flex justify-around py-3 z-50 pb-safe">
        <div className="flex flex-col items-center gap-1 text-primary">
          <div className="p-1 rounded bg-primary/10">
             <LayoutDashboard className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium mt-0.5">Dashboard</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-[#8E8E93]">
          <History className="w-6 h-6" />
          <span className="text-[10px] font-medium mt-0.5">History</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-[#8E8E93]">
          <User className="w-6 h-6" />
          <span className="text-[10px] font-medium mt-0.5">Profile</span>
        </div>
      </div>
    </div>
  );
};