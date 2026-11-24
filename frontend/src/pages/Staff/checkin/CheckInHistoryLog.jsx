import { Code, DataTable, FilterBar, OpsButton, OpsPanel, Segmented, StatusBadge } from '../../../components/Ops';
import { parseLocalDateTime } from '../../../utils/cinemaTime';
import { CHECKIN_STORAGE_KEY, getTodayDateKey } from './checkInUtils';

const filters = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'SUCCESS', label: 'Hợp lệ' },
  { value: 'DUPLICATE', label: 'Quét trùng' },
  { value: 'ERROR', label: 'Từ chối' },
];
const resultTone = { SUCCESS: 'success', DUPLICATE: 'warning', ERROR: 'danger' };

export default function CheckInHistoryLog({
  reopenResult, filteredHistory, historyFilter, historySearch, recentCheckIns,
  setHistoryFilter, setHistorySearch, setRecentCheckIns, setVerdict,
}) {
  const clearHistory = () => {
    setRecentCheckIns([]);
    setVerdict(null);
    try {
      localStorage.removeItem(CHECKIN_STORAGE_KEY);
    } catch {
      // Trình duyệt chặn lưu trữ nhưng nhật ký trên màn hình vẫn đã được xóa.
    }
  };
  const today = getTodayDateKey();
  const timeOf = row => row.sortTime || parseLocalDateTime(today + 'T' + row.time)?.getTime() || 0;
  const resetFilters = () => { setHistorySearch(''); setHistoryFilter('ALL'); };
  const columns = [
    { key: 'time', header: 'Giờ' },
    { key: 'code', header: 'Mã đơn / vé', render: row => <Code>{row.code}</Code> },
    { key: 'show', header: 'Phim và ghế', render: row => <>{row.movieName}
      {row.seats && <small className="o-subline">Ghế {row.seats}</small>}
      {row.roomName && <small className="o-subline">{row.roomName}</small>}</> },
    { key: 'status', header: 'Kết quả', render: row => <StatusBadge tone={resultTone[row.status]}>{row.statusLabel}</StatusBadge> },
    { key: 'details', header: 'Chi tiết', render: row => row.rawResponse
      ? <OpsButton onClick={() => reopenResult(row)} aria-label={'Xem lượt soát đơn ' + row.code}>Xem</OpsButton> : '—' },
  ];
  return (
    <OpsPanel title="Lượt soát gần đây" actions={recentCheckIns.length > 0 &&
      <OpsButton variant="ghost-danger" onClick={clearHistory}>Xóa nhật ký</OpsButton>}>
      <FilterBar search={historySearch} onSearchChange={setHistorySearch} searchLabel="Lọc nhật ký soát vé"
        filtered={historyFilter !== 'ALL'} onReset={resetFilters} resultLabel={filteredHistory.length + ' lượt soát'}>
        <Segmented label="Lọc theo kết quả" options={filters} value={historyFilter} onChange={setHistoryFilter} />
      </FilterBar>
      <DataTable caption="Nhật ký soát vé hôm nay" columns={columns} rowKey="id" stackOnMobile
        rows={filteredHistory.slice().sort((first, second) => timeOf(second) - timeOf(first))}
        empty={{ title: 'Chưa có lượt soát vé phù hợp', action: { label: 'Xóa bộ lọc', onClick: resetFilters } }} />
    </OpsPanel>
  );
}
