import assert from 'node:assert/strict';
import test from 'node:test';
import { branchScopeLabel, canEditBranchItem } from '../src/utils/branchScope.js';

const admin = { role: 'ADMIN', branchId: null };
const manager = { role: 'MANAGER', branchId: 1 };
const staff = { role: 'STAFF', branchId: 1 };

test('admin edits system-wide and branch items', () => {
  assert.equal(canEditBranchItem({ branchId: null }, admin), true);
  assert.equal(canEditBranchItem({ branchId: 2 }, admin), true);
});

test('manager edits only items of the assigned branch', () => {
  assert.equal(canEditBranchItem({ branchId: 1 }, manager), true);
  assert.equal(canEditBranchItem({ branchId: '1' }, manager), true);
  assert.equal(canEditBranchItem({ branchId: 2 }, manager), false);
  assert.equal(canEditBranchItem({ branchId: null }, manager), false);
  assert.equal(canEditBranchItem({ branchId: undefined }, manager), false);
});

test('manager without a branch, staff and missing data cannot edit', () => {
  assert.equal(canEditBranchItem({ branchId: null }, { role: 'MANAGER', branchId: null }), false);
  assert.equal(canEditBranchItem({ branchId: 1 }, staff), false);
  assert.equal(canEditBranchItem(null, admin), false);
  assert.equal(canEditBranchItem({ branchId: 1 }, null), false);
});

test('scope label prefers branch name from the item, then the branch list', () => {
  const branches = [{ branchId: 3, name: 'MoviePTIT Landmark' }];
  assert.equal(branchScopeLabel({ branchId: null }, branches), 'Toàn hệ thống');
  assert.equal(branchScopeLabel({ branchId: 3, branchName: 'Hồ Gươm' }, branches), 'Hồ Gươm');
  assert.equal(branchScopeLabel({ branchId: 3 }, branches), 'MoviePTIT Landmark');
  assert.equal(branchScopeLabel({ branchId: 9 }, branches), 'Chi nhánh #9');
});
