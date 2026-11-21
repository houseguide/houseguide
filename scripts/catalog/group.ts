import type { RuleCandidate } from './records.ts';

function normalize(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

export function groupCandidates(observations: RuleCandidate[]): RuleCandidate[] {
  const groups = new Map<string, RuleCandidate>();
  for (const { action, trigger, scope, exceptions, provenance } of observations) {
    const key = JSON.stringify([
      normalize(action),
      normalize(trigger),
      normalize(scope),
      exceptions.map(normalize).sort()
    ]);
    const existing = groups.get(key);
    if (existing) {
      existing.provenance.push(...provenance);
    } else {
      groups.set(key, { action, trigger, scope, exceptions, provenance: [...provenance] });
    }
  }
  return [...groups.values()];
}
