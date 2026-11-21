import { readFileSync } from 'node:fs';

export function loadCatalog() {
  return {
    instructions: readFileSync(new URL('../catalog/instructions.md', import.meta.url), 'utf8'),
    structure: readFileSync(new URL('../catalog/structure.md', import.meta.url), 'utf8')
  };
}
