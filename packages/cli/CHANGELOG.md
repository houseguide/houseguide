# @houseguide/cli

## 0.3.0

### Minor Changes

- Add Command Code as an agent (`--agent cmd`), which runs models from labs such as DeepSeek and Google. It runs read-only from an isolated directory so the inspected project cannot supply hooks, permissions, or MCP servers.

- Name models by lab, as in `--model openai/<model>`, and pick the agent with the new `--agent` option or let Houseguide choose one that runs the lab. Add `--effort` to set the agent's reasoning effort. The `codex/<model>` and `claude/<model>` forms keep working.

## 0.2.0

### Minor Changes

- Show a progress spinner on stderr while the agent drafts, and run provider processes asynchronously.

## 0.1.0

### Minor Changes

- [`fec2afc`](https://github.com/houseguide/houseguide/commit/fec2afcccf8f73bc6fcf23809cfcdd482b8de366) Thanks [@gokaygurcan](https://github.com/gokaygurcan)! - Initial release: draft a project-specific AGENTS.md with a local Codex or Claude Code agent.
