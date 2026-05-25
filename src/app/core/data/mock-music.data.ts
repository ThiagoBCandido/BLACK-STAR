import { Playlist, Track } from '../models/music.model';

export const TRACKS: Track[] = [
  {
    id: 'mock-1',
    title: 'Void',
    artist: 'Kedr Livanskiy',
    album: 'Night Signals',
    duration: '4:12',
    cover: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'mock-2',
    title: 'Used to Be',
    artist: 'The Plot In You',
    album: 'Static Bloom',
    duration: '3:58',
    cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'mock-3',
    title: 'Under the Surface',
    artist: 'The KVB',
    album: 'Echoes Fade',
    duration: '4:47',
    cover: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'mock-4',
    title: 'Into the Night',
    artist: 'Austra',
    album: 'Glassheart',
    duration: '3:44',
    cover: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=500&q=80',
  },
];

export const PLAYLISTS: Playlist[] = [
  {
    id: 'mock-playlist-1',
    title: 'Night Drive',
    description: 'Dark, atmospheric tracks for late nights.',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=300&q=80',
    owner: 'BLACK STAR',
    totalTracks: 12,
  },
  {
    id: 'mock-playlist-2',
    title: 'Black Star Essentials',
    description: 'Our favorite underground picks.',
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=300&q=80',
    owner: 'BLACK STAR',
    totalTracks: 24,
  },
];