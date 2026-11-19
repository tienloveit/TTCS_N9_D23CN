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
    await find(page.render(), node => node.type === 'ConfirmDialog')[0].props.onConfirm();
    assert.equal(page.notifications.some(n => n.level === 'success'), false);
    assert.equal(page.notifications[0].level, 'info');
    assert.equal(page.state[0][0].refundGatewayStatus, gatewayStatus);
    assert.equal(page.state[0][0].status, 'REFUND_REQUESTED');
    assert.equal(page.state[7].refundGatewayMessage, 'Gateway pending');
    const buttons = find(page.render(), node => node.type === 'button');
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
  await find(page.render(), node => node.type === 'ConfirmDialog')[0].props.onConfirm();
  assert.equal(page.notifications[0].level, 'success');
  assert.equal(page.state[0][0].status, 'REFUNDED');
  assert.equal(page.state[6], null);
});

test('transport failure leaves the refund open and reports an error', async () => {
  const booking = { bookingId: 5, status: 'REFUND_REQUESTED' };
  const page = await loadPage('../src/pages/Admin/BookingManagement.jsx',
    [[booking], false, '', 'ALL', null, 1, { bookingId: 5, approved: true }, null],
    { bookingApi: { processRefund: async () => { throw new Error('offline'); } } });
  await find(page.render(), node => node.type === 'ConfirmDialog')[0].props.onConfirm();
  assert.equal(page.notifications[0].level, 'error');
  assert.equal(page.state[0][0].status, 'REFUND_REQUESTED');
  assert.notEqual(page.state[6], null);
  assert.equal(page.state[4], null);
});
