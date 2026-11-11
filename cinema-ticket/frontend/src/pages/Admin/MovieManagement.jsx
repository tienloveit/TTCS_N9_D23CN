import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { movieApi, genreApi, directorApi } from '../../api';
import MovieForm from './MovieForm';
import SafeImage from '../../components/Common/SafeImage';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import { useAuth } from '../../context/useAuth';
import { EditIcon, PlusIcon, SearchIcon, TrashIcon } from '../../components/Common/CinemaIcons';

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
      const res = await movieApi.getAll();
      setMovies(res.data.result || []);
    } catch (err) {
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
      toast.success(`Xoá phim "${deleteTarget.movieName}" thành công!`);
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
      NOW_SHOWING: { label: 'Đang chiếu', className: 'status--active' },
      UPCOMING: { label: 'Sắp chiếu', className: 'status--pending' },
      ENDED: { label: 'Đã kết thúc', className: 'status--inactive' },
    };
    return map[status] || { label: status, className: '' };
  };

  if (loading && !isModalOpen) {
    return <div className="loading"><div className="spinner" /></div>;
  }

  return (
    <div className="admin-movies">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Quản lý Phim</h1>
          <p className="page-subtitle">
            Tổng cộng <strong>{movies.length}</strong> phim trong hệ thống.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()} disabled={!isAdmin} style={!isAdmin ? { display: 'none' } : undefined}>
          <PlusIcon size={18} />
          Thêm phim mới
        </button>
      </div>

      <div className="admin-table-card">
        <div className="console-toolbar">
          <div className="console-status-tabs">
            {MOVIE_STATUS_TABS.map((tab) => {
              const count =
                tab.key === 'ALL'
                  ? movies.length
                  : movies.filter((m) => tab.key === 'DRAFT' ? m.isPublic === false : m.status === tab.key && m.isPublic !== false).length;
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

          <div style={{ position: 'relative', maxWidth: '320px', flex: '0 1 320px' }}>
            <SearchIcon
              size={16}
              style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}
            />
            <input
              type="text"
              className="input"
              placeholder="Tìm tên phim, đạo diễn..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '40px', height: 38, background: 'var(--bg-input)' }}
            />
          </div>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>#</th>
              <th>Tên phim</th>
              <th>Đạo diễn</th>
              <th>Thể loại</th>
              <th>Thời lượng</th>
              <th>Ngày chiếu</th>
              <th>Trạng thái</th>
              {isAdmin && <th style={{ width: '120px' }}>Hành động</th>}
            </tr>
          </thead>
          <tbody>
            {filteredMovies.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  {searchTerm ? 'Không tìm thấy phim nào' : 'Chưa có phim nào trong hệ thống'}
                </td>
              </tr>
            ) : (
              filteredMovies.map((movie, idx) => {
                const statusInfo = movie.isPublic === false ? { label: 'Bản nháp', className: 'status--inactive' } : getStatusInfo(movie.status);
                return (
                  <tr key={movie.movieId || idx}>
                    <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <SafeImage
                          src={movie.thumbnailUrl}
                          alt={movie.movieName}
                          style={{
                            width: '40px', height: '56px', borderRadius: '6px',
                            objectFit: 'cover', background: 'var(--bg-secondary)',
                          }}
                          fallback="https://via.placeholder.com/40x56?text=No+Img"
                        />
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{movie.movieName}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {movie.ageRating && <span>{movie.ageRating}</span>}
                            {movie.language && <span> · {movie.language}</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{movie.directorName || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {movie.genres?.map((g, i) => (
                          <span key={i} className="movie-badge">{g.name}</span>
                        )) || '—'}
                      </div>
                    </td>
                    <td>{movie.durationMinutes ? `${movie.durationMinutes} phút` : '—'}</td>
                    <td>
                      {movie.releaseDate
                        ? new Date(movie.releaseDate).toLocaleDateString('vi-VN')
                        : '—'}
                    </td>
                    <td>
                      <span className={`status-badge ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    {isAdmin && <td>
                      <div className="action-btns">
                        <button className="btn btn-ghost btn-sm" title="Sửa" onClick={() => handleOpenModal(movie)} disabled={!isAdmin} style={!isAdmin ? { display: 'none' } : undefined}>
                          <EditIcon size={15} />
                        </button>
                        <button className="btn btn-ghost btn-sm" title="Xóa" style={isAdmin ? { color: '#ef4444' } : { display: 'none' }} onClick={() => handleDelete(movie.movieId, movie.movieName)} disabled={!isAdmin}>
                          <TrashIcon size={15} />
                        </button>
                      </div>
                    </td>}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <MovieForm movie={editingMovie} genres={genres} directors={directors} onSave={handleSubmit} onClose={handleCloseModal} />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Xoá phim"
        message={`Bạn có chắc chắn muốn xoá phim "${deleteTarget?.movieName}" khỏi hệ thống?`}
        confirmText="Xoá phim"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default MovieManagement;
