# Reusable instruction catalog

Consider these rules when the trigger and scope fit the project. Check existing project instructions and operator directives before adding one.

## Keep credentials out of version control.

- Applies to tracked files and proposed commits.
- Trigger condition. Editing configuration, examples, fixtures, or Git changes that involve credentials.

## Add or update tests that cover the changed behavior.

- Applies to changes to observable program behavior.
- Trigger condition. Adding behavior or changing an existing contract.

## Add a regression test that exercises the reported failure.

- Applies to behavior covered by the project's test harness.
- Trigger condition. Fixing a reproducible bug.

## Change the canonical input and regenerate the derived files with the project's generator.

- Applies to generated files with a documented source and generator.
- Trigger condition. A change affects tracked generated output.

## Use a follow-up commit to correct published branch history.

- Applies to published Git history.
- Trigger condition. Correcting a change that has already been pushed.

## Run the configured commit hooks and address failures before committing.

- Applies to repositories with commit hooks.
- Trigger condition. A Git hook fails during a commit.

## Wait for explicit authorization before committing.

- Applies to git commits.
- Trigger condition. The next step would create a Git commit.
- Exception. The user has explicitly authorized the commit.

## Wait for explicit authorization before pushing.

- Applies to remote Git pushes.
- Trigger condition. The next step would push changes to a remote.
- Exception. The user has explicitly authorized the push.

## Name the check that did not run and explain the blocker in the handoff.

- Applies to verification reports.
- Trigger condition. A relevant verification command cannot run.

## Get explicit approval before taking the destructive action.

- Applies to destructive operations.
- Trigger condition. A proposed operation may irreversibly remove or overwrite user data.

## Reproduce the failure on the current code and rerun that case after the fix.

- Applies to bug fixes with an observable failure.
- Trigger condition. Investigating a reported defect.

## Keep unrelated cleanup out of the change under review.

- Applies to patches and pull requests.
- Trigger condition. An unrelated issue becomes visible while working on another task.
- Exception. The requested task includes the cleanup.
