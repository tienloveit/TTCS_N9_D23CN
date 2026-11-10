import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { staffApi } from '../../api';
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  RefreshIcon,
  SearchIcon,
} from '../../components/Common/CinemaIcons';

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

const STATUS_TABS = [
  { key: 'ALL', label: 'Tất cả ca' },
  { key: 'SCHEDULED', label: 'Đã lên lịch' },
  { key: 'COMPLETED', label: 'Hoàn tất' },
  { key: 'CANCELLED', label: 'Đã huỷ' },
];

export default function StaffSchedulePage() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchSchedules = () => {
    setLoading(true);
    staffApi
      .getMySchedules()
      .then((res) => {
        setSchedules(res.data.result || []);
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || 'Không tải được lịch trực');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const stats = useMemo(() => {
    const total = schedules.length;
    const upcoming = schedules.filter(
      (s) => s.status !== 'CANCELLED' && s.status !== 'COMPLETED'
    ).length;
    const onTime = schedules.filter((s) => s.attendanceStatus === 'ON_TIME').length;
    const irregular = schedules.filter(
      (s) => s.attendanceStatus === 'IRREGULAR' || s.attendanceStatus === 'MISSED'
    ).length;
    return { total, upcoming, onTime, irregular };
  }, [schedules]);

  const nextActiveSchedule = useMemo(() => {
    const now = Date.now();
    return schedules
      .filter((s) => s.status !== 'CANCELLED' && s.status !== 'COMPLETED')
      .sort((a, b) => new Date(a.startTime || 0) - new Date(b.startTime || 0))
      .find((s) => new Date(s.endTime || 0).getTime() >= now - 3600000);
  }, [schedules]);

  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      if (statusFilter !== 'ALL') {
        const normalized = s.status || 'SCHEDULED';
        if (normalized !== statusFilter) return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        (s.position || '').toLowerCase().includes(q) ||
        (s.note || '').toLowerCase().includes(q) ||
        (s.createdByUsername || '').toLowerCase().includes(q)
      );
    });
  }, [schedules, statusFilter, searchQuery]);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Lịch trực của tôi</h1>
          <p className="page-subtitle">Theo dõi các ca trực được quản lý phân công và trạng thái chấm công.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary" onClick={fetchSchedules}>
            <RefreshIcon size={16} />
            <span>Làm mới</span>
          </button>
          <Link to="/staff/dashboard" className="btn btn-primary">
            <span>Bàn giao / Mở ca</span>
            <ArrowRightIcon size={16} />
          </Link>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(7, 86, 166, 0.1)', color: 'var(--blue)' }}>
            <CalendarIcon size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Tổng ca phân công</span>
            <h3 className="stat-value">{stats.total}</h3>
            <span className="stat-note">Toàn bộ lịch trực cá nhân</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#d97706' }}>
            <ClockIcon size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Ca sắp tới / Đang trực</span>
            <h3 className="stat-value">{stats.upcoming}</h3>
            <span className="stat-note">Cần mở ca đúng giờ quy định</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(22, 163, 74, 0.12)', color: '#16a34a' }}>
            <CheckCircleIcon size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Chấm công đúng giờ</span>
            <h3 className="stat-value">{stats.onTime}</h3>
            <span className="stat-note">Mở và đóng ca chuẩn giờ</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#dc2626' }}>
            <AlertTriangleIcon size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Lệch giờ / Chưa mở ca</span>
            <h3 className="stat-value">{stats.irregular}</h3>
            <span className="stat-note">Muộn, về sớm hoặc vắng mặt</span>
          </div>
        </div>
      </div>

      {/* Next / Active Shift Callout Banner */}
      {nextActiveSchedule && (
        <div
          className="admin-table-card"
          style={{
            padding: '18px 22px',
            marginBottom: 20,
            background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)',
            borderColor: '#93c5fd',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: '#0756a6',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ClockIcon size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#0756a6', textTransform: 'uppercase' }}>
                Ca trực gần nhất của bạn
              </div>
              <div style={{ fontSize: '1.02rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                {nextActiveSchedule.position || 'Quầy vé'} • {formatDateTime(nextActiveSchedule.startTime)} → {formatDateTime(nextActiveSchedule.endTime)}
              </div>
              {nextActiveSchedule.note && (
                <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                  Ghi chú: {nextActiveSchedule.note}
                </div>
              )}
            </div>
          </div>

          <Link to="/staff/dashboard" className="btn btn-primary btn-sm">
            <span>Đi tới Mở ca / Tổng quan ca</span>
            <ArrowRightIcon size={15} />
          </Link>
        </div>
      )}

      <div className="admin-table-card">
        <div className="console-toolbar">
          <div className="console-status-tabs">
            {STATUS_TABS.map((tab) => {
              const count =
                tab.key === 'ALL'
                  ? schedules.length
                  : schedules.filter((s) => (s.status || 'SCHEDULED') === tab.key).length;
              return (
                <button
                  key={tab.key}
                  type="button"
                  className={`console-status-tab ${statusFilter === tab.key ? 'is-active' : ''}`}
                  onClick={() => setStatusFilter(tab.key)}
                >
                  <span>{tab.label}</span>
                  <span className="console-status-count">{count}</span>
                </button>
              );
            })}
          </div>

          <div style={{ position: 'relative', minWidth: 250 }}>
            <SearchIcon
              size={16}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              className="input"
              placeholder="Tìm vị trí, người phân công, ghi chú..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 36, height: 38, fontSize: '0.85rem' }}
            />
          </div>
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
            {filteredSchedules.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: 36, color: 'var(--text-muted)' }}>
                  Không tìm thấy lịch trực phù hợp.
                </td>
              </tr>
            ) : (
              filteredSchedules.map((schedule) => (
                <tr key={schedule.scheduleId}>
                  <td>
                    <div style={{ display: 'grid', gap: 3 }}>
                      <strong>{formatDateTime(schedule.startTime)}</strong>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        Đến {formatDateTime(schedule.endTime)}
                      </span>
                    </div>
                  </td>
                  <td style={{ fontWeight: 700 }}>{schedule.position || '-'}</td>
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

