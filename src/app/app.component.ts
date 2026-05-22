import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

interface Track {
  id: number;
  title: string;
  artist: string;
  album: string;
  cover: string;
  duration: string;
}

interface Playlist {
  title: string;
  description: string;
  image: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  isPlayerOpen = false;
  isPlayerClosing = false;
  isPlaying = false;
  isLiked = false;

  tracks: Track[] = [
    {
      id: 1,
      title: 'Void',
      artist: 'Kedr Livanskiy',
      album: 'Night Signals',
      duration: '4:12',
      cover: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=500&q=80',
    },
    {
      id: 2,
      title: 'Used to Be',
      artist: 'The Plot In You',
      album: 'Static Bloom',
      duration: '3:58',
      cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=500&q=80',
    },
    {
      id: 3,
      title: 'Under the Surface',
      artist: 'The KVB',
      album: 'Echoes Fade',
      duration: '4:47',
      cover: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=500&q=80',
    },
    {
      id: 4,
      title: 'Into the Night',
      artist: 'Austra',
      album: 'Glassheart',
      duration: '3:44',
      cover: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=500&q=80',
    },
  ];

  currentTrack: Track = this.tracks[2];

  playlists: Playlist[] = [
    {
      title: 'Night Drive',
      description: 'Dark, atmospheric tracks for late nights.',
      image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=300&q=80',
    },
    {
      title: 'Black Star Essentials',
      description: 'Our favorite underground picks.',
      image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=300&q=80',
    },
  ];

  selectTrack(track: Track): void {
    this.currentTrack = track;
    this.isPlaying = true;
  }

  toggleTrackPlayback(track: Track, event: Event): void {
    event.stopPropagation();

    const isCurrentTrack = track.id === this.currentTrack.id;

    if (isCurrentTrack) {
      this.isPlaying = !this.isPlaying;
      return;
    }

    this.currentTrack = track;
    this.isPlaying = true;
  }

  selectTrackAndOpenPlayer(track: Track): void {
    this.currentTrack = track;
    this.isPlaying = true;
    this.openPlayer();
  }

  openPlayer(): void {
    this.isPlayerClosing = false;
    this.isPlayerOpen = true;
  }

  closePlayer(): void {
    this.isPlayerClosing = true;

    setTimeout(() => {
      this.isPlayerOpen = false;
      this.isPlayerClosing = false;
    }, 320);
  }

  togglePlay(event?: Event): void {
    event?.stopPropagation();
    this.isPlaying = !this.isPlaying;
  }

  toggleLike(): void {
    this.isLiked = !this.isLiked;
  }

  nextTrack(event?: Event): void {
    event?.stopPropagation();

    const currentIndex = this.tracks.findIndex((track) => track.id === this.currentTrack.id);
    const nextIndex = (currentIndex + 1) % this.tracks.length;

    this.currentTrack = this.tracks[nextIndex];
    this.isPlaying = true;
  }

  previousTrack(event?: Event): void {
    event?.stopPropagation();

    const currentIndex = this.tracks.findIndex((track) => track.id === this.currentTrack.id);
    const previousIndex = currentIndex === 0 ? this.tracks.length - 1 : currentIndex - 1;

    this.currentTrack = this.tracks[previousIndex];
    this.isPlaying = true;
  }
}
