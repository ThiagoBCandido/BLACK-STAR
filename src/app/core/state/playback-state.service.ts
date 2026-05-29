import { Injectable, computed, signal } from '@angular/core';
import { TRACKS } from '../data/mock-music.data';
import { Track } from '../models/music.model';

export type RepeatMode = 'off' | 'context' | 'track';

@Injectable({
  providedIn: 'root',
})
export class PlaybackStateService {
  readonly currentTrack = signal<Track>(TRACKS[0]);
  readonly isPlaying = signal(false);
  readonly isPlayerOpen = signal(false);

  readonly positionMs = signal(0);
  readonly progressMs = this.positionMs;
  readonly durationMs = signal(TRACKS[0].durationMs ?? 0);

  readonly volumePercent = signal(70);
  readonly previousVolumePercent = signal(70);
  readonly isMuted = signal(false);

  readonly isShuffleEnabled = signal(false);
  readonly repeatMode = signal<RepeatMode>('off');

  readonly activeSpotifyDeviceName = signal<string | null>(null);
  readonly activeSpotifyDeviceType = signal<string | null>(null);
  readonly isExternalPlaybackActive = signal(false);
  readonly isPlaybackSyncEnabled = signal(false);

  readonly progressPercent = computed(() => {
    const duration = this.durationMs();

    if (!duration) {
      return 0;
    }

    const progress = (this.positionMs() / duration) * 100;

    return Math.min(Math.max(progress, 0), 100);
  });

  readonly currentTime = computed(() => this.formatTime(this.positionMs()));
  readonly durationTime = computed(() => this.formatTime(this.durationMs()));
  readonly totalTime = this.durationTime;

  setCurrentTrack(track: Track): void {
    this.currentTrack.set(track);
    this.durationMs.set(track.durationMs ?? 0);
    this.positionMs.set(0);
  }

  setPlaybackProgress(positionMs: number, durationMs?: number): void {
    this.positionMs.set(Math.max(positionMs, 0));

    if (durationMs !== undefined) {
      this.durationMs.set(Math.max(durationMs, 0));
    }
  }

  resetPlaybackProgress(): void {
    this.positionMs.set(0);
  }

  openPlayer(): void {
    this.isPlayerOpen.set(true);
  }

  closePlayer(): void {
    this.isPlayerOpen.set(false);
  }

  private formatTime(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}