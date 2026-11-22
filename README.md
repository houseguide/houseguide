# ⌂ houseguide

Teach your coding agent the house rules.

Houseguide inspects a project and drafts the `AGENTS.md` that the next coding agent needs before changing it: the commands that actually work, the boundaries that must hold, and the workflows that need approval. It asks an installed coding agent to write the guide, shows you the draft, and writes only after you approve it.

## Quick start

```sh
npx houseguide # to review it first

npx houseguide --yes # or to generate AGENTS.md directly
```

## Usage

```text
Usage: ⌂ houseguide [options]

Options
  -m, --model <provider/model>  Select the agent and model
  -p, --prompt <text>           Add instructions for the agent
  -y, --yes                     Approve writing the generated draft
  -o, --output <file>           Write to this path (default: AGENTS.md)
  -h, --help                    Show help
  -v, --version                 Show the version
```

### `-m, --model <provider/model>`

Selects the coding agent and model used to write the draft.

- Currently, it supports `claude` and `codex` as providers, PRs welcome to support more in the future.
- Everything after the first slash is passed verbatim to that provider's CLI as its model. It's highly forgiving but you can go as specific as needed. `claude/opus` would work with the default Opus version, but `claude/claude-opus-5-5` would only use Opus 5.5.
- When you omit `--model`, Houseguide probes each provider with `--version`:
  - One installed provider is used automatically, with its own configured default model. For Codex, Houseguide reads the configured model from `codex app-server`; for Claude, it lets Claude Code choose.
  - Both installed: Houseguide asks which one to use, but only when stdin, stdout, and stderr are all terminals. Otherwise it exits with an error so a pipeline never blocks on a prompt.
  - Neither installed: it exits with links to the install instructions.

Example:

```sh
npx houseguide --model claude/fable --yes
```

### `-p, --prompt <text>`

Adds instructions from you, the operator, to the generation prompt.

- Operator guidance is applied before scoped repository instructions, so it wins when the two disagree. Use it to override a convention, supply context the code cannot show, or rule out a section.
- The agent still works read-only: project files and your instructions are evidence for the draft, never permission to execute commands.
- It does not change where the draft is written or whether the write is confirmed.

Example:

```sh
npx houseguide --prompt "Use Bun for every command and never suggest npm." --yes
```

### `-y, --yes`

Approves writing the draft without the interactive `Write this draft? [y/N]` prompt.

- Without `--yes`, an interactive run waits for confirmation; anything other than `y` or `yes` leaves the destination untouched and exits successfully.
- Without `--yes`, a noninteractive run only previews. Stdout carries the draft and nothing is written, so `npx houseguide > draft.md` is a safe preview.
- With `--yes`, the write proceeds without confirmation, including in scripts and CI. Houseguide still refuses to write when the draft reports unresolved conflicts.

### `-o, --output <file>`

Sets the destination for the draft.

- The default is `AGENTS.md` at the project root, which is the Git root when inside a repository.
- If you exclusively work with Claude and prefer CLAUDE.md instead, you can use `-o CLAUDE.md`.
- A relative path is resolved from the directory you invoked Houseguide in, not from the Git root.
- An absolute path may point outside the project, so you can stage a draft elsewhere before adopting it.
- An empty path is rejected.

The destination only controls where the draft is written. Inspection still happens from the project root.

```sh
npx houseguide -o CLAUDE.md
npx houseguide --output docs/AGENTS.md
```

### `-h, --help` and `-v, --version`

Print the usage text or the version and exit. Both work without Git and without an installed agent, which makes them safe checks in any environment.

## Output and exit behavior

Houseguide keeps machine-readable output separate from review detail:

- Noninteractive stdout carries the draft Markdown verbatim, so a pipeline can consume it directly.
- Interactive stdout shows the full draft for a new destination and a diff against the existing file when one is present.
- Stderr carries the destination, change notes, command evidence, unresolved conflicts, agent-selection prompts, write prompts, and errors.
- Exit status is 0 when the draft is shown, written, or the write is declined. It is 1 for invalid options, unresolved conflicts, agent failures, and write failures.

## Write guarantees

- Only the validated draft Markdown is written.
- Identical content is left untouched, including its permissions.
- An existing destination keeps its file mode, and concurrent changes made during review are detected rather than overwritten.
- A new destination is created without clobbering a file that appeared during review.
- Unresolved conflicts preserve the destination and fail the run, even with `--yes`.
- Writes are atomic, so a failure cannot leave a partially written guide.

## Read-only generation

The guide is generated under restrictions, not under the agent's normal permissions:

- Claude Code runs with only `Read`, `Glob`, and `Grep`, no MCP servers, no session persistence, and a restricted permission mode.
- Codex runs in a read-only sandbox with shell execution, plugins, hooks, web search, and user configuration disabled. It reads the project through a project-reader MCP server confined to the resolved project root, including through symlinks.
- Collected project content is treated as evidence for the draft. It cannot authorize command execution, edits, or extra tools.

## Repository layout

- `packages/cli` contains the `@houseguide/cli` implementation.
- `packages/houseguide` provides the unscoped `houseguide` package and delegates to `@houseguide/cli`.
- `apps/website` is the workspace for the landing page at `houseguide.dev`.

The monorepo uses Bun for development and builds. The CLI targets Node.js and Bun.

## Development

- [x] Claude Code
- [x] Codex
- [ ] PRs welcome for more providers

## License

MIT
