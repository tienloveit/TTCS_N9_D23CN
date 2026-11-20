import { ROOM_TECHNOLOGY_LABELS, formatScreening } from '../../utils/cinemaFormats';
import { useEffect, useMemo, useRef, useState } from 'react';
import { showtimeApi, movieApi, branchApi, roomApi } from '../../api';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/useAuth';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import useModalDialog from '../../components/Common/useModalDialog';
import {
  CalendarIcon as LucideCalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EditIcon as LucideEditIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon as LucideTrashIcon,
  XIcon,
} from '../../components/Common/CinemaIcons';
import './ShowtimeCalendar.css';

const EditIcon = () => <LucideEditIcon size={15} />;
const TrashIcon = () => <LucideTrashIcon size={15} />;
const CalendarIcon = () => <LucideCalendarIcon size={16} />;

const ROOM_TYPE_LABELS = ROOM_TECHNOLOGY_LABELS;

const STATUS_MAP = {
  OPEN: { label: 'Đang mở', className: 'status--active' },
  CLOSED: { label: 'Đã đóng', className: 'status--inactive' },
  CANCELLED: { label: 'Đã hủy', className: 'status--inactive' },
};

const DAY_START_HOUR = 7;
const DAY_END_HOUR = 24;
const HOUR_WIDTH = 90;
const calendarDate = new Intl.DateTimeFormat('vi-VN', {
  weekday: 'long',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
});

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

const shiftCalendarDate = (value, days) => {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const layoutRoomShowtimes = (showtimes, date, firstMinute) => {
  const laneEnds = [];
  const slots = showtimes.map((showtime) => {
    const start = toMinutes(showtime.startTime);
    const end = new Date(showtime.endTime) > new Date(showtime.startTime)
      ? (isSameDate(showtime.endTime, date) ? toMinutes(showtime.endTime) : DAY_END_HOUR * 60)
      : start + 30;
    const visibleEnd = Math.min(DAY_END_HOUR * 60, Math.max(end, start + 20));
    const availableLane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
    const lane = availableLane === -1 ? laneEnds.length : availableLane;
    laneEnds[lane] = visibleEnd;
    const minutes = DAY_END_HOUR * 60 - firstMinute;
    return {
      showtime,
      style: {
        '--slot-offset': `${(start - firstMinute) / minutes * 100}%`,
        '--slot-width': `${(visibleEnd - start) / minutes * 100}%`,
        '--slot-lane': lane,
      },
    };
  });
  return { slots, lanes: Math.max(laneEnds.length, 1) };
};

const ShowtimeCalendar = ({ date, rooms, showtimes, branches, canEdit, onSelect }) => {
  const scrollRef = useRef(null);
  const firstShowtimeMinute = showtimes.length ? toMinutes(showtimes[0].startTime) : DAY_START_HOUR * 60;
  const firstShowtimeHour = Math.floor(firstShowtimeMinute / 60);
  const firstHour = Math.min(DAY_START_HOUR, firstShowtimeHour);
  const hours = Array.from({ length: DAY_END_HOUR - firstHour }, (_, index) => firstHour + index);
  const branchNames = new Map(branches.map((branch) => [String(branch.branchId), branch.name]));
  const showtimesByRoom = new Map();
  for (const showtime of showtimes) {
    const roomId = String(showtime.roomId);
    if (!showtimesByRoom.has(roomId)) showtimesByRoom.set(roomId, []);
    showtimesByRoom.get(roomId).push(showtime);
  }
  const openCount = showtimes.filter((showtime) => showtime.status === 'OPEN').length;

  useEffect(() => {
    if (scrollRef.current) {
      const leadHours = scrollRef.current.clientWidth < 480 ? 0 : 1;
      scrollRef.current.scrollLeft = Math.max(0, (firstShowtimeHour - firstHour - leadHours) * HOUR_WIDTH);
    }
  }, [date, firstHour, firstShowtimeHour]);

  return (
    <section className="schedule-calendar" aria-labelledby="schedule-calendar-title">
      <header className="schedule-calendar-heading">
        <div>
          <h2 id="schedule-calendar-title">Lịch chiếu theo phòng</h2>
          <p aria-live="polite">
            <time dateTime={date}>{calendarDate.format(new Date(date))}</time>
            <span> · {showtimes.length} suất · {rooms.length} phòng · {openCount} đang mở bán</span>
          </p>
        </div>
        {rooms.length > 0 && (
          <ul className="schedule-legend" aria-label="Trạng thái suất chiếu">
            {Object.entries(STATUS_MAP).map(([status, info]) => (
              <li key={status} data-status={status}>{info.label}</li>
            ))}
          </ul>
        )}
      </header>
      {rooms.length === 0 ? (
        <p className="schedule-empty">Không có suất chiếu trong ngày và chi nhánh đang chọn.</p>
      ) : (
        <div className="schedule-scroll" ref={scrollRef} role="region" tabIndex={0} aria-label="Trục giờ chiếu theo phòng">
          <div className="schedule-grid" style={{ '--schedule-hours': hours.length, '--schedule-hour-width': `${HOUR_WIDTH}px` }}>
            <div className="schedule-row schedule-hour-header">
              <span className="schedule-room">Phòng chiếu</span>
              <div className="schedule-hours">
                {hours.map((hour) => <span key={hour}>{String(hour).padStart(2, '0')}:00</span>)}
              </div>
            </div>
            {rooms.map((room) => {
              const roomShowtimes = showtimesByRoom.get(String(room.id)) || [];
              const { slots, lanes } = layoutRoomShowtimes(roomShowtimes, date, firstHour * 60);
              const branchName = branchNames.get(String(room.branchId)) || roomShowtimes[0]?.branchName;
              const technology = ROOM_TYPE_LABELS[room.roomTechnology] || room.roomTechnology;
              return (
                <div className="schedule-row" key={room.id} role="group" aria-label={branchName ? `${room.name}, ${branchName}` : room.name}>
                  <div className="schedule-room">
                    <strong>{room.name}</strong>
                    {branchName && <span>{branchName}</span>}
                    <span>{[technology, `${room.seatCapacity || 0} ghế`].filter(Boolean).join(' · ')}</span>
                  </div>
                  <div className="schedule-track" style={{ '--schedule-lanes': lanes }}>
                    {slots.map(({ showtime, style }) => {
                      const status = STATUS_MAP[showtime.status]?.label || showtime.status || '–';
                      const time = `${formatTime(showtime.startTime)} – ${formatTime(showtime.endTime)}`;
                      const label = `${showtime.movieName}, ${time}, ${status}`;
                      return (
                        <button
                          key={showtime.showtimeId}
                          type="button"
                          className="schedule-slot"
                          data-status={showtime.status}
                          style={style}
                          title={label}
                          aria-label={label}
                          disabled={!canEdit}
                          onClick={() => onSelect(showtime)}
                        >
                          <span className="schedule-slot-time">{time}</span>
                          <strong>{showtime.movieName}</strong>
                          <span className="schedule-slot-meta">{formatScreening(showtime.screeningFormat, showtime.roomTechnology)} · {status}</span>
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
    </section>
  );
};

const ShowtimeManagement = () => {
  const { isAdmin, isManager, isAdminOrManager } = useAuth();
  const canEditShowtime = isAdminOrManager;
  const [showtimes, setShowtimes] = useState([]);
  const [reloadCount, setReloadCount] = useState(0);
  const [completedRequest, setCompletedRequest] = useState(null);
  const loading = completedRequest?.reloadCount !== reloadCount || completedRequest?.isManager !== isManager;
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('calendar');
  const [selectedDate, setSelectedDate] = useState(toDateInputValue());
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const dialog = useModalDialog(showModal, () => setShowModal(false));
  const [isEditing, setIsEditing] = useState(false);
  const [movies, setMovies] = useState([]);
  const [branches, setBranches] = useState([]);
  const [rooms, setRooms] = useState([]);

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

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      try {
        const [stRes, branchRes, roomRes] = await Promise.all([
          showtimeApi.getAll(),
          branchApi.getAll(),
          roomApi.getAll(),
        ]);
        if (!active) return;
        const movieList = isManager
          ? await Promise.all([movieApi.getNowShowing(), movieApi.getUpcoming()]).then(([nowRes, upcomingRes]) => {
            const moviesById = new Map();
            [...(nowRes.data.result || []), ...(upcomingRes.data.result || [])].forEach((movie) => {
              moviesById.set(movie.movieId, movie);
            });
            return [...moviesById.values()];
          })
          : (await movieApi.getAll()).data.result || [];
        if (!active) return;
        const branchList = branchRes.data.result || [];
        setShowtimes(stRes.data.result || []);
        setMovies(movieList);
        setBranches(branchList);
        setRooms(roomRes.data.result || []);
        setSelectedBranchId((current) => current || (branchList.length === 1 ? String(branchList[0].branchId) : ''));
      } catch {
        if (active) toast.error('Lỗi khi tải dữ liệu');
      } finally {
        if (active) setCompletedRequest({ reloadCount, isManager });
      }
    };

    fetchData();
    return () => {
      active = false;
    };
  }, [isManager, reloadCount]);

  const filteredRooms = formData.branchId
    ? rooms.filter((room) => String(room.branchId || room.branch_id) === String(formData.branchId))
    : [];

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
      setReloadCount((count) => count + 1);
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
      setReloadCount((count) => count + 1);
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

  const formatDT = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return (
      <div>
        <div style={{ fontWeight: 400, color: 'var(--text-primary)' }}>{formatTime(dateStr)}</div>
        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
          {date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
        </div>
      </div>
    );
  };

  if (loading && showtimes.length === 0) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="showtime-management">
      <header className="schedule-page-heading">
        <div>
          <h1>Quản lý Suất chiếu</h1>
          {viewMode === 'list' && <p>{listShowtimes.length} suất chiếu</p>}
        </div>
        {canEditShowtime && (
          <button type="button" className="schedule-button schedule-button--primary" onClick={() => handleOpenModal()}>
            <PlusIcon size={16} aria-hidden="true" />
            Thêm suất chiếu
          </button>
        )}
      </header>

      <div className="schedule-toolbar">
        {viewMode === 'calendar' && (
          <div className="schedule-date-controls" role="group" aria-label="Điều hướng lịch chiếu">
            <button type="button" className="schedule-button schedule-arrow" aria-label="Ngày trước" onClick={() => setSelectedDate(shiftCalendarDate(selectedDate, -1))}>
              <ChevronLeftIcon size={16} aria-hidden="true" />
            </button>
            <button type="button" className="schedule-button" onClick={() => setSelectedDate(toDateInputValue())}>Hôm nay</button>
            <button type="button" className="schedule-button schedule-arrow" aria-label="Ngày sau" onClick={() => setSelectedDate(shiftCalendarDate(selectedDate, 1))}>
              <ChevronRightIcon size={16} aria-hidden="true" />
            </button>
            <input
              className="schedule-field schedule-date-field"
              aria-label="Ngày chiếu"
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value || toDateInputValue())}
            />
          </div>
        )}

        <label className="schedule-branch">
          <span>Chi nhánh</span>
          <select className="schedule-field" aria-label="Chi nhánh" value={selectedBranchId} onChange={(event) => setSelectedBranchId(event.target.value)}>
            <option value="">Tất cả chi nhánh</option>
            {branches.map((branch) => (
              <option key={branch.branchId} value={branch.branchId}>{branch.name}</option>
            ))}
          </select>
        </label>

        <div className="schedule-views" role="group" aria-label="Kiểu hiển thị suất chiếu">
          <button type="button" className="schedule-button" aria-pressed={viewMode === 'calendar'} onClick={() => setViewMode('calendar')}>
            <CalendarIcon />
            Lịch
          </button>
          <button type="button" className="schedule-button" aria-pressed={viewMode === 'list'} onClick={() => setViewMode('list')}>
            Danh sách
          </button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <ShowtimeCalendar
          key={selectedBranchId}
          date={selectedDate}
          rooms={calendarRooms}
          showtimes={calendarShowtimes}
          branches={branches}
          canEdit={canEditShowtime}
          onSelect={handleOpenModal}
        />
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
        <div className="modal-overlay" {...dialog.overlayProps}>
          <div
            className="modal-content"
            {...dialog.contentProps}
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
              <h2 id={dialog.titleId} style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>
                {isEditing ? 'Chỉnh sửa suất chiếu' : 'Thêm suất chiếu mới'}
              </h2>
              <button
                type="button"
                className="modal-close modal-close--inline modal-close--lg"
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
