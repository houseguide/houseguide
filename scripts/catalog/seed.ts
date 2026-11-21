import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { argv } from 'node:process';
import { fileURLToPath } from 'node:url';

import { deduplicateSources } from './deduplicate.ts';
import { extractCorpus } from './extract.ts';
import { groupCandidates } from './group.ts';
import { inventorySnapshot, snapshotRoot } from './inventory.ts';
import { judgeCandidate } from './judge.ts';
import { renderInstructionCatalog } from './render.ts';
import { renderStructureGuide } from './structure.ts';

const root = resolve(argv[2] ?? snapshotRoot);
const catalogPath = fileURLToPath(new URL('../../packages/cli/catalog/', import.meta.url));
const evidencePath = fileURLToPath(new URL('../../out/catalog/', import.meta.url));
const inventory = inventorySnapshot(root);
const groups = deduplicateSources(inventory);
const extraction = extractCorpus(root, groups);
const judgments = groupCandidates(extraction.candidates).map((candidate) => ({
  ...candidate,
  decision: judgeCandidate(candidate)
}));

const accepted = judgments.filter(({ decision }) => decision.accepted);
const topics = new Set(
  extraction.structure.flatMap((observation) => (observation.kind === 'heading' ? [observation.topic] : []))
);
if (accepted.length === 0 || topics.size !== 6) {
  throw new Error('Catalog seed requires accepted rules and evidence for all six structure topics.');
}

mkdirSync(catalogPath, { recursive: true });
mkdirSync(evidencePath, { recursive: true });
writeFileSync(join(catalogPath, 'instructions.md'), renderInstructionCatalog(accepted));
writeFileSync(join(catalogPath, 'structure.md'), renderStructureGuide(extraction.structure));
for (const [name, data] of Object.entries({ inventory, groups, judgments, structure: extraction.structure })) {
  writeFileSync(join(evidencePath, `${name}.json`), `${JSON.stringify(data, null, 2)}\n`);
}
console.log(`Bundled ${accepted.length} rules and ${topics.size} structure topics from ${groups.length} unique files.`);
