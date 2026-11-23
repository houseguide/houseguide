import { posix } from 'node:path';

import type { Repository } from './discover.ts';
import { GitHubError, type GitHubRequest } from './github.ts';

interface TreeEntry {
  path: string;
  type: 'tree' | 'blob' | 'commit';
  sha: string;
}

interface TreeResponse {
  sha: string;
  truncated: boolean;
  tree: TreeEntry[];
}

export interface RemoteSource {
  repositoryId: number;
  repository: string;
  treeSha: string;
  path: string;
  blobSha: string;
}

export function repositoryPath(name: string): string {
  return `/repos/${name.split('/').map(encodeURIComponent).join('/')}`;
}

export async function discoverSources(request: GitHubRequest, repositories: Repository[]): Promise<RemoteSource[]> {
  const sources: RemoteSource[] = [];
  for (const repository of repositories) {
    const endpoint = `${repositoryPath(repository.name)}/git/trees/`;
    let root: TreeResponse;
    try {
      root = await request<TreeResponse>(`${endpoint}${encodeURIComponent(repository.defaultBranch)}?recursive=1`);
    } catch (error) {
      if (error instanceof GitHubError && (error.status === 404 || error.status === 409)) {
        continue;
      }
      // Some organizations block the refresh token, and some repositories are legally blocked.
      // Skip what the token cannot read, but never a rate limit, which would drop sources silently.
      if (error instanceof GitHubError && (error.status === 403 || error.status === 451) && !error.rateLimited) {
        console.error(`Sources: skipped ${repository.name} (HTTP ${error.status}).`);
        continue;
      }
      throw error;
    }

    function add(entry: TreeEntry, path: string) {
      if (entry.type === 'blob' && ['AGENTS.md', 'CLAUDE.md'].includes(posix.basename(path))) {
        sources.push({
          repositoryId: repository.id,
          repository: repository.name,
          treeSha: root.sha,
          path,
          blobSha: entry.sha
        });
      }
    }

    async function visit(sha: string, prefix: string): Promise<void> {
      const tree = await request<TreeResponse>(`${endpoint}${encodeURIComponent(sha)}`);
      if (tree.truncated) {
        throw new Error(`GitHub truncated a nonrecursive tree for ${repository.name}. Retry the refresh.`);
      }
      for (const entry of tree.tree) {
        const path = posix.join(prefix, entry.path);
        if (entry.type === 'tree') {
          const subtree = await request<TreeResponse>(`${endpoint}${encodeURIComponent(entry.sha)}?recursive=1`);
          if (subtree.truncated) {
            await visit(entry.sha, path);
          } else {
            for (const child of subtree.tree) {
              add(child, posix.join(path, child.path));
            }
          }
        } else {
          add(entry, path);
        }
      }
    }

    if (root.truncated) {
      await visit(root.sha, '');
    } else {
      for (const entry of root.tree) {
        add(entry, entry.path);
      }
    }
  }
  return sources.sort((a, b) => a.repositoryId - b.repositoryId || a.path.localeCompare(b.path, 'en'));
}
