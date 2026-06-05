import { Playlist, Track } from '../models/music.model';

export const TRACKS: Track[] = [
  {
    id: 'mock-1',
    title: 'Midnight Static',
    artist: 'Noir Signal',
    album: 'Black Frequency',
    duration: '3:42',
    durationMs: 222000,
    cover: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'mock-2',
    title: 'Neon Burial',
    artist: 'Glass District',
    album: 'After Hours',
    duration: '4:05',
    durationMs: 245000,
    cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'mock-3',
    title: 'Cold Engine',
    artist: 'Velvet Ashes',
    album: 'Machine Heart',
    duration: '3:28',
    durationMs: 208000,
    cover: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'mock-4',
    title: 'Night Transmission',
    artist: 'Black Halo',
    album: 'Signal Lost',
    duration: '4:16',
    durationMs: 256000,
    cover: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'mock-5',
    title: 'Low Light Ritual',
    artist: 'Saint Voltage',
    album: 'Nocturne City',
    duration: '3:55',
    durationMs: 235000,
    cover: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'mock-6',
    title: 'Chrome Ghosts',
    artist: 'Static Bloom',
    album: 'Dead Neon',
    duration: '4:31',
    durationMs: 271000,
    cover: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'mock-7',
    title: 'Afterimage',
    artist: 'Lunar Method',
    album: 'Dark Room',
    duration: '3:36',
    durationMs: 216000,
    cover: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'mock-8',
    title: 'Basement Sun',
    artist: 'Echo Frame',
    album: 'Concrete Dreams',
    duration: '4:02',
    durationMs: 242000,
    cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=500&q=80',
  },
];

export const PLAYLISTS: Playlist[] = [
  {
    id: 'mock-playlist-1',
    title: 'Night Drive',
    description: 'Dark, atmospheric tracks for late nights.',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=500&q=80',
    owner: 'BLACK STAR',
    totalTracks: 4,
    isAccessible: true,
  },
  {
    id: 'mock-playlist-2',
    title: 'Black Star Essentials',
    description: 'A demo collection with the BLACK STAR identity.',
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=500&q=80',
    owner: 'BLACK STAR',
    totalTracks: 4,
    isAccessible: true,
  },
];

export const DEMO_PLAYLIST_TRACKS: Record<string, Track[]> = {
  'mock-playlist-1': [TRACKS[0], TRACKS[2], TRACKS[4], TRACKS[6]],
  'mock-playlist-2': [TRACKS[1], TRACKS[3], TRACKS[5], TRACKS[7]],
};