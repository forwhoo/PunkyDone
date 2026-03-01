import React from 'react';

export const ChartSkeleton = () => (
    <div className="flex items-start overflow-x-auto pb-8 pt-2 no-scrollbar snap-x pl-6 gap-4 animate-in fade-in duration-700">
        {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="flex-shrink-0 relative flex items-center w-[180px] md:w-[220px]">
                <div className="relative z-10 ml-10 md:ml-12 w-full">
                    {/* Image Skeleton */}
                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-xl bg-[#2C2C2E] animate-pulse" />
                    
                    {/* Text Skeleton */}
                    <div className="mt-3 space-y-2">
                        <div className="h-4 bg-[#2C2C2E] rounded w-32 md:w-40 animate-pulse" />
                        <div className="h-3 bg-[#2C2C2E]/50 rounded w-24 md:w-32 animate-pulse" />
                    </div>
                </div>
            </div>
        ))}
    </div>
);

export const StatsCardSkeleton = () => (
    <div className="bg-[#252523] border border-[#3A3A37] rounded-2xl p-6 animate-pulse">
        <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-[#2C2C2E] rounded w-32" />
            <div className="h-8 w-8 bg-[#2C2C2E] rounded-full" />
        </div>
        <div className="h-12 bg-[#2C2C2E] rounded w-24 mb-2" />
        <div className="h-4 bg-[#2C2C2E]/50 rounded w-full" />
    </div>
);

export const GridSkeleton = ({ count = 6 }: { count?: number }) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 animate-in fade-in duration-700">
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="animate-pulse">
                <div className="w-full aspect-square rounded-xl bg-[#2C2C2E] mb-2" />
                <div className="h-3 bg-[#2C2C2E] rounded w-full mb-1" />
                <div className="h-2 bg-[#2C2C2E]/50 rounded w-3/4" />
            </div>
        ))}
    </div>
);
