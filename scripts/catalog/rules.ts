import type { Rule } from './records.ts';

interface RulePattern extends Rule {
  match: RegExp;
}

export const rulePatterns: RulePattern[] = [
  {
    match:
      /(?:do not|don't|never) (?:directly |manually |hand[- ]?)?(?:edit|modify|change) (?:the )?generated (?:files|code|output)|generated (?:files|code).*(?:do not|don't|never) (?:edit|modify)/i,
    action: "Change the canonical input and regenerate the derived files with the project's generator.",
    trigger: 'A change affects tracked generated output.',
    scope: 'Generated files with a documented source and generator',
    exceptions: []
  },
  {
    match:
      /(?:fix(?:ing)? (?:a )?bugs?|bug fixes?).{0,100}regression test|regression test.{0,100}(?:bug fixes?|fix(?:ing)? (?:a )?bugs?)/i,
    action: 'Add a regression test that exercises the reported failure.',
    trigger: 'Fixing a reproducible bug.',
    scope: "Behavior covered by the project's test harness",
    exceptions: []
  },
  {
    match:
      /(?:do not|don't|never) commit (?:any )?(?:secrets|credentials|api keys|tokens)|(?:secrets|credentials|api keys).{0,50}(?:must never|should never) be committed/i,
    action: 'Keep credentials out of version control.',
    trigger: 'Editing configuration, examples, fixtures, or Git changes that involve credentials.',
    scope: 'Tracked files and proposed commits',
    exceptions: []
  },
  {
    match:
      /(?:ask|confirm|get (?:explicit )?(?:approval|permission)).{0,55}before.{0,35}(?:destructive (?:actions?|operations?|commands?)|irreversible (?:actions?|operations?))/i,
    action: 'Get explicit approval before taking the destructive action.',
    trigger: 'A proposed operation may irreversibly remove or overwrite user data.',
    scope: 'Destructive operations',
    exceptions: []
  },
  {
    match: /(?:ask|confirm|get (?:explicit )?(?:approval|permission)).{0,55}before.{0,30}(?:deploying|deployments?)/i,
    action: 'Get explicit approval before deploying.',
    trigger: 'The next step would deploy a change.',
    scope: 'Deployments',
    exceptions: []
  },
  {
    match:
      /(?:do not|don't|never) (?:force[- ]push|push with --force)(?:\s+(?:shared|published|remote) (?:branches|history))?[.!*]*\s*$/i,
    action: 'Use a follow-up commit to correct published branch history.',
    trigger: 'Correcting a change that has already been pushed.',
    scope: 'Published Git history',
    exceptions: []
  },
  {
    match:
      /(?:do not|don't|never) commit (?:code )?without (?:explicit )?(?:user )?(?:approval|permission|authorization)\b/i,
    action: 'Wait for explicit authorization before committing.',
    trigger: 'The next step would create a Git commit.',
    scope: 'Git commits',
    exceptions: ['The user has explicitly authorized the commit.']
  },
  {
    match:
      /(?:do not|don't|never) push (?:changes )?without (?:explicit )?(?:user )?(?:approval|permission|authorization)\b/i,
    action: 'Wait for explicit authorization before pushing.',
    trigger: 'The next step would push changes to a remote.',
    scope: 'Remote Git pushes',
    exceptions: ['The user has explicitly authorized the push.']
  },
  {
    match:
      /(?:do not|don't|never) (?:commit|add|include).{0,20}(?:unrelated|drive[- ]by) (?:changes|refactors?|cleanup)|(?:keep|leave) unrelated (?:changes|refactors?|cleanup) (?:separate|out)/i,
    action: 'Keep unrelated cleanup out of the change under review.',
    trigger: 'An unrelated issue becomes visible while working on another task.',
    scope: 'Patches and pull requests',
    exceptions: ['The requested task includes the cleanup.']
  },
  {
    match:
      /(?:do not|don't|never) (?:bypass|skip|disable) (?:the )?(?:git |pre.commit )?hooks|(?:do not|don't|never) use .?--no-verify/i,
    action: 'Run the configured commit hooks and address failures before committing.',
    trigger: 'A Git hook fails during a commit.',
    scope: 'Repositories with commit hooks',
    exceptions: []
  },
  {
    match:
      /(?:add|update|write).{0,55}(?:tests?|test coverage).{0,60}(?:new (?:features?|behavior|behaviour|functionality)|behavio[u]?r changes)|(?:new (?:features?|functionality)|behavio[u]?r changes).{0,70}(?:must|should|require).{0,35}tests?/i,
    action: 'Add or update tests that cover the changed behavior.',
    trigger: 'Adding behavior or changing an existing contract.',
    scope: 'Changes to observable program behavior',
    exceptions: []
  },
  {
    match:
      /(?:report|mention|state|note|list).{0,60}(?:tests?|checks?).{0,30}(?:not run|were skipped|could not (?:be )?run)|if you (?:cannot|can.t|couldn.t) run (?:the )?tests?.{0,70}(?:report|mention|state|say|note)/i,
    action: 'Name the check that did not run and explain the blocker in the handoff.',
    trigger: 'A relevant verification command cannot run.',
    scope: 'Verification reports',
    exceptions: []
  },
  {
    match:
      /(?:reproduce|reproduction).{0,60}(?:before fixing|before (?:applying|implementing) (?:a |the )?fix)|before (?:fixing|implementing (?:a |the )?fix).{0,60}reproduce/i,
    action: 'Reproduce the failure on the current code and rerun that case after the fix.',
    trigger: 'Investigating a reported defect.',
    scope: 'Bug fixes with an observable failure',
    exceptions: []
  },
  {
    match:
      /(?:follow|use|stick to) (?:the )?(?:existing|established|local) (?:coding )?(?:conventions|patterns|style)/i,
    action: 'Follow existing project conventions.',
    trigger: 'Changing code.',
    scope: 'Source code',
    exceptions: []
  }
];
