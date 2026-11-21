import type { RuleCandidate } from './records.ts';

const scenarios = new Map<string, string>([
  [
    "Change the canonical input and regenerate the derived files with the project's generator.",
    'Edit the API schema and regenerate its checked-in client.'
  ],
  [
    'Add a regression test that exercises the reported failure.',
    'For a leap-day parser bug, add a case with the failing date.'
  ],
  [
    'Keep credentials out of version control.',
    'Keep the real integration key local when adding an example configuration.'
  ],
  [
    'Get explicit approval before taking the destructive action.',
    'Ask before deleting a directory of user-provided imports.'
  ],
  ['Get explicit approval before deploying.', 'After a build passes, ask before deploying to the shared environment.'],
  [
    'Use a follow-up commit to correct published branch history.',
    'Correct a broken change on a shared branch with another commit.'
  ],
  [
    'Wait for explicit authorization before committing.',
    'Leave working-tree changes available for review after testing.'
  ],
  [
    'Wait for explicit authorization before pushing.',
    'Keep a locally reviewed commit local until the user authorizes a push.'
  ],
  ['Keep unrelated cleanup out of the change under review.', 'Leave unrelated formatting out of a bug-fix patch.'],
  [
    'Run the configured commit hooks and address failures before committing.',
    'Fix the formatting error reported by the commit hook and rerun it.'
  ],
  [
    'Add or update tests that cover the changed behavior.',
    'When tightening path validation, test an accepted path and a rejected path.'
  ],
  [
    'Name the check that did not run and explain the blocker in the handoff.',
    'Report which integration tests were skipped because the database was unavailable.'
  ],
  [
    'Reproduce the failure on the current code and rerun that case after the fix.',
    'Trigger the crash with the smallest input and rerun that input after patching.'
  ]
]);

export function judgeCandidate(candidate: RuleCandidate) {
  const scenario = scenarios.get(candidate.action);
  return scenario
    ? { accepted: true as const, scenario }
    : { accepted: false as const, reason: 'The rule does not specify a concrete action for an observed task.' };
}
