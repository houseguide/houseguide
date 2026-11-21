export interface CommandEvidence {
  command: string;
  source: string;
}

export interface AgentResponse {
  markdown: string;
  changes: string[];
  commandEvidence: CommandEvidence[];
  unresolvedConflicts: string[];
}

export const agentResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['markdown', 'changes', 'commandEvidence', 'unresolvedConflicts'],
  properties: {
    markdown: { type: 'string' },
    changes: { type: 'array', items: { type: 'string' } },
    commandEvidence: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['command', 'source'],
        properties: {
          command: { type: 'string' },
          source: { type: 'string' }
        }
      }
    },
    unresolvedConflicts: { type: 'array', items: { type: 'string' } }
  }
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isTextList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isText);
}

function isCommandEvidence(value: unknown): value is CommandEvidence {
  return isRecord(value) && isText(value.command) && isText(value.source);
}

export function validateDraft(response: unknown): AgentResponse {
  if (!isRecord(response) || !isText(response.markdown)) {
    throw new Error('The agent returned an empty or invalid Markdown draft.');
  }

  const { markdown, changes, commandEvidence, unresolvedConflicts } = response;
  if (
    !isTextList(changes) ||
    !Array.isArray(commandEvidence) ||
    !commandEvidence.every(isCommandEvidence) ||
    !isTextList(unresolvedConflicts)
  ) {
    throw new Error('The agent returned invalid draft metadata.');
  }

  return { markdown, changes, commandEvidence, unresolvedConflicts };
}

export function assertDraftWritable(response: AgentResponse): void {
  if (response.unresolvedConflicts.length > 0) {
    throw new Error('Resolve the reported conflicts before writing the draft.');
  }
}
