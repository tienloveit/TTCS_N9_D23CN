import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { movieApi, genreApi, directorApi } from '../../api';
import SafeImage from '../../components/Common/SafeImage';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import { useAuth } from '../../context/useAuth';
import { EditIcon, PlusIcon, SearchIcon, TrashIcon, XIcon } from '../../components/Common/CinemaIcons';

const MOVIE_STATUS_TABS = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'NOW_SHOWING', label: 'Đang chiếu' },
  { key: 'UPCOMING', label: 'Sắp chiếu' },
  { key: 'ENDED', label: 'Đã kết thúc' },
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
  const [newDirectorName, setNewDirectorName] = useState('');
  const [formData, setFormData] = useState({
    movieName: '',
    description: '',
    durationMinutes: '',
    ageRating: 'P',
    language: 'Việt Nam',
    subtitle: 'Tiếng Việt',
    thumbnailUrl: '',
    trailerUrl: '',
    releaseDate: '',
    endDate: '',
    status: 'UPCOMING',
    directorId: '',
    genreIds: []
  });

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
    setNewDirectorName('');
    if (movie) {
      setEditingMovie(movie);
      setFormData({
        movieName: movie.movieName || '',
        description: movie.description || '',
        durationMinutes: movie.durationMinutes || '',
        ageRating: movie.ageRating || 'P',
        language: movie.language || 'Việt Nam',
        subtitle: movie.subtitle || 'Tiếng Việt',
        thumbnailUrl: movie.thumbnailUrl || '',
        trailerUrl: movie.trailerUrl || '',
        releaseDate: movie.releaseDate ? movie.releaseDate.split('T')[0] : '',
        endDate: movie.endDate ? movie.endDate.split('T')[0] : '',
        status: movie.status || 'UPCOMING',
        directorId: movie.directorId ? String(movie.directorId) : '',
        genreIds: movie.genres?.map(g => g.id) || []
      });
    } else {
      setEditingMovie(null);
      setFormData({
        movieName: '',
        description: '',
        durationMinutes: '',
        ageRating: 'P',
        language: 'Việt Nam',
        subtitle: 'Tiếng Việt',
        thumbnailUrl: '',
        trailerUrl: '',
        releaseDate: '',
        endDate: '',
        status: 'UPCOMING',
        directorId: '',
        genreIds: []
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingMovie(null);
    setNewDirectorName('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGenreToggle = (genreId) => {
    setFormData(prev => {
      const exists = prev.genreIds.includes(genreId);
      if (exists) {
        return { ...prev, genreIds: prev.genreIds.filter(id => id !== genreId) };
      } else {
        return { ...prev, genreIds: [...prev.genreIds, genreId] };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    try {
      const payload = {
        ...formData,
        durationMinutes: formData.durationMinutes ? Number(formData.durationMinutes) : null,
        directorId: formData.directorId ? Number(formData.directorId) : null,
      };

      if (editingMovie) {
        await movieApi.update(editingMovie.movieId, payload);
        toast.success(`Cập nhật phim "${formData.movieName}" thành công!`);
      } else {
        await movieApi.create(payload);
        toast.success(`Thêm phim "${formData.movieName}" thành công!`);
      }
      handleCloseModal();
      fetchMovies();
    } catch (err) {
      toast.error('Đã có lỗi xảy ra: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleCreateDirector = async () => {
    if (!isAdmin) return;
    const name = newDirectorName.trim();
    if (!name) {
      toast.warn('Vui lòng nhập tên đạo diễn.');
      return;
    }

    try {
      const res = await directorApi.create({ name });
      const director = res.data.result;
      setDirectors(prev => [...prev.filter(item => item.id !== director.id), director]);
      setFormData(prev => ({ ...prev, directorId: director.id ? String(director.id) : '' }));
      setNewDirectorName('');
      toast.success(`Đã thêm đạo diễn "${director.name}".`);
    } catch (err) {
      toast.error('Lỗi khi thêm đạo diễn: ' + (err.response?.data?.message || err.message));
    }
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
      if (statusFilter !== 'ALL' && movie.status !== statusFilter) return false;
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
      INACTIVE: { label: 'Ngừng hoạt động', className: 'status--inactive' },
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
                  : movies.filter((m) => m.status === tab.key).length;
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
                const statusInfo = getStatusInfo(movie.status);
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

      {/* Movie Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content admin-modal" onClick={e => e.stopPropagation()} style={{
            maxWidth: '800px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '32px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{editingMovie ? 'Chỉnh sửa phim' : 'Thêm phim mới'}</h2>
              <button type="button" onClick={handleCloseModal} className="modal-close" style={{ position: 'static', width: 34, height: 34 }} aria-label="Đóng">
                <XIcon size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="auth-form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Tên phim</label>
                <input
                  type="text"
                  name="movieName"
                  className="input"
                  value={formData.movieName}
                  onChange={handleInputChange}
                  required
                  placeholder="Nhập tên phim..."
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Mô tả</label>
                <textarea
                  name="description"
                  className="input"
                  value={formData.description}
                  onChange={handleInputChange}
                  style={{ minHeight: '100px', resize: 'vertical' }}
                  placeholder="Nhập mô tả phim..."
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Đạo diễn</label>
                <select
                  name="directorId"
                  className="input"
                  value={formData.directorId}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Chọn đạo diễn</option>
                  {directors.map(director => (
                    <option key={director.id} value={director.id}>
                      {director.name}
                    </option>
                  ))}
                </select>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <input
                    type="text"
                    className="input"
                    value={newDirectorName}
                    onChange={(event) => setNewDirectorName(event.target.value)}
                    placeholder="Thêm đạo diễn mới..."
                  />
                  <button type="button" className="btn btn-secondary" onClick={handleCreateDirector}>
                    Thêm
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Thời lượng (phút)</label>
                <input
                  type="number"
                  name="durationMinutes"
                  className="input"
                  value={formData.durationMinutes}
                  onChange={handleInputChange}
                  placeholder="Ví dụ: 120"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Độ tuổi (Rating)</label>
                <select name="ageRating" className="input" value={formData.ageRating} onChange={handleInputChange}>
                  <option value="P">P - Mọi độ tuổi</option>
                  <option value="K">K - Dưới 13 tuối (với người giám hộ)</option>
                  <option value="T13">T13 - Từ 13 tuổi</option>
                  <option value="T16">T16 - Từ 16 tuổi</option>
                  <option value="T18">T18 - Từ 18 tuổi</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Ngôn ngữ</label>
                <input type="text" name="language" className="input" value={formData.language} onChange={handleInputChange} />
              </div>

              <div className="form-group">
                <label className="form-label">Phụ đề</label>
                <input type="text" name="subtitle" className="input" value={formData.subtitle} onChange={handleInputChange} />
              </div>

              <div className="form-group">
                <label className="form-label">Ngày khởi chiếu</label>
                <input type="date" name="releaseDate" className="input" value={formData.releaseDate} onChange={handleInputChange} />
              </div>

              <div className="form-group">
                <label className="form-label">Ngày kết thúc (dự kiến)</label>
                <input type="date" name="endDate" className="input" value={formData.endDate} onChange={handleInputChange} />
              </div>

              <div className="form-group">
                <label className="form-label">Trạng thái</label>
                <select name="status" className="input" value={formData.status} onChange={handleInputChange}>
                  <option value="UPCOMING">Sắp chiếu</option>
                  <option value="NOW_SHOWING">Đang chiếu</option>
                  <option value="ENDED">Đã kết thúc</option>
                  <option value="INACTIVE">Ngừng hoạt động</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Poster URL</label>
                <input type="text" name="thumbnailUrl" className="input" value={formData.thumbnailUrl} onChange={handleInputChange} placeholder="https://..." />
                {formData.thumbnailUrl && (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <SafeImage
                      src={formData.thumbnailUrl}
                      alt="Poster preview"
                      style={{ width: 52, height: 74, borderRadius: 6, objectFit: 'cover', border: '1px solid var(--border)' }}
                    />
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Xem trước Poster</span>
                  </div>
                )}
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Trailer URL (Youtube Embed)</label>
                <input type="text" name="trailerUrl" className="input" value={formData.trailerUrl} onChange={handleInputChange} placeholder="https://youtube.com/embed/..." />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Thể loại</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  {genres.map(genre => (
                    <label key={genre.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input
                        type="checkbox"
                        checked={formData.genreIds.includes(genre.id)}
                        onChange={() => handleGenreToggle(genre.id)}
                        style={{ cursor: 'pointer' }}
                      />
                      {genre.name}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  {editingMovie ? 'Lưu thay đổi' : 'Thêm phim'}
                </button>
                <button type="button" onClick={handleCloseModal} className="btn btn-secondary" style={{ flex: 1 }}>
                  Huỷ bỏ
                </button>
              </div>
            </form>
          </div>
        </div>
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
