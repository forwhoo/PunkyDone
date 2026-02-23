import React, { useState, useEffect } from 'react';
import { X, Search, Database, Calendar, Music, Disc, User, Clock } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

interface DatabaseViewerProps {
    isOpen: boolean;
    onClose: () => void;
}

export const DatabaseViewer: React.FC<DatabaseViewerProps> = ({ isOpen, onClose }) => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [limit, setLimit] = useState(100);

    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen, limit]);

    const fetchData = async () => {
        setLoading(true);
        const { data: history, error } = await supabase
            .from('listening_history')
            .select('*')
            .order('played_at', { ascending: false })
            .limit(limit);

        if (!error && history) {
            setData(history);
        }
        setLoading(false);
    };

    const filteredData = data.filter(item =>
        (item.track_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.artist_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.album_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 md:p-10"
                >
                    <div className="bg-[#111] w-full max-w-7xl h-full max-h-[90vh] rounded-3xl border border-white/10 flex flex-col overflow-hidden shadow-2xl relative">
                        {/* Header */}
                        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#161618]">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                                    <Database size={24} className="text-blue-400" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white tracking-tight">Database Viewer</h2>
                                    <p className="text-white/50 text-sm">Real-time view of your listening history</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Toolbar */}
                        <div className="p-4 border-b border-white/10 flex items-center gap-4 bg-[#111]">
                            <div className="relative flex-1 max-w-md">
                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                                <input
                                    type="text"
                                    placeholder="Search artists, songs, albums..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 transition-colors"
                                />
                            </div>
                            <div className="flex items-center gap-2 text-sm text-white/50 ml-auto">
                                <span>Showing {filteredData.length} records</span>
                                <div className="h-4 w-[1px] bg-white/10 mx-2" />
                                <select
                                    value={limit}
                                    onChange={(e) => setLimit(Number(e.target.value))}
                                    className="bg-transparent text-white/70 focus:outline-none cursor-pointer hover:text-white"
                                >
                                    <option value={100}>Last 100</option>
                                    <option value={500}>Last 500</option>
                                    <option value={1000}>Last 1000</option>
                                </select>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="flex-1 overflow-auto custom-scrollbar bg-[#0A0A0A]">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 z-10 bg-[#161618] shadow-md">
                                    <tr>
                                        <th className="p-4 text-xs font-bold text-white/40 uppercase tracking-wider border-b border-white/10 w-[200px]">
                                            <div className="flex items-center gap-2"><Calendar size={14} /> Played At</div>
                                        </th>
                                        <th className="p-4 text-xs font-bold text-white/40 uppercase tracking-wider border-b border-white/10">
                                            <div className="flex items-center gap-2"><Music size={14} /> Song</div>
                                        </th>
                                        <th className="p-4 text-xs font-bold text-white/40 uppercase tracking-wider border-b border-white/10">
                                            <div className="flex items-center gap-2"><User size={14} /> Artist</div>
                                        </th>
                                        <th className="p-4 text-xs font-bold text-white/40 uppercase tracking-wider border-b border-white/10 hidden md:table-cell">
                                            <div className="flex items-center gap-2"><Disc size={14} /> Album</div>
                                        </th>
                                        <th className="p-4 text-xs font-bold text-white/40 uppercase tracking-wider border-b border-white/10 text-right w-[100px]">
                                            <div className="flex items-center justify-end gap-2"><Clock size={14} /> Duration</div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-white/30">Loading data...</td>
                                        </tr>
                                    ) : filteredData.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-white/30">No records found matching "{searchTerm}"</td>
                                        </tr>
                                    ) : (
                                        filteredData.map((item) => (
                                            <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="p-4 text-sm text-white/60 font-mono whitespace-nowrap">
                                                    {new Date(item.played_at).toLocaleString()}
                                                </td>
                                                <td className="p-4 text-sm text-white font-medium">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded bg-[#222] overflow-hidden flex-shrink-0 border border-white/5">
                                                            {item.cover || item.album_cover ? (
                                                                <img src={item.cover || item.album_cover} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-white/20"><Music size={12} /></div>
                                                            )}
                                                        </div>
                                                        <span className="truncate max-w-[200px]">{item.track_name || 'Unknown Track'}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-sm text-white/80">
                                                    {item.artist_name || 'Unknown Artist'}
                                                </td>
                                                <td className="p-4 text-sm text-white/50 hidden md:table-cell">
                                                    {item.album_name || 'Unknown Album'}
                                                </td>
                                                <td className="p-4 text-sm text-white/40 font-mono text-right">
                                                    {item.duration_ms ? `${Math.floor(item.duration_ms / 60000)}:${String(Math.floor((item.duration_ms % 60000) / 1000)).padStart(2, '0')}` : '--:--'}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
