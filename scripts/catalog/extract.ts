import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { argv } from 'node:process';

import { deduplicateSources, type SourceGroup } from './deduplicate.ts';
import { inventorySnapshot, snapshotRoot } from './inventory.ts';
import type { RuleCandidate, SourceLocation, StructureObservation, StructureTopic } from './records.ts';
import { rulePatterns } from './rules.ts';

const headingTopics: [StructureTopic, RegExp][] = [
  ['scope-and-precedence', /\b(?:scope|precedence|inheritance|permissions?|boundaries)\b/i],
  ['verification', /\b(?:tests?|testing|verification|validation|checks?)\b/i],
  ['setup-and-commands', /\b(?:setup|commands?|installation|getting started|quick start)\b/i],
  ['handoff-and-contribution', /\b(?:contribution|contributing|handoff|pull requests?|commit messages?)\b/i],
  ['architecture-and-conventions', /\b(?:architecture|conventions|repository map|project structure|code style)\b/i],
  ['change-workflow', /\b(?:workflow|change process|development process|making changes)\b/i]
];

export function extractCorpus(root: string, groups: SourceGroup[]) {
  const candidates: RuleCandidate[] = [];
  const structure: StructureObservation[] = [];

  for (const { sha256, sources } of groups) {
    const source = sources[0];
    if (!source) {
      throw new Error('Source group has no references.');
    }
    const data = readFileSync(join(root, source.repository, source.path));
    if (createHash('sha256').update(data).digest('hex') !== sha256) {
      throw new Error(`Source changed after inventory: ${source.repository}/${source.path}`);
    }
    const lines = data.toString('utf8').split(/\r?\n/);
    let fence: string | undefined;

    for (const [index, line] of lines.entries()) {
      const marker = /^\s{0,3}(`{3,}|~{3,})/.exec(line)?.[1];
      if (marker) {
        if (!fence) {
          fence = marker;
        } else if (marker[0] === fence[0] && marker.length >= fence.length) {
          fence = undefined;
        }
        continue;
      }
      if (fence) {
        continue;
      }

      const provenance: SourceLocation = { sha256, sources, line: index + 1 };
      const heading = /^\s{0,3}(#{1,6})\s+(.+)$/.exec(line);
      if (heading?.[1] && heading[2]) {
        const match = headingTopics.find(([, pattern]) => pattern.test(heading[2] ?? ''));
        if (match) {
          structure.push({ kind: 'heading', topic: match[0], level: heading[1].length, provenance });
        }
      }
      const pointer = /^\s*@((?:\.\/)?(?:AGENTS|CLAUDE)\.md)\s*$/.exec(line)?.[1];
      if (pointer) {
        structure.push({ kind: 'pointer', target: pointer, provenance });
      }

      if (/\b(?:unless|except|only if)\b/i.test(line)) {
        continue;
      }
      for (const { match, ...rule } of rulePatterns) {
        if (match.test(line)) {
          candidates.push({ ...rule, provenance: [provenance] });
        }
      }
    }
  }

  return { candidates, structure };
}

if (import.meta.main) {
  const root = resolve(argv[2] ?? snapshotRoot);
  console.log(JSON.stringify(extractCorpus(root, deduplicateSources(inventorySnapshot(root))), null, 2));
}
