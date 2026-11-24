import assert from 'node:assert/strict';
import test from 'node:test';
import { ACCOUNT_TABS, DEFAULT_TAB, isTabHash, tabFromHash, tabKeyTarget } from '../src/pages/Profile/accountTabsModel.js';

test('account tabs default to promotions', () => {
  assert.deepEqual(ACCOUNT_TABS.map((tab) => tab.id), ['promos', 'info', 'password']);
  assert.equal(DEFAULT_TAB, 'promos');
});

test('tabFromHash maps known hashes and falls back to the default tab', () => {
  for (const hash of ['', undefined, null, '#abc']) assert.equal(tabFromHash(hash), 'promos');
  assert.equal(tabFromHash('#info'), 'info');
  assert.equal(tabFromHash('password'), 'password');
  assert.equal(tabFromHash('#promos'), 'promos');
});

test('isTabHash is true only for a tab id', () => {
  assert.equal(isTabHash('#promos'), true);
  assert.equal(isTabHash('info'), true);
  assert.equal(isTabHash(''), false);
  assert.equal(isTabHash(undefined), false);
  assert.equal(isTabHash('#abc'), false);
});

test('tabKeyTarget follows the ARIA tablist keys and wraps around', () => {
  assert.equal(tabKeyTarget(0, 'ArrowRight', 3), 1);
  assert.equal(tabKeyTarget(2, 'ArrowRight', 3), 0);
  assert.equal(tabKeyTarget(0, 'ArrowLeft', 3), 2);
  assert.equal(tabKeyTarget(1, 'ArrowDown', 3), 2);
  assert.equal(tabKeyTarget(1, 'ArrowUp', 3), 0);
  assert.equal(tabKeyTarget(2, 'Home', 3), 0);
  assert.equal(tabKeyTarget(0, 'End', 3), 2);
  assert.equal(tabKeyTarget(0, 'Enter', 3), null);
});
