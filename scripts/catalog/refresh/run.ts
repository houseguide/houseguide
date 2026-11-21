import { resolve } from 'node:path';
import { argv, env } from 'node:process';
import { parseArgs } from 'node:util';

import { discoverRepositories, parseCutoff } from './discover.ts';
import { distillSources } from './distill.ts';
import { fetchChangedSources } from './fetch.ts';
import { githubRequest } from './github.ts';
import { createInference, readInferenceSettings } from './inference.ts';
import { rebuildGuides } from './rebuild.ts';
import { discoverSources } from './sources.ts';
import { writeState } from './state.ts';

const { values } = parseArgs({
  args: argv.slice(2),
  options: {
    cutoff: { type: 'string' },
    state: { type: 'string', default: 'out/catalog-refresh/state' },
    output: { type: 'string', default: 'out/catalog-refresh/guides' }
  }
});

const cutoff = parseCutoff(values.cutoff);
const state = resolve(values.state);
const output = resolve(values.output);
const settings = readInferenceSettings();
const infer = createInference(settings);
const request = githubRequest(env.CATALOG_GITHUB_TOKEN || env.GH_TOKEN);
const repositories = await discoverRepositories(request, cutoff);
console.log(`Found ${repositories.length} public repositories with at least ${cutoff} stars.`);
const paths = await discoverSources(request, repositories);
const active = await fetchChangedSources(request, state, paths);
console.log(`Collected ${active.length} active instruction paths.`);
const findings = await distillSources(state, active, settings, infer);
const guides = rebuildGuides(active, findings);
writeState(resolve(output, 'instructions.md'), guides.instructions);
writeState(resolve(output, 'structure.md'), guides.structure);
console.log(`Validated both guides with ${guides.candidates.length} grouped candidates.`);
