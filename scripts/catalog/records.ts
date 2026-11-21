import type { SourceReference } from './deduplicate.ts';

export interface SourceLocation {
  sha256: string;
  sources: SourceReference[];
  line: number;
}

export interface Rule {
  action: string;
  trigger: string;
  scope: string;
  exceptions: string[];
}

export interface RuleCandidate extends Rule {
  provenance: SourceLocation[];
}

export type StructureTopic =
  | 'scope-and-precedence'
  | 'setup-and-commands'
  | 'change-workflow'
  | 'architecture-and-conventions'
  | 'verification'
  | 'handoff-and-contribution';

export type StructureObservation =
  | { kind: 'heading'; topic: StructureTopic; level: number; provenance: SourceLocation }
  | { kind: 'pointer'; target: string; provenance: SourceLocation };
