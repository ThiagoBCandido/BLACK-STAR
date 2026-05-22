import { Injectable, signal, inject } from '@angular/core';
import { SpotifyAuthService } from './spotify-auth.service';

interface SpotifyPlaybackState {
  paused: boolean;
  position: number;
  duration: number;
  track_window: {
    current_track: {
      id: string;
      name: string;
      uri: string;
      artists: Array<{ name: string }>;
      album: {
        name: string;
        images: Array<{ url: string }>;
      };
    };
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

  private readonly sdkScriptId = 'spotify-web-playback-sdk';
  private readonly apiBaseUrl = 'https://api.spotify.com/v1';

  private player: SpotifyPlayer | null = null;
  private sdkLoadPromise: Promise<void> | null = null;

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
      // Some browsers only allow this during direct user interaction.
      // If it fails here, the play endpoint below may still work after user interaction.
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

  disconnect(): void {
    this.player?.disconnect();
    this.player = null;

    this.deviceId.set(null);
    this.isReady.set(false);
    this.playbackState.set(null);
  }

  private async ensureReady(): Promise<void> {
    if (!this.player || !this.isReady()) {
      await this.initialize();
    }

    if (!this.deviceId()) {
      await this.waitUntilReady();
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
    });

    player.addListener('player_state_changed', (state: SpotifyPlaybackState | null) => {
      if (!state) {
        return;
      }

      this.playbackState.set(state);
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