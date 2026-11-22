import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execPath } from 'node:process';
import { fileURLToPath } from 'node:url';

import { type AgentResponse, agentResponseSchema, validateDraft } from '../response.ts';
import { runProcess } from './run.ts';

export async function runCodex(projectRoot: string, prompt: string, model?: string): Promise<AgentResponse> {
  const directory = mkdtempSync(join(tmpdir(), 'houseguide-codex-'));

  try {
    const schema = join(directory, 'schema.json');
    const output = join(directory, 'response.json');
    writeFileSync(schema, JSON.stringify(agentResponseSchema));

    const root = realpathSync(projectRoot);
    const reader = fileURLToPath(
      new URL(import.meta.url.endsWith('.ts') ? './project-reader.ts' : './project-reader.js', import.meta.url)
    );
    const args = [
      'exec',
      '--ignore-user-config',
      '--ignore-rules',
      '-c',
      'agents.enabled=false',
      '-c',
      'web_search="disabled"',
      '-c',
      `mcp_servers.houseguide.command=${JSON.stringify(execPath)}`,
      '-c',
      `mcp_servers.houseguide.args=${JSON.stringify([reader])}`,
      '-c',
      `mcp_servers.houseguide.cwd=${JSON.stringify(root)}`,
      '--disable',
      'shell_tool',
      '--disable',
      'unified_exec',
      '--disable',
      'shell_snapshot',
      '--disable',
      'plugins',
      '--disable',
      'apps',
      '-c',
      'approval_policy="never"',
      '--disable',
      'hooks',
      '--sandbox',
      'read-only',
      '--ephemeral',
      '--skip-git-repo-check',
      '--output-schema',
      schema,
      '--output-last-message',
      output
    ];

    if (model !== undefined) {
      args.push(`--model=${model}`);
    }
    args.push('-');

    const result = await runProcess('codex', args, { cwd: projectRoot, input: prompt, capture: false });

    if (result.status !== 0) {
      throw new Error(`Codex exited with ${result.signal ?? `status ${result.status}`}.`);
    }

    return validateDraft(JSON.parse(readFileSync(output, 'utf8')));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
