import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { GitHubRequest } from './github.ts';
import { type RemoteSource, repositoryPath } from './sources.ts';
import { readState, writeState } from './state.ts';

interface GitBlob {
  sha: string;
  size: number;
  encoding: 'base64';
  content: string;
}

export interface ActiveSource extends RemoteSource {
  sha256: string;
}

function blobPath(state: string, blobSha: string): string {
  if (!/^[a-f0-9]{40}$/.test(blobSha)) {
    throw new Error('Invalid Git blob ID.');
  }
  return join(state, 'blobs', blobSha);
}

export function readBlob(state: string, blobSha: string): Buffer {
  return readFileSync(blobPath(state, blobSha));
}

function verifiedHash(data: Buffer, blobSha: string): string {
  const actual = createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex');
  if (actual !== blobSha) {
    throw new Error(`Git blob content did not match its object ID (${blobSha}).`);
  }
  return createHash('sha256').update(data).digest('hex');
}

export async function fetchChangedSources(
  request: GitHubRequest,
  state: string,
  sources: RemoteSource[]
): Promise<ActiveSource[]> {
  const manifest = join(state, 'inventory.json');
  const prior = readState<ActiveSource[]>(manifest) ?? [];
  const knownHashes = new Map(prior.map(({ blobSha, sha256 }) => [blobSha, sha256]));
  const currentHashes = new Map<string, string>();
  const active: ActiveSource[] = [];

  for (const source of sources) {
    const { blobSha } = source;
    let sha256 = currentHashes.get(blobSha);
    if (!sha256) {
      try {
        sha256 = verifiedHash(readBlob(state, blobSha), blobSha);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
        const blob = await request<GitBlob>(`${repositoryPath(source.repository)}/git/blobs/${blobSha}`);
        if (blob.encoding !== 'base64' || blob.sha !== blobSha) {
          throw new Error(`GitHub returned an unexpected blob for ${source.repository}/${source.path}.`);
        }
        const content = Buffer.from(blob.content, 'base64');
        if (content.length !== blob.size) {
          throw new Error(`GitHub returned an incomplete blob for ${source.repository}/${source.path}.`);
        }
        sha256 = verifiedHash(content, blobSha);
        writeState(blobPath(state, blobSha), content);
      }
      const priorHash = knownHashes.get(blobSha);
      if (priorHash && priorHash !== sha256) {
        throw new Error(`Stored inventory hash disagreed with Git blob ${blobSha}.`);
      }
      currentHashes.set(blobSha, sha256);
    }
    active.push({ ...source, sha256 });
  }

  writeState(manifest, `${JSON.stringify(active, null, 2)}\n`);
  return active;
}
