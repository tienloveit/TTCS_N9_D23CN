#!/usr/bin/env node
// Chặn mã màu hex mới ngoài src/styles/tokens.css.
//
// Mã hex hiện có được ghi trong design-tokens-baseline.json theo từng file.
// Lệnh thất bại khi một file có nhiều mã hex hơn mức đã ghi, hoặc file mới có mã hex.
// Khi đã thay bớt mã hex bằng token, chạy `npm run lint:tokens -- --update`
// để hạ mức trong baseline (mức chỉ được giảm, không tăng).

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const srcDir = join(root, 'src');
const baselinePath = join(root, 'design-tokens-baseline.json');
const tokenFile = 'src/styles/tokens.css';
const extensions = ['.css', '.js', '.jsx'];
const hexPattern = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return walk(path);
    return extensions.some((ext) => entry.name.endsWith(ext)) ? [path] : [];
  });

const counts = {};
for (const file of walk(srcDir)) {
  const rel = relative(root, file).split(sep).join('/');
  if (rel === tokenFile) continue;
  const matches = readFileSync(file, 'utf8').match(hexPattern);
  if (matches?.length) counts[rel] = matches.length;
}

const sorted = Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
const total = Object.values(sorted).reduce((sum, n) => sum + n, 0);

if (process.argv.includes('--update') || !existsSync(baselinePath)) {
  if (existsSync(baselinePath)) {
    const previous = JSON.parse(readFileSync(baselinePath, 'utf8'));
    const raised = Object.entries(sorted).filter(([file, n]) => n > (previous[file] ?? 0));
    if (raised.length) {
      console.error('Không cập nhật baseline: các file sau có thêm mã hex. Dùng token trong src/styles/tokens.css.');
      raised.forEach(([file, n]) => console.error(`  ${file}: ${previous[file] ?? 0} → ${n}`));
      process.exit(1);
    }
  }
  writeFileSync(baselinePath, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log(`Đã ghi baseline: ${total} mã hex trong ${Object.keys(sorted).length} file.`);
  process.exit(0);
}

const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
const failures = Object.entries(sorted).filter(([file, n]) => n > (baseline[file] ?? 0));
const improved = Object.entries(baseline).filter(([file, n]) => (sorted[file] ?? 0) < n);

if (failures.length) {
  console.error('Có mã màu hex mới ngoài src/styles/tokens.css. Dùng token (var(--...)) thay cho mã hex:');
  failures.forEach(([file, n]) => console.error(`  ${file}: ${baseline[file] ?? 0} → ${n}`));
  process.exit(1);
}

const baselineTotal = Object.values(baseline).reduce((sum, n) => sum + n, 0);
console.log(`Token màu: ${total} mã hex ngoài tokens.css (baseline ${baselineTotal}).`);
if (improved.length) {
  console.log(`${improved.length} file đã giảm mã hex. Chạy "npm run lint:tokens -- --update" để hạ baseline.`);
}
