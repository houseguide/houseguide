import { copyFileSync } from 'node:fs';

const license = new URL('../LICENSE', import.meta.url);
for (const name of ['cli', 'houseguide']) {
  copyFileSync(license, new URL(`../packages/${name}/LICENSE`, import.meta.url));
}
