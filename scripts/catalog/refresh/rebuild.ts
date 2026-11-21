import { groupCandidates } from '../group.ts';
import type { RuleCandidate, StructureObservation } from '../records.ts';
import { renderInstructionCatalog } from '../render.ts';
import { renderStructureGuide } from '../structure.ts';
import type { Findings } from './distill.ts';
import type { ActiveSource } from './fetch.ts';

export function rebuildGuides(sources: ActiveSource[], findings: Findings[]) {
  const active = new Map<string, { repository: string; path: string }[]>();
  for (const { sha256, repository, path } of sources) {
    const references = active.get(sha256);
    if (references) {
      references.push({ repository, path });
    } else {
      active.set(sha256, [{ repository, path }]);
    }
  }

  const rules: RuleCandidate[] = [];
  const structure: StructureObservation[] = [];
  for (const { sha256, rules: ruleFindings, structure: structureFindings } of findings) {
    const references = active.get(sha256);
    if (!references) {
      continue;
    }
    for (const { line, useCase: _useCase, ...rule } of ruleFindings) {
      rules.push({ ...rule, provenance: [{ sha256, sources: references, line }] });
    }
    for (const { line, ...observation } of structureFindings) {
      structure.push({ ...observation, provenance: { sha256, sources: references, line } });
    }
  }

  const candidates = groupCandidates(rules).sort(
    (a, b) =>
      a.action.localeCompare(b.action, 'en') ||
      a.trigger.localeCompare(b.trigger, 'en') ||
      a.scope.localeCompare(b.scope, 'en') ||
      a.exceptions.join('\n').localeCompare(b.exceptions.join('\n'), 'en')
  );
  const topics = new Set(
    structure.flatMap((observation) => (observation.kind === 'heading' ? [observation.topic] : []))
  );
  if (candidates.length === 0 || topics.size !== 6) {
    throw new Error('Refreshed guides require reusable rules and evidence for all six structure topics.');
  }

  return {
    instructions: renderInstructionCatalog(candidates),
    structure: renderStructureGuide(structure),
    candidates
  };
}
