import { Artist, Album, Song, ChartDataPoint } from '../types';

export const MOCK_ARTISTS: Artist[] = [
  { id: '1', name: 'The Weeknd', image: 'https://picsum.photos/400/400?random=1', totalListens: 84500000, trend: 12 },
  { id: '2', name: 'Taylor Swift', image: 'https://picsum.photos/400/400?random=2', totalListens: 102300000, trend: 5 },
  { id: '3', name: 'Bad Bunny', image: 'https://picsum.photos/400/400?random=3', totalListens: 67200000, trend: -2 },
  { id: '4', name: 'Drake', image: 'https://picsum.photos/400/400?random=4', totalListens: 55100000, trend: 1 },
  { id: '5', name: 'SZA', image: 'https://picsum.photos/400/400?random=5', totalListens: 42000000, trend: 15 },
];

export const MOCK_ALBUMS: Album[] = [
  { id: '1', title: 'Midnights', artist: 'Taylor Swift', cover: 'https://picsum.photos/400/400?random=6', year: 2022, totalListens: 45000000 },
  { id: '2', title: 'SOS', artist: 'SZA', cover: 'https://picsum.photos/400/400?random=7', year: 2022, totalListens: 38000000 },
  { id: '3', title: 'Un Verano Sin Ti', artist: 'Bad Bunny', cover: 'https://picsum.photos/400/400?random=8', year: 2022, totalListens: 62000000 },
  { id: '4', title: 'Starboy', artist: 'The Weeknd', cover: 'https://picsum.photos/400/400?random=9', year: 2016, totalListens: 29000000 },
];

export const MOCK_SONGS: Song[] = [
  { id: '1', title: 'Anti-Hero', artist: 'Taylor Swift', album: 'Midnights', cover: 'https://picsum.photos/400/400?random=6', duration: '3:20', listens: 12500000, dailyChange: 24000 },
  { id: '2', title: 'Kill Bill', artist: 'SZA', album: 'SOS', cover: 'https://picsum.photos/400/400?random=7', duration: '2:33', listens: 11200000, dailyChange: 18500 },
  { id: '3', title: 'As It Was', artist: 'Harry Styles', album: 'Harry\'s House', cover: 'https://picsum.photos/400/400?random=10', duration: '2:47', listens: 9800000, dailyChange: 12000 },
  { id: '4', title: 'Creepin\'', artist: 'Metro Boomin', album: 'Heroes & Villains', cover: 'https://picsum.photos/400/400?random=11', duration: '3:41', listens: 8400000, dailyChange: 32000 },
  { id: '5', title: 'Die For You', artist: 'The Weeknd', album: 'Starboy', cover: 'https://picsum.photos/400/400?random=9', duration: '3:50', listens: 15600000, dailyChange: 5000 },
];

export const MOCK_CHART_DATA: ChartDataPoint[] = [
  { day: 'Mon', listens: 4500 },
  { day: 'Tue', listens: 5200 },
  { day: 'Wed', listens: 4900 },
  { day: 'Thu', listens: 6300 },
  { day: 'Fri', listens: 8500 },
  { day: 'Sat', listens: 9100 },
  { day: 'Sun', listens: 7600 },
];

export const MOCK_HOURLY_ACTIVITY = [
    { time: '12 AM', value: 20, song: MOCK_SONGS[0] },
    { time: '1 AM', value: 15, song: MOCK_SONGS[4] },
    { time: '2 AM', value: 5, song: MOCK_SONGS[4] },
    { time: '3 AM', value: 2, song: null },
    { time: '4 AM', value: 0, song: null },
    { time: '5 AM', value: 0, song: null },
    { time: '6 AM', value: 10, song: MOCK_SONGS[2] },
    { time: '7 AM', value: 35, song: MOCK_SONGS[2] },
    { time: '8 AM', value: 55, song: MOCK_SONGS[1] },
    { time: '9 AM', value: 45, song: MOCK_SONGS[3] },
    { time: '10 AM', value: 30, song: MOCK_SONGS[0] },
    { time: '11 AM', value: 40, song: MOCK_SONGS[1] },
    { time: '12 PM', value: 65, song: MOCK_SONGS[4] },
    { time: '1 PM', value: 50, song: MOCK_SONGS[3] },
    { time: '2 PM', value: 45, song: MOCK_SONGS[2] },
    { time: '3 PM', value: 60, song: MOCK_SONGS[0] },
    { time: '4 PM', value: 80, song: MOCK_SONGS[1] },
    { time: '5 PM', value: 95, song: MOCK_SONGS[4] },
    { time: '6 PM', value: 85, song: MOCK_SONGS[3] },
    { time: '7 PM', value: 70, song: MOCK_SONGS[0] },
    { time: '8 PM', value: 90, song: MOCK_SONGS[1] },
    { time: '9 PM', value: 60, song: MOCK_SONGS[2] },
    { time: '10 PM', value: 40, song: MOCK_SONGS[4] },
    { time: '11 PM', value: 30, song: MOCK_SONGS[0] },
];