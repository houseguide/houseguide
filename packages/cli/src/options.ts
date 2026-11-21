import { parseArgs } from 'node:util';

export function parseOptions(args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      model: { type: 'string', short: 'm', multiple: true },
      prompt: { type: 'string', short: 'p' },
      yes: { type: 'boolean', short: 'y', default: false },
      output: { type: 'string', short: 'o' },
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' }
    }
  });

  if (values.model && values.model.length > 1) {
    throw new Error('Specify --model or -m only once.');
  }

  return { ...values, model: values.model?.[0] };
}
