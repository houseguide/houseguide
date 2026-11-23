import { createFileRoute } from '@tanstack/react-router';
import { useCopyToClipboard } from '@uidotdev/usehooks';
import { useEffect, useState } from 'react';

export const Route = createFileRoute('/')({
  component: Home
});

const repository = 'https://github.com/houseguide/houseguide';
const command = 'npx houseguide';
const help = `Usage: ⌂ houseguide [options]

Options
  -m, --model <lab/model>       Select the model, such as openai/<model>
  -a, --agent <agent>           Run with codex, claude, or cmd
  -e, --effort <level>          Set the agent's reasoning effort
  -p, --prompt <text>           Add instructions for the agent
  -y, --yes                     Approve writing the generated draft
  -o, --output <file>           Write to this path (default: AGENTS.md)
  -h, --help                    Show help
  -v, --version                 Show the version`;

function Home() {
  const [copiedText, copyToClipboard] = useCopyToClipboard();
  const [copyAttempt, setCopyAttempt] = useState<number | null>(null);
  const copied = copyAttempt !== null && copiedText === command;

  useEffect(() => {
    if (copyAttempt !== null && copiedText === command) {
      const timer = window.setTimeout(() => setCopyAttempt(null), 3000);
      return () => window.clearTimeout(timer);
    }
  }, [copiedText, copyAttempt]);

  function copyCommand() {
    copyToClipboard(command);
    setCopyAttempt((attempt) => (attempt ?? 0) + 1);
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="mx-auto flex min-h-20 w-[calc(100%-clamp(2rem,10vw,9rem))] max-w-304 items-center justify-between gap-3 border-b border-rule max-[25rem]:min-h-[4.2rem]">
        <a
          className="inline-flex min-h-11 items-center gap-2 text-lg font-bold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          href="/"
        >
          <span aria-hidden="true" className="text-[1.25rem] leading-none font-medium text-accent">
            ⌂
          </span>
          houseguide
        </a>

        <nav aria-label="Site" className="flex items-center gap-[clamp(.65rem,2vw,1.5rem)] text-sm">
          <a
            className="inline-flex min-h-11 items-center font-semibold underline-offset-4 hover:text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            href={repository}
          >
            GitHub
          </a>
        </nav>
      </header>

      <main className="mx-auto grid w-[calc(100%-clamp(2rem,10vw,9rem))] max-w-304 flex-1 grid-cols-[minmax(0,.92fr)_minmax(0,1.08fr)] items-center gap-[clamp(2rem,5.5vw,5rem)] py-[clamp(4rem,10vh,7rem)] max-[54rem]:grid-cols-1 max-[54rem]:content-center max-[54rem]:gap-9 max-[54rem]:py-12">
        <div>
          <h1 className="mb-7 max-w-[13ch] text-[clamp(2.8rem,5.25vw,5.15rem)] leading-none font-bold tracking-[-.075em] text-balance max-[54rem]:text-[clamp(2.8rem,8.6vw,4.6rem)]">
            Teach your coding agent{' '}
            <em className="block font-display text-[1.07em] font-normal tracking-[-.07em] text-accent">
              the house rules.
            </em>
          </h1>

          <button
            aria-label="Copy npx houseguide"
            className="group inline-flex min-h-[3.1rem] cursor-pointer items-center gap-6 rounded-md bg-action px-4 py-2.5 text-action-ink select-text hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            onClick={copyCommand}
            type="button"
          >
            <code className="font-mono text-sm">{command}</code>

            {copied ? (
              <svg aria-hidden="true" className="size-4 shrink-0" fill="none" viewBox="0 0 16 16">
                <path
                  d="m3 8.5 3.5 3.5L13 4.5"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                />
              </svg>
            ) : (
              <span aria-hidden="true" className="relative size-4 shrink-0">
                <span className="absolute top-0 left-0 h-3 w-[.65rem] rounded-xs border border-current" />
                <span className="absolute right-0 bottom-0 h-3 w-[.65rem] rounded-xs border border-current bg-action group-hover:bg-action-hover" />
              </span>
            )}
          </button>
        </div>

        <figure className="@container min-w-0 overflow-hidden rounded-[.65rem] border border-terminal-edge bg-terminal text-terminal-ink">
          <figcaption className="flex items-center gap-2.5 border-b border-terminal-rule bg-terminal-bar px-[clamp(1rem,2.25vw,1.6rem)] py-4 font-mono text-xs">
            <span aria-hidden="true" className="text-terminal-prompt">
              $
            </span>
            <code>{command} --help</code>
          </figcaption>

          <pre className="px-[clamp(1rem,2.25vw,1.6rem)] py-6 font-mono text-[clamp(.72rem,1.93cqi,.82rem)] leading-[1.85] wrap-anywhere whitespace-pre-wrap max-[25rem]:leading-[1.7]">
            <code>{help}</code>
          </pre>
        </figure>
      </main>

      <footer className="mx-auto flex min-h-[4.2rem] w-[calc(100%-clamp(2rem,10vw,9rem))] max-w-304 flex-wrap items-center justify-between gap-x-3 border-t border-rule py-2.5 text-xs text-muted">
        <span>
          © {new Date().getUTCFullYear()}{' '}
          <a
            className="text-accent hover:underline"
            href="https://gokaygurcan.com?ref=houseguide"
            rel="noopener noreferrer"
            target="_blank"
          >
            Gökay Gürcan
          </a>
        </span>

        <span className="inline-flex min-h-11 items-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
          MIT License
        </span>
      </footer>
    </div>
  );
}
