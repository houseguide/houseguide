import { argv, env } from 'node:process';
import { parseArgs } from 'node:util';

import { type GitHubRequest, githubRequest } from './github.ts';

export const minimumCutoff = 1000;
const searchLimit = 1000;
const pageSize = 100;

export interface Repository {
  id: number;
  name: string;
  defaultBranch: string;
  stars: number;
}

interface SearchResult {
  total_count: number;
  incomplete_results: boolean;
  items: { id: number; full_name: string; default_branch: string; stargazers_count: number; private: boolean }[];
}

interface Window {
  stars: [number, number?];
  created?: [number, number];
}

export function parseCutoff(input?: string): number {
  const cutoff = Number(input ?? minimumCutoff);
  if (!Number.isSafeInteger(cutoff) || cutoff < minimumCutoff) {
    throw new Error('--cutoff must be an integer of at least 1000.');
  }
  return cutoff;
}

function timestamp(seconds: number): string {
  return new Date(seconds * 1000).toISOString().replace('.000Z', 'Z');
}

function describe({ stars: [min, max], created }: Window): string {
  const stars = max === undefined ? `stars:>=${min}` : `stars:${min}..${max}`;
  return created ? `${stars} created:${timestamp(created[0])}..${timestamp(created[1])}` : stars;
}

// GitHub search serves at most 1000 results per query, so split by star band, and by creation
// date only when a single star count still exceeds the cap. Counts and pages drift while stars
// change, so discovery is best effort: it deduplicates what it sees and reports any shortfall
// instead of failing the refresh.
export async function discoverRepositories(
  request: GitHubRequest,
  cutoff = minimumCutoff,
  log: (message: string) => void = (message) => console.error(message)
): Promise<Repository[]> {
  parseCutoff(String(cutoff));
  const repositories = new Map<number, Repository>();
  let reported = 0;

  async function visit(window: Window): Promise<void> {
    const query = new URLSearchParams({ q: `is:public fork:true ${describe(window)}`, per_page: String(pageSize) });
    const search = async (page: number) => {
      query.set('page', String(page));
      return request<SearchResult>(`/search/repositories?${query}`);
    };

    const initial = await search(1);
    const total = initial.total_count;
    if (total > searchLimit) {
      const [min, max] = window.stars;
      if (max === undefined) {
        await visit({ stars: [min, min * 2 - 1] });
        await visit({ stars: [min * 2] });
        return;
      }
      if (max > min) {
        const middle = Math.floor((min + max) / 2);
        await visit({ stars: [min, middle] });
        await visit({ stars: [middle + 1, max] });
        return;
      }
      const [first, last] = window.created ?? [0, Math.floor(Date.now() / 1000)];
      if (first < last) {
        const middle = Math.floor((first + last) / 2);
        await visit({ stars: window.stars, created: [first, middle] });
        await visit({ stars: window.stars, created: [middle + 1, last] });
        return;
      }
      log(`Discovery: ${describe(window)} has ${total} results; keeping the first ${searchLimit}.`);
    }

    const wanted = Math.min(total, searchLimit);
    const seen = new Set<number>();
    let incomplete = initial.incomplete_results;
    for (let page = 1; page <= Math.ceil(wanted / pageSize); page++) {
      const result = page === 1 ? initial : await search(page);
      incomplete ||= result.incomplete_results;
      for (const item of result.items) {
        seen.add(item.id);
        if (!item.private && item.stargazers_count >= cutoff) {
          repositories.set(item.id, {
            id: item.id,
            name: item.full_name,
            defaultBranch: item.default_branch,
            stars: item.stargazers_count
          });
        }
      }
    }
    reported += wanted;
    if (incomplete || seen.size < wanted) {
      log(
        `Discovery: ${describe(window)} reported ${total} results and returned ${seen.size}${incomplete ? ' (incomplete)' : ''}.`
      );
    }
  }

  await visit({ stars: [cutoff] });
  log(`Discovery: found ${repositories.size} repositories; GitHub reported ${reported}.`);
  return [...repositories.values()].sort((left, right) => left.id - right.id);
}

if (import.meta.main) {
  const { values } = parseArgs({ args: argv.slice(2), options: { cutoff: { type: 'string' } } });
  const repositories = await discoverRepositories(githubRequest(env.GH_TOKEN), parseCutoff(values.cutoff));
  console.log(JSON.stringify(repositories, null, 2));
}
