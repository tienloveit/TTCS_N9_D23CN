import { CHECKIN_STORAGE_KEY } from './checkInUtils';

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
  return (
    <section className="gate-card gate-history">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 14,
          flexWrap: 'wrap',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800 }}>
          Nhật ký soát vé trong phiên ({filteredHistory.length})
        </h3>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            className="input"
            placeholder="Lọc mã, ghế, phim..."
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
            style={{ height: 30, width: 150, fontSize: '0.78rem', padding: '0 10px' }}
          />
          {[
            { key: 'ALL', label: 'Tất cả' },
            { key: 'SUCCESS', label: 'Hợp lệ' },
            { key: 'DUPLICATE', label: 'Quét trùng' },
            { key: 'ERROR', label: 'Từ chối' },
          ].map((f) => (
            <button
              key={f.key}
              type="button"
              className={`pos-time-pill ${
                historyFilter === f.key ? 'pos-time-pill--active' : ''
              }`}
              onClick={() => setHistoryFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
          {recentCheckIns.length > 0 && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '0.76rem', padding: '4px 8px' }}
              onClick={() => {
                setRecentCheckIns([]);
                setVerdict(null);
                try {
                  localStorage.removeItem(CHECKIN_STORAGE_KEY);
                } catch {
                  // ignore
                }
              }}
            >
              Xóa nhật ký
            </button>
          )}
        </div>
      </div>

      {filteredHistory.length === 0 ? (
        <div
          style={{
            padding: '28px 16px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            background: '#f8fafc',
            borderRadius: 12,
            border: '1px dashed var(--border)',
            fontSize: '0.88rem',
          }}
        >
          Chưa có lượt check-in nào trong bộ lọc này.
        </div>
      ) : (
        <div className="admin-table-card" style={{ borderRadius: 12 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Giờ</th>
                <th>Mã đơn / Vé</th>
                <th>Phim & Ghế</th>
                <th>Kết quả</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((item) => (
                <tr
                  key={item.id}
                  style={{ cursor: item.rawResponse ? 'pointer' : 'default' }}
                  onClick={() => {
                    if (item.rawResponse) {
                      evaluateCheckInResult(item.rawResponse, item.code);
                    }
                  }}
                >
                  <td style={{ fontFamily: 'monospace', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                    {item.time}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0f172a' }}>
                    {item.code.length > 22 ? `${item.code.slice(0, 20)}...` : item.code}
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.86rem' }}>
                      {item.movieName}
                    </div>
                    {item.seats && (
                      <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                        Ghế: <strong>{item.seats}</strong>
                        {item.roomName ? ` • ${item.roomName}` : ''}
                      </div>
                    )}
                  </td>
                  <td>
                    <span
                      className={`status-badge ${
                        item.status === 'SUCCESS'
                          ? 'status--active'
                          : item.status === 'DUPLICATE'
                          ? 'status--pending'
                          : 'status--inactive'
                      }`}
                    >
                      {item.statusLabel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
