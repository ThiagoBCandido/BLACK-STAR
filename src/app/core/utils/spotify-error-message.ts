type SpotifyErrorRule = {
  tokens: readonly string[];
  message: string;
};

const SPOTIFY_ERROR_RULES: readonly SpotifyErrorRule[] = [
  {
    tokens: ['not registered', 'user is not registered'],
    message: 'This Spotify account is not authorized to use this app. Add this user in the Spotify Developer Dashboard or use Demo Mode.',
  },
  {
    tokens: ['premium', 'account_error'],
    message: 'Spotify Premium is required to use playback inside BLACK STAR. You can still explore the app in Demo Mode.',
  },
  {
    tokens: ['401', 'access token', 'authentication'],
    message: 'Your Spotify session expired. Reconnect Spotify and try again.',
  },
  {
    tokens: ['403', 'access denied'],
    message: 'Spotify blocked this request. Check the account permission, dashboard allowlist or app scopes.',
  },
  {
    tokens: ['429', 'rate limit'],
    message: 'Spotify is receiving too many requests. Wait a moment and try again.',
  },
  {
    tokens: [
      'player is not ready',
      'device was not ready',
      'missing spotify device id',
      'could not connect black star player',
    ],
    message: 'The Spotify player is not ready yet. Open Spotify, keep the account connected and try again.',
  },
  {
    tokens: [
      'playback_error',
      'not playable',
      'restriction',
      'cannot be played',
    ],
    message: 'This track cannot be played through Spotify right now. Try another track.',
  },
  {
    tokens: ['invalid limit'],
    message: 'Spotify rejected the search request. The search parameters need to be adjusted.',
  },
];

export function getSpotifyFriendlyErrorMessage(
  error: unknown,
  fallbackMessage = 'Something went wrong with Spotify.'
): string {
  const message = normalizeErrorMessage(error);
  const rule = SPOTIFY_ERROR_RULES.find(({ tokens }) =>
    tokens.some((token) => message.includes(token))
  );

  return rule?.message ?? fallbackMessage;
}

function normalizeErrorMessage(error: unknown): string {
  return (error instanceof Error ? error.message : String(error ?? '')).toLowerCase();
}
