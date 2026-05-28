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
  id: string;
  title: string;
  description: string;
  image: string;
  owner?: string;
  ownerId?: string;
  totalTracks?: number;
  collaborative?: boolean;
  isOwnedByCurrentUser?: boolean;
  isAccessible?: boolean;
  spotifyUri?: string;
  spotifyUrl?: string;
}
