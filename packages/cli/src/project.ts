import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { env } from 'node:process';

export function resolveProjectRoot(invocationDirectory: string): string {
  const result = spawnSync('git', ['rev-parse', '--show-toplevel'], {
    cwd: invocationDirectory,
    encoding: 'utf8',
    env: { ...env, LC_ALL: 'C' }
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status === 0) {
    return result.stdout.replace(/\r?\n$/, '');
  }
  if (result.stderr.startsWith('fatal: not a git repository')) {
    return invocationDirectory;
  }

  throw new Error(result.stderr.trim() || 'Git could not resolve the project root.');
}

export function resolveDestination(projectRoot: string, invocationDirectory: string, output?: string): string {
  if (output === '') {
    throw new Error('--output requires a nonempty file path.');
  }

  return output === undefined ? resolve(projectRoot, 'AGENTS.md') : resolve(invocationDirectory, output);
}
