import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getObsessionScore } from './dbService';
import { supabase } from './supabaseClient';

// Mock the supabase client
vi.mock('./supabaseClient', () => ({
    supabase: {
        from: vi.fn(),
    },
}));

describe('getObsessionScore', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // Helper to setup the mock chain
    const setupMock = (data: any[] | null, error: any = null) => {
        const queryBuilder: any = {
            select: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            ilike: vi.fn().mockReturnThis(),
            then: (resolve: any) => resolve({ data, error }),
        };
        (supabase.from as any).mockReturnValue(queryBuilder);
        return queryBuilder;
    };

    it('should return null if supabase returns an error', async () => {
        setupMock(null, { message: 'Supabase error' });
        const result = await getObsessionScore('Test Artist');
        expect(result).toBeNull();
    });

    it('should return null if no data is returned', async () => {
        setupMock([]);
        const result = await getObsessionScore('Test Artist');
        expect(result).toBeNull();
    });

    it('should calculate obsession score correctly for a single artist', async () => {
        const mockData = [
            // 8 plays for Song A
            ...Array(8).fill({ artist_name: 'Artist A', track_name: 'Song A', album_cover: 'cover.jpg' }),
            // 2 plays for Song B
            ...Array(2).fill({ artist_name: 'Artist A', track_name: 'Song B', album_cover: 'cover.jpg' }),
        ];

        setupMock(mockData);

        const result = await getObsessionScore();

        expect(result).not.toBeNull();
        expect(result?.artist).toBe('Artist A');
        expect(result?.total_plays).toBe(10);
        expect(result?.top_song).toBe('Song A');

        // Calculation:
        // Top song (Song A) plays: 8
        // Total plays: 10
        // Dominance: (8 / 10) * 100 = 80%
        // Log10(10) = 1
        // Score: 80 * (1 + 1) = 160
        expect(result?.obsession_score).toBe(160);
    });

    it('should select the artist with the highest obsession score', async () => {
        const mockData = [
            // Artist A: 10 plays, 8 for top song -> Score 160 (from previous test)
            ...Array(8).fill({ artist_name: 'Artist A', track_name: 'Song A', album_cover: 'coverA.jpg' }),
            ...Array(2).fill({ artist_name: 'Artist A', track_name: 'Song B', album_cover: 'coverA.jpg' }),

            // Artist B: 100 plays, 50 for top song -> Dominance 50%
            // Log10(100) = 2
            // Score: 50 * (1 + 2) = 150
            ...Array(50).fill({ artist_name: 'Artist B', track_name: 'Hit Song', album_cover: 'coverB.jpg' }),
            ...Array(50).fill({ artist_name: 'Artist B', track_name: 'Other Song', album_cover: 'coverB.jpg' }),
        ];

        setupMock(mockData);

        const result = await getObsessionScore();

        // Expect Artist A because 160 > 150
        expect(result?.artist).toBe('Artist A');
        expect(result?.obsession_score).toBe(160);
    });

    it('should ignore artists with fewer than 3 plays', async () => {
        const mockData = [
            { artist_name: 'Small Artist', track_name: 'Song 1', album_cover: 'cover.jpg' },
            { artist_name: 'Small Artist', track_name: 'Song 1', album_cover: 'cover.jpg' },
        ];

        setupMock(mockData);

        const result = await getObsessionScore();
        expect(result).toBeNull();
    });

    it('should apply filters correctly', async () => {
        const queryBuilder = setupMock([]);

        const startDate = '2023-01-01';
        const endDate = '2023-01-31';
        const artistName = 'Filtered Artist';

        await getObsessionScore(artistName, startDate, endDate);

        expect(queryBuilder.gte).toHaveBeenCalledWith('played_at', new Date(startDate).toISOString());
        expect(queryBuilder.lte).toHaveBeenCalledWith('played_at', new Date(endDate).toISOString());
        expect(queryBuilder.ilike).toHaveBeenCalledWith('artist_name', `%${artistName}%`);
    });

    it('should not apply filters if not provided', async () => {
        const queryBuilder = setupMock([]);

        await getObsessionScore();

        expect(queryBuilder.gte).not.toHaveBeenCalled();
        expect(queryBuilder.lte).not.toHaveBeenCalled();
        expect(queryBuilder.ilike).not.toHaveBeenCalled();
    });
});
