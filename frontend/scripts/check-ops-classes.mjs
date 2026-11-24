// CLI của `npm run lint:ops`: kiểm luật khu vận hành (JSX và CSS). Luật nằm trong ops-rules.mjs.
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkOpsFile } from './ops-rules.mjs';

function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? files(path) : /\.(?:jsx?|css)$/.test(path) ? [path] : [];
  });
}

const root = fileURLToPath(new URL('../', import.meta.url));
for (const dir of ['src/pages/Admin', 'src/pages/Staff', 'src/components/Ops', 'src/styles/ops']) {
  for (const file of files(join(root, dir))) {
    const path = relative(root, file).replaceAll('\\', '/');
    for (const problem of checkOpsFile(path, readFileSync(file, 'utf8'))) {
      console.error(path + ':' + problem.line + ' ' + problem.message);
      process.exitCode = 1;
    }
  }
}
