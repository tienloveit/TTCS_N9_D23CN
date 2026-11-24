// Luật máy kiểm cho khu vận hành (/staff, /manager, /admin).
// Nguồn luật: docs/03-architecture/ops-design-system.md. Đổi luật thì sửa tài liệu và test cùng commit.
import { Linter } from 'eslint';

const forbidden = /^(?:btn(?:-|$)|input$|card$|page$|page-title$|container$|form-(?:group|label)$|modal-(?:content|overlay)$|loading$|spinner$|(?:admin|staff|counter|gate|dashboard|booking|schedule|revenue|ops|analytics|stat)-)/;
const hexPattern = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/;
const emojiPattern = /\p{Extended_Pictographic}/u;
const copyPattern = /[!·→]/;
const customerComponent = /components\/Common\/(Button|Badge|ConfirmDialog|EmptyState|Skeleton)(?:\.jsx?)?$/;
const cssImportAllowed = new Set(['src/components/Ops/OpsShell.jsx', 'src/components/Ops/OpsGallery.jsx']);
const allowedCssClass = /^(?:ops|o-[a-z0-9_-]+|seat(?:--[a-z-]+)?|seat-legend-dot|digital-ticket|Toastify__toast(?:--[a-z]+)?)$/;

const MSG = {
  hex: 'Mã màu hex trong khu vận hành, dùng var(--...)',
  emoji: 'Không dùng emoji trong giao diện',
  copy: 'Chữ giao diện không dùng "!", "·" hoặc "→"',
  svg: 'Không viết <svg>/<path>, dùng icon trong CinemaIcons.jsx',
  styleShape: 'Inline style phải là object literal chỉ chứa biến CSS',
  cssImport: 'Không import CSS trong trang, thêm @import vào components/Ops/ops.css',
};

const normalize = (relPath = '') => relPath.replaceAll('\\', '/').replace(/^\.\//, '');

export function opsScope(relPath) {
  const path = normalize(relPath);
  if (/^src\/(?:pages\/(?:Admin|Staff)|components\/Ops)\/.+\.jsx?$/.test(path)) return 'jsx';
  if (path === 'src/components/Ops/ops.css' || /^src\/styles\/ops\/.+\.css$/.test(path)) return 'css';
  return null;
}

function classFragments(node) {
  if (!node) return [];
  switch (node.type) {
    case 'Literal': return typeof node.value === 'string' ? [node.value] : [];
    case 'TemplateLiteral': return [...node.quasis.map((part) => part.value.cooked), ...node.expressions.flatMap(classFragments)];
    case 'JSXExpressionContainer': return classFragments(node.expression);
    case 'ConditionalExpression': return [...classFragments(node.consequent), ...classFragments(node.alternate)];
    case 'LogicalExpression': return classFragments(node.right);
    case 'BinaryExpression': return [...classFragments(node.left), ...classFragments(node.right)];
    default: return [];
  }
}

// Trả về danh sách lỗi của một biểu thức style: key không phải biến CSS hoặc hình dạng sai.
function styleProblems(node, topLevel = true) {
  if (!node) return [MSG.styleShape];
  switch (node.type) {
    case 'ObjectExpression':
      return node.properties.flatMap((property) => {
        if (property.type !== 'Property' || property.computed) return [MSG.styleShape];
        const key = property.key.type === 'Identifier' ? property.key.name : String(property.key.value);
        return key.startsWith('--') ? [] : ['Inline style chỉ truyền biến CSS: ' + key];
      });
    case 'ConditionalExpression':
      return [...styleProblems(node.consequent, false), ...styleProblems(node.alternate, false)];
    case 'LogicalExpression':
      return node.operator === '&&' ? styleProblems(node.right, false) : [MSG.styleShape];
    case 'Identifier':
      return node.name === 'undefined' ? [] : [MSG.styleShape];
    default:
      return topLevel || node.type !== 'Literal' || node.value !== null ? [MSG.styleShape] : [];
  }
}

const templateText = (node) => node.quasis.map((part) => part.value.cooked ?? '').join('');
const stringText = (node) => {
  if (!node) return null;
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node.type === 'TemplateLiteral') return templateText(node);
  return null;
};

function createRule(relPath) {
  return {
    create(context) {
      const report = (node, message) => context.report({ node, message });
      const checkCopy = (node, text) => {
        if (text != null && copyPattern.test(text)) report(node, MSG.copy);
      };
      const checkRaw = (node, text) => {
        if (typeof text !== 'string') return;
        if (emojiPattern.test(text)) report(node, MSG.emoji);
        if (hexPattern.test(text)) report(node, MSG.hex);
      };
      return {
        JSXAttribute(node) {
          const name = node.name.name;
          if (name === 'className') {
            for (const value of classFragments(node.value)) {
              for (const token of value.trim().split(/\s+/).filter((item) => forbidden.test(item))) {
                report(node, 'Class cũ: ' + token);
              }
            }
          }
          if (name === 'style') {
            const expression = node.value?.type === 'JSXExpressionContainer' ? node.value.expression : node.value;
            for (const message of new Set(styleProblems(expression))) report(node, message);
          }
          const value = node.value?.type === 'JSXExpressionContainer' ? node.value.expression : node.value;
          checkCopy(node, stringText(value));
        },
        JSXOpeningElement(node) {
          if (node.name.type === 'JSXIdentifier' && (node.name.name === 'svg' || node.name.name === 'path')) report(node, MSG.svg);
        },
        JSXText(node) {
          checkRaw(node, node.value);
          checkCopy(node, node.value);
        },
        Literal(node) {
          checkRaw(node, node.value);
        },
        TemplateElement(node) {
          checkRaw(node, node.value.cooked);
        },
        CallExpression(node) {
          const callee = node.callee;
          if (callee.type === 'MemberExpression' && callee.object.type === 'Identifier' && callee.object.name === 'toast') {
            checkCopy(node, stringText(node.arguments[0]));
          }
        },
        ImportDeclaration(node) {
          const source = String(node.source.value);
          const component = source.match(customerComponent);
          if (component) report(node, 'Khu vận hành dùng components/Ops thay cho ' + component[1]);
          if (/\.css$/.test(source) && !cssImportAllowed.has(relPath)) report(node, MSG.cssImport);
        },
      };
    },
  };
}

export function checkOpsJsx(source, relPath = '') {
  const path = normalize(relPath);
  const messages = new Linter().verify(source, {
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { ops: { rules: { design: createRule(path) } } },
    rules: { 'ops/design': 'error' },
  }, { allowInlineConfig: false });
  return messages.map((message) => ({
    line: message.line ?? 1,
    message: message.fatal ? 'Không đọc được file: ' + message.message : message.message,
  }));
}

// Thay đoạn khớp bằng khoảng trắng cùng độ dài (giữ xuống dòng) để vị trí và số dòng không đổi.
const blank = (text) => text.replace(/[^\n]/g, ' ');

export function checkOpsCss(source) {
  const css = source.replace(/\/\*[\s\S]*?\*\//g, blank);
  const lineAt = (index) => css.slice(0, index).split('\n').length;
  const problems = [];
  const add = (index, message) => problems.push({ line: lineAt(index), message, index });

  for (const match of css.matchAll(/!\s*important/gi)) add(match.index, 'Không dùng !important');
  for (const match of css.matchAll(/@layer\b/g)) add(match.index, 'Không dùng @layer');
  for (const match of css.matchAll(new RegExp(hexPattern.source, 'g'))) add(match.index, MSG.hex);

  for (const match of css.matchAll(/([^{};]+)\{/g)) {
    const prelude = match[1];
    if (prelude.trim().startsWith('@')) continue;
    const cleaned = prelude.replace(/\[[^\]]*\]/g, blank).replace(/"[^"]*"|'[^']*'/g, blank);
    for (const cls of cleaned.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) {
      if (!allowedCssClass.test(cls[1])) add(match.index + cls.index, 'Class ngoài tiền tố o-: ' + cls[1]);
    }
  }

  for (const match of css.matchAll(/(^|[;{\s])(box-shadow|font-family)\s*:\s*([^;}]+)/g)) {
    const index = match.index + match[1].length;
    const value = match[3].trim();
    if (match[2] === 'box-shadow' && !/^(none|inset\b.*|var\(--o-shadow-[a-z-]+\))$/.test(value)) {
      add(index, 'box-shadow chỉ dùng var(--o-shadow-*), inset hoặc none');
    }
    if (match[2] === 'font-family' && !/^(var\(--o-font[\w-]*\)|inherit)$/.test(value)) {
      add(index, 'font-family chỉ dùng var(--o-font) hoặc inherit');
    }
  }

  return problems.sort((a, b) => a.index - b.index).map(({ line, message }) => ({ line, message }));
}

export function checkOpsFile(relPath, source) {
  const scope = opsScope(relPath);
  if (scope === 'jsx') return checkOpsJsx(source, relPath);
  if (scope === 'css') return checkOpsCss(source);
  return [];
}
