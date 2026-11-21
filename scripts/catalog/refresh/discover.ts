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

export async function discoverRepositories(request: GitHubRequest, cutoff = minimumCutoff): Promise<Repository[]> {
  parseCutoff(String(cutoff));
  const repositories = new Map<number, Repository>();

  async function visit(first: number, last: number): Promise<void> {
    const query = new URLSearchParams({
      q: `is:public fork:true stars:>=${cutoff} created:${timestamp(first)}..${timestamp(last)}`,
      sort: 'stars',
      order: 'desc',
      per_page: String(pageSize)
    });
    const search = async (page: number) => {
      query.set('page', String(page));
      return request<SearchResult>(`/search/repositories?${query}`);
    };

    const initial = await search(1);
    if (initial.incomplete_results || initial.total_count > searchLimit) {
      if (first === last) {
        throw new Error(`GitHub search could not enumerate repositories created at ${timestamp(first)}.`);
      }
      const middle = Math.floor((first + last) / 2);
      await visit(first, middle);
      await visit(middle + 1, last);
      return;
    }

    const items = [...initial.items];
    for (let page = 2; page <= Math.ceil(initial.total_count / pageSize); page++) {
      const result = await search(page);
      if (result.incomplete_results || result.total_count !== initial.total_count) {
        throw new Error('GitHub search changed during pagination. Retry the refresh.');
      }
      items.push(...result.items);
    }
    if (new Set(items.map(({ id }) => id)).size !== initial.total_count) {
      throw new Error('GitHub search returned an incomplete or overlapping page. Retry the refresh.');
    }
    for (const item of items) {
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

  await visit(0, Math.floor(Date.now() / 1000));
  return [...repositories.values()].sort((left, right) => left.id - right.id);
}

if (import.meta.main) {
  const { values } = parseArgs({ args: argv.slice(2), options: { cutoff: { type: 'string' } } });
  const repositories = await discoverRepositories(githubRequest(env.GH_TOKEN), parseCutoff(values.cutoff));
  console.log(JSON.stringify(repositories, null, 2));
}
