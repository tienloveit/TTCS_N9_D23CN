import assert from 'node:assert/strict';
import test from 'node:test';
import { find, loadPage, textContent } from './componentHarness.mjs';

for (const gatewayStatus of ['PROCESSING', 'UNKNOWN', 'FAILED']) {
  test(`approval with ${gatewayStatus} keeps the booking pending and never reports success`, async () => {
    const booking = { bookingId: 5, status: 'REFUND_REQUESTED', bookingCode: 'BK-TEST' };
    const result = { ...booking, refundGatewayStatus: gatewayStatus, refundGatewayMessage: 'Gateway pending' };
    const page = await loadPage('../src/pages/Admin/BookingManagement.jsx',
      [[booking], false, '', 'ALL', null, 1, { bookingId: 5, approved: true }, booking],
      { bookingApi: { processRefund: async () => ({ data: { result } }) } });
    await find(page.render(), node => node.type === 'OpsConfirm')[0].props.onConfirm();
    assert.equal(page.notifications.some(n => n.level === 'success'), false);
    assert.equal(page.notifications[0].level, 'info');
    assert.equal(page.state[0][0].refundGatewayStatus, gatewayStatus);
    assert.equal(page.state[0][0].status, 'REFUND_REQUESTED');
    assert.equal(page.state[7].refundGatewayMessage, 'Gateway pending');
    const buttons = find(page.render(), node => node.type === 'OpsButton');
    const reject = buttons.find(button => textContent(button) === 'Từ chối');
    assert.equal(Boolean(reject.props.disabled), gatewayStatus !== 'FAILED');
    assert.ok(buttons.some(button => textContent(button) ===
      (gatewayStatus === 'FAILED' ? 'Thử lại hoàn tiền' : 'Kiểm tra kết quả')));
  });
}

test('only a confirmed refund reports approval success', async () => {
  const booking = { bookingId: 5, status: 'REFUND_REQUESTED' };
  const result = { ...booking, status: 'REFUNDED', paymentStatus: 'REFUNDED', refundGatewayStatus: 'SUCCEEDED' };
  const page = await loadPage('../src/pages/Admin/BookingManagement.jsx',
    [[booking], false, '', 'ALL', null, 1, { bookingId: 5, approved: true }, null],
    { bookingApi: { processRefund: async () => ({ data: { result } }) } });
  await find(page.render(), node => node.type === 'OpsConfirm')[0].props.onConfirm();
  assert.equal(page.notifications[0].level, 'success');
  assert.equal(page.state[0][0].status, 'REFUNDED');
  assert.equal(page.state[6], null);
});

test('transport failure leaves the refund open and reports an error', async () => {
  const booking = { bookingId: 5, status: 'REFUND_REQUESTED' };
  const page = await loadPage('../src/pages/Admin/BookingManagement.jsx',
    [[booking], false, '', 'ALL', null, 1, { bookingId: 5, approved: true }, null],
    { bookingApi: { processRefund: async () => { throw new Error('offline'); } } });
  await find(page.render(), node => node.type === 'OpsConfirm')[0].props.onConfirm();
  assert.equal(page.notifications[0].level, 'error');
  assert.equal(page.state[0][0].status, 'REFUND_REQUESTED');
  assert.notEqual(page.state[6], null);
  assert.equal(page.state[4], null);
});

test('loads one server page with the active filters and shows server totals', async () => {
  const calls = [];
  const content = [{ bookingId: 9, bookingCode: 'BK-9', status: 'COMPLETED', paymentStatus: 'PAID' }];
  const result = {
    content, totalElements: 31, totalPages: 3,
    summary: { completed: 20, refundRequested: 2, paidAmount: 1500000 },
  };
  const emptyPage = { totalElements: 0, totalPages: 0, summary: { completed: 0, refundRequested: 0, paidAmount: 0 } };
  // useState theo thứ tự: bookings, loading, searchTerm, statusFilter, processingRefund, page, confirmState,
  // detailBooking, filters, selectedIds, exporting, refundError, refundReason, loadError, lookupNotice,
  // pageInfo, branches, debouncedSearch.
  const initial = [[], false, ' bk ', 'COMPLETED', null, 2, null, null,
    { branch: '3', from: '2026-11-01', to: '', payment: 'PAID' }, new Map(), false, '', '', '', '',
    emptyPage, [], ' bk '];
  const page = await loadPage('../src/pages/Admin/BookingManagement.jsx', initial,
    { bookingApi: { search: async (params) => { calls.push(params); return { data: { result } }; } } });
  const refresh = find(page.render(), node => node.type === 'OpsButton')
    .find(button => textContent(button).trim() === 'Làm mới');
  refresh.props.onClick();
  await new Promise(resolve => setImmediate(resolve));

  // Tham số được tạo trong vm context của trang: so sánh theo giá trị JSON.
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{
    q: 'bk', status: 'COMPLETED', paymentStatus: 'PAID', branchId: '3', from: '2026-11-01', page: 1, size: 15,
  }]);
  assert.deepEqual(page.state[0], content);
  assert.equal(page.state[15].totalElements, 31);
  const view = page.render();
  const [filter] = find(view, node => node.type === 'FilterBar');
  assert.equal(filter.props.resultLabel, '31 đơn phù hợp');
  const [pagination] = find(view, node => node.type === 'Pagination');
  assert.equal(pagination.props.page + 1, 2);
  assert.equal(Math.ceil(pagination.props.totalItems / pagination.props.pageSize), 3);
});
