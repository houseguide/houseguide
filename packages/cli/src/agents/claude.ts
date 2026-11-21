import { spawnSync } from 'node:child_process';

import { type AgentResponse, agentResponseSchema, validateDraft } from '../response.ts';

interface ClaudeResult {
  is_error?: boolean;
  result?: string;
  structured_output?: unknown;
}

export function runClaude(projectRoot: string, prompt: string, model?: string): AgentResponse {
  const args = [
    '--print',
    '--output-format',
    'json',
    '--json-schema',
    JSON.stringify(agentResponseSchema),
    '--no-session-persistence',
    '--restricted',
    '--permission-mode',
    'dontAsk',
    '--tools',
    'Read,Glob,Grep',
    '--strict-mcp-config',
    '--mcp-config',
    '{"mcpServers":{}}'
  ];
  if (model !== undefined) {
    args.push(`--model=${model}`);
  }

  const result = spawnSync('claude', args, { cwd: projectRoot, encoding: 'utf8', input: prompt });

  if (result.error) {
    throw result.error;
  }

  let response: ClaudeResult;
  try {
    response = JSON.parse(result.stdout) as ClaudeResult;
  } catch {
    throw new Error(result.stderr.trim() || result.stdout.trim() || 'Claude did not return JSON.');
  }

  if (result.status !== 0 || response.is_error) {
    throw new Error(response.result || result.stderr.trim() || `Claude exited with status ${result.status}.`);
  }
  if (!response.structured_output) {
    throw new Error('Claude did not return a structured response.');
  }

  return validateDraft(response.structured_output);
}
