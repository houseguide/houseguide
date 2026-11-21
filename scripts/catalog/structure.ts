import type { StructureObservation, StructureTopic } from './records.ts';

const sections: { topic: StructureTopic; title: string; guidance: string }[] = [
  {
    topic: 'scope-and-precedence',
    title: 'Scope and precedence',
    guidance:
      'State which paths the guide covers, where narrower instructions live, and how overlapping rules are resolved. Place approval requirements where they apply.'
  },
  {
    topic: 'setup-and-commands',
    title: 'Setup and commands',
    guidance:
      'List verified prerequisites and commands. Give the working directory, required arguments, and expected result when those details affect whether the command works.'
  },
  {
    topic: 'change-workflow',
    title: 'Change workflow',
    guidance:
      'Describe the steps maintainers expect from investigation through review. Include exceptions or approval requirements for changes with side effects.'
  },
  {
    topic: 'architecture-and-conventions',
    title: 'Architecture and conventions',
    guidance:
      'Point from common tasks to the modules that own them. Record dependency boundaries, canonical definitions, and project conventions that affect decisions.'
  },
  {
    topic: 'verification',
    title: 'Verification',
    guidance:
      'Tie checks to the changes they cover. Include a focused check and any broader required gate. Describe results that can appear successful even when the intended check did not run.'
  },
  {
    topic: 'handoff-and-contribution',
    title: 'Handoff and contribution',
    guidance:
      'Say what a maintainer expects to see about the change, its verification, and outstanding work. Include local contribution and review requirements when they apply.'
  }
];

export function renderStructureGuide(observations: StructureObservation[]): string {
  const topics = new Set<StructureTopic>();
  let hasPointer = false;
  for (const observation of observations) {
    if (observation.kind === 'heading') {
      topics.add(observation.topic);
    } else {
      hasPointer = true;
    }
  }

  const lines = [
    '# Instruction file structure',
    '',
    'Choose headings that fit the repository and group related guidance. A small project can combine setup with verification. A workspace with several toolchains can keep shared requirements at the root and place package specifics near the affected code.'
  ];
  for (const { topic, title, guidance } of sections) {
    if (topics.has(topic)) {
      lines.push('', `## ${title}`, '', guidance);
    }
  }
  if (hasPointer) {
    lines.push(
      '',
      'Keep shared guidance in a canonical file. A companion file can point to it when the relevant agent supports that reference format.'
    );
  }
  return `${lines.join('\n')}\n`;
}
