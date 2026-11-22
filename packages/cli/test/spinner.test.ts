import { expect, test } from 'bun:test';

import { createSpinner } from '../src/spinner.ts';

function stream(isTTY: boolean) {
  let output = '';
  return {
    isTTY,
    write(chunk: string) {
      output += chunk;
      return true;
    },
    read: () => output
  };
}

test('stays silent when stderr is not a terminal', () => {
  const stderr = stream(false);
  createSpinner(stderr).start('Drafting claude/sonnet');
  expect(stderr.read()).toBe('');
});

test('draws a frame and clears it on a terminal', async () => {
  const stderr = stream(true);
  const spinner = createSpinner(stderr);
  spinner.start('Drafting claude/sonnet');
  expect(stderr.read()).toStartWith('\r\x1b[2K');
  expect(stderr.read()).toContain('Drafting claude/sonnet');

  spinner.stop();
  expect(stderr.read()).toEndWith('\r\x1b[2K');

  const stopped = stderr.read();
  await new Promise((resolve) => setTimeout(resolve, 200));
  expect(stderr.read()).toBe(stopped);
});

test('stop is safe without a start', () => {
  const stderr = stream(true);
  createSpinner(stderr).stop();
  expect(stderr.read()).toBe('');
});
