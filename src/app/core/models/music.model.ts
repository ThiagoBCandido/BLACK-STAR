export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  cover: string;
  duration: string;
  durationMs?: number;
  spotifyUri?: string;
  spotifyUrl?: string;
}

export interface Playlist {
  title: string;
  description: string;
  image: string;
}