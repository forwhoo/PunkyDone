import React, { useMemo, useState, useEffect } from 'react';
import { Clock, RefreshCw, BarChart2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface HourlyChartProps {
    history: any[];
}

export const HourlyChart: React.FC<HourlyChartProps> = ({ history }) => {
    const [filter, setFilter] = useState<'Artist' | 'Album' | 'Song'>('Artist');
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    // Calculate Data
    const hourlyData = useMemo(() => {
        const hours = Array(24).fill(0).map((_, i) => ({ hour: i, count: 0, items: [] as any[] }));
        
        if (!history) return hours;

        history.forEach(play => {
            const date = new Date(play.played_at);
            const h = date.getHours();
            hours[h].count++;
            hours[h].items.push(play);
        });

        // Compute Top Item per hour based on filter
        return hours.map(data => {
            if (data.count === 0) return { ...data, topItem: null };
            
            // Count frequencies
            const counts: Record<string, number> = {};
            const ref: Record<string, any> = {}; 

            data.items.forEach(play => {
                let key = '';
                let label = '';
                let image = '';

                if (filter === 'Artist') {
                    key = play.artist_name || play.artist;
                    label = key;
                    image = play.artist_image || play.cover; // fallback
                } else if (filter === 'Album') {
                    key = play.album_name || play.album;
                    label = key;
                    image = play.album_cover || play.cover;
                } else {
                    key = play.track_name || play.title;
                    label = key;
                    image = play.cover;
                }

                if (!key) return;
                counts[key] = (counts[key] || 0) + 1;
                ref[key] = { label, image, subLabel: filter === 'Song' ? play.artist_name : '' };
            });

            // Find Max
            let bestKey = '';
            let max = 0;
            Object.entries(counts).forEach(([k, v]) => {
                if (v > max) {
                    max = v;
                    bestKey = k;
                }
            });

            return { 
                ...data, 
                maxCount: max,
                topItem: ref[bestKey] 
            };
        });

    }, [history, filter]);

    const maxPlays = Math.max(...hourlyData.map(d => d.count), 1);
    
    // next refresh (next :00 or :30)
    const getNextRefresh = () => {
        const now = new Date();
        const next = new Date(now);
        if (now.getMinutes() < 30) {
            next.setMinutes(30, 0, 0);
        } else {
            next.setHours(now.getHours() + 1, 0, 0, 0);
        }
        return next.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="bg-[#1C1C1E] rounded-3xl p-6 border border-white/5">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div>
                     <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Clock className="text-purple-400" /> Hourly Activity
                    </h3>
                    <p className="text-[#8E8E93] text-xs flex items-center gap-2 mt-1">
                        <RefreshCw size={10} /> Next refresh: <span className="text-white">{getNextRefresh()}</span>
                    </p>
                </div>

                {/* Filter Switch */}
                <div className="flex bg-[#2C2C2E] p-1 rounded-full w-fit self-start">
                    {['Artist', 'Album', 'Song'].map((type) => (
                        <button
                          key={type}
                          onClick={() => setFilter(type as any)}
                          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                            filter === type 
                              ? 'bg-white text-black shadow-lg' 
                              : 'text-[#8E8E93] hover:text-white'
                          }`}
                        >
                          {type}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chart */}
            <div className="h-48 flex items-end gap-1 md:gap-2">
                {hourlyData.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                        {/* Tooltip */}
                        {d.count > 0 && (
                        <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity bg-[#2C2C2E] border border-white/10 p-2 rounded-lg shadow-xl w-32 z-20 flex flex-col items-center text-center">
                            {d.topItem?.image && (
                                <img src={d.topItem.image} className="w-8 h-8 rounded mb-1 object-cover" />
                            )}
                            <div className="text-[10px] text-white font-bold leading-tight">{d.topItem?.label}</div>
                            {d.topItem?.subLabel && <div className="text-[9px] text-[#8E8E93]">{d.topItem.subLabel}</div>}
                            <div className="text-[9px] text-purple-400 mt-1 font-mono">{d.count} plays</div>
                        </div>
                        )}
                        
                        <div className="w-full bg-[#2C2C2E] rounded-t-sm relative overflow-hidden group-hover:bg-[#3C3C3E] transition-colors" style={{ height: `${(d.count / maxPlays) * 100}%` }}>
                            {/* Fill Effect */}
                            <motion.div 
                                initial={{ height: 0 }}
                                animate={{ height: '100%' }}
                                transition={{ duration: 1, delay: i * 0.02 }}
                                className="w-full bg-white/10 absolute bottom-0 left-0"
                            />
                        </div>
                        
                        {/* Label */}
                        <div className="text-[9px] text-[#8E8E93] mt-2 group-hover:text-white transition-colors">
                            {i % 3 === 0 ? i : ''}
                        </div>
                    </div>
                ))}
            </div>
            <div className="text-center text-[10px] text-[#8E8E93] mt-2 font-mono uppercase tracking-widest">Hour of Day (0-23)</div>
        </div>
    );
};
