# ⌂ houseguide

Teach your coding agent the house rules.

## Repository layout

- `packages/cli` contains the `@houseguide/cli` implementation.
- `packages/houseguide` provides the unscoped `houseguide` package and delegates to `@houseguide/cli`.
- `apps/website` is the workspace for the landing page at `houseguide.dev`.

The monorepo uses Bun for development and builds. The CLI targets Node.js and Bun.

## License

MIT
