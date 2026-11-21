import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { argv } from 'node:process';

export const snapshotRoot = join(homedir(), 'Projects/temp/agents/c85c45e3a5151f6091086f516311471d/research');

export interface SourceFile {
  repository: string;
  path: string;
  sha256: string;
}

function directories(path: string): string[] {
  return readdirSync(path, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort();
}

export function inventorySnapshot(root: string): SourceFile[] {
  const sources: SourceFile[] = [];
  for (const owner of directories(root)) {
    for (const repo of directories(join(root, owner))) {
      const repository = `${owner}/${repo}`;
      const directory = join(root, repository);
      const files = readdirSync(directory, { withFileTypes: true });
      for (const path of ['AGENTS.md', 'CLAUDE.md']) {
        if (files.some((entry) => entry.name === path && entry.isFile())) {
          const sha256 = createHash('sha256')
            .update(readFileSync(join(directory, path)))
            .digest('hex');
          sources.push({ repository, path, sha256 });
        }
      }
    }
  }
  return sources;
}

if (import.meta.main) {
  console.log(JSON.stringify(inventorySnapshot(resolve(argv[2] ?? snapshotRoot)), null, 2));
}
