import { Injectable, computed, inject, signal } from '@angular/core';
import { TRACKS } from '../data/mock-music.data';
import { Track } from '../models/music.model';
import { SpotifyPlayerService } from '../services/spotify-player.service';
import { ToastService } from '../services/toast.service';
import { BrowseStateService } from './browse-state.service';

export type RepeatMode = 'off' | 'context' | 'track';

@Injectable({
  providedIn: 'root',
})
export class PlaybackStateService {
  private readonly spotifyPlayer = inject(SpotifyPlayerService);
  private readonly browseState = inject(BrowseStateService);
  private readonly toast = inject(ToastService);

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

  setPlaying(isPlaying: boolean): void {
    this.isPlaying.set(isPlaying);
  }

  async selectTrack(track: Track): Promise<void> {
    this.setCurrentTrack(track);
    this.setPlaying(true);
    this.browseState.moveTrackToTop(track);

    try {
      await this.playCurrentTrackOnSpotify();
    } catch (error) {
      console.error('Could not play Spotify track:', error);
      this.setPlaying(false);
      this.toast.error('Could not play this track.');
    }
  }

  async selectTrackAndOpenPlayer(track: Track): Promise<void> {
    this.openPlayer();
    await this.selectTrack(track);
  }

  async toggleTrackPlayback(track: Track, event?: Event): Promise<void> {
    event?.stopPropagation();

    const isSameTrack = track.id === this.currentTrack().id;

    if (isSameTrack) {
      await this.togglePlay();
      return;
    }

    await this.selectTrack(track);
  }

  async togglePlay(event?: Event): Promise<void> {
    event?.stopPropagation();

    const shouldPause = this.isPlaying();

    if (shouldPause) {
      this.setPlaying(false);

      try {
        await this.spotifyPlayer.togglePlayback();
      } catch (error) {
        console.error('Could not pause Spotify playback:', error);
        this.setPlaying(true);
        this.toast.error('Could not pause playback.');
      }

      return;
    }

    this.setPlaying(true);

    try {
      await this.playCurrentTrackOnSpotify();
    } catch (error) {
      console.error('Could not resume Spotify playback:', error);
      this.setPlaying(false);
      this.toast.error('Could not play this track.');
    }
  }

  async nextTrack(event?: Event): Promise<void> {
    event?.stopPropagation();

    const tracks = this.browseState.recentlyPlayedTracks();

    if (!tracks.length) {
      return;
    }

    const currentIndex = tracks.findIndex(
      (track) => track.id === this.currentTrack().id
    );

    const nextIndex = this.isShuffleEnabled()
      ? this.getRandomTrackIndex(tracks.length, currentIndex)
      : currentIndex >= 0
        ? (currentIndex + 1) % tracks.length
        : 0;

    await this.selectTrack(tracks[nextIndex]);
  }

  async previousTrack(event?: Event): Promise<void> {
    event?.stopPropagation();

    const tracks = this.browseState.recentlyPlayedTracks();

    if (!tracks.length) {
      return;
    }

    const currentIndex = tracks.findIndex(
      (track) => track.id === this.currentTrack().id
    );

    const previousIndex =
      currentIndex > 0
        ? currentIndex - 1
        : tracks.length - 1;

    await this.selectTrack(tracks[previousIndex]);
  }

  openPlayer(): void {
    this.isPlayerOpen.set(true);
  }

  closePlayer(): void {
    this.isPlayerOpen.set(false);
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

  setVolume(volume: number): void {
    const normalizedVolume = Math.min(Math.max(volume, 0), 100);

    this.volumePercent.set(normalizedVolume);
    this.isMuted.set(normalizedVolume === 0);

    if (normalizedVolume > 0) {
      this.previousVolumePercent.set(normalizedVolume);
    }
  }

  mute(): void {
    const currentVolume = this.volumePercent();

    if (currentVolume > 0) {
      this.previousVolumePercent.set(currentVolume);
    }

    this.volumePercent.set(0);
    this.isMuted.set(true);
  }

  unmute(): void {
    const restoredVolume = this.previousVolumePercent() || 70;

    this.volumePercent.set(restoredVolume);
    this.isMuted.set(false);
  }

  toggleMuteState(): number {
    if (this.isMuted() || this.volumePercent() === 0) {
      this.unmute();
      return this.volumePercent();
    }

    this.mute();
    return 0;
  }

  toggleShuffleState(): boolean {
    const nextValue = !this.isShuffleEnabled();

    this.isShuffleEnabled.set(nextValue);

    return nextValue;
  }

  setShuffleState(value: boolean): void {
    this.isShuffleEnabled.set(value);
  }

  cycleRepeatState(): RepeatMode {
    const currentMode = this.repeatMode();

    const nextMode: RepeatMode =
      currentMode === 'off'
        ? 'context'
        : currentMode === 'context'
          ? 'track'
          : 'off';

    this.repeatMode.set(nextMode);

    return nextMode;
  }

  setRepeatMode(mode: RepeatMode): void {
    this.repeatMode.set(mode);
  }

  async setSpotifyVolumeFromEvent(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const volume = Number(input.value);

    const previousVolume = this.volumePercent();
    const previousMutedState = this.isMuted();

    this.setVolume(volume);

    try {
      await this.spotifyPlayer.setVolume(volume / 100);
    } catch (error) {
      console.error('Could not update Spotify volume:', error);

      this.volumePercent.set(previousVolume);
      this.isMuted.set(previousMutedState);

      this.toast.error('Could not update volume.');
    }
  }

  async toggleSpotifyMute(): Promise<void> {
    const previousVolume = this.volumePercent();
    const previousMutedState = this.isMuted();

    const nextVolume = this.toggleMuteState();

    try {
      await this.spotifyPlayer.setVolume(nextVolume / 100);
    } catch (error) {
      console.error('Could not update Spotify mute:', error);

      this.volumePercent.set(previousVolume);
      this.isMuted.set(previousMutedState);

      this.toast.error('Could not update volume.');
    }
  }

  async toggleSpotifyShuffle(): Promise<void> {
    const nextValue = this.toggleShuffleState();

    try {
      await this.spotifyPlayer.setShuffle(nextValue);
    } catch (error) {
      console.error('Could not update Spotify shuffle:', error);

      this.setShuffleState(!nextValue);

      this.toast.error('Could not update shuffle.');
    }
  }

  async cycleSpotifyRepeatMode(): Promise<void> {
    const previousMode = this.repeatMode();
    const nextMode = this.cycleRepeatState();

    try {
      await this.spotifyPlayer.setRepeat(nextMode);
    } catch (error) {
      console.error('Could not update Spotify repeat:', error);

      this.setRepeatMode(previousMode);

      this.toast.error('Could not update repeat mode.');
    }
  }

  setSpotifyDevice(data: {
    name: string | null;
    type: string | null;
    isExternal: boolean;
  }): void {
    this.activeSpotifyDeviceName.set(data.name);
    this.activeSpotifyDeviceType.set(data.type);
    this.isExternalPlaybackActive.set(data.isExternal);
  }

  clearSpotifyDevice(): void {
    this.activeSpotifyDeviceName.set(null);
    this.activeSpotifyDeviceType.set(null);
    this.isExternalPlaybackActive.set(false);
  }

  setPlaybackSyncEnabled(value: boolean): void {
    this.isPlaybackSyncEnabled.set(value);
  }

  private async playCurrentTrackOnSpotify(): Promise<void> {
    const track = this.currentTrack();

    if (!track.spotifyUri) {
      throw new Error('Missing Spotify track URI.');
    }

    await this.spotifyPlayer.playTrack(track.spotifyUri);
  }

  private getRandomTrackIndex(totalTracks: number, currentIndex: number): number {
    if (totalTracks <= 1) {
      return 0;
    }

    let nextIndex = currentIndex;

    while (nextIndex === currentIndex) {
      nextIndex = Math.floor(Math.random() * totalTracks);
    }

    return nextIndex;
  }

  private formatTime(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
