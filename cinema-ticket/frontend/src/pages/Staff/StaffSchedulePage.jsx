import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { staffApi } from '../../api';

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '-';

const formatDuration = (minutes) => {
  if (minutes == null) return '-';
  const hours = Math.floor(Number(minutes) / 60);
  const mins = Number(minutes) % 60;
  return hours > 0 ? `${hours} giờ ${mins} phút` : `${mins} phút`;
};

const attendanceLabels = {
  SCHEDULED: 'Chưa đến ca',
  WORKING: 'Đang làm',
  ON_TIME: 'Đúng giờ',
  IRREGULAR: 'Lệch giờ',
  MISSED: 'Không mở ca',
  CANCELLED: 'Đã huỷ',
};

export default function StaffSchedulePage() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    staffApi
      .getMySchedules()
      .then((res) => {
        if (active) setSchedules(res.data.result || []);
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || 'Không tải được lịch trực');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Lịch trực của tôi</h1>
        <p className="page-subtitle">Theo dõi các ca trực được quản lý phân công.</p>
      </div>

      <div className="admin-table-card">
        <div className="table-header">
          <h3>Lịch trực</h3>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{schedules.length} lịch</span>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Thời gian</th>
              <th>Vị trí</th>
              <th>Thời lượng</th>
              <th>Trạng thái</th>
              <th>Chấm công</th>
              <th>Người tạo</th>
              <th>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {schedules.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: 36, color: 'var(--text-muted)' }}>
                  Chưa có lịch trực.
                </td>
              </tr>
            ) : (
              schedules.map((schedule) => (
                <tr key={schedule.scheduleId}>
                  <td>
                    <div style={{ display: 'grid', gap: 3 }}>
                      <strong>{formatDateTime(schedule.startTime)}</strong>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        Đến {formatDateTime(schedule.endTime)}
                      </span>
                    </div>
                  </td>
                  <td>{schedule.position || '-'}</td>
                  <td>{formatDuration(schedule.durationMinutes)}</td>
                  <td>
                    <span className={`status-badge ${schedule.status === 'CANCELLED' ? 'status--inactive' : schedule.status === 'COMPLETED' ? 'status--active' : 'status--pending'}`}>
                      {schedule.status === 'CANCELLED' ? 'Đã huỷ' : schedule.status === 'COMPLETED' ? 'Hoàn tất' : 'Đã lên lịch'}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${schedule.attendanceStatus === 'MISSED' || schedule.attendanceStatus === 'IRREGULAR' ? 'status--pending' : schedule.attendanceStatus === 'ON_TIME' ? 'status--active' : 'status--inactive'}`}>
                      {attendanceLabels[schedule.attendanceStatus] || '-'}
                    </span>
                    {(schedule.lateMinutes > 0 || schedule.earlyLeaveMinutes > 0) && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 4 }}>
                        Muộn {schedule.lateMinutes || 0}p, sớm {schedule.earlyLeaveMinutes || 0}p
                      </div>
                    )}
                  </td>
                  <td>{schedule.createdByUsername || '-'}</td>
                  <td>{schedule.note || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
