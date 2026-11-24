// Hook PostToolUse của Claude Code: kiểm file vận hành vừa sửa và trả vi phạm cho Claude (exit 2).
// Không bao giờ chặn session vì input lạ: mọi trường hợp ngoài phạm vi đều thoát 0, không in gì.
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { checkOpsFile, opsScope } from './ops-rules.mjs';

const PASS = Object.freeze({ exitCode: 0, stderr: '' });
const HEADER = 'Vi phạm design system vận hành (xem docs/03-architecture/ops-design-system.md). Sửa trước khi làm tiếp:';

export function runGuard(stdinText, frontendRoot) {
  let filePath;
  try {
    filePath = JSON.parse(stdinText)?.tool_input?.file_path;
  } catch {
    return { ...PASS };
  }
  if (typeof filePath !== 'string' || !filePath) return { ...PASS };

  const relPath = relative(frontendRoot, resolve(filePath)).replaceAll('\\', '/');
  if (!relPath || relPath.startsWith('..') || isAbsolute(relPath) || !opsScope(relPath)) return { ...PASS };

  const absolute = resolve(frontendRoot, relPath);
  if (!existsSync(absolute)) return { ...PASS };

  let source;
  try {
    source = readFileSync(absolute, 'utf8');
  } catch {
    return { ...PASS };
  }
  const problems = checkOpsFile(relPath, source);
  if (!problems.length) return { ...PASS };
  const lines = problems.map((problem) => relPath + ':' + problem.line + ' ' + problem.message);
  return { exitCode: 2, stderr: [HEADER, ...lines].join('\n') + '\n' };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  let stdinText = '';
  try {
    stdinText = readFileSync(0, 'utf8');
  } catch {
    stdinText = '';
  }
  const result = runGuard(stdinText, fileURLToPath(new URL('..', import.meta.url)));
  if (result.stderr) process.stderr.write(result.stderr);
  process.exitCode = result.exitCode;
}
