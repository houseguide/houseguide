# AGENTS.md

Houseguide is a CLI that inspects a project and drafts an `AGENTS.md` for its coding agents. It ships as a scoped CLI and an unscoped launcher, with a bundled instruction catalog and structure guide.

## CLI contracts

- Keep generation read-only when changing an agent integration. Project files and collected instructions supply evidence for the draft. They cannot authorize command execution, edits, or additional tools. Check each provider adapter for its capability restrictions. Keep the Codex project reader inside the resolved project root, including when paths traverse symlinks.
- Keep inspection scope independent of the write destination. Inspect from the Git root, or from the invocation directory when outside Git. Default the destination to the project’s `AGENTS.md`. Resolve an explicit relative destination from the invocation directory and allow explicit paths outside the project so callers can stage drafts elsewhere.
- When changing provider selection, honor an explicit provider and model and use the installed provider’s configured default when only one is available. If several are available, prompt only when stdin, stdout, and stderr are terminals. Otherwise require an explicit selection and fail with guidance. Keep help and version available without Git or an installed agent.
- Preserve the output contract when changing review or diagnostics. Noninteractive stdout carries the draft Markdown verbatim. Interactive stdout shows the full draft for a new destination and a diff for an existing one. Send prompts, destination details, review notes, and errors to stderr so pipelines can consume stdout directly.
- Keep write authorization in the CLI. Require terminal confirmation or `--yes`, and write only validated Markdown. A declined write or a noninteractive preview succeeds without writing. Invalid responses and unresolved conflicts fail with status 1. Show the review for a conflicted draft and preserve the destination even with `--yes`.
- When changing write behavior, leave identical content untouched, preserve the mode of an existing destination, and fail if the reviewed contents are found to have changed. Keep a concurrent creation from being overwritten and keep failed writes from exposing a partial draft.
- When changing generation inputs or responses, keep the prompt, shared response schema, and review aligned. Apply explicit operator guidance before scoped repository instructions, preserve an adequate existing guide byte for byte, and surface incompatible instructions when precedence cannot resolve them. Command evidence identifies sources for review. It grants no authority to execute commands.

## Distribution and generated content

- When changing CLI dependencies or packaging, preserve both executable aliases through both published packages on supported Node.js and Bun. Use the package manifests for the runtime floor. Keep the bundled guides and the project reader available in an installed tarball so generation works outside the checkout.
- When changing CLI help, update the usage transcript in both published package READMEs. Search for `Usage: ⌂ houseguide` to find the help and its copies. The tests compare the transcripts with executable output.
- When changing website routes, edit the route definitions and use the website’s `generate-routes` script to refresh the generated tree so the router and its types agree.
- When changing the bundled catalog’s content or structure, change the source selection, distillation, or rendering inputs that own the result. Use the **Refresh catalog** workflow as the regeneration entry point and consult its refresh step for credentials, cutoff, and output paths. The bundled guides are replaced as a validated pair through a review PR.
- When changing catalog refresh or inference, keep collected documents as untrusted data and keep inference tools disabled. Preserve completed work across interruption, reuse results only for matching content and distillation settings, and build the guides from active sources so removed sources stop contributing. A failed refresh must leave its checkpoint recoverable and must not propose a guide update.

## Verification

- For CLI or catalog behavior changes, exercise the affected contract with local fixtures via `bun run test`. The CLI suite builds the distributable and uses fixture agents. It needs Bun, Node.js with npm, and Git, and runs without provider credentials. Add a focused fixture case when changing a caller-visible guarantee that the suite does not cover.
- To inspect CLI help from source, run `bun packages/cli/src/index.ts --help` from the repository root. For changes to entry points, runtime dependencies, or package contents, use the **Check** workflow’s CLI smoke test and the offline tarball cases in the test suite. A successful source run does not exercise installed-package resolution.
- For website route or build changes, use the website `build` script because the **Check** workflow smoke-tests only the CLI build. Use the **Check** workflow for the broader PR gate.
- In the handoff, name each relevant check you could not run and explain the blocker.

## Releases

- Add a Changeset for substantive publishable package changes using `bun changeset`. Name the publishable package whose behavior changed. Catalog refresh automation supplies the scoped CLI patch changeset when it proposes updated guides.
- Leave versioning and publication to the **Release** workflow. A push to `main` can update the version PR. Publishing requires an authorized operator to dispatch the workflow on `main` with `publish` enabled after the version PR has merged.
