import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Linter } from 'eslint';

const forbidden = /^(?:btn(?:-|$)|input$|card$|page$|page-title$|container$|form-(?:group|label)$|modal-(?:content|overlay)$|loading$|spinner$|(?:admin|staff|counter|gate|dashboard|booking|schedule|revenue|ops|analytics|stat)-)/;

function classFragments(node) {
  if (!node) return [];
  switch (node.type) {
    case 'Literal': return typeof node.value === 'string' ? [node.value] : [];
    case 'TemplateLiteral': return [...node.quasis.map(part => part.value.cooked), ...node.expressions.flatMap(classFragments)];
    case 'JSXExpressionContainer': return classFragments(node.expression);
    case 'ConditionalExpression': return [...classFragments(node.consequent), ...classFragments(node.alternate)];
    case 'LogicalExpression': return classFragments(node.right);
    case 'BinaryExpression': return [...classFragments(node.left), ...classFragments(node.right)];
    default: return [];
  }
}

export function checkClasses(source) {
  const rules = { classes: { create(context) {
    return { JSXAttribute(node) {
      if (node.name.name !== 'className') return;
      for (const value of classFragments(node.value)) {
        for (const name of value.trim().split(/\s+/).filter(token => forbidden.test(token))) {
          context.report({node, message: 'Class cũ: ' + name});
        }
      }
    }};
  }}};
  return new Linter().verify(source, {
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { ops: { rules } }, rules: { 'ops/classes': 'error' },
  }, { allowInlineConfig: false });
}

function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? files(path) : /\.jsx?$/.test(path) ? [path] : [];
  });
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  for (const dir of ['src/pages/Admin', 'src/pages/Staff', 'src/components/Ops']) {
    for (const file of files(join(root, dir))) {
      const path = relative(root, file).replaceAll('\\', '/');
      for (const problem of checkClasses(readFileSync(file, 'utf8'))) {
        console.error(path + ':' + problem.line + ' ' + problem.message);
        process.exitCode = 1;
      }
    }
  }
}
