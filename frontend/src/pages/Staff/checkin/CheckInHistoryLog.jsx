import Badge from '../../../components/Common/Badge';
import Button from '../../../components/Common/Button';
import { StaffChips } from '../StaffUI';
import { CHECKIN_STORAGE_KEY } from './checkInUtils';

const HISTORY_FILTERS = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'SUCCESS', label: 'Hợp lệ' },
  { key: 'DUPLICATE', label: 'Quét trùng' },
  { key: 'ERROR', label: 'Từ chối' },
];
const RESULT_TONE = { SUCCESS: 'success', DUPLICATE: 'warning', ERROR: 'danger' };

/** Nhật ký check-in trong phiên làm việc tại cửa soát vé. */
export default function CheckInHistoryLog({
  evaluateCheckInResult,
  filteredHistory,
  historyFilter,
  historySearch,
  recentCheckIns,
  setHistoryFilter,
  setHistorySearch,
  setRecentCheckIns,
  setVerdict,
}) {
  const clearHistory = () => {
    setRecentCheckIns([]);
    setVerdict(null);
    try {
      localStorage.removeItem(CHECKIN_STORAGE_KEY);
    } catch {
      // Trình duyệt chặn lưu trữ: nhật ký trên màn hình vẫn đã được xóa.
    }
  };

  return (
    <section className="gate-card gate-history" aria-labelledby="gate-history-title">
      <div className="gate-history-head">
        <h2 id="gate-history-title">Nhật ký soát vé trong phiên ({filteredHistory.length})</h2>
        <div className="gate-history-tools">
          <input
            type="search"
            className="input gate-history-search"
            placeholder="Lọc mã, ghế, phim..."
            aria-label="Lọc nhật ký soát vé"
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
          />
          <StaffChips label="Lọc theo kết quả" options={HISTORY_FILTERS} value={historyFilter} onChange={setHistoryFilter} />
          {recentCheckIns.length > 0 && (
            <Button size="sm" variant="ghost" onClick={clearHistory}>Xóa nhật ký</Button>
          )}
        </div>
      </div>

      {filteredHistory.length === 0 ? (
        <p className="gate-empty">Chưa có lượt soát vé nào trong bộ lọc này.</p>
      ) : (
        <div className="admin-table-card gate-history-table">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Giờ</th>
                <th scope="col">Mã đơn / vé</th>
                <th scope="col">Phim và ghế</th>
                <th scope="col">Kết quả</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((item) => (
                <tr
                  key={item.id}
                  className={item.rawResponse ? 'is-clickable' : undefined}
                  onClick={() => item.rawResponse && evaluateCheckInResult(item.rawResponse, item.code)}
                >
                  <td className="gate-history-time">{item.time}</td>
                  <td className="gate-history-code" title={item.code}>
                    {item.code.length > 22 ? `${item.code.slice(0, 20)}…` : item.code}
                  </td>
                  <td>
                    <div className="gate-history-movie">{item.movieName}</div>
                    {item.seats && (
                      <div className="gate-history-seats">
                        Ghế: <strong>{item.seats}</strong>
                        {item.roomName ? ` · ${item.roomName}` : ''}
                      </div>
                    )}
                  </td>
                  <td><Badge tone={RESULT_TONE[item.status] || 'neutral'}>{item.statusLabel}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
