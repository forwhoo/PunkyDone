-- ============================================================
-- ALBUM COVER BACKFILL FUNCTIONS
-- Run this in Supabase SQL Editor
-- ============================================================

-- STEP 1: Borrow covers from listening_history
-- This copies album covers from listening_history to extended_streaming_history
-- where the track+artist OR album+artist matches
CREATE OR REPLACE FUNCTION backfill_covers_from_history()
RETURNS json AS $$
DECLARE
    updated_by_track int := 0;
    updated_by_album int := 0;
BEGIN
    -- First: Match by exact track + artist
    WITH matches AS (
        SELECT DISTINCT ON (e.id)
            e.id as extended_id,
            l.album_cover
        FROM extended_streaming_history e
        JOIN listening_history l 
            ON LOWER(e.track_name) = LOWER(l.track_name)
            AND LOWER(e.artist_name) = LOWER(l.artist_name)
        WHERE e.album_cover IS NULL
            AND l.album_cover IS NOT NULL
            AND l.album_cover != ''
    )
    UPDATE extended_streaming_history e
    SET album_cover = m.album_cover
    FROM matches m
    WHERE e.id = m.extended_id;
    
    GET DIAGNOSTICS updated_by_track = ROW_COUNT;
    
    -- Second: Match by album + artist (for remaining NULLs)
    WITH matches AS (
        SELECT DISTINCT ON (e.id)
            e.id as extended_id,
            l.album_cover
        FROM extended_streaming_history e
        JOIN listening_history l 
            ON LOWER(e.album_name) = LOWER(l.album_name)
            AND LOWER(e.artist_name) = LOWER(l.artist_name)
        WHERE e.album_cover IS NULL
            AND l.album_cover IS NOT NULL
            AND l.album_cover != ''
    )
    UPDATE extended_streaming_history e
    SET album_cover = m.album_cover
    FROM matches m
    WHERE e.id = m.extended_id;
    
    GET DIAGNOSTICS updated_by_album = ROW_COUNT;
    
    RETURN json_build_object(
        'updated_by_track_match', updated_by_track,
        'updated_by_album_match', updated_by_album,
        'total_updated', updated_by_track + updated_by_album
    );
END;
$$ LANGUAGE plpgsql;

-- STEP 2: Get albums that still need covers
-- Returns up to 500 unique album+artist pairs that have NULL album_cover
CREATE OR REPLACE FUNCTION get_albums_needing_covers(max_results int DEFAULT 500)
RETURNS TABLE(album_name text, artist_name text, record_count bigint) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.album_name,
        e.artist_name,
        COUNT(*) as record_count
    FROM extended_streaming_history e
    WHERE e.album_cover IS NULL
        AND e.album_name IS NOT NULL
        AND e.artist_name IS NOT NULL
        AND e.album_name != ''
        AND e.artist_name != ''
    GROUP BY e.album_name, e.artist_name
    ORDER BY record_count DESC
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- STEP 3: Bulk update album covers
-- Takes a JSON array of {album, artist, cover} objects and updates all matching records
CREATE OR REPLACE FUNCTION update_album_covers(covers json)
RETURNS json AS $$
DECLARE
    item json;
    total_updated int := 0;
    albums_processed int := 0;
    row_count int;
BEGIN
    FOR item IN SELECT * FROM json_array_elements(covers)
    LOOP
        UPDATE extended_streaming_history
        SET album_cover = item->>'cover'
        WHERE LOWER(album_name) = LOWER(item->>'album')
            AND LOWER(artist_name) = LOWER(item->>'artist')
            AND album_cover IS NULL;
        
        GET DIAGNOSTICS row_count = ROW_COUNT;
        total_updated := total_updated + row_count;
        albums_processed := albums_processed + 1;
    END LOOP;
    
    RETURN json_build_object(
        'albums_processed', albums_processed,
        'records_updated', total_updated
    );
END;
$$ LANGUAGE plpgsql;

-- STEP 4: Count remaining NULL covers (for diagnostics)
CREATE OR REPLACE FUNCTION count_null_covers()
RETURNS json AS $$
DECLARE
    null_count bigint;
    total_count bigint;
    unique_albums bigint;
BEGIN
    SELECT COUNT(*) INTO total_count FROM extended_streaming_history;
    SELECT COUNT(*) INTO null_count FROM extended_streaming_history WHERE album_cover IS NULL;
    SELECT COUNT(DISTINCT album_name || '|||' || artist_name) INTO unique_albums 
    FROM extended_streaming_history WHERE album_cover IS NULL AND album_name IS NOT NULL;
    
    RETURN json_build_object(
        'total_records', total_count,
        'null_covers', null_count,
        'with_covers', total_count - null_count,
        'unique_albums_needing_covers', unique_albums,
        'percent_complete', ROUND(((total_count - null_count)::numeric / NULLIF(total_count, 0)) * 100, 1)
    );
END;
$$ LANGUAGE plpgsql;
