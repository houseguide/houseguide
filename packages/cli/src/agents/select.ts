import { spawn, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { createInterface } from 'node:readline';

const providers = ['codex', 'claude'] as const;
export type Provider = (typeof providers)[number];
type AgentSelection = { provider: Provider; model?: string };

export async function selectAgent(
  selection: string | undefined,
  ask?: (message: string) => Promise<string>
): Promise<AgentSelection> {
  if (selection !== undefined) {
    const slash = selection.indexOf('/');
    const provider = providers.find((candidate) => candidate === selection.slice(0, slash));
    const model = selection.slice(slash + 1);
    if (slash < 1 || !provider || !model.trim()) {
      throw new Error('Use --model with codex/<model> or claude/<model>.');
    }
    return { provider, model };
  }

  const available = providers.filter(
    (provider) => spawnSync(provider, ['--version'], { stdio: 'ignore', timeout: 3000 }).status === 0
  );
  let [provider] = available;
  if (!provider) {
    throw new Error(
      'Install Codex (https://developers.openai.com/codex/cli/) or Claude Code (https://code.claude.com/docs/en/setup).'
    );
  }
  if (available.length > 1) {
    if (!ask) {
      throw new Error('Multiple agents are installed. Specify --model <provider/model>.');
    }
    const answer = (await ask('Choose an agent (1 for Codex, 2 for Claude): ')).trim();
    if (answer !== '1' && answer !== '2') {
      throw new Error('Select 1 for Codex or 2 for Claude.');
    }
    provider = answer === '1' ? 'codex' : 'claude';
  }
  return { provider, model: provider === 'codex' ? await readCodexModel() : undefined };
}

function readCodexModel(): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    const child = spawn('codex', ['app-server', '--stdio'], { cwd: tmpdir(), stdio: ['pipe', 'pipe', 'ignore'] });
    const lines = createInterface({ input: child.stdout });
    const timeout = setTimeout(() => finish(new Error('Timed out reading the configured Codex model.')), 10_000);

    let finished = false;

    function finish(error?: Error, model?: string) {
      if (finished) {
        return;
      }
      finished = true;
      clearTimeout(timeout);
      lines.close();
      child.kill();
      if (error) {
        reject(error);
      } else {
        resolve(model);
      }
    }

    const send = (message: object) => child.stdin.write(`${JSON.stringify(message)}\n`);
    child.once('error', finish);
    child.stdin.once('error', finish);
    child.once('exit', () => finish(new Error('Codex exited before returning its configuration.')));
    lines.on('line', (line) => {
      let reply: { id?: number; error?: unknown; result?: { config?: { model?: unknown } } };
      try {
        reply = JSON.parse(line);
      } catch {
        finish(new Error('Codex returned invalid configuration output.'));
        return;
      }
      if (reply.error && (reply.id === 1 || reply.id === 2)) {
        finish(new Error('Could not read the configured Codex model.'));
      } else if (reply.id === 1) {
        send({ jsonrpc: '2.0', method: 'initialized' });
        send({ jsonrpc: '2.0', id: 2, method: 'config/read', params: {} });
      } else if (reply.id === 2) {
        const model: unknown = reply.result?.config?.model;
        finish(undefined, typeof model === 'string' ? model : undefined);
      }
    });
    send({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { clientInfo: { name: 'houseguide', version: '0.1.0' }, capabilities: { experimentalApi: true } }
    });
  });
}
