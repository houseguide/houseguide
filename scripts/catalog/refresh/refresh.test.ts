import { expect, test } from 'bun:test';

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
