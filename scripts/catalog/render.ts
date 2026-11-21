import type { Rule } from './records.ts';

function plainText(text: string): string {
  return text.replace(/[\\`*_{}[\]<>]/g, '\\$&');
}

export function renderInstructionCatalog(rules: Rule[]): string {
  const lines = [
    '# Reusable instruction catalog',
    '',
    'Consider these rules when the trigger and scope fit the project. Check existing project instructions and operator directives before adding one.'
  ];
  for (const { action, trigger, scope, exceptions } of rules) {
    lines.push(
      '',
      `## ${plainText(action)}`,
      '',
      `- Applies to ${plainText(scope.charAt(0).toLowerCase() + scope.slice(1))}.`,
      `- Trigger condition. ${plainText(trigger)}`
    );
    for (const exception of exceptions) {
      lines.push(`- Exception. ${plainText(exception)}`);
    }
  }
  return `${lines.join('\n')}\n`;
}
