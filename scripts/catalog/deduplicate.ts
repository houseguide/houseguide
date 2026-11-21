import { resolve } from 'node:path';
import { argv } from 'node:process';

import { inventorySnapshot, type SourceFile, snapshotRoot } from './inventory.ts';

export type SourceReference = Pick<SourceFile, 'repository' | 'path'>;

export interface SourceGroup {
  sha256: string;
  sources: SourceReference[];
}

export function deduplicateSources(inventory: SourceFile[]): SourceGroup[] {
  const groups = new Map<string, SourceGroup>();
  for (const { sha256, repository, path } of inventory) {
    const reference = { repository, path };
    const group = groups.get(sha256);
    if (group) {
      group.sources.push(reference);
    } else {
      groups.set(sha256, { sha256, sources: [reference] });
    }
  }
  return [...groups.values()];
}

if (import.meta.main) {
  console.log(JSON.stringify(deduplicateSources(inventorySnapshot(resolve(argv[2] ?? snapshotRoot))), null, 2));
}
