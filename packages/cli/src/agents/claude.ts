import { type AgentResponse, agentResponseSchema, validateDraft } from '../response.ts';
import { runProcess } from './run.ts';

interface ClaudeResult {
  is_error?: boolean;
  result?: string;
  structured_output?: unknown;
}

export async function runClaude(projectRoot: string, prompt: string, model?: string): Promise<AgentResponse> {
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

  const result = await runProcess('claude', args, { cwd: projectRoot, input: prompt });

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
