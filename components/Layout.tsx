import React from "react";
import {
  LayoutDashboard,
  History,
  User,
  Search,
  PlayCircle,
  SkipBack,
} from "lucide-react";
import { Button } from "./UIComponents";

interface LayoutProps {
  children: React.ReactNode;
  user?: { name: string; image: string; product: string } | null;
  currentTrack?: { title: string; artist: string; cover: string } | null;
}
const Navbar = ({ user, currentTrack }: { user: any; currentTrack: any }) =>
  // Navbar removed as requested
  null;

export const Layout: React.FC<LayoutProps> = ({
  children,
  user,
  currentTrack,
}) => {
  return (
    <div className="min-h-[100dvh] min-h-screen bg-card text-foreground selection:bg-[#d97757] selection:text-foreground font-[Inter] overflow-x-hidden relative">
      {/* Scroll Blur Effects - Top & Bottom */}
      <div className="fixed top-0 left-0 right-0 h-20 pointer-events-none touch-none z-40"
        style={{ background: "linear-gradient(to bottom, #050505 0%, rgba(5,5,5,0.6) 60%, transparent 100%)" }} />
      <div className="fixed bottom-0 left-0 right-0 h-20 pointer-events-none touch-none z-40"
        style={{ background: "linear-gradient(to top, #050505 0%, rgba(5,5,5,0.6) 60%, transparent 100%)" }} />

      {/* Navbar removed */}
      <main className="pt-12 pb-32 px-0 md:px-12 max-w-[1400px] mx-auto animate-fade-in-up w-full relative z-0">
        {children}
      </main>

      {/* Mobile Nav REMOVED as requested */}
    </div>
  );
};
