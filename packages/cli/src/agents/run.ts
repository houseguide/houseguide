import { spawn } from 'node:child_process';

interface ProcessOptions {
  cwd: string;
  input: string;
  capture?: boolean;
}

interface ProcessResult {
  status: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
}

export function runProcess(
  command: string,
  args: string[],
  { cwd, input, capture = true }: ProcessOptions
): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ['pipe', capture ? 'pipe' : 'ignore', capture ? 'pipe' : 'ignore']
    });
    const stdin = child.stdin;
    const stdoutStream = child.stdout;
    const stderrStream = child.stderr;

    let stdout = '';
    let stderr = '';
    if (stdoutStream && stderrStream) {
      stdoutStream.setEncoding('utf8');
      stderrStream.setEncoding('utf8');
      stdoutStream.on('data', (chunk: string) => {
        stdout += chunk;
      });
      stderrStream.on('data', (chunk: string) => {
        stderr += chunk;
      });
    }

    child.once('error', reject);
    // The agent may exit without draining stdin, which raises EPIPE here.
    stdin?.once('error', () => {});
    child.once('close', (status, signal) => resolve({ status, signal, stdout, stderr }));
    stdin?.end(input);
  });
}
