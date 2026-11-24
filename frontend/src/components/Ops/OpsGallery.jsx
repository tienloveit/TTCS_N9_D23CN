import { useState } from 'react';
import { cinemaTodayKey, toCinemaDateKey, formatTime } from '../../utils/cinemaTime';
import {
  Checkbox, ChoiceCards, Code, DataTable, DateLabel, Field, FilterBar, Money, OpsButton,
  OpsConfirm, OpsDialog, OpsDrawer, OpsPage, OpsPanel, Pagination, Segmented, Select,
  ShowtimeRail, ShowTime, StatStrip, StateBlock, StatusBadge, Stepper, Switch, Tabs,
  Textarea, TextInput, Verdict,
} from './index';
import './ops.css';

const samples = [
  { id: 1, status: 'COMPLETED', payment: 'PAID', amount: 245000 },
  { id: 2, status: 'PENDING', payment: 'UNPAID', amount: 120000 },
  { id: 3, status: 'REFUNDED', payment: 'REFUNDED', amount: -175000 },
];
const columns = [
  { key: 'code', header: 'Mã đơn', render: row => <Code copy>{'MPT-118' + row.id}</Code> },
  { key: 'status', header: 'Trạng thái', render: row => <StatusBadge kind="booking" value={row.status} /> },
  { key: 'payment', header: 'Thanh toán', render: row => <StatusBadge kind="payment" value={row.payment} /> },
  { key: 'amount', header: 'Tổng tiền', align: 'end', render: row => <Money value={row.amount} /> },
];
const tableStates = ['ready', 'loading', 'error', 'empty'].map((value, index) =>
  ({ value, label: ['Có dữ liệu', 'Đang tải', 'Lỗi', 'Danh sách rỗng'][index] }));
const steps = [
  { key: 'selection', label: 'Suất chiếu' }, { key: 'seats', label: 'Chọn ghế' },
  { key: 'food', label: 'Bắp nước' }, { key: 'payment', label: 'Thu tiền' },
];
const clock = offset => {
  const date = new Date(Date.now() + offset * 60_000);
  return toCinemaDateKey(date) + 'T' + formatTime(date);
};
const screenings = [
  { name: 'Bí mật dưới mưa', start: -145, end: -45 },
  { name: 'Những ngày xanh', start: -25, end: 80 },
  { name: 'Chuyến tàu cuối', start: 100, end: 210, available: 0 },
  { name: 'Một mùa xa', start: 45, end: 142, status: 'CANCELLED', room: 2 },
  { name: 'Đêm thành phố', start: 164, end: 230, status: 'CLOSED', room: 2 },
].map(({ name, start, end, available, status, room }, index) => ({
  showtimeId: index + 1, movieName: name, roomId: room || 1, roomName: 'Phòng ' + (room || 1),
  startTime: clock(start), endTime: clock(end), status: status || 'OPEN',
  availableSeats: available ?? 72, totalSeats: 120,
}));
const options = [{ value: 'cash', label: 'Tiền mặt' }, { value: 'vnpay', label: 'VNPay' }];

export default function OpsGallery() {
  const [density, setDensity] = useState('desk');
  const [overlay, setOverlay] = useState('');
  const [tableState, setTableState] = useState('ready');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [tab, setTab] = useState('qr');
  const [pay, setPay] = useState('cash');
  const [step, setStep] = useState('food');
  const close = () => setOverlay('');
  return (
    <main className="ops o-shell__main" data-density={density}>
      <OpsPage title="Thư viện giao diện vận hành" actions={
        <Segmented label="Mật độ" value={density} onChange={setDensity}
          options={[{ value: 'desk', label: 'Máy bàn' }, { value: 'touch', label: 'Cảm ứng' }]} />
      }>
        <StatStrip items={[{ label: 'Doanh thu', value: <Money value={12450000} /> },
          { label: 'Vé đã bán', value: 342 }, { label: 'Chờ hoàn tiền', value: 3, tone: 'warning' },
          { label: 'Suất kế tiếp', value: <ShowTime value={clock(100)} /> }]} />
        <OpsPanel title="Lịch chiếu" description={<DateLabel value={cinemaTodayKey()} />}>
          <ShowtimeRail date={cinemaTodayKey()} showtimes={screenings} nextId={3}
            onSelect={() => setOverlay('drawer')} />
        </OpsPanel>
        <FilterBar search={search} onSearchChange={setSearch} onReset={() => setSearch('')}>
          <Segmented label="Trạng thái bảng" options={tableStates} value={tableState} onChange={setTableState} />
        </FilterBar>
        <OpsPanel title="Đơn đặt vé" flush>
          <DataTable caption="Đơn đặt vé mẫu" rows={tableState === 'empty' ? [] : samples} columns={columns}
            state={tableState} stackOnMobile onRowOpen={() => setOverlay('drawer')}
            onRetry={() => setTableState('ready')} empty={{ title: 'Không có đơn phù hợp',
              action: { label: 'Làm mới', onClick: () => setTableState('ready') } }} />
          <Pagination page={page} pageSize={15} totalItems={45} noun="đơn" onPageChange={setPage} />
        </OpsPanel>
        <OpsPanel title="Điều khiển">
          <div className="o-form">
            <div className="o-actions">
              <OpsButton variant="primary" onClick={() => setOverlay('dialog')}>Mở hộp thoại</OpsButton>
              <OpsButton onClick={() => setOverlay('drawer')}>Mở chi tiết</OpsButton>
              <OpsButton variant="ghost-danger" onClick={() => setOverlay('confirm')}>Mở xác nhận</OpsButton>
              <OpsButton variant="ghost" loading>Đang lưu</OpsButton>
            </div>
            <Stepper steps={steps} current={step} onChange={setStep} />
            <Tabs label="Cách soát vé" value={tab} onChange={setTab} options={[
              { value: 'qr', label: 'Quét mã QR', content: <StateBlock title="Đang chờ mã vé" /> },
              { value: 'code', label: 'Nhập mã', content: <Field label="Mã đơn"><TextInput /></Field> },
            ]} />
            <Verdict tone="success" title="Cho vào phòng 2"><p>Phim Một mùa xa, ghế A2.</p></Verdict>
          </div>
        </OpsPanel>
      </OpsPage>
      <OpsDialog open={overlay === 'dialog'} title="Chỉnh sửa suất chiếu" onClose={close} footer={<OpsButton variant="primary" onClick={close}>Lưu thay đổi</OpsButton>}>
        <Field label="Giờ bắt đầu" required error="Giờ này trùng với một suất khác"><TextInput type="time" /></Field>
        <Field label="Phòng chiếu"><Select><option>Phòng 1</option><option>Phòng 2</option></Select></Field>
        <Field label="Ghi chú"><Textarea /></Field>
        <label className="o-actions"><Checkbox /> Chỉ suất còn bán</label>
        <label className="o-actions"><Switch /> Nhận thông báo</label>
        <ChoiceCards label="Phương thức thanh toán" options={options} value={pay} onChange={setPay} />
      </OpsDialog>
      <OpsDrawer open={overlay === 'drawer'} title="Chi tiết đơn" onClose={close}>
        <p>Mã đơn <Code copy>MPT-1181</Code></p>
        <p>Tổng tiền <Money value={245000} /></p>
      </OpsDrawer>
      <OpsConfirm open={overlay === 'confirm'} title="Hủy đơn" onClose={close} onConfirm={close}
        confirmLabel="Hủy đơn" message="Hủy đơn MPT-1181? Ghế A5, A6 sẽ được mở bán lại." />
    </main>
  );
}
