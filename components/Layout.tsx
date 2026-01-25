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
      <div className="flex items-center gap-3">
         {/* User Icon instead of Red Dot */}
         <div className="w-8 h-8 rounded-full bg-[#2C2C2E] border border-white/10 overflow-hidden">
             {user?.image ? (
                 <img src={user.image} className="w-full h-full object-cover" />
             ) : (
                 <User className="w-4 h-4 text-white m-auto h-full" />
             )}
         </div>
         <span className="text-xl font-black tracking-tighter text-white uppercase italic">Punky</span>
      </div>
    </div>
    
    {/* Removed Dashboard/Discover/Search/NowPlaying as requested */}

    <div className="flex items-center gap-4">
      {/* Empty right side or user actions if needed later */}
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