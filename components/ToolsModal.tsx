import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Zap, Search } from 'lucide-react';
import { TOOL_DEFINITIONS, TOOL_ICON_MAP } from '../services/mistralService';
import {
    Music, Mic2, Disc, Clock, Orbit, Flame, BarChart3, Radio, TrendingUp, Moon,
    SkipForward, BarChart2, Gift, SlidersHorizontal, Image, Grid3x3,
    Network, ChartPie, History, ArrowLeftRight, ImageIcon, Timer,
    ArrowUpDown, Heart, PieChart, Calendar, Play, Star, CheckCircle, Repeat,
    Briefcase, CloudSun, CalendarClock, Car, LineChart,
    FastForward, DoorOpen, Users, Target, CheckSquare, Smile, Ticket, BookOpen, Lightbulb, Tent, ListMusic
} from 'lucide-react';

// Map icon string names to actual Lucide components
const ICON_COMPONENT_MAP: Record<string, any> = {
    Music, Mic2, Disc, Clock, Orbit, Flame, BarChart3, Radio, TrendingUp, Moon,
    SkipForward, BarChart2, Gift, Search, SlidersHorizontal, Image, Grid3x3,
    Network, ChartPie, History, ArrowLeftRight, ImageIcon, Timer,
    ArrowUpDown, Heart, PieChart, Calendar, Play, Star, CheckCircle, Repeat,
    Briefcase, CloudSun, CalendarClock, Car, LineChart,
    FastForward, DoorOpen, Users, Target, CheckSquare,
    Smile, Ticket, BookOpen, Lightbulb, Tent, ListMusic
};

interface ToolsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectTool: (toolName: string) => void;
}

export const ToolsModal: React.FC<ToolsModalProps> = ({ isOpen, onClose, onSelectTool }) => {
    const [search, setSearch] = React.useState('');

    const filteredTools = TOOL_DEFINITIONS.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-[#faf9f5] "
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-5xl h-[85vh] bg-[#111] border border-[#e8e6dc] rounded-3xl shadow-2xl flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-[#e8e6dc] bg-white">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#d97757]/10 flex items-center justify-center border border-[#d97757]/20">
                                    <Zap className="w-5 h-5 text-[#d97757]" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-[#141413] tracking-tight">Tools Library</h2>
                                    <p className="text-sm text-[#141413]/40 font-medium">Explore {TOOL_DEFINITIONS.length} AI capabilities</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-9 h-9 rounded-full bg-[#e8e6dc]/50 hover:bg-[#e8e6dc] flex items-center justify-center text-[#141413]/50 hover:text-[#141413] transition-all"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Search */}
                        <div className="px-6 py-4 border-b border-[#e8e6dc]">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#141413]/30 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Search tools..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full bg-[#e8e6dc]/50 border border-[#e8e6dc] rounded-xl py-3 pl-11 pr-4 text-sm text-[#141413] placeholder:text-[#141413]/20 focus:outline-none focus:border-[#b0aea5]/30 focus:bg-[#e8e6dc] transition-all"
                                />
                            </div>
                        </div>

                        {/* Grid */}
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredTools.map((tool) => {
                                    const iconInfo = TOOL_ICON_MAP[tool.name] || { icon: 'Zap', label: tool.name };
                                    const Icon = ICON_COMPONENT_MAP[iconInfo.icon] || Zap;

                                    return (
                                        <button
                                            key={tool.name}
                                            onClick={() => {
                                                onSelectTool(tool.name);
                                                onClose();
                                            }}
                                            className="group flex flex-col items-start text-left bg-white hover:bg-white/[0.06] border border-[#e8e6dc] hover:border-[#e8e6dc] rounded-2xl p-5 transition-all duration-200 active:scale-[0.98]"
                                        >
                                            <div className="flex items-start justify-between w-full mb-3">
                                                <div className="w-10 h-10 rounded-lg bg-[#e8e6dc]/50 flex items-center justify-center text-[#141413]/70 group-hover:text-[#141413] group-hover:scale-110 transition-all duration-300">
                                                    <Icon size={20} />
                                                </div>
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                    <ArrowRight size={16} className="text-[#141413]/30" />
                                                </div>
                                            </div>

                                            <h3 className="text-[15px] font-bold text-[#141413] mb-1.5 group-hover:text-[#d97757] transition-colors">{iconInfo.label}</h3>
                                            <p className="text-[13px] text-[#141413]/40 leading-relaxed line-clamp-2 mb-3 h-[40px]">
                                                {tool.description}
                                            </p>
                                            <div className="mt-auto w-full pt-3 border-t border-[#e8e6dc]">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {Object.keys(tool.parameters.properties || {}).slice(0, 3).map(param => (
                                                        <span key={param} className="px-2 py-0.5 rounded-md bg-[#e8e6dc]/50 text-[10px] text-[#141413]/30 font-mono">
                                                            {param}
                                                        </span>
                                                    ))}
                                                    {Object.keys(tool.parameters.properties || {}).length > 3 && (
                                                        <span className="px-2 py-0.5 rounded-md bg-[#e8e6dc]/50 text-[10px] text-[#141413]/30 font-mono">...</span>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
