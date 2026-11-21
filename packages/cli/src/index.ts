#!/usr/bin/env node

import process from 'node:process';
import { createInterface } from 'node:readline';

import { version } from '../package.json';
import { runClaude } from './agents/claude.ts';
import { runCodex } from './agents/codex.ts';
import { selectAgent } from './agents/select.ts';
import { deliverDraft } from './deliver.ts';
import { help } from './help.ts';
import { parseOptions } from './options.ts';
import { resolveDestination, resolveProjectRoot } from './project.ts';
import { buildGenerationPrompt } from './prompt.ts';
import { readDestination } from './review.ts';

function askTerminal(message: string): Promise<string> {
  return new Promise((resolve) => {
    const terminal = createInterface({ input: process.stdin, output: process.stderr });
    terminal.once('close', () => resolve(''));
    terminal.question(message, (answer) => {
      resolve(answer);
      terminal.close();
    });
  });
}

try {
  const options = parseOptions(process.argv.slice(2));
  if (options.help) {
    console.log(help);
  } else if (options.version) {
    console.log(version);
  } else {
    const invocationDirectory = process.cwd();
    const projectRoot = resolveProjectRoot(invocationDirectory);
    const destination = resolveDestination(projectRoot, invocationDirectory, options.output);
    const previous = readDestination(destination);
    const ask = process.stdin.isTTY && process.stdout.isTTY && process.stderr.isTTY ? askTerminal : undefined;
    const { provider, model } = await selectAgent(options.model, ask);
    const prompt = buildGenerationPrompt(projectRoot, options.prompt);
    const runAgent = provider === 'codex' ? runCodex : runClaude;
    const draft = runAgent(projectRoot, prompt, model);
    await deliverDraft(draft, destination, previous, {
      yes: options.yes,
      stdout: process.stdout,
      stderr: process.stderr,
      ask
    });
  }
} catch (error) {
  console.error(`houseguide: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
