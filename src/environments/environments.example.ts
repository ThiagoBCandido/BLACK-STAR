export const environment = {
  production: false,
  spotify: {
    clientId: 'your_spotify_client_id_here',
    redirectUri: 'http://127.0.0.1:4200/callback',
    scopes: [
      'user-read-private',
      'user-read-email',
      'user-read-playback-state',
      'user-modify-playback-state',
      'user-read-currently-playing',
      'user-read-recently-played',
      'user-top-read',
      'playlist-read-private',
      'playlist-read-collaborative',
      'streaming',
    ],
  },
};