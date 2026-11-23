import { expect, test } from 'bun:test';

import { discoverRepositories } from './discover.ts';
import type { GitHubRequest } from './github.ts';
import { findStateArtifact } from './restore.ts';

test('restore selects the newest retained checkpoint even after a failed run', async () => {
  const request: GitHubRequest = async <T>(path: string) => {
    if (path.includes('/workflows/')) {
      return { workflow_runs: [{ id: 12 }, { id: 11, conclusion: 'failure' }, { id: 10, conclusion: 'success' }] } as T;
    }
    if (path.includes('/12/')) {
      return { artifacts: [] } as T;
    }
    if (path.includes('/11/')) {
      return {
        artifacts: [
          { name: 'catalog-state-11-1', expired: false, created_at: '2026-11-20' },
          { name: 'catalog-state-11-2', expired: false, created_at: '2026-11-21' },
          { name: 'catalog-state-11-3', expired: true, created_at: '2026-11-22' }
        ]
      } as T;
    }
    throw new Error(`Unexpected fixture request: ${path}`);
  };
  expect(await findStateArtifact(request, 'example/project')).toEqual({ runId: 11, name: 'catalog-state-11-2' });
});

function searchFixture(
  repositories: { id: number; stars: number; created: number }[],
  options: { phantom?: number } = {}
) {
  const queries: string[] = [];
  const request: GitHubRequest = async <T>(path: string) => {
    const params = new URL(path, 'https://api.github.com').searchParams;
    const q = params.get('q') ?? '';
    queries.push(q);
    const stars = /stars:(?:>=(\d+)|(\d+)\.\.(\d+))/.exec(q);
    const created = /created:(\S+)\.\.(\S+)/.exec(q);
    const [min, max] = stars?.[1] ? [Number(stars[1]), Infinity] : [Number(stars?.[2]), Number(stars?.[3])];
    const [from, to] = created
      ? [Date.parse(created[1] ?? '') / 1000, Date.parse(created[2] ?? '') / 1000]
      : [-Infinity, Infinity];
    const matches = repositories.filter(
      (r) => r.stars >= min && r.stars <= max && r.created >= from && r.created <= to
    );
    const page = Number(params.get('page'));
    const size = Number(params.get('per_page'));
    return {
      total_count: matches.length + (options.phantom ?? 0),
      incomplete_results: false,
      items: matches.slice((page - 1) * size, page * size).map((r) => ({
        id: r.id,
        full_name: `owner/repo-${r.id}`,
        default_branch: 'main',
        stargazers_count: r.stars,
        private: false
      }))
    } as T;
  };
  return { request, queries };
}

test('discovery splits by stars, then by creation date, to enumerate more than the search cap', async () => {
  const repositories = Array.from({ length: 2500 }, (_, index) => ({
    id: index + 1,
    stars: index < 1500 ? 1000 : 1000 + index,
    created: 1_600_000_000 + index * 1000
  }));
  const { request, queries } = searchFixture(repositories);
  const found = await discoverRepositories(request, 1000, () => {});
  expect(found.map(({ id }) => id)).toEqual(repositories.map(({ id }) => id));
  expect(queries.some((q) => q.includes('stars:1000..1000 created:'))).toBe(true);
});

test('discovery reports a search count it cannot reach instead of failing', async () => {
  const repositories = Array.from({ length: 250 }, (_, index) => ({
    id: index + 1,
    stars: 2000,
    created: 1_600_000_000
  }));
  const { request } = searchFixture(repositories, { phantom: 2 });
  const messages: string[] = [];
  const found = await discoverRepositories(request, 1000, (message) => messages.push(message));
  expect(found).toHaveLength(250);
  expect(messages).toContain('Discovery: stars:>=1000 reported 252 results and returned 250.');
});
