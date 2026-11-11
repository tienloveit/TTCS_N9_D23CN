import { ROOM_TECHNOLOGY_LABELS, formatScreening } from '../../utils/cinemaFormats';
import { useEffect, useMemo, useState } from 'react';
import { showtimeApi, movieApi, branchApi, roomApi } from '../../api';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/useAuth';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import {
  CalendarIcon as LucideCalendarIcon,
  EditIcon as LucideEditIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon as LucideTrashIcon,
  XIcon,
} from '../../components/Common/CinemaIcons';

const EditIcon = () => <LucideEditIcon size={15} />;
const TrashIcon = () => <LucideTrashIcon size={15} />;
const CalendarIcon = () => <LucideCalendarIcon size={16} />;

const ROOM_TYPE_LABELS = ROOM_TECHNOLOGY_LABELS;

const STATUS_MAP = {
  OPEN: { label: 'Đang mở', className: 'status--active' },
  CLOSED: { label: 'Đã đóng', className: 'status--inactive' },
  CANCELLED: { label: 'Đã hủy', className: 'status--inactive' },
};

const SLOT_COLORS = ['#0756a6', '#0f766e', '#7c3aed', '#be123c', '#b45309', '#4338ca'];
const DAY_START_HOUR = 7;
const DAY_END_HOUR = 24;
const HOUR_WIDTH = 96;

const toDateInputValue = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toMinutes = (dateStr) => {
  const date = new Date(dateStr);
  return date.getHours() * 60 + date.getMinutes();
};

const isSameDate = (dateStr, dateInput) => {
  if (!dateStr || !dateInput) return false;
  return toDateInputValue(new Date(dateStr)) === dateInput;
};

const formatTime = (dateStr) =>
  dateStr
    ? new Date(dateStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : '--:--';

const ShowtimeManagement = () => {
  const { isAdmin, isManager, isAdminOrManager } = useAuth();
  const canEditShowtime = isAdminOrManager;
  const [showtimes, setShowtimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('calendar');
  const [selectedDate, setSelectedDate] = useState(toDateInputValue());
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [movies, setMovies] = useState([]);
  const [branches, setBranches] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);

  const [formData, setFormData] = useState({
    showtimeId: null,
    movieId: '',
    branchId: '',
    roomId: '',
    startTime: '',
    endTime: '',
    status: 'OPEN',
    screeningFormat: 'TWO_D',
    ticketPrice: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [stRes, branchRes, roomRes] = await Promise.all([
        showtimeApi.getAll(),
        branchApi.getAll(),
        roomApi.getAll(),
      ]);
      const movieList = isManager
        ? await Promise.all([movieApi.getNowShowing(), movieApi.getUpcoming()]).then(([nowRes, upcomingRes]) => {
          const moviesById = new Map();
          [...(nowRes.data.result || []), ...(upcomingRes.data.result || [])].forEach((movie) => {
            moviesById.set(movie.movieId, movie);
          });
          return [...moviesById.values()];
        })
        : (await movieApi.getAll()).data.result || [];
      const branchList = branchRes.data.result || [];
      setShowtimes(stRes.data.result || []);
      setMovies(movieList);
      setBranches(branchList);
      setRooms(roomRes.data.result || []);
      setSelectedBranchId((current) => current || (branchList.length === 1 ? String(branchList[0].branchId) : ''));
    } catch {
      toast.error('Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (formData.branchId) {
      setFilteredRooms(rooms.filter((room) => String(room.branchId || room.branch_id) === String(formData.branchId)));
    } else {
      setFilteredRooms([]);
    }
  }, [formData.branchId, rooms]);

  const calendarShowtimes = useMemo(
    () =>
      showtimes
        .filter((showtime) => isSameDate(showtime.startTime, selectedDate))
        .filter((showtime) => !selectedBranchId || String(showtime.branchId) === String(selectedBranchId))
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime)),
    [showtimes, selectedDate, selectedBranchId],
  );

  const calendarRooms = useMemo(() => {
    const roomIdsWithSchedule = new Set(calendarShowtimes.map((showtime) => String(showtime.roomId)));
    return rooms
      .filter((room) => !selectedBranchId || String(room.branchId) === String(selectedBranchId))
      .filter((room) => roomIdsWithSchedule.has(String(room.id)))
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  }, [rooms, calendarShowtimes, selectedBranchId]);

  const timelineHours = useMemo(
    () => Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, index) => DAY_START_HOUR + index),
    [],
  );

  const dayStats = useMemo(() => {
    const openCount = calendarShowtimes.filter((showtime) => showtime.status === 'OPEN').length;
    const usedRooms = new Set(calendarShowtimes.map((showtime) => showtime.roomId)).size;
    return { openCount, usedRooms, total: calendarShowtimes.length };
  }, [calendarShowtimes]);

  const handleOpenModal = (showtime = null) => {
    if (!canEditShowtime) return;
    if (showtime) {
      setIsEditing(true);
      setFormData({
        showtimeId: showtime.showtimeId,
        movieId: showtime.movieId,
        branchId: showtime.branchId || '',
        roomId: showtime.roomId,
        startTime: showtime.startTime ? showtime.startTime.slice(0, 16) : '',
        endTime: showtime.endTime ? showtime.endTime.slice(0, 16) : '',
        status: showtime.status || 'OPEN',
        screeningFormat: showtime.screeningFormat || 'TWO_D',
        ticketPrice: showtime.ticketPrice ?? '',
      });
    } else {
      setIsEditing(false);
      setFormData({
        showtimeId: null,
        movieId: '',
        branchId: selectedBranchId || (branches.length === 1 ? String(branches[0].branchId) : ''),
        roomId: '',
        startTime: `${selectedDate}T08:00`,
        endTime: `${selectedDate}T10:00`,
        status: 'OPEN',
        screeningFormat: 'TWO_D',
        ticketPrice: '',
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canEditShowtime) return;
    try {
      const payload = { ...formData, ticketPrice: Number(formData.ticketPrice) };
      if (isEditing) {
        await showtimeApi.update(formData.showtimeId, payload);
        toast.success('Cập nhật suất chiếu thành công!');
      } else {
        await showtimeApi.create(payload);
        toast.success('Thêm suất chiếu thành công!');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const computeEndTimeFromMovie = (movieId, startTimeStr) => {
    if (!movieId || !startTimeStr) return '';
    const found = movies.find((m) => String(m.movieId || m.id) === String(movieId));
    const duration = Number(found?.durationMinutes || found?.duration || 120);
    const start = new Date(startTimeStr);
    if (Number.isNaN(start.getTime())) return '';
    const end = new Date(start.getTime() + duration * 60000);
    const pad = (n) => String(n).padStart(2, '0');
    return `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`;
  };

  const handleDelete = (id) => {
    if (!isAdmin) return;
    setDeleteTargetId(id);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      await showtimeApi.delete(deleteTargetId);
      toast.success('Xóa suất chiếu thành công!');
      setDeleteTargetId(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xóa thất bại');
    } finally {
      setDeleting(false);
    }
  };

  const listShowtimes = useMemo(() => {
    return showtimes.filter((showtime) => !selectedBranchId || String(showtime.branchId) === String(selectedBranchId));
  }, [showtimes, selectedBranchId]);

  const filtered = listShowtimes.filter((showtime) => {
    if (statusFilter !== 'ALL' && showtime.status !== statusFilter) return false;
    return [showtime.movieName, showtime.roomName, showtime.branchName].some((field) =>
      field?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  });

  const getShowtimesForRoom = (roomId) =>
    calendarShowtimes.filter((showtime) => String(showtime.roomId) === String(roomId));

  const getSlotStyle = (showtime, index) => {
    const start = Math.max(toMinutes(showtime.startTime), DAY_START_HOUR * 60);
    const end = Math.min(toMinutes(showtime.endTime), DAY_END_HOUR * 60);
    const left = ((start - DAY_START_HOUR * 60) / 60) * HOUR_WIDTH;
    const width = Math.max(((end - start) / 60) * HOUR_WIDTH, 74);
    const color = showtime.status === 'CANCELLED' ? '#64748b' : SLOT_COLORS[index % SLOT_COLORS.length];
    return {
      left,
      width,
      background: color,
      opacity: showtime.status === 'CANCELLED' ? 0.58 : 1,
    };
  };

  const formatDT = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return (
      <div>
        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{formatTime(dateStr)}</div>
        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
          {date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
        </div>
      </div>
    );
  };

  if (loading && showtimes.length === 0) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18 }}>
        <div>
          <h1 className="page-title">Quản lý Suất chiếu</h1>
          <p className="page-subtitle">
            {viewMode === 'calendar' ? (
              <><strong>{dayStats.total}</strong> suất trong ngày đang chọn · <strong>{dayStats.usedRooms}</strong> phòng có lịch</>
            ) : (
              <><strong>{listShowtimes.length}</strong> suất chiếu trên hệ thống</>
            )}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()} disabled={!canEditShowtime} style={!canEditShowtime ? { display: 'none' } : undefined}>
          <PlusIcon size={18} />
          Thêm suất chiếu
        </button>
      </div>

      <div className="admin-table-card" style={{ padding: 18, marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) 180px minmax(220px, 1fr) auto', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8, padding: 4, background: 'var(--bg-card-hover)', borderRadius: 8 }}>
            <button
              type="button"
              className={`btn btn-sm ${viewMode === 'calendar' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('calendar')}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              <CalendarIcon />
              Calendar
            </button>
            <button
              type="button"
              className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('list')}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              Danh sách
            </button>
          </div>

          {viewMode === 'calendar' && (
            <input className="input" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          )}

          <select className="input" value={selectedBranchId} onChange={(e) => setSelectedBranchId(e.target.value)}>
            <option value="">Tất cả chi nhánh</option>
            {branches.map((branch) => (
              <option key={branch.branchId} value={branch.branchId}>{branch.name}</option>
            ))}
          </select>

          {viewMode === 'calendar' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedDate(toDateInputValue(new Date(new Date(selectedDate).setDate(new Date(selectedDate).getDate() - 1))))}>
                Trước
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedDate(toDateInputValue())}>
                Hôm nay
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedDate(toDateInputValue(new Date(new Date(selectedDate).setDate(new Date(selectedDate).getDate() + 1))))}>
                Sau
              </button>
            </div>
          )}
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <div className="admin-table-card" style={{ overflow: 'hidden' }}>
          <div className="table-header">
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Lịch chiếu theo phòng</h3>
              <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                {dayStats.openCount} suất đang mở bán · timeline {DAY_START_HOUR}:00 - {DAY_END_HOUR}:00
              </p>
            </div>
          </div>

          {calendarRooms.length === 0 ? (
            <div style={{ padding: 44, textAlign: 'center', color: 'var(--text-muted)' }}>
              Không có suất chiếu nào trong ngày/chi nhánh đang chọn.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <div style={{ minWidth: 240 + timelineHours.length * HOUR_WIDTH }}>
                <div style={{ display: 'grid', gridTemplateColumns: `220px ${timelineHours.length * HOUR_WIDTH}px`, borderBottom: '1px solid var(--border)', background: 'var(--bg-card-hover)' }}>
                  <div style={{ padding: '12px 16px', fontWeight: 800 }}>Phòng</div>
                  <div style={{ position: 'relative', height: 44 }}>
                    {timelineHours.map((hour) => (
                      <div key={hour} style={{ position: 'absolute', left: (hour - DAY_START_HOUR) * HOUR_WIDTH, top: 0, width: HOUR_WIDTH, height: 44, borderLeft: '1px solid var(--border)', padding: '12px 8px', fontSize: 12, color: 'var(--text-muted)' }}>
                        {String(hour).padStart(2, '0')}:00
                      </div>
                    ))}
                  </div>
                </div>

                {calendarRooms.map((room) => {
                  const roomShowtimes = getShowtimesForRoom(room.id);
                  return (
                    <div key={room.id} style={{ display: 'grid', gridTemplateColumns: `220px ${timelineHours.length * HOUR_WIDTH}px`, borderBottom: '1px solid var(--border)' }}>
                      <div style={{ padding: 16, borderRight: '1px solid var(--border)' }}>
                        <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{room.name}</div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span className="movie-badge">{ROOM_TYPE_LABELS[room.roomTechnology] || room.roomTechnology}</span>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{room.seatCapacity || 0} ghế</span>
                        </div>
                      </div>
                      <div style={{ position: 'relative', height: 92, background: '#f8fafc' }}>
                        {timelineHours.map((hour) => (
                          <div key={hour} style={{ position: 'absolute', left: (hour - DAY_START_HOUR) * HOUR_WIDTH, top: 0, bottom: 0, borderLeft: '1px solid #e2e8f0' }} />
                        ))}
                        {roomShowtimes.map((showtime, index) => {
                          const statusInfo = STATUS_MAP[showtime.status] || { label: showtime.status || '-', className: '' };
                          return (
                            <button
                              key={showtime.showtimeId}
                              type="button"
                              title={`${showtime.movieName} · ${formatTime(showtime.startTime)} - ${formatTime(showtime.endTime)}`}
                              onClick={() => handleOpenModal(showtime)}
                              style={{
                                position: 'absolute',
                                top: 14 + (index % 2) * 34,
                                height: 30,
                                border: 'none',
                                borderRadius: 6,
                                color: '#fff',
                                textAlign: 'left',
                                padding: '4px 8px',
                                overflow: 'hidden',
                                cursor: canEditShowtime ? 'pointer' : 'default',
                                boxShadow: '0 6px 14px rgba(15,23,42,0.14)',
                                ...getSlotStyle(showtime, index),
                              }}
                            >
                              <div style={{ fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {formatTime(showtime.startTime)} {showtime.movieName}
                              </div>
                              <div style={{ fontSize: 10, opacity: 0.88 }}>{formatScreening(showtime.screeningFormat, showtime.roomTechnology)} · {statusInfo.label}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="admin-table-card">
          <div className="console-toolbar">
            <div className="console-status-tabs">
              {[
                { key: 'ALL', label: 'Tất cả' },
                { key: 'OPEN', label: 'Đang mở' },
                { key: 'CLOSED', label: 'Đã đóng' },
                { key: 'CANCELLED', label: 'Đã hủy' },
              ].map((tab) => {
                const count =
                  tab.key === 'ALL'
                    ? listShowtimes.length
                    : listShowtimes.filter((s) => s.status === tab.key).length;
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

            <div style={{ position: 'relative', maxWidth: 320, flex: '0 1 320px' }}>
              <SearchIcon
                size={16}
                style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}
              />
              <input
                type="text"
                className="input"
                placeholder="Tìm phim, phòng, chi nhánh..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: 40, height: 38, background: 'var(--bg-input)' }}
              />
            </div>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Phim</th>
                <th>Phòng chiếu</th>
                <th>Chi nhánh</th>
                <th>Bắt đầu</th>
                <th>Kết thúc</th>
                <th>Giá vé</th>
                <th>Trạng thái</th>
                {canEditShowtime && <th style={{ width: 100 }}>Hành động</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={canEditShowtime ? 9 : 8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    {searchTerm ? 'Không tìm thấy suất chiếu nào' : 'Chưa có suất chiếu nào'}
                  </td>
                </tr>
              ) : (
                filtered.map((showtime, index) => {
                  const statusInfo = STATUS_MAP[showtime.status] || { label: showtime.status || '-', className: '' };
                  return (
                    <tr key={showtime.showtimeId || index}>
                      <td style={{ color: 'var(--text-muted)' }}>{index + 1}</td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{showtime.movieName || '-'}</td>
                      <td>
                        <div>
                          <div style={{ color: 'var(--text-primary)' }}>{showtime.roomName || '-'}</div>
                          {showtime.roomTechnology && (
                            <span className="movie-badge" style={{ marginTop: 3, display: 'inline-block' }}>
                              {formatScreening(showtime.screeningFormat, showtime.roomTechnology)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>{showtime.branchName || '-'}</td>
                      <td>{formatDT(showtime.startTime)}</td>
                      <td>{formatDT(showtime.endTime)}</td>
                      <td>{Number(showtime.ticketPrice || 0).toLocaleString('vi-VN')}đ</td>
                      <td><span className={`status-badge ${statusInfo.className}`}>{statusInfo.label}</span></td>
                      {canEditShowtime && (
                        <td>
                          <div className="action-btns">
                            <button className="btn btn-ghost btn-sm" title="Sửa" onClick={() => handleOpenModal(showtime)}><EditIcon /></button>
                            {isAdmin && (
                              <button className="btn btn-ghost btn-sm" title="Xóa" style={{ color: '#ef4444' }} onClick={() => handleDelete(showtime.showtimeId)}><TrashIcon /></button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 650,
              height: 'auto',
              aspectRatio: 'unset',
              overflowY: 'auto',
              maxHeight: '90vh',
              background: 'var(--bg-card)',
              padding: '28px 32px',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>
                {isEditing ? 'Chỉnh sửa suất chiếu' : 'Thêm suất chiếu mới'}
              </h2>
              <button
                type="button"
                className="modal-close"
                style={{ position: 'static', width: 34, height: 34 }}
                onClick={() => setShowModal(false)}
                aria-label="Đóng"
              >
                <XIcon size={18} />
              </button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="form-group">
                <label className="form-label">Chọn phim</label>
                <select
                  className="input"
                  value={formData.movieId}
                  onChange={(e) => {
                    const nextMovieId = e.target.value;
                    const autoEnd = computeEndTimeFromMovie(nextMovieId, formData.startTime);
                    setFormData({
                      ...formData,
                      movieId: nextMovieId,
                      endTime: autoEnd || formData.endTime,
                    });
                  }}
                  required
                >
                  <option value="">-- Chọn phim --</option>
                  {movies.map((movie) => (
                    <option key={movie.movieId} value={movie.movieId}>
                      {movie.movieName} {movie.durationMinutes ? `(${movie.durationMinutes} phút)` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Chi nhánh</label>
                  <select className="input" value={formData.branchId} onChange={(e) => setFormData({ ...formData, branchId: e.target.value, roomId: '' })} required>
                    <option value="">-- Chọn rạp --</option>
                    {branches.map((branch) => <option key={branch.branchId} value={branch.branchId}>{branch.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Phòng chiếu</label>
                  <select className="input" value={formData.roomId} onChange={(e) => setFormData({ ...formData, roomId: e.target.value })} required disabled={!formData.branchId}>
                    <option value="">-- Chọn phòng --</option>
                    {filteredRooms.map((room) => <option key={room.id} value={room.id}>{room.name} ({ROOM_TYPE_LABELS[room.roomTechnology] || room.roomTechnology})</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Bắt đầu</label>
                  <input
                    type="datetime-local"
                    className="input"
                    value={formData.startTime}
                    onChange={(e) => {
                      const nextStart = e.target.value;
                      const autoEnd = computeEndTimeFromMovie(formData.movieId, nextStart);
                      setFormData({
                        ...formData,
                        startTime: nextStart,
                        endTime: autoEnd || formData.endTime,
                      });
                    }}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Kết thúc (tự động tính theo thời lượng)</label>
                  <input type="datetime-local" className="input" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} required />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="showtime-ticket-price">Giá vé (VNĐ/vé)</label>
                <input id="showtime-ticket-price" type="number" className="input" min="1" max="999999999999" step="1" required
                  value={formData.ticketPrice} onChange={(e) => setFormData({ ...formData, ticketPrice: e.target.value })} />
                <small style={{ color: 'var(--text-muted)' }}>Áp dụng cho mọi loại ghế. Chỉ đổi giá khi chưa có ghế đang giữ hoặc vé đã bán.</small>
              </div>
              <div className="form-group">
                <label className="form-label">Định dạng chiếu</label>
                <select className="input" value={formData.screeningFormat} onChange={(e) => setFormData({ ...formData, screeningFormat: e.target.value })} required>
                  <option value="TWO_D">2D</option><option value="THREE_D">3D</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Trạng thái</label>
                <select className="input" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                  <option value="OPEN">Mở bán</option>
                  <option value="CLOSED">Đóng</option>
                  <option value="CANCELLED">Đã hủy</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Lưu lại</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTargetId)}
        title="Xóa suất chiếu"
        message="Bạn có chắc chắn muốn xóa suất chiếu này? Thao tác này không thể hoàn tác."
        confirmText="Xóa suất chiếu"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};

export default ShowtimeManagement;
