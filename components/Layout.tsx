import React from 'react';
import { LayoutDashboard, History, User, Search, PlayCircle, SkipBack } from 'lucide-react';
import { Button } from './UIComponents';

interface LayoutProps {
  children: React.ReactNode;
  user?: { name: string; image: string; product: string } | null;
  currentTrack?: { title: string; artist: string; cover: string } | null;
}

const Navbar = ({ user, currentTrack }: { user: any, currentTrack: any }) => (
  <header className="fixed top-0 left-0 right-0 h-16 glass z-50 flex items-center justify-between px-6 md:px-12 border-b border-[#2C2C2E] bg-black/80 backdrop-blur-md">
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-2">
         {/* Simple color dot logo or we could use an icon */}
         <div className="w-3 h-3 rounded-full bg-[#FA2D48]"></div>
         <span className="text-xl font-black tracking-tighter text-white uppercase italic">Punky</span>
      </div>

      <nav className="hidden md:flex items-center gap-6 ml-4 border-l border-white/10 pl-6 h-6">
          <a href="#" className="text-sm font-bold text-white hover:text-[#FA2D48] transition-colors">Dashboard</a>
          <a href="#" className="text-sm font-bold text-[#8E8E93] hover:text-white transition-colors">Discover</a>
      </nav>
    </div>

    {/* Center - Now Playing / Previous */}
    {currentTrack ? (
        <div className="hidden lg:flex items-center gap-4 absolute left-1/2 -translate-x-1/2">
            <button className="flex items-center gap-2 text-[#8E8E93] hover:text-white transition-colors group">
                <SkipBack className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Previous</span>
            </button>
            <div className="flex items-center gap-3 bg-[#1C1C1E] border border-white/10 rounded-full py-1 pl-1 pr-4">
                 <img src={currentTrack.cover} className="w-8 h-8 rounded-full border border-white/10 animate-[spin_10s_linear_infinite]" />
                 <div className="flex flex-col">
                     <span className="text-[10px] font-bold text-white uppercase tracking-wider leading-none truncate max-w-[120px]">{currentTrack.title}</span>
                     <span className="text-[9px] font-medium text-[#FA2D48] leading-none mt-0.5">Now Listening</span>
                 </div>
            </div>
        </div>
    ) : (
        <div className="hidden lg:flex items-center gap-4 absolute left-1/2 -translate-x-1/2 opacity-50">
            <div className="flex items-center gap-2 text-[#8E8E93]">
                 <span className="text-xs font-medium uppercase tracking-wide">Not Playing</span>
            </div>
        </div>
    )}

    <div className="flex items-center gap-4">
      {/* Search Input */}
      <div className="hidden md:flex items-center bg-[#1C1C1E] rounded-full border border-[#2C2C2E] px-4 h-9 w-48 transition-colors hover:border-[#3A3A3C] focus-within:border-white/30">
         <Search className="w-3.5 h-3.5 text-[#8E8E93]" />
         <input className="bg-transparent border-none outline-none text-xs text-white ml-2 w-full placeholder-[#636366]" placeholder="Search history..." />
      </div>
      
      {/* User Profile */}
      <div className="flex items-center gap-3 pl-4 border-l border-white/10">
         <div className="text-right hidden md:block">
             <div className="text-[12px] font-bold text-white leading-none mb-1">{user?.name || "Guest"}</div>
             <div className="text-[10px] font-medium text-[#FA2D48] uppercase tracking-wider leading-none">{user?.product === 'premium' ? 'Premium' : 'Free'}</div>
         </div>
         <div className="w-9 h-9 rounded-full bg-[#2C2C2E] border border-white/10 overflow-hidden cursor-pointer hover:ring-2 hover:ring-[#FA2D48] transition-all">
             {user?.image ? (
                 <img src={user.image} className="w-full h-full object-cover" />
             ) : (
                 <User className="w-4 h-4 text-white m-auto h-full" />
             )}
         </div>
      </div>
    </div>
  </header>
);

export const Layout: React.FC<LayoutProps> = ({ children, user, currentTrack }) => {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#FA2D48] selection:text-white font-[Inter]">
      <Navbar user={user} currentTrack={currentTrack} />
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