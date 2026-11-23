import { spawn, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { createInterface } from 'node:readline';

// Labs that a harness runs natively. Command Code hosts many labs, so it accepts any.
const agents = {
  codex: { name: 'Codex', executable: 'codex', labs: ['openai'], install: 'https://developers.openai.com/codex/cli/' },
  claude: {
    name: 'Claude Code',
    executable: 'claude',
    labs: ['anthropic'],
    install: 'https://code.claude.com/docs/en/setup'
  },
  cmd: { name: 'Command Code', executable: 'command-code', labs: undefined, install: 'https://commandcode.ai/docs' }
} as const satisfies Record<string, { name: string; executable: string; labs?: readonly string[]; install: string }>;
export type Provider = keyof typeof agents;
const providers = Object.keys(agents) as Provider[];

export interface AgentRequest {
  agent?: string;
  model?: string;
  effort?: string;
}
export interface AgentSelection {
  provider: Provider;
  model?: string;
  effort?: string;
}

function isProvider(value: string): value is Provider {
  return (providers as string[]).includes(value);
}

function runs(provider: Provider, lab: string | undefined): boolean {
  const labs: readonly string[] | undefined = agents[provider].labs;
  return lab === undefined || labs === undefined || labs.includes(lab);
}

export async function selectAgent(
  { agent: requested, model, effort }: AgentRequest,
  ask?: (message: string) => Promise<string>
): Promise<AgentSelection> {
  if (requested !== undefined && !isProvider(requested)) {
    throw new Error(`Use --agent with ${providers.join(', ')}.`);
  }
  let agent: Provider | undefined = requested;
  if (model !== undefined && !model.trim()) {
    throw new Error('Use --model with <lab/model>, such as openai/<model>, or a model name.');
  }

  // A harness name in front of the model is the shorthand for --agent.
  let lab: string | undefined;
  let slash = model?.indexOf('/') ?? -1;
  if (model !== undefined && slash > 0 && isProvider(model.slice(0, slash))) {
    const named: Provider = model.slice(0, slash) as Provider;
    if (agent !== undefined && agent !== named) {
      throw new Error(`--model names ${named} but --agent names ${agent}.`);
    }
    agent = named;
    model = model.slice(slash + 1);
    if (!model.trim()) {
      throw new Error(`Use --model with ${named}/<model>.`);
    }
    slash = model.indexOf('/');
  }
  if (model !== undefined && slash > 0) {
    lab = model.slice(0, slash);
  }

  let provider: Provider;
  if (agent !== undefined) {
    provider = agent;
    if (!runs(provider, lab)) {
      throw new Error(`${agents[provider].name} does not run ${lab} models.`);
    }
  } else {
    const candidates = providers.filter((name) => runs(name, lab));
    const available = candidates.filter(
      (name) => spawnSync(agents[name].executable, ['--version'], { stdio: 'ignore', timeout: 3000 }).status === 0
    );
    const [first] = available;
    if (!first) {
      const install = candidates.map((name) => `${agents[name].name} (${agents[name].install})`).join(', ');
      throw new Error(lab === undefined ? `Install ${install}.` : `To run ${lab} models, install ${install}.`);
    }
    provider = first;
    if (available.length > 1) {
      if (!ask) {
        throw new Error(`Multiple agents can run this model. Specify --agent with ${available.join(', ')}.`);
      }
      const choices = available.map((name, index) => `${index + 1} for ${agents[name].name}`).join(', ');
      const answer = (await ask(`Choose an agent (${choices}): `)).trim();
      const chosen = /^[1-9]$/.test(answer) ? available[Number(answer) - 1] : undefined;
      if (!chosen) {
        throw new Error(`Select ${choices}.`);
      }
      provider = chosen;
    }
  }

  // Codex and Claude Code take the bare model name; Command Code takes lab/model.
  if (model !== undefined && lab !== undefined && agents[provider].labs !== undefined) {
    model = model.slice(slash + 1);
  }
  if (model === undefined && provider === 'codex') {
    model = await readCodexModel();
  }
  return { provider, model, effort };
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
