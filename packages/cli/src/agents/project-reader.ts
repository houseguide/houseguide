import { closeSync, constants, fstatSync, openSync, readdirSync, readSync, realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline';

const root = realpathSync(process.cwd());
const readLimit = 32 * 1024;
const toolSchema = {
  type: 'object',
  required: ['path'],
  properties: { path: { type: 'string', description: 'Path relative to the project root.' } },
  additionalProperties: false
};
const annotations = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };
const tools = [
  { name: 'list_directory', description: 'List entries in a project directory.', inputSchema: toolSchema, annotations },
  {
    name: 'read_file',
    description: 'Read the first 32 KiB of a project text file.',
    inputSchema: toolSchema,
    annotations
  }
];

function resolveProjectPath(path: unknown): string {
  if (typeof path !== 'string' || isAbsolute(path)) {
    throw new Error('Provide a relative project path.');
  }
  const target = realpathSync(resolve(root, path));
  const location = relative(root, target);
  if (location === '..' || location.startsWith(`..${sep}`) || isAbsolute(location)) {
    throw new Error('Path is outside the project.');
  }
  return target;
}

function readFile(path: string): string {
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    if (!fstatSync(fd).isFile()) {
      throw new Error('Path must be a regular file.');
    }
    const buffer = Buffer.alloc(readLimit + 1);
    const bytes = readSync(fd, buffer);
    const text = buffer.subarray(0, Math.min(bytes, readLimit)).toString('utf8');
    return bytes > readLimit ? `${text}\n[File truncated at 32 KiB]` : text;
  } finally {
    closeSync(fd);
  }
}

function callTool(name: string | undefined, path: unknown) {
  try {
    const target = resolveProjectPath(path);
    if (name === 'read_file') {
      return { content: [{ type: 'text', text: readFile(target) }] };
    }
    if (name === 'list_directory') {
      const entries = readdirSync(target);
      const listed = entries.slice(0, 1000);
      if (entries.length > listed.length) {
        listed.push('[Directory listing truncated at 1000 entries]');
      }
      return { content: [{ type: 'text', text: listed.join('\n') }] };
    }
    throw new Error('Unknown project reader tool.');
  } catch (error) {
    return { isError: true, content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }] };
  }
}

interface Request {
  id?: number | string;
  method?: string;
  params?: { protocolVersion?: string; name?: string; arguments?: { path?: unknown } };
}

for await (const line of createInterface({ input: stdin, crlfDelay: Infinity })) {
  const { id, method, params } = JSON.parse(line) as Request;
  if (id === undefined) {
    continue;
  }

  let result: unknown;
  switch (method) {
    case 'initialize':
      result = {
        protocolVersion: params?.protocolVersion ?? '2025-06-18',
        capabilities: { tools: {} },
        serverInfo: { name: 'houseguide-project-reader', version: '1.0.0' }
      };
      break;
    case 'ping':
      result = {};
      break;
    case 'tools/list':
      result = { tools };
      break;
    case 'tools/call':
      result = callTool(params?.name, params?.arguments?.path);
      break;
    default:
      stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } })}\n`);
      continue;
  }
  stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, result })}\n`);
}
