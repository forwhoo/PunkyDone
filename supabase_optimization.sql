-- Optimization: Server-side aggregation for All Time stats
-- Prevents crashing the client with 80k+ records

create or replace function get_all_time_stats()
returns json as $$
declare
    result json;
begin
    with raw_data as (
        -- 1. Combine both tables
        select 
            played_at, 
            track_name, 
            artist_name, 
            album_name, 
            album_cover, 
            duration_ms
        from listening_history
        where played_at is not null
        
        union all
        
        select 
            played_at, 
            track_name, 
            artist_name, 
            album_name, 
            album_cover, 
            duration_ms
        from extended_streaming_history
        where played_at is not null
    ),
    deduped as (
        -- 2. Deduplicate based on timestamp and track name
        -- If duplicate exists (one from each table), keep the one that potentially has a cover (NULLS LAST)
        select distinct on (played_at, track_name)
            *
        from raw_data
        order by played_at, track_name, album_cover nulls last
    ),
    artist_aggregation as (
        select 
            artist_name,
            sum(duration_ms) as total_ms,
            count(*) filter (where duration_ms > 30000) as play_count,
            -- Pick an arbitrary cover art for the artist from their tracks
            max(album_cover) filter (where album_cover is not null and album_cover != '') as artist_image
        from deduped
        where artist_name is not null
        group by artist_name
        order by total_ms desc
        limit 100
    ),
    song_aggregation as (
        select 
            track_name,
            artist_name,
            -- Pick the album cover if available
            max(album_cover) filter (where album_cover is not null and album_cover != '') as cover_image,
            sum(duration_ms) as total_ms,
            count(*) filter (where duration_ms > 30000) as play_count
        from deduped
        where track_name is not null
        group by track_name, artist_name
        order by total_ms desc
        limit 100
    ),
    album_aggregation as (
        select 
            album_name,
            artist_name,
            max(album_cover) filter (where album_cover is not null and album_cover != '') as cover_image,
            sum(duration_ms) as total_ms,
            count(*) filter (where duration_ms > 30000) as play_count
        from deduped
        where album_name is not null and album_name != 'Unknown Album'
        group by album_name, artist_name
        order by total_ms desc
        limit 100
    ),
    global_aggregates as (
        select 
            coalesce(sum(duration_ms), 0) as total_ms,
            count(*) as total_tracks
        from deduped
        where duration_ms > 30000 -- Only count actual plays for the total track count logic, or remove if you want raw
    )
    select json_build_object(
        'totals', (
            select json_build_object(
                'minutes', round(total_ms / 60000.0), 
                'tracks', total_tracks
            ) from global_aggregates
        ),
        'artists', (
            select json_agg(
                json_build_object(
                    'name', artist_name,
                    'image', coalesce(artist_image, ''),
                    'totalListens', play_count,
                    'timeStr', round(total_ms / 60000.0) || 'm',
                    'rawTime', total_ms
                )
            ) from artist_aggregation
        ),
        'songs', (
            select json_agg(
                json_build_object(
                    'title', track_name,
                    'artist', artist_name,
                    'cover', coalesce(cover_image, ''),
                    'listens', play_count,
                    'timeStr', round(total_ms / 60000.0) || 'm',
                    'rawTime', total_ms
                )
            ) from song_aggregation
        ),
        'albums', (
            select json_agg(
                json_build_object(
                    'title', album_name,
                    'artist', artist_name,
                    'cover', coalesce(cover_image, ''),
                    'totalListens', play_count,
                    'timeStr', round(total_ms / 60000.0) || 'm',
                    'rawTime', total_ms
                )
            ) from album_aggregation
        )
    ) into result;

    return result;
end;
$$ language plpgsql;
