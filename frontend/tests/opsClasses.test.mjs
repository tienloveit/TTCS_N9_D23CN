import test from 'node:test';
import assert from 'node:assert/strict';
import { checkClasses } from '../scripts/check-ops-classes.mjs';

test('rejects legacy JSX classes in literals, expressions and templates', () => {
  for (const source of ['<div className="card" />', "<div className={'admin-box'} />", '<div className={`counter-row ${active}`} />']) {
    assert.equal(checkClasses(source).length, 1);
  }
  assert.deepEqual(checkClasses('<div className="ops"><p className="o-note">card</p></div>'), []);
});
