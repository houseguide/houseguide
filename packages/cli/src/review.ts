import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { AgentResponse } from './response.ts';

export function readDestination(path: string): string | undefined {
  try {
    return readFileSync(path, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
}

function renderDiff(before: string, after: string): string {
  if (before === after) {
    return 'No changes.';
  }

  const directory = mkdtempSync(join(tmpdir(), 'houseguide-diff-'));
  try {
    writeFileSync(join(directory, 'current'), before);
    writeFileSync(join(directory, 'proposed'), after);
    const diff = spawnSync(
      'git',
      [
        'diff',
        '--no-index',
        '--no-color',
        '--no-ext-diff',
        '--no-textconv',
        '--no-prefix',
        '--text',
        '--',
        'current',
        'proposed'
      ],
      { cwd: directory, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }
    );
    if (diff.error) {
      throw diff.error;
    }
    if (diff.status !== 1) {
      throw new Error(diff.stderr.trim() || 'Could not compare the draft with the destination.');
    }
    return diff.stdout.slice(diff.stdout.indexOf('--- current\n'));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

export function renderReview(draft: AgentResponse, destination: string, previous?: string) {
  const notes = [`Destination: ${destination}`];
  if (draft.changes.length > 0) {
    notes.push('Changes', ...draft.changes.map((change) => `- ${change}`));
  }
  if (draft.commandEvidence.length > 0) {
    notes.push('Command evidence', ...draft.commandEvidence.map(({ command, source }) => `- ${command} (${source})`));
  }
  if (draft.unresolvedConflicts.length > 0) {
    notes.push('Unresolved conflicts', ...draft.unresolvedConflicts.map((conflict) => `- ${conflict}`));
  }
  return {
    preview: previous === undefined ? draft.markdown : renderDiff(previous, draft.markdown),
    notes: notes.join('\n')
  };
}
