import test from 'node:test';
import assert from 'node:assert/strict';
import { opsNavigation } from '../src/components/Ops/opsNav.js';

const paths = area => opsNavigation(area).flatMap(group => group.items.map(item => item.path.slice(area.length + 1)));
test('menus follow the staff, manager and administrator routes', () => {
  assert.deepEqual(paths('staff'), ['/dashboard','/booking','/check-in','/bookings','/notifications']);
  const all = ['', '/operations','/revenue','/movies','/showtimes','/branches','/bookings','/refunds','/foods','/promotions','/users','/notifications','/audit-logs','/settings'];
  assert.deepEqual(paths('admin'), all);
  assert.deepEqual(paths('manager'), all.filter(path => !['/movies','/settings'].includes(path)));
  assert.ok(opsNavigation('manager').some(group => group.items.some(item => item.label === 'Nhân viên')));
});
