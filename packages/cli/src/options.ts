import { parseArgs } from 'node:util';

export function parseOptions(args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      model: { type: 'string', short: 'm', multiple: true },
      agent: { type: 'string', short: 'a', multiple: true },
      effort: { type: 'string', short: 'e', multiple: true },
      prompt: { type: 'string', short: 'p' },
      yes: { type: 'boolean', short: 'y', default: false },
      output: { type: 'string', short: 'o' },
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' }
    }
  });

  for (const [name, short] of [
    ['model', 'm'],
    ['agent', 'a'],
    ['effort', 'e']
  ] as const) {
    if ((values[name]?.length ?? 0) > 1) {
      throw new Error(`Specify --${name} or -${short} only once.`);
    }
  }
  const effort = values.effort?.[0];
  // Codex receives effort inside a TOML override, so keep it to a bare word.
  if (effort !== undefined && !/^[a-z]+$/.test(effort)) {
    throw new Error('Use --effort with a single lowercase level such as low, medium, or high.');
  }

  return { ...values, model: values.model?.[0], agent: values.agent?.[0], effort };
}
