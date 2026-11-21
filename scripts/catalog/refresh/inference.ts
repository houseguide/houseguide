import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { env } from 'node:process';

export interface InferenceSettings {
  provider: string;
  model: string;
  credential?: string;
}

export type Infer = (prompt: string) => Promise<unknown>;

export function readInferenceSettings(environment = env): InferenceSettings {
  return {
    provider: environment.CATALOG_INFERENCE_PROVIDER || 'copilot',
    model: environment.CATALOG_INFERENCE_MODEL || 'auto',
    credential: environment.CATALOG_INFERENCE_TOKEN
  };
}

export function createInference(settings: InferenceSettings): Infer {
  if (settings.provider !== 'copilot') {
    throw new Error(`Unsupported catalog inference provider: ${settings.provider}.`);
  }
  if (!settings.credential) {
    throw new Error('Set CATALOG_INFERENCE_TOKEN to a GitHub Copilot credential.');
  }
  return async (prompt) => {
    const directory = mkdtempSync(join(tmpdir(), 'houseguide-inference-'));
    try {
      const result = spawnSync(
        'copilot',
        [
          `--model=${settings.model}`,
          '--silent',
          '--no-color',
          '--no-ask-user',
          '--no-auto-update',
          '--no-custom-instructions',
          '--disable-builtin-mcps',
          '--available-tools=houseguide_no_tools'
        ],
        {
          cwd: directory,
          input: prompt,
          encoding: 'utf8',
          timeout: 5 * 60_000,
          maxBuffer: 8 * 1024 * 1024,
          env: {
            PATH: env.PATH,
            HOME: env.HOME,
            USERPROFILE: env.USERPROFILE,
            SystemRoot: env.SystemRoot,
            COPILOT_HOME: directory,
            COPILOT_GITHUB_TOKEN: settings.credential
          }
        }
      );
      if (result.error) {
        throw result.error;
      }
      if (result.status !== 0) {
        const quota = /quota|rate.limit|too many requests|\b429\b/i.test(result.stderr + result.stdout);
        throw new Error(
          quota ? 'Copilot quota or rate limit reached.' : `Copilot inference failed (status ${result.status}).`
        );
      }
      const payload = result.stdout.trim().replace(/^`{3}(?:json)?\s*\n([\s\S]*?)\n`{3}$/i, '$1');
      try {
        return JSON.parse(payload);
      } catch {
        if (/quota|rate.limit|too many requests|\b429\b/i.test(payload)) {
          throw new Error('Copilot quota or rate limit reached.');
        }
        throw new Error('Copilot did not return valid JSON.');
      }
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  };
}
