import { Injectable, signal, inject } from '@angular/core';
import { SpotifyAuthService } from './spotify-auth.service';

interface SpotifyPlaybackTrack {
  id: string;
  name: string;
  uri: string;
  duration_ms: number;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
}

interface SpotifyPlaybackState {
  paused: boolean;
  position: number;
  duration: number;
  track_window: {
    current_track: SpotifyPlaybackTrack;
  };
}

interface SpotifyPlayer {
  connect(): Promise<boolean>;
  disconnect(): void;
  togglePlay(): Promise<void>;
  nextTrack(): Promise<void>;
  previousTrack(): Promise<void>;
  activateElement(): Promise<void>;
  getCurrentState(): Promise<SpotifyPlaybackState | null>;
  seek(positionMs: number): Promise<void>;
  getVolume(): Promise<number>;
  setVolume(volume: number): Promise<void>;
  addListener(event: string, callback: (data: any) => void): boolean;
  removeListener(event: string): boolean;
}

interface SpotifyPlayerOptions {
  name: string;
  getOAuthToken: (callback: (token: string) => void) => void;
  volume?: number;
}

interface SpotifySdk {
  Player: new (options: SpotifyPlayerOptions) => SpotifyPlayer;
}

declare global {
  interface Window {
    Spotify?: SpotifySdk;
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

@Injectable({
  providedIn: 'root',
})
export class SpotifyPlayerService {
  private readonly auth = inject(SpotifyAuthService);

  readonly deviceId = signal<string | null>(null);
  readonly isReady = signal(false);
  readonly isInitializing = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly playbackState = signal<SpotifyPlaybackState | null>(null);
  readonly isPaused = signal(true);
  readonly positionMs = signal(0);
  readonly durationMs = signal(0);
  readonly currentTrackUri = signal<string | null>(null);
  readonly isShuffleEnabled = signal(false);
  readonly repeatMode = signal<'off' | 'context' | 'track'>('off');
  readonly volumePercent = signal(80);
  readonly isMuted = signal(false);

  private readonly sdkScriptId = 'spotify-web-playback-sdk';
  private readonly apiBaseUrl = 'https://api.spotify.com/v1';

  private player: SpotifyPlayer | null = null;
  private sdkLoadPromise: Promise<void> | null = null;
  private progressIntervalId: ReturnType<typeof setInterval> | null = null;
  private lastVolumeBeforeMute = 80;

  async initialize(): Promise<void> {
    if (this.player || this.isInitializing()) {
      return;
    }

    const token = this.auth.getAccessToken();

    if (!token) {
      this.errorMessage.set('Spotify access token is missing.');
      return;
    }

    this.isInitializing.set(true);
    this.errorMessage.set(null);

    try {
      await this.loadSdk();

      if (!window.Spotify?.Player) {
        throw new Error('Spotify Web Playback SDK was not loaded.');
      }

      this.player = new window.Spotify.Player({
        name: 'BLACK STAR Player',
        getOAuthToken: (callback) => {
          const accessToken = this.auth.getAccessToken();

          if (accessToken) {
            callback(accessToken);
          }
        },
        volume: 0.8,
      });

      this.registerPlayerListeners(this.player);

      const connected = await this.player.connect();

      if (!connected) {
        throw new Error('Could not connect BLACK STAR player.');
      }

      await this.waitUntilReady();
      await this.loadVolumeFromPlayer();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Spotify player error.';
      this.errorMessage.set(message);
      console.error(error);
    } finally {
      this.isInitializing.set(false);
    }
  }

  async playTrack(uri: string): Promise<void> {
    if (!uri) {
      return;
    }

    await this.ensureReady();

    if (!this.player || !this.deviceId()) {
      throw new Error('Spotify player is not ready.');
    }

    try {
      await this.player.activateElement();
    } catch {
      // Alguns navegadores exigem interação direta do usuário.
    }

    await this.transferPlayback(false);
    await this.startPlayback(uri);
  }

  async togglePlayback(): Promise<void> {
    await this.ensureReady();

    if (!this.player) {
      return;
    }

    await this.player.togglePlay();
  }

  async seekTo(positionMs: number): Promise<void> {
    await this.ensureReady();

    if (!this.player) {
      return;
    }

    const safePosition = Math.max(0, Math.min(positionMs, this.durationMs()));

    await this.player.seek(safePosition);
    this.positionMs.set(safePosition);
  }

  async setVolumePercent(percent: number): Promise<void> {
    await this.ensureReady();

    if (!this.player) {
      return;
    }

    const safePercent = Math.max(0, Math.min(percent, 100));
    const sdkVolume = safePercent / 100;

    await this.player.setVolume(sdkVolume);

    this.volumePercent.set(safePercent);
    this.isMuted.set(safePercent === 0);

    if (safePercent > 0) {
      this.lastVolumeBeforeMute = safePercent;
    }
  }

  async toggleMute(): Promise<void> {
    const shouldMute = this.volumePercent() > 0;
    const nextVolume = shouldMute ? 0 : this.lastVolumeBeforeMute || 80;

    await this.setVolumePercent(nextVolume);
  }

  async nextTrack(): Promise<void> {
    await this.ensureReady();

    if (!this.player) {
      return;
    }

    await this.player.nextTrack();
  }

  async previousTrack(): Promise<void> {
    await this.ensureReady();

    if (!this.player) {
      return;
    }

    await this.player.previousTrack();
  }

  async toggleShuffle(): Promise<void> {
    const nextState = !this.isShuffleEnabled();

    await this.request(`/me/player/shuffle?state=${nextState}`, {
      method: 'PUT',
    });

    this.isShuffleEnabled.set(nextState);
  }

  async cycleRepeatMode(): Promise<void> {
    const currentMode = this.repeatMode();

    const nextMode =
      currentMode === 'off'
        ? 'context'
        : currentMode === 'context'
          ? 'track'
          : 'off';

    await this.request(`/me/player/repeat?state=${nextMode}`, {
      method: 'PUT',
    });

    this.repeatMode.set(nextMode);
  }

  async refreshCurrentState(): Promise<void> {
    if (!this.player) {
      return;
    }

    const state = await this.player.getCurrentState();

    if (state) {
      this.updatePlaybackState(state);
    }
  }

  disconnect(): void {
    this.clearProgressTimer();

    this.player?.disconnect();
    this.player = null;

    this.deviceId.set(null);
    this.isReady.set(false);
    this.playbackState.set(null);
    this.isPaused.set(true);
    this.positionMs.set(0);
    this.durationMs.set(0);
    this.currentTrackUri.set(null);
  }

  private async ensureReady(): Promise<void> {
    if (!this.player || !this.isReady()) {
      await this.initialize();
    }

    if (!this.deviceId()) {
      await this.waitUntilReady();
    }
  }

  private async loadVolumeFromPlayer(): Promise<void> {
    if (!this.player) {
      return;
    }

    try {
      const volume = await this.player.getVolume();
      const percent = Math.round(volume * 100);

      this.volumePercent.set(percent);
      this.isMuted.set(percent === 0);

      if (percent > 0) {
        this.lastVolumeBeforeMute = percent;
      }
    } catch (error) {
      console.error('Could not load Spotify player volume:', error);
    }
  }

  private loadSdk(): Promise<void> {
    if (window.Spotify?.Player) {
      return Promise.resolve();
    }

    if (this.sdkLoadPromise) {
      return this.sdkLoadPromise;
    }

    this.sdkLoadPromise = new Promise((resolve, reject) => {
      window.onSpotifyWebPlaybackSDKReady = () => {
        resolve();
      };

      const existingScript = document.getElementById(this.sdkScriptId);

      if (existingScript) {
        return;
      }

      const script = document.createElement('script');
      script.id = this.sdkScriptId;
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;

      script.onerror = () => {
        reject(new Error('Could not load Spotify Web Playback SDK.'));
      };

      document.body.appendChild(script);
    });

    return this.sdkLoadPromise;
  }

  private registerPlayerListeners(player: SpotifyPlayer): void {
    player.addListener('ready', ({ device_id }: { device_id: string }) => {
      console.log('BLACK STAR Spotify device ready:', device_id);

      this.deviceId.set(device_id);
      this.isReady.set(true);
      this.errorMessage.set(null);
    });

    player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
      console.warn('BLACK STAR Spotify device not ready:', device_id);

      this.deviceId.set(null);
      this.isReady.set(false);
      this.clearProgressTimer();
    });

    player.addListener('player_state_changed', (state: SpotifyPlaybackState | null) => {
      if (!state) {
        return;
      }

      this.updatePlaybackState(state);
    });

    player.addListener('initialization_error', ({ message }: { message: string }) => {
      this.errorMessage.set(message);
      console.error('Spotify initialization error:', message);
    });

    player.addListener('authentication_error', ({ message }: { message: string }) => {
      this.errorMessage.set(message);
      console.error('Spotify authentication error:', message);
    });

    player.addListener('account_error', ({ message }: { message: string }) => {
      this.errorMessage.set(message);
      console.error('Spotify account error:', message);
    });

    player.addListener('playback_error', ({ message }: { message: string }) => {
      this.errorMessage.set(message);
      console.error('Spotify playback error:', message);
    });

    player.addListener('autoplay_failed', () => {
      console.warn('Spotify autoplay failed. User interaction is required.');
    });
  }

  private updatePlaybackState(state: SpotifyPlaybackState): void {
    this.playbackState.set(state);
    this.isPaused.set(state.paused);
    this.positionMs.set(state.position);
    this.durationMs.set(state.duration);
    this.currentTrackUri.set(state.track_window.current_track.uri);

    if (state.paused) {
      this.clearProgressTimer();
      return;
    }

    this.startProgressTimer();
  }

  private startProgressTimer(): void {
    this.clearProgressTimer();

    this.progressIntervalId = setInterval(() => {
      const nextPosition = Math.min(this.positionMs() + 1000, this.durationMs());
      this.positionMs.set(nextPosition);

      if (nextPosition >= this.durationMs()) {
        this.clearProgressTimer();
      }
    }, 1000);
  }

  private clearProgressTimer(): void {
    if (!this.progressIntervalId) {
      return;
    }

    clearInterval(this.progressIntervalId);
    this.progressIntervalId = null;
  }

  private async waitUntilReady(): Promise<void> {
    if (this.deviceId()) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const startedAt = Date.now();

      const intervalId = window.setInterval(() => {
        if (this.deviceId()) {
          window.clearInterval(intervalId);
          resolve();
          return;
        }

        const timeoutReached = Date.now() - startedAt > 8000;

        if (timeoutReached) {
          window.clearInterval(intervalId);
          reject(new Error('Spotify player device was not ready in time.'));
        }
      }, 150);
    });
  }

  private async transferPlayback(play: boolean): Promise<void> {
    const deviceId = this.deviceId();

    if (!deviceId) {
      throw new Error('Missing Spotify device ID.');
    }

    await this.request('/me/player', {
      method: 'PUT',
      body: JSON.stringify({
        device_ids: [deviceId],
        play,
      }),
    });
  }

  private async startPlayback(uri: string): Promise<void> {
    const deviceId = this.deviceId();

    if (!deviceId) {
      throw new Error('Missing Spotify device ID.');
    }

    await this.request(`/me/player/play?device_id=${encodeURIComponent(deviceId)}`, {
      method: 'PUT',
      body: JSON.stringify({
        uris: [uri],
      }),
    });
  }

  private async request(endpoint: string, options: RequestInit): Promise<void> {
    const token = this.auth.getAccessToken();

    if (!token) {
      throw new Error('Spotify access token is missing.');
    }

    const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
    });

    if (response.status === 204) {
      return;
    }

    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(`Spotify request failed: ${response.status} ${responseText}`);
    }
  }
}
