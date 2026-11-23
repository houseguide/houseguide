import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { type AgentResponse, agentResponseSchema, validateDraft } from '../response.ts';
import { runProcess } from './run.ts';

interface CommandCodeResult {
  type?: string;
  subtype?: string;
  stopReason?: string;
  finalText?: string;
  error?: unknown;
}

// Command Code loads hooks, permission grants, and MCP servers from the working directory's
// .commandcode/ and .mcp.json, so it runs from a directory we own whose only settings grant
// reads under the project root. Headless mode withholds shell and write tools.
export async function runCommandCode(
  projectRoot: string,
  prompt: string,
  model?: string,
  effort?: string
): Promise<AgentResponse> {
  const directory = mkdtempSync(join(tmpdir(), 'houseguide-cmd-'));

  try {
    const root = realpathSync(projectRoot);
    mkdirSync(join(directory, '.commandcode'));
    writeFileSync(
      join(directory, '.commandcode', 'settings.json'),
      JSON.stringify({ permissions: { additionalDirectories: [root], allow: [`Read(${root}/**)`] } })
    );
    const args = [
      '--print',
      '--output-format',
      'json',
      '--add-dir',
      root,
      '--safe-mode',
      '--no-skills',
      '--no-session',
      '--skip-onboarding',
      '--no-auto-update'
    ];
    if (model !== undefined) {
      args.push(`--model=${model}`);
    }
    if (effort !== undefined) {
      args.push(`--effort=${effort}`);
    }

    const preamble = [
      `The project is at ${root}. Your working directory is not the project; read project files by absolute path under that directory. Only read, list, and search tools are available.`,
      `Reply with only one JSON object that matches this JSON schema, with no prose or code fence around it:\n${JSON.stringify(agentResponseSchema)}`
    ].join('\n\n');

    const result = await runProcess('command-code', args, { cwd: directory, input: `${preamble}\n\n${prompt}` });

    const response = parseResult(result.stdout);
    if (response?.stopReason === 'permission_denied') {
      throw new Error('Command Code stopped after requesting a tool outside read-only access to the project.');
    }
    if (result.status !== 0 || response?.subtype !== 'success') {
      const reason = typeof response?.error === 'string' ? response.error : result.stderr.trim();
      throw new Error(reason || `Command Code exited with status ${result.status}.`);
    }

    return validateDraft(parseDraft(response.finalText ?? ''));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function parseResult(stdout: string): CommandCodeResult | undefined {
  const last = stdout.trim().split('\n').at(-1);
  try {
    const value = JSON.parse(last ?? '') as CommandCodeResult;
    return value.type === 'result' ? value : undefined;
  } catch {
    return undefined;
  }
}

function parseDraft(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new Error('Command Code did not return a JSON draft.');
  }
}
