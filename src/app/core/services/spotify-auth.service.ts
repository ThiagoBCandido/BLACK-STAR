import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token?: string;
}

interface SpotifyUserProfile {
  id: string;
  display_name: string;
  email?: string;
  country?: string;
  product?: string;
  external_urls?: {
    spotify?: string;
  };
  images?: Array<{
    url: string;
    height: number | null;
    width: number | null;
  }>;
}

@Injectable({
  providedIn: 'root',
})
export class SpotifyAuthService {
  readonly isAuthenticated = signal(false);
  readonly profile = signal<SpotifyUserProfile | null>(null);
  readonly isLoading = signal(false);

  private readonly accessTokenKey = 'blackstar_spotify_access_token';
  private readonly expiresAtKey = 'blackstar_spotify_expires_at';
  private readonly refreshTokenKey = 'blackstar_spotify_refresh_token';
  private readonly codeVerifierKey = 'blackstar_spotify_code_verifier';
  private readonly stateKey = 'blackstar_spotify_state';

  async initialize(): Promise<void> {
    await this.handleCallbackIfNeeded();

    const token = this.getAccessToken();

    if (!token) {
      this.isAuthenticated.set(false);
      return;
    }

    this.isAuthenticated.set(true);
    await this.loadProfile();
  }

  async login(): Promise<void> {
    const clientId = environment.spotify.clientId;

    if (!clientId || clientId === 'COLE_SEU_CLIENT_ID_AQUI') {
      console.error('Spotify Client ID is missing.');
      return;
    }

    const codeVerifier = this.generateRandomString(64);
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);
    const state = this.generateRandomString(32);

    localStorage.setItem(this.codeVerifierKey, codeVerifier);
    localStorage.setItem(this.stateKey, state);

    const authUrl = new URL('https://accounts.spotify.com/authorize');

    authUrl.search = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      scope: environment.spotify.scopes.join(' '),
      redirect_uri: environment.spotify.redirectUri,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
      state,
      show_dialog: 'true',
    }).toString();

    window.location.href = authUrl.toString();
  }

  logout(): void {
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.expiresAtKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.codeVerifierKey);
    localStorage.removeItem(this.stateKey);

    this.isAuthenticated.set(false);
    this.profile.set(null);
  }

  getAccessToken(): string | null {
    const token = localStorage.getItem(this.accessTokenKey);
    const expiresAt = Number(localStorage.getItem(this.expiresAtKey));

    if (!token || !expiresAt) {
      return null;
    }

    const hasExpired = Date.now() >= expiresAt;

    if (hasExpired) {
      this.logout();
      return null;
    }

    return token;
  }

  private async handleCallbackIfNeeded(): Promise<void> {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    const state = urlParams.get('state');

    if (error) {
      console.error('Spotify authorization error:', error);
      this.cleanCallbackUrl();
      return;
    }

    if (!code) {
      return;
    }

    const storedState = localStorage.getItem(this.stateKey);

    if (!state || state !== storedState) {
      console.error('Invalid Spotify authorization state.');
      this.cleanCallbackUrl();
      return;
    }

    await this.requestAccessToken(code);
    this.cleanCallbackUrl();
  }

  private async requestAccessToken(code: string): Promise<void> {
    this.isLoading.set(true);

    try {
      const codeVerifier = localStorage.getItem(this.codeVerifierKey);

      if (!codeVerifier) {
        throw new Error('Missing Spotify code verifier.');
      }

      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: environment.spotify.clientId,
          grant_type: 'authorization_code',
          code,
          redirect_uri: environment.spotify.redirectUri,
          code_verifier: codeVerifier,
        }),
      });

      if (!response.ok) {
        throw new Error('Could not request Spotify access token.');
      }

      const tokenData = (await response.json()) as SpotifyTokenResponse;
      const expiresAt = Date.now() + tokenData.expires_in * 1000;

      localStorage.setItem(this.accessTokenKey, tokenData.access_token);
      localStorage.setItem(this.expiresAtKey, String(expiresAt));

      if (tokenData.refresh_token) {
        localStorage.setItem(this.refreshTokenKey, tokenData.refresh_token);
      }

      localStorage.removeItem(this.codeVerifierKey);
      localStorage.removeItem(this.stateKey);

      this.isAuthenticated.set(true);
    } catch (error) {
      console.error(error);
      this.logout();
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadProfile(): Promise<void> {
    const token = this.getAccessToken();

    if (!token) {
      return;
    }

    try {
      const response = await fetch('https://api.spotify.com/v1/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Could not load Spotify profile.');
      }

      const profile = (await response.json()) as SpotifyUserProfile;
      this.profile.set(profile);
    } catch (error) {
      console.error(error);
    }
  }

  private cleanCallbackUrl(): void {
    window.history.replaceState({}, document.title, '/');
  }

  private generateRandomString(length: number): string {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values = crypto.getRandomValues(new Uint8Array(length));

    return values.reduce((result, value) => result + possible[value % possible.length], '');
  }

  private async generateCodeChallenge(codeVerifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);

    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }
}
