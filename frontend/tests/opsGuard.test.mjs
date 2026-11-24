import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { runGuard } from '../scripts/ops-guard.mjs';

const input = (file) => JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: file } });

function write(root, relPath, source) {
  const file = join(root, relPath);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, source);
  return file;
}

function withRoot(fn) {
  const root = mkdtempSync(join(tmpdir(), 'ops-guard-'));
  try {
    fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('reports violations with exit 2', () => withRoot((root) => {
  const file = write(root, 'src/pages/Admin/Bad.jsx', '<div className="card" />');
  const r = runGuard(input(file), root);
  assert.equal(r.exitCode, 2);
  assert.match(r.stderr, /ops-design-system\.md/);
  assert.match(r.stderr, /src\/pages\/Admin\/Bad\.jsx:1 Class cũ: card/);
}));

test('clean ops file passes', () => withRoot((root) => {
  const file = write(root, 'src/styles/ops/x.css', '.o-x { color: var(--o-ink); }');
  assert.deepEqual(runGuard(input(file), root), { exitCode: 0, stderr: '' });
}));

test('never blocks on out-of-scope or bad input', () => withRoot((root) => {
  const customer = write(root, 'src/pages/Home/Home.jsx', '<div className="card" />');
  for (const stdin of ['', 'not json', '{}', input(customer), input(join(root, '..', 'backend', 'A.java')),
    input(join(root, 'src/pages/Admin/Missing.jsx'))]) {
    assert.deepEqual(runGuard(stdin, root), { exitCode: 0, stderr: '' }, stdin);
  }
}));
