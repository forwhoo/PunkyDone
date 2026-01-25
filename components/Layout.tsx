import React from 'react';
import { LayoutDashboard, History, Settings, User, Search } from 'lucide-react';
import { Button } from './UIComponents';

interface LayoutProps {
  children: React.ReactNode;
}

const Navbar = () => (
  <header className="fixed top-0 left-0 right-0 h-14 glass z-50 flex items-center justify-between px-6 md:px-12 border-b border-[#2C2C2E]">
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
         <span className="text-xl font-bold tracking-tight text-white">MuseAnalytics</span>
      </div>
    </div>

    <div className="flex items-center gap-3">
      <div className="hidden md:flex items-center bg-[#1C1C1E] rounded-lg border border-[#2C2C2E] px-3 h-8 w-48 transition-colors hover:border-[#3A3A3C]">
         <Search className="w-3.5 h-3.5 text-[#8E8E93]" />
         <span className="text-xs text-[#8E8E93] ml-2">Search</span>
      </div>
      
      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#333] to-[#111] border border-white/10 cursor-pointer flex items-center justify-center hover:scale-105 transition-transform">
         <User className="w-4 h-4 text-white" />
      </div>
    </div>
  </header>
);

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary selection:text-white">
      <Navbar />
      <main className="pt-24 pb-12 px-6 md:px-12 max-w-[1400px] mx-auto animate-fade-in-up">
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