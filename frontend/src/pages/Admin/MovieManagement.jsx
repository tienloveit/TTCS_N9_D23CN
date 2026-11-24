import { DataTable, FilterBar, OpsButton, OpsConfirm, OpsPage, OpsPanel, Segmented, StatusBadge } from '../../components/Ops';
import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { movieApi, genreApi, directorApi } from '../../api';
import MovieForm from './MovieForm';
import SafeImage from '../../components/Common/SafeImage';
import { useAuth } from '../../context/useAuth';
import { EditIcon, PlusIcon, SearchIcon, TrashIcon } from '../../components/Common/CinemaIcons';
import { formatDate as formatCinemaDate } from '../../utils/cinemaTime';

const MOVIE_STATUS_TABS = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'NOW_SHOWING', label: 'Đang chiếu' },
  { key: 'UPCOMING', label: 'Sắp chiếu' },
  { key: 'ENDED', label: 'Đã kết thúc' },
  { key: 'DRAFT', label: 'Bản nháp' },
];

const MovieManagement = () => {
  const { isAdmin } = useAuth();
  const [movies, setMovies] = useState([]);
  const [genres, setGenres] = useState([]);
  const [directors, setDirectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deleteTarget, setDeleteTarget] = useState(null); // { movieId, movieName }
  const [deleting, setDeleting] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState(null);
  const fetchMovies = async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const res = await movieApi.getAll();
      setMovies(res.data.result || []);
    } catch (err) {
      setLoadError(true);
      console.error('Lỗi khi tải danh sách phim:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGenres = async () => {
    try {
      const res = await genreApi.getAll();
      setGenres(res.data.result || []);
    } catch (err) {
      console.error('Lỗi khi tải thể loại:', err);
    }
  };

  const fetchDirectors = async () => {
    try {
      const res = await directorApi.getAll();
      setDirectors(res.data.result || []);
    } catch (err) {
      console.error('Lỗi khi tải đạo diễn:', err);
    }
  };

  useEffect(() => {
    fetchMovies();
    fetchGenres();
    fetchDirectors();
  }, []);

  const handleOpenModal = (movie = null) => {
    if (!isAdmin) return;
    setEditingMovie(movie);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingMovie(null);
  };

  const handleSubmit = async (payload) => {
    if (!isAdmin) return;
    if (editingMovie) {
      await movieApi.update(editingMovie.movieId, payload);
    } else {
      await movieApi.create(payload);
    }
    toast.success(editingMovie ? 'Cập nhật phim thành công!' : 'Thêm phim thành công!');
    handleCloseModal();
    fetchMovies();
  };

  const handleDelete = (movieId, movieName) => {
    if (!isAdmin) return;
    setDeleteTarget({ movieId, movieName });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await movieApi.delete(deleteTarget.movieId);
      toast.success(`Đã xoá phim "${deleteTarget.movieName}"`);
      setDeleteTarget(null);
      fetchMovies();
    } catch (err) {
      toast.error('Lỗi khi xoá: ' + (err.response?.data?.message || err.message));
    } finally {
      setDeleting(false);
    }
  };

  const filteredMovies = useMemo(() => {
    return movies.filter((movie) => {
      if (statusFilter === 'DRAFT' ? movie.isPublic !== false : statusFilter !== 'ALL' && (movie.status !== statusFilter || movie.isPublic === false)) return false;
      const q = searchTerm.toLowerCase().trim();
      if (!q) return true;
      return (
        movie.movieName?.toLowerCase().includes(q) ||
        movie.directorName?.toLowerCase().includes(q)
      );
    });
  }, [movies, statusFilter, searchTerm]);

  const getStatusInfo = (status) => {
    const map = {
      NOW_SHOWING: { label: 'Đang chiếu', tone: 'success' },
      UPCOMING: { label: 'Sắp chiếu', tone: 'warning' },
      ENDED: { label: 'Đã kết thúc', tone: 'neutral' },
    };
    return map[status] || { label: status, tone: 'neutral' };
  };



  return (
    <OpsPage title="Quản lý phim" description={<>Tổng cộng <strong>{movies.length}</strong> phim trong hệ thống.</>} actions={isAdmin && <OpsButton variant="primary" icon={<PlusIcon size={18} />}
      onClick={() => handleOpenModal()}>Thêm phim</OpsButton>}>


      <FilterBar search={searchTerm} onSearchChange={setSearchTerm} searchLabel="Tìm phim" searchPlaceholder="Tìm tên phim, đạo diễn..."
        filtered={Boolean(searchTerm || statusFilter !== 'ALL')} onReset={() => { setSearchTerm(''); setStatusFilter('ALL'); }} resultLabel={`${filteredMovies.length} phim`}>
        <Segmented label="Trạng thái" value={statusFilter} onChange={setStatusFilter} options={(MOVIE_STATUS_TABS).map(tab => {
                const count =
                tab.key === 'ALL'
                  ? movies.length
                  : movies.filter((m) => tab.key === 'DRAFT' ? m.isPublic === false : m.status === tab.key && m.isPublic !== false).length;
                return { value: tab.key, label: tab.label, count };
              })} />

      </FilterBar>
      <OpsPanel flush title="Phim">

        <DataTable caption="Phim" rows={filteredMovies} rowKey={movie => movie.movieId}
          state={loading ? 'loading' : loadError ? 'error' : 'ready'} onRetry={fetchMovies}
          empty={{ title: 'Không có phim phù hợp', action: { label: 'Làm mới', onClick: fetchMovies } }}
          columns={[
            { key: 'index', header: "#", render: (movie, idx) => idx + 1 },
            { key: 'ten_phim', header: "Tên phim", render: movie => <> <div className="o-media">
                        <SafeImage
                          src={movie.thumbnailUrl}
                          alt={movie.movieName}
                          className="o-poster"
                        />
                        <div>
                          <div className="o-table-value">{movie.movieName}</div>
                          <div className="o-subline">
                            {movie.ageRating && <span>{movie.ageRating}</span>}
                            {movie.language && <span> {movie.language}</span>}
                          </div>
                        </div>
                      </div> </> },
            { key: 'dao_dien', header: "Đạo diễn", render: movie => movie.directorName || '—' },
            { key: 'the_loai', header: "Thể loại", render: movie => <> <div className="o-actions">
                        {movie.genres?.map((g, i) => (
                          <StatusBadge key={g.id ?? i}>{g.name}</StatusBadge>
                        )) || '—'}
                      </div> </> },
            { key: 'thoi_luong', header: "Thời lượng", render: movie => movie.durationMinutes ? `${movie.durationMinutes} phút` : '—' },
            { key: 'ngay_chieu', header: "Ngày chiếu", render: movie => movie.releaseDate
                        ? formatCinemaDate(movie.releaseDate)
                        : '—' },
            { key: 'trang_thai', header: "Trạng thái", render: movie => {
              const statusInfo = movie.isPublic === false ? { label: 'Bản nháp', tone: 'neutral' } : getStatusInfo(movie.status);
              return (<> <StatusBadge tone={statusInfo.tone}>
                        {statusInfo.label}
                      </StatusBadge> </>);
            } },
            ...(isAdmin ? [{ key: 'hanh_dong', header: "Hành động", render: movie => <> <div className="o-actions">
                        <OpsButton variant="ghost" icon={<EditIcon size={16} />} aria-label={'Sửa phim ' + movie.movieName}
                          onClick={() => handleOpenModal(movie)} />
                        <OpsButton variant="ghost-danger" icon={<TrashIcon size={16} />} aria-label={'Xóa phim ' + movie.movieName}
                          onClick={() => handleDelete(movie.movieId, movie.movieName)} />
                      </div> </> }] : [])
          ]} />
      </OpsPanel>

      {isModalOpen && (
        <MovieForm movie={editingMovie} genres={genres} directors={directors} onSave={handleSubmit} onClose={handleCloseModal} />
      )}

      <OpsConfirm
        open={Boolean(deleteTarget)}
        title="Xoá phim"
        message={`Bạn có chắc chắn muốn xoá phim "${deleteTarget?.movieName}" khỏi hệ thống?`}
        confirmText="Xoá phim"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </OpsPage>
  );
};

export default MovieManagement;
