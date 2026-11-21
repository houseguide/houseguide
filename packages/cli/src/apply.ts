import { chmodSync, linkSync, mkdtempSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { type AgentResponse, assertDraftWritable } from './response.ts';
import { readDestination } from './review.ts';

export async function applyDraft(
  draft: AgentResponse,
  destination: string,
  previous: string | undefined,
  yes: boolean,
  confirm?: () => Promise<boolean>
): Promise<boolean> {
  assertDraftWritable(draft);
  if (!yes && !(await confirm?.())) {
    return false;
  }

  if (readDestination(destination) !== previous) {
    throw new Error('The destination changed during review. Run Houseguide again to review the new contents.');
  }
  if (previous === draft.markdown) {
    return false;
  }

  const target = previous === undefined ? destination : realpathSync(destination);
  const directory = mkdtempSync(join(dirname(target), '.houseguide-'));
  try {
    const prepared = join(directory, 'draft');
    writeFileSync(prepared, draft.markdown);
    if (previous === undefined) {
      linkSync(prepared, target);
    } else {
      chmodSync(prepared, statSync(target).mode & 0o777);
      if (readDestination(target) !== previous) {
        throw new Error('The destination changed during review. Run Houseguide again to review the new contents.');
      }
      renameSync(prepared, target);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
  return true;
}
