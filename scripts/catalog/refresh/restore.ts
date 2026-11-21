import { execFileSync } from 'node:child_process';
import { argv, env } from 'node:process';

import { type GitHubRequest, githubRequest } from './github.ts';
import { repositoryPath } from './sources.ts';

interface WorkflowRuns {
  workflow_runs: { id: number }[];
}

interface Artifacts {
  artifacts: { name: string; expired: boolean; created_at: string }[];
}

export async function findStateArtifact(request: GitHubRequest, repository: string) {
  const endpoint = repositoryPath(repository);
  const runs = await request<WorkflowRuns>(
    `${endpoint}/actions/workflows/catalog-refresh.yml/runs?branch=main&per_page=100`
  );

  for (const { id } of runs.workflow_runs) {
    const { artifacts } = await request<Artifacts>(`${endpoint}/actions/runs/${id}/artifacts?per_page=100`);
    const artifact = artifacts
      .filter(({ name, expired }) => !expired && name.startsWith(`catalog-state-${id}-`))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    if (artifact) {
      return { runId: id, name: artifact.name };
    }
  }
  return undefined;
}

if (import.meta.main) {
  const directory = argv[2];
  const repository = env.GITHUB_REPOSITORY;
  const token = env.GH_TOKEN;
  if (!directory || !repository || !token) {
    throw new Error('State restore requires a destination, GITHUB_REPOSITORY, and GH_TOKEN.');
  }
  const artifact = await findStateArtifact(githubRequest(token), repository);
  if (artifact) {
    execFileSync(
      'gh',
      ['run', 'download', String(artifact.runId), '--repo', repository, '--name', artifact.name, '--dir', directory],
      { stdio: 'inherit' }
    );
    console.log(`Restored catalog state from workflow run ${artifact.runId}.`);
  } else {
    console.log('No retained catalog state. Starting with an empty cache.');
  }
}
