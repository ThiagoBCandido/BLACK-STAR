import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const environmentPath = 'src/environments/environment.ts';

const clientId = process.env.SPOTIFY_CLIENT_ID;
const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

if (!clientId || !redirectUri) {
  if (existsSync(environmentPath)) {
    console.log('Using local src/environments/environment.ts');
    process.exit(0);
  }

  console.error('Missing SPOTIFY_CLIENT_ID or SPOTIFY_REDIRECT_URI.');
  process.exit(1);
}

mkdirSync('src/environments', { recursive: true });

const environmentFile = `export const environment = {
  spotify: {
    clientId: '${clientId}',
    redirectUri: '${redirectUri}',
    scopes: [
      'user-read-private',
      'user-read-email',
      'streaming',
      'user-read-playback-state',
      'user-modify-playback-state',
      'user-read-currently-playing',
      'user-read-recently-played',
      'user-top-read',
      'playlist-read-private',
      'playlist-read-collaborative',
      'playlist-modify-public',
      'playlist-modify-private',
      'user-library-read',
      'user-library-modify'
    ]
  }
};
`;

writeFileSync(environmentPath, environmentFile);

console.log('Generated src/environments/environment.ts');