export type GitHubRequest = <T>(path: string) => Promise<T>;

export class GitHubError extends Error {
  constructor(
    readonly status: number,
    path: string,
    readonly rateLimited = false
  ) {
    super(`GitHub returned HTTP ${status} for ${path.split('?')[0]}.`);
  }
}

export function githubRequest(token?: string): GitHubRequest {
  return async <T>(path: string): Promise<T> => {
    const url = new URL(path, 'https://api.github.com');
    if (url.origin !== 'https://api.github.com') {
      throw new Error('Invalid GitHub API origin.');
    }
    for (let attempt = 0; ; attempt++) {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/vnd.github+json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        signal: AbortSignal.timeout(60_000)
      });
      if (response.ok) {
        return (await response.json()) as T;
      }

      const retryAfter = response.headers.get('retry-after');
      const reset = response.headers.get('x-ratelimit-reset');
      const delay = retryAfter
        ? Number(retryAfter) * 1000
        : response.headers.get('x-ratelimit-remaining') === '0' && reset
          ? Number(reset) * 1000 - Date.now()
          : response.status === 429 || response.status >= 500
            ? 1000 * 2 ** attempt
            : undefined;
      if (attempt === 3 || delay === undefined || !Number.isFinite(delay)) {
        throw new GitHubError(
          response.status,
          url.pathname,
          Boolean(retryAfter) || response.headers.get('x-ratelimit-remaining') === '0'
        );
      }
      await response.body?.cancel();
      await new Promise((resolve) => setTimeout(resolve, Math.max(0, delay) + 1000));
    }
  };
}
