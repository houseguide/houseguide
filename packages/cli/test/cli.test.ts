import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { env } from 'node:process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const entry = join(root, 'packages/cli/dist/index.js');
const markdown = '# Fixture rules\n\nUse the calibration log.\n';
const evidence = [{ command: 'make verify-dial', source: 'README.md:2' }];
const scratch = realpathSync(mkdtempSync(join(tmpdir(), 'houseguide-acceptance-')));
const bin = join(scratch, 'bin');

function command(executable: string, args: string[], cwd: string, environment = env) {
  const result = spawnSync(executable, args, { cwd, env: environment, encoding: 'utf8', timeout: 20_000 });
  if (result.error) {
    throw result.error;
  }
  return result;
}

const fixtureAgent = `#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const argv = process.argv.slice(2);
if (argv[0] === '--version') {
  console.log('fixture');
  process.exit(0);
}
if (process.env.HOUSEGUIDE_FIXTURE_ARGV) {
  fs.writeFileSync(process.env.HOUSEGUIDE_FIXTURE_ARGV, JSON.stringify(argv));
}
const prompt = fs.readFileSync(0, 'utf8');
const input = JSON.parse(prompt.slice(prompt.lastIndexOf('\\n\\n') + 2));
if (argv.includes('--add-dir')) {
  assert.notEqual(input.projectRoot, process.cwd());
  const settings = JSON.parse(fs.readFileSync('.commandcode/settings.json', 'utf8'));
  assert.deepEqual(settings, {permissions: {additionalDirectories: [input.projectRoot], allow: ['Read(' + input.projectRoot + '/**)']}});
  assert.ok(argv.includes('--safe-mode') && argv.includes('--no-skills') && !argv.includes('--yolo'));
  assert.match(prompt, /Reply with only one JSON object/);
  process.chdir(argv[argv.indexOf('--add-dir') + 1]);
}
assert.equal(input.projectRoot, process.cwd());
assert.match(input.instructionCatalog, /Reusable instruction catalog/);
assert.match(input.structureGuide, /Instruction file structure/);
assert.match(input.operatorDirective, /calibration log/);
assert.match(prompt, /return its exact contents/);
const existing = fs.existsSync('AGENTS.md') ? fs.readFileSync('AGENTS.md', 'utf8') : '';
const conflict = fs.existsSync('CLAUDE.md');
const draft = ${JSON.stringify(markdown)};
const response = {
  markdown: conflict && existing.includes('meridian') ? draft + '\\nKeep meridian records in UTC.\\n' : draft,
  changes: existing === draft ? [] : ["Use the operator's vocabulary."],
  commandEvidence: fs.existsSync('README.md') ? ${JSON.stringify(evidence)} : [],
  unresolvedConflicts: conflict ? ['AGENTS.md and CLAUDE.md disagree about retention.'] : []
};
if (argv.includes('exec')) {
  assert.ok(argv.includes('read-only') && argv.includes('shell_tool'));
  fs.writeFileSync(argv[argv.indexOf('--output-last-message') + 1], JSON.stringify(response));
} else if (argv.includes('--add-dir')) {
  const finalText = 'Draft:\\n\\x60\\x60\\x60json\\n' + JSON.stringify(response) + '\\n\\x60\\x60\\x60';
  console.log(JSON.stringify({type: 'event', event: {type: 'tool_running', toolName: 'read_file'}}));
  console.log(JSON.stringify({type: 'result', subtype: 'success', finalText}));
} else {
  assert.ok(argv.includes('Read,Glob,Grep'));
  console.log(JSON.stringify({structured_output: response}));
}
`;

beforeAll(() => {
  const build = command('bun', ['run', 'prepare-release'], root);
  expect(build.status, build.stderr).toBe(0);
  mkdirSync(bin);
  for (const agent of ['codex', 'claude', 'command-code']) {
    const fixture = join(bin, agent);
    writeFileSync(fixture, fixtureAgent);
    chmodSync(fixture, 0o755);
  }
});

afterAll(() => rmSync(scratch, { recursive: true, force: true }));

for (const [agent, runtime] of [
  ['codex', 'node'],
  ['claude', 'bun'],
  ['cmd', 'node']
] as const) {
  describe(agent, () => {
    function run(directory: string, ...args: string[]) {
      return command(runtime, [entry, '-m', `${agent}/fixture`, '-p', 'Use calibration log.', ...args], directory, {
        ...env,
        PATH: [bin, env.PATH].join(delimiter)
      });
    }

    test('prints a draft for an empty directory without writing', () => {
      const directory = mkdtempSync(join(scratch, 'empty-'));
      const result = run(directory);
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout).toBe(markdown);
      expect(existsSync(join(directory, 'AGENTS.md'))).toBe(false);
    });

    test('reports command evidence and keeps a repeat write byte-identical', () => {
      const directory = mkdtempSync(join(scratch, 'established-'));
      expect(command('git', ['init', '-q'], directory).status).toBe(0);
      writeFileSync(join(directory, 'README.md'), '# Dial\nRun make verify-dial.\n');
      const nested = join(directory, 'nested');
      mkdirSync(nested);
      const destination = join(directory, 'AGENTS.md');
      const first = run(nested, '-y');
      expect(first.status, first.stderr).toBe(0);
      expect(first.stderr).toContain('make verify-dial (README.md:2)');
      expect(readFileSync(destination, 'utf8')).toBe(first.stdout);
      const second = run(nested, '-y');
      expect(second.status, second.stderr).toBe(0);
      expect(second.stdout).toBe(first.stdout);
      expect(second.stderr).not.toContain("Use the operator's vocabulary.");
      expect(readFileSync(destination, 'utf8')).toBe(markdown);
    });

    test('reports a conflict alongside the override and preserves the destination with --yes', () => {
      const directory = mkdtempSync(join(scratch, 'conflict-'));
      const destination = join(directory, 'AGENTS.md');
      const original = '# Dial\nUse the calibration sheet. Keep meridian records in UTC. Retain records for 30 days.\n';
      writeFileSync(destination, original);
      writeFileSync(join(directory, 'CLAUDE.md'), 'Retain records for 90 days.\n');
      const result = run(directory, '--yes');
      expect(result.status).toBe(1);
      expect(result.stdout).toContain('Use the calibration log.');
      expect(result.stdout).toContain('Keep meridian records in UTC.');
      expect(result.stderr).toContain('Unresolved conflicts');
      expect(readFileSync(destination, 'utf8')).toBe(original);
    });
  });
}

describe('model, agent, and effort selection', () => {
  function select(...args: string[]) {
    const directory = mkdtempSync(join(scratch, 'select-'));
    const log = join(directory, '..', `${directory.split('/').at(-1)}.argv.json`);
    const result = command('node', [entry, '-p', 'Use calibration log.', ...args], directory, {
      ...env,
      PATH: [bin, env.PATH].join(delimiter),
      HOUSEGUIDE_FIXTURE_ARGV: log
    });
    return { ...result, argv: existsSync(log) ? (JSON.parse(readFileSync(log, 'utf8')) as string[]) : [] };
  }

  test('passes the bare model and effort to Codex for an openai model', () => {
    const result = select('-a', 'codex', '-m', 'openai/fixture', '-e', 'high');
    expect(result.status, result.stderr).toBe(0);
    expect(result.argv).toContain('--model=fixture');
    expect(result.argv).toContain('model_reasoning_effort="high"');
  });

  test('passes the bare model and effort to Claude Code for an anthropic model', () => {
    const result = select('-a', 'claude', '-m', 'anthropic/fixture', '-e', 'max');
    expect(result.status, result.stderr).toBe(0);
    expect(result.argv).toContain('--model=fixture');
    expect(result.argv).toContain('--effort=max');
  });

  test('passes lab/model to Command Code', () => {
    const result = select('-a', 'cmd', '-m', 'deepseek/fixture', '-e', 'low');
    expect(result.status, result.stderr).toBe(0);
    expect(result.argv).toContain('--model=deepseek/fixture');
    expect(result.argv).toContain('--effort=low');
  });

  test('picks the only harness that runs the lab and leaves effort to it', () => {
    const result = select('-m', 'deepseek/fixture');
    expect(result.status, result.stderr).toBe(0);
    expect(result.argv).toContain('--model=deepseek/fixture');
    expect(result.argv.some((arg) => arg.includes('effort'))).toBe(false);
  });

  test('keeps the harness shorthand working', () => {
    const result = select('-m', 'claude/fixture');
    expect(result.status, result.stderr).toBe(0);
    expect(result.argv).toContain('--model=fixture');
  });

  test('requires --agent when several harnesses run the lab without a terminal', () => {
    const result = select('-m', 'openai/fixture');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Specify --agent with codex, cmd.');
  });

  test('rejects a harness that does not run the lab', () => {
    const result = select('-a', 'claude', '-m', 'openai/fixture');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Claude Code does not run openai models.');
  });

  test('rejects an effort that is not a single level', () => {
    const result = select('-a', 'claude', '-e', 'high max');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('--effort');
    expect(result.argv).toEqual([]);
  });
});

test('both package READMEs show the exact help output', () => {
  for (const [name, executable] of [
    ['cli', entry],
    ['houseguide', join(root, 'packages/houseguide/bin.js')]
  ] as const) {
    const result = command('node', [executable, '--help'], root);
    expect(result.status, result.stderr).toBe(0);
    const readme = readFileSync(join(root, 'packages', name, 'README.md'), 'utf8');
    expect(readme).toContain(`\`\`\`text\n${result.stdout}\`\`\``);
  }
});

test('offline tarball installs expose both aliases under Node and Bun', () => {
  const tarballs = ['cli', 'houseguide'].map((name) => {
    const packed = command(
      'npm',
      ['pack', '--offline', '--ignore-scripts', '--silent', '--pack-destination', scratch],
      join(root, 'packages', name)
    );
    expect(packed.status, packed.stderr).toBe(0);
    return packed.stdout.trim();
  });
  const [cli, wrapper] = tarballs;
  const version = JSON.parse(readFileSync(join(root, 'packages/cli/package.json'), 'utf8')).version;

  for (const manager of ['npm', 'bun']) {
    for (const kind of ['scoped', 'wrapper']) {
      const install = join(scratch, `${manager}-${kind}`);
      mkdirSync(install);
      const manifest =
        kind === 'scoped'
          ? { dependencies: { '@houseguide/cli': `file:../${cli}` } }
          : {
              dependencies: { houseguide: `file:../${wrapper}` },
              overrides: { '@houseguide/cli': `file:../${cli}` }
            };
      writeFileSync(join(install, 'package.json'), JSON.stringify({ private: true, ...manifest }));
      const args = ['install', '--offline', '--ignore-scripts'];
      if (manager === 'npm') {
        args.push('--no-audit', '--no-fund', '--no-package-lock', '--install-strategy=nested');
      }
      const installed = command(manager, args, install);
      expect(installed.status, installed.stderr).toBe(0);

      for (const alias of ['houseguide', 'hg']) {
        const executable = join(install, 'node_modules/.bin', alias);
        expect(realpathSync(executable)).toEndWith(
          kind === 'scoped' ? '@houseguide/cli/dist/index.js' : 'houseguide/bin.js'
        );
        for (const runtime of ['node', 'bun']) {
          const result = command(runtime, [executable, '--version'], install);
          expect(result.status, result.stderr).toBe(0);
          expect(result.stdout.trim()).toBe(version);
        }
      }

      const draft = command(
        'node',
        [join(install, 'node_modules/.bin/hg'), '-m', 'claude/fixture', '-p', 'Use calibration log.'],
        install,
        {
          ...env,
          PATH: [bin, env.PATH].join(delimiter)
        }
      );
      expect(draft.status, draft.stderr).toBe(0);
      expect(draft.stdout).toBe(markdown);
    }
  }
}, 30_000);
