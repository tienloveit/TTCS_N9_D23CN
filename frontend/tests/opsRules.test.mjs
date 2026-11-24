import test from 'node:test';
import assert from 'node:assert/strict';
import { checkOpsCss, checkOpsJsx, opsScope } from '../scripts/ops-rules.mjs';

const msgs = (problems) => problems.map((p) => p.message);
const ADMIN = 'src/pages/Admin/X.jsx';

test('opsScope', () => {
  assert.equal(opsScope('src/pages/Admin/A.jsx'), 'jsx');
  assert.equal(opsScope('src/pages/Staff/booking/x.js'), 'jsx');
  assert.equal(opsScope('src\\pages\\Admin\\A.jsx'), 'jsx');
  assert.equal(opsScope('src/components/Ops/ops.css'), 'css');
  assert.equal(opsScope('src/styles/ops/rail.css'), 'css');
  assert.equal(opsScope('src/pages/Home/HomePage.jsx'), null);
  assert.equal(opsScope('src/styles/tokens.css'), null);
});

test('legacy classes still rejected, inline disable ignored', () => {
  for (const s of ['<div className="card" />', "<div className={'admin-box'} />",
    '<div className={`counter-row ${a}`} />', '/* eslint-disable */ <div className="card" />']) {
    assert.equal(checkOpsJsx(s, ADMIN).length, 1);
  }
  assert.deepEqual(checkOpsJsx('<div className="ops"><p className="o-note">card</p></div>', ADMIN), []);
});

test('inline style only passes CSS variables', () => {
  assert.deepEqual(msgs(checkOpsJsx("<div style={{ color: 'red' }} />", ADMIN)), ['Inline style chỉ truyền biến CSS: color']);
  assert.deepEqual(msgs(checkOpsJsx('<div style={styles} />', ADMIN)), ['Inline style phải là object literal chỉ chứa biến CSS']);
  assert.deepEqual(checkOpsJsx("<div style={{ '--o-start': 0.4 }} />", ADMIN), []);
  assert.deepEqual(checkOpsJsx("<th style={w ? { '--o-col-width': w } : undefined} />", ADMIN), []);
});

test('no raw svg, no emoji', () => {
  assert.equal(checkOpsJsx('<svg><path d="M0 0" /></svg>', ADMIN).length, 2);
  assert.deepEqual(msgs(checkOpsJsx('<span>🎬 Phim</span>', ADMIN)), ['Không dùng emoji trong giao diện']);
  assert.equal(checkOpsJsx('<OpsButton label="✅" />', ADMIN).length, 1);
});

test('copy rules apply to UI text only', () => {
  const copy = 'Chữ giao diện không dùng "!", "·" hoặc "→"';
  assert.deepEqual(msgs(checkOpsJsx('<p>Đã lưu!</p>', ADMIN)), [copy]);
  assert.deepEqual(msgs(checkOpsJsx('<p title="A · B" />', ADMIN)), [copy]);
  assert.deepEqual(msgs(checkOpsJsx("toast.success('Đã duyệt!')", ADMIN)), [copy]);
  assert.deepEqual(msgs(checkOpsJsx('toast.success(`Thêm "${name}" thành công!`)', ADMIN)), [copy]);
  for (const s of ['const x = a !== b;', '<p>{!loading && "Xong"}</p>', '// a → b\nconst y = 1;',
    "document.title = title + ' · MoviePTIT';"]) {
    assert.deepEqual(checkOpsJsx(s, ADMIN), [], s);
  }
});

test('imports: no customer components, no page CSS', () => {
  assert.deepEqual(msgs(checkOpsJsx("import Button from '../../components/Common/Button';", ADMIN)),
    ['Khu vận hành dùng components/Ops thay cho Button']);
  assert.equal(checkOpsJsx("import ConfirmDialog from '../../components/Common/ConfirmDialog.jsx';", ADMIN).length, 1);
  assert.deepEqual(checkOpsJsx("import { useModalDialog } from '../../components/Common/useModalDialog';", ADMIN), []);
  assert.equal(checkOpsJsx("import './Foo.css';", ADMIN).length, 1);
  assert.deepEqual(checkOpsJsx("import './ops.css';", 'src/components/Ops/OpsShell.jsx'), []);
});

test('hex and parse errors', () => {
  assert.deepEqual(msgs(checkOpsJsx("const c = '#B9380C';", ADMIN)), ['Mã màu hex trong khu vận hành, dùng var(--...)']);
  const [fatal] = checkOpsJsx('<div', ADMIN);
  assert.match(fatal.message, /^Không đọc được file: /);
});

test('css rules', () => {
  assert.deepEqual(msgs(checkOpsCss('.o-x { color: red !important; }')), ['Không dùng !important']);
  assert.deepEqual(msgs(checkOpsCss('@layer ops { .o-x { color: red; } }')), ['Không dùng @layer']);
  assert.deepEqual(msgs(checkOpsCss('.card { padding: 0; }')), ['Class ngoài tiền tố o-: card']);
  assert.deepEqual(msgs(checkOpsCss('.o-panel { box-shadow: 0 1px 2px var(--o-line); }')),
    ['box-shadow chỉ dùng var(--o-shadow-*), inset hoặc none']);
  assert.deepEqual(msgs(checkOpsCss('.o-x { font-family: Inter; }')), ['font-family chỉ dùng var(--o-font) hoặc inherit']);
  assert.deepEqual(msgs(checkOpsCss('.o-x { color: #fff; }')), ['Mã màu hex trong khu vận hành, dùng var(--...)']);
  assert.equal(checkOpsCss('.o-a {}\n\n.card {}')[0].line, 3);
});

test('valid css is not flagged', () => {
  const ok = [
    "@import '../../styles/ops/rail.css';",
    '/* .card cũ */ .ops .o-table [aria-selected="true"] > td:first-child { box-shadow: inset 3px 0 var(--o-mark); }',
    '.o-counter-seatmap .seat--booked { opacity: 0.5; background: url(./a.png); }',
    '.ops .Toastify__toast--error, .o-staff-sale-complete .digital-ticket { box-shadow: var(--o-shadow-float); }',
    '@media (min-width: 1280px) { .o-shell { font-family: var(--o-font); box-shadow: none; } }',
  ];
  for (const s of ok) assert.deepEqual(checkOpsCss(s), [], s);
});
