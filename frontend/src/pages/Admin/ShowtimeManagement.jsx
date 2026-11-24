import { useEffect, useMemo, useState } from 'react';
import { showtimeApi, movieApi, branchApi, roomApi } from '../../api';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/useAuth';
import { EditIcon, PlusIcon, TrashIcon } from '../../components/Common/CinemaIcons';
import {
  DataTable, DateLabel, Field, FilterBar, Money, OpsButton, OpsConfirm, OpsDialog,
  OpsPage, OpsPanel, Segmented, Select, ShowtimeRail, ShowTime, StateBlock, StatusBadge, TextInput,
} from '../../components/Ops';
import { addDaysToDateKey, cinemaTodayKey, formatTime, parseLocalDateTime, toCinemaDateKey } from '../../utils/cinemaTime';
import { ROOM_TECHNOLOGY_LABELS, formatScreening } from '../../utils/cinemaFormats';
import { SHOWTIME_STATUS_META } from '../../utils/showtimeStatus';

const localInputTime = value => {
  const date = parseLocalDateTime(value);
  return date ? toCinemaDateKey(date) + 'T' + formatTime(date) : '';
};
const showtimeStatuses = Object.entries(SHOWTIME_STATUS_META);
const idOfMovie = movie => movie.movieId ?? movie.id;

const ShowtimeManagement = () => {
  const { isAdmin, isManager, isAdminOrManager } = useAuth();
  const canEditShowtime = isAdminOrManager;
  const [showtimes, setShowtimes] = useState([]);
  const [reloadCount, setReloadCount] = useState(0);
  const [completedRequest, setCompletedRequest] = useState(null);
  const loading = completedRequest?.reloadCount !== reloadCount || completedRequest?.isManager !== isManager;
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllDates, setShowAllDates] = useState(false);
  const [selectedDate, setSelectedDate] = useState(cinemaTodayKey);
  const [movieFilter, setMovieFilter] = useState('');
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [showModal, setShowModal] = useState(false);
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
        setMovies(Array.isArray(movieList) ? movieList : movieList.content || []);
        setLoadError('');
        setBranches(branchList);
        setRooms(roomRes.data.result || []);
        setSelectedBranchId((current) => current || (branchList.length === 1 ? String(branchList[0].branchId) : ''));
      } catch {
        if (active) setLoadError('Không tải được lịch chiếu, phim hoặc danh sách phòng.');
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

  const scopedShowtimes = useMemo(() => showtimes
    .filter(show => !selectedBranchId || String(show.branchId) === selectedBranchId)
    .filter(show => !movieFilter || String(show.movieId) === movieFilter)
    .filter(show => statusFilter === 'ALL' || show.status === statusFilter)
    .filter(show => !searchTerm.trim() || [show.movieName, show.roomName, show.branchName].some(
      value => value?.toLocaleLowerCase('vi').includes(searchTerm.toLocaleLowerCase('vi').trim()),
    ))
    .sort((first, second) => parseLocalDateTime(first.startTime) - parseLocalDateTime(second.startTime)),
  [showtimes, selectedBranchId, movieFilter, statusFilter, searchTerm]);
  const calendarShowtimes = scopedShowtimes.filter(show => toCinemaDateKey(show.startTime) === selectedDate);
  const calendarRooms = rooms
    .filter(room => !selectedBranchId || String(room.branchId) === selectedBranchId)
    .map(room => ({ ...room, roomName: room.name,
      branchName: branches.find(branch => String(branch.branchId) === String(room.branchId))?.name }));

  const computeEndTimeFromMovie = (movieId, startTime) => {
    const start = parseLocalDateTime(startTime);
    if (!movieId || !start) return '';
    const movie = movies.find(item => String(idOfMovie(item)) === String(movieId));
    const duration = Number(movie?.durationMinutes || movie?.duration || 120);
    return localInputTime(new Date(start.getTime() + duration * 60_000));
  };

  const handleOpenModal = (showtime = null, room, startTime = selectedDate + 'T08:00') => {
    if (!canEditShowtime) return;
    setSaveError('');
    if (showtime) {
      setIsEditing(true);
      setFormData({
        showtimeId: showtime.showtimeId,
        movieId: showtime.movieId,
        branchId: showtime.branchId || '',
        roomId: showtime.roomId,
        startTime: localInputTime(showtime.startTime),
        endTime: localInputTime(showtime.endTime),
        status: showtime.status || 'OPEN',
        screeningFormat: showtime.screeningFormat || 'TWO_D',
        ticketPrice: showtime.ticketPrice ?? '',
      });
    } else {
      setIsEditing(false);
      setFormData({
        showtimeId: null,
        movieId: movieFilter,
        branchId: room?.branchId ?? (selectedBranchId || (branches.length === 1 ? String(branches[0].branchId) : '')),
        roomId: room?.id ?? '',
        startTime,
        endTime: computeEndTimeFromMovie(movieFilter, startTime),
        status: 'OPEN',
        screeningFormat: 'TWO_D',
        ticketPrice: '',
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canEditShowtime || saving) return;
    setSaving(true);
    setSaveError('');
    try {
      const payload = { ...formData, ticketPrice: Number(formData.ticketPrice) };
      if (isEditing) {
        await showtimeApi.update(formData.showtimeId, payload);
        toast.success('Đã lưu thay đổi suất chiếu');
      } else {
        await showtimeApi.create(payload);
        toast.success('Đã thêm suất chiếu');
      }
      setShowModal(false);
      setReloadCount((count) => count + 1);
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Không lưu được suất chiếu. Kiểm tra dữ liệu rồi thử lại.');
    } finally {
      setSaving(false);
    }
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
      toast.success('Đã xóa suất chiếu');
      setDeleteTargetId(null);
      setReloadCount((count) => count + 1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xóa thất bại');
    } finally {
      setDeleting(false);
    }
  };


  const today = cinemaTodayKey();
  const tomorrow = addDaysToDateKey(today, 1);
  const resetFilters = () => {
    setSearchTerm('');
    setMovieFilter('');
    setStatusFilter('ALL');
    setSelectedDate(today);
    setShowAllDates(false);
    setSelectedBranchId(branches.length === 1 ? String(branches[0].branchId) : '');
  };
  const openNew = () => handleOpenModal();
  const reload = () => setReloadCount(count => count + 1);
  const setField = (key, value) => setFormData(current => ({ ...current, [key]: value }));
  const setScheduleField = (key, value) => {
    setSaveError('');
    setFormData(current => {
      const next = { ...current, [key]: value };
      return { ...next, endTime: computeEndTimeFromMovie(next.movieId, next.startTime) || current.endTime };
    });
  };
  const visibleShows = showAllDates ? scopedShowtimes : calendarShowtimes;
  const columns = [
    { key: 'movieName', header: 'Phim' },
    { key: 'room', header: 'Phòng chiếu', render: row => <>{row.roomName}<small className="o-subline">{formatScreening(row.screeningFormat, row.roomTechnology)}</small></> },
    { key: 'branchName', header: 'Chi nhánh' },
    { key: 'startTime', header: 'Bắt đầu', render: row => <><ShowTime value={row.startTime} /> <DateLabel value={row.startTime} /></> },
    { key: 'endTime', header: 'Kết thúc', render: row => <><ShowTime value={row.endTime} /> <DateLabel value={row.endTime} /></> },
    { key: 'price', header: 'Giá vé', align: 'end', render: row => <Money value={row.ticketPrice} /> },
    { key: 'status', header: 'Trạng thái', render: row => <StatusBadge kind="showtime" value={row.status} /> },
    ...(canEditShowtime ? [{ key: 'actions', header: 'Thao tác', render: row => <div className="o-actions">
      <OpsButton variant="ghost" icon={<EditIcon size={16} />} aria-label={'Sửa suất ' + row.movieName} onClick={() => handleOpenModal(row)} />
      {isAdmin && <OpsButton variant="ghost-danger" icon={<TrashIcon size={16} />} aria-label={'Xóa suất ' + row.movieName} onClick={() => handleDelete(row.showtimeId)} />}
    </div> }] : []),
  ];
  const deleteTarget = showtimes.find(show => show.showtimeId === deleteTargetId);
  return (
    <OpsPage title="Quản lý suất chiếu" actions={canEditShowtime &&
      <OpsButton variant="primary" icon={<PlusIcon size={16} />} disabled={loading || Boolean(loadError)} onClick={openNew}>Thêm suất chiếu</OpsButton>}>
      <FilterBar search={searchTerm} onSearchChange={setSearchTerm} searchLabel="Tìm phim, phòng hoặc rạp"
        filtered={Boolean(movieFilter || statusFilter !== 'ALL' || selectedDate !== today || showAllDates || (isAdmin && selectedBranchId && branches.length > 1))}
        onReset={resetFilters} resultLabel={loading ? undefined : visibleShows.length + ' suất'}>
        {isAdmin && <Field label="Chi nhánh">
          <Select value={selectedBranchId} onChange={event => setSelectedBranchId(event.target.value)}>
            <option value="">Tất cả chi nhánh</option>
            {branches.map(branch => <option key={branch.branchId} value={branch.branchId}>{branch.name}</option>)}
          </Select>
        </Field>}
        <Field label="Phim">
          <Select value={movieFilter} onChange={event => setMovieFilter(event.target.value)}>
            <option value="">Tất cả phim</option>
            {movies.map(movie => <option key={idOfMovie(movie)} value={idOfMovie(movie)}>{movie.movieName}</option>)}
          </Select>
        </Field>
        <Field label="Trạng thái">
          <Select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
            <option value="ALL">Tất cả</option>
            {showtimeStatuses.map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
          </Select>
        </Field>
      </FilterBar>
      <div className="o-actions">
        <Segmented label="Ngày chiếu" value={showAllDates ? 'all' : selectedDate} onChange={value => {
          setShowAllDates(value === 'all');
          if (value !== 'all') setSelectedDate(value);
        }} options={[{ value: today, label: 'Hôm nay' }, { value: tomorrow, label: 'Ngày mai' }, { value: 'all', label: 'Tất cả ngày' }]} />
        <TextInput type="date" aria-label="Chọn ngày chiếu" value={selectedDate} onChange={event => {
          setSelectedDate(event.target.value || today); setShowAllDates(false);
        }} />
      </div>
      {!showAllDates && <OpsPanel title="Lịch chiếu theo phòng">
        {loading ? <StateBlock state="loading" title="Đang tải lịch chiếu" /> :
          loadError ? <StateBlock state="error" title={loadError} onRetry={reload} /> :
          calendarRooms.length ? <ShowtimeRail date={selectedDate} showtimes={calendarShowtimes} rooms={calendarRooms}
            onSelect={canEditShowtime ? handleOpenModal : undefined}
            onCreate={canEditShowtime ? (room, startTime) => handleOpenModal(null, room, startTime) : undefined} /> :
          <StateBlock title="Không có phòng chiếu phù hợp" action={{ label: 'Xóa bộ lọc', onClick: resetFilters }} />}
      </OpsPanel>}
      <OpsPanel title={showAllDates ? 'Danh sách suất chiếu' : 'Danh sách suất trong ngày'} flush>
        <DataTable caption="Danh sách suất chiếu" columns={columns} rows={visibleShows} rowKey="showtimeId"
          state={loading ? 'loading' : loadError ? 'error' : 'ready'} error={loadError} onRetry={reload} stackOnMobile
          empty={{ title: 'Chưa có suất chiếu phù hợp', action: canEditShowtime
            ? { label: 'Thêm suất chiếu', onClick: openNew } : { label: 'Xóa bộ lọc', onClick: resetFilters } }} />
      </OpsPanel>
      <OpsDialog open={showModal} size="md" title={isEditing ? 'Sửa suất chiếu' : 'Thêm suất chiếu'}
        onClose={() => setShowModal(false)} disabled={saving}
        footer={<><OpsButton disabled={saving} onClick={() => setShowModal(false)}>Quay lại</OpsButton>
          <OpsButton type="submit" form="o-showtime-form" variant="primary" loading={saving}>
            {isEditing ? 'Lưu thay đổi' : 'Thêm suất chiếu'}
          </OpsButton></>}>
        <form id="o-showtime-form" className="o-form-grid" onSubmit={handleSave}>
          <Field className="o-form-grid__wide" label="Phim" required>
            <Select value={formData.movieId} onChange={event => setScheduleField('movieId', event.target.value)}>
              <option value="">Chọn phim</option>
              {movies.map(movie => <option key={idOfMovie(movie)} value={idOfMovie(movie)}>{movie.movieName}</option>)}
            </Select>
          </Field>
          <Field label="Chi nhánh" required>
            <Select value={formData.branchId} onChange={event => setFormData(current => ({ ...current, branchId: event.target.value, roomId: '' }))}>
              <option value="">Chọn rạp</option>
              {branches.map(branch => <option key={branch.branchId} value={branch.branchId}>{branch.name}</option>)}
            </Select>
          </Field>
          <Field label="Phòng chiếu" required>
            <Select value={formData.roomId} disabled={!formData.branchId} onChange={event => setField('roomId', event.target.value)}>
              <option value="">Chọn phòng</option>
              {filteredRooms.map(room => <option key={room.id} value={room.id}>{room.name} ({ROOM_TECHNOLOGY_LABELS[room.roomTechnology] || room.roomTechnology})</option>)}
            </Select>
          </Field>
          <Field label="Bắt đầu" required error={saveError}>
            <TextInput type="datetime-local" value={formData.startTime} onChange={event => setScheduleField('startTime', event.target.value)} />
          </Field>
          <Field label="Kết thúc" required hint="Gợi ý theo thời lượng phim. Có thể chỉnh giờ nếu cần.">
            <TextInput type="datetime-local" value={formData.endTime} onChange={event => setField('endTime', event.target.value)} />
          </Field>
          <Field label="Giá vé (đ/vé)" required hint="Chỉ đổi giá khi chưa có ghế đang giữ hoặc vé đã bán.">
            <TextInput type="number" min={1} max={999999999999} step={1} value={formData.ticketPrice} onChange={event => setField('ticketPrice', event.target.value)} />
          </Field>
          <Field label="Định dạng chiếu" required>
            <Select value={formData.screeningFormat} onChange={event => setField('screeningFormat', event.target.value)}>
              <option value="TWO_D">2D</option><option value="THREE_D">3D</option>
            </Select>
          </Field>
          <Field label="Trạng thái">
            <Select value={formData.status} onChange={event => setField('status', event.target.value)}>
              {showtimeStatuses.map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
            </Select>
          </Field>
        </form>
      </OpsDialog>
      <OpsConfirm open={Boolean(deleteTargetId)} title="Xóa suất chiếu"
        message={deleteTarget && <>Xóa suất <strong>{deleteTarget.movieName}</strong> lúc <ShowTime value={deleteTarget.startTime} />? Thao tác này không thể hoàn tác.</>}
        confirmLabel="Xóa suất chiếu" loading={deleting} onConfirm={confirmDelete} onClose={() => setDeleteTargetId(null)} />
    </OpsPage>
  );
};

export default ShowtimeManagement;
