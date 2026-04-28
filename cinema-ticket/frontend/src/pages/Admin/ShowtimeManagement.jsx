import { useState, useEffect } from 'react';
import { showtimeApi, movieApi, branchApi, roomApi } from '../../api';
import { toast } from 'react-toastify';

const EditIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const ROOM_TYPE_LABELS = {
  TWO_D: '2D', THREE_D: '3D', IMAX: 'IMAX', FOUR_DX: '4DX',
};

const STATUS_MAP = {
  OPEN:      { label: 'Đang mở',  className: 'status--active' },
  CLOSED:    { label: 'Đã đóng', className: 'status--inactive' },
  CANCELLED: { label: 'Đã hủy',  className: 'status--inactive' },
};

const ShowtimeManagement = () => {
  const [showtimes, setShowtimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
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
    status: 'OPEN'
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [stRes, movieRes, branchRes, roomRes] = await Promise.all([
        showtimeApi.getAll(),
        movieApi.getAll(),
        branchApi.getAll(),
        roomApi.getAll()
      ]);
      setShowtimes(stRes.data.result || []);
      setMovies(movieRes.data.result || []);
      setBranches(branchRes.data.result || []);
      setRooms(roomRes.data.result || []);
    } catch (err) {
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
      // Dùng so sánh lỏng hoặc ép kiểu sang String để tránh lỗi type mismatch (String vs Number)
      // Và kiểm tra cả camelCase/snake_case cho chắc chắn
      setFilteredRooms(rooms.filter(r => 
        String(r.branchId || r.branch_id) === String(formData.branchId)
      ));
    } else {
      setFilteredRooms([]);
    }
  }, [formData.branchId, rooms]);

  const handleOpenModal = (st = null) => {
    if (st) {
      setIsEditing(true);
      setFormData({
        showtimeId: st.showtimeId,
        movieId: st.movieId,
        branchId: st.branchId || '', // Đã được bổ sung vào ShowtimeResponse
        roomId: st.roomId,
        startTime: st.startTime ? new Date(st.startTime).toISOString().slice(0, 16) : '',
        endTime: st.endTime ? new Date(st.endTime).toISOString().slice(0, 16) : '',
        status: st.status || 'OPEN'
      });
    } else {
      setIsEditing(false);
      setFormData({
        showtimeId: null,
        movieId: '',
        branchId: '',
        roomId: '',
        startTime: '',
        endTime: '',
        status: 'OPEN'
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
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

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa suất chiếu này?')) return;
    try {
      await showtimeApi.delete(id);
      toast.success('Xóa thành công!');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Xóa thất bại');
    }
  };

  const filtered = showtimes.filter(st =>
    [st.movieName, st.roomName, st.branchName].some(f =>
      f?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const formatDT = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    return (
      <div>
        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{time}</div>
        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{date}</div>
      </div>
    );
  };

  if (loading && showtimes.length === 0) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Quản lý Suất chiếu</h1>
          <p className="page-subtitle">Tổng cộng <strong>{showtimes.length}</strong> suất chiếu.</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Thêm suất chiếu
        </button>
      </div>

      <div className="admin-table-card">
        <div className="table-header">
          <div style={{ position: 'relative', maxWidth: '320px', flex: 1 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"
              style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="input"
              placeholder="Tìm phim, phòng, chi nhánh..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '40px', background: 'var(--bg-input)' }}
            />
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{filtered.length} kết quả</span>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>#</th>
              <th>Phim</th>
              <th>Phòng chiếu</th>
              <th>Chi nhánh</th>
              <th>Bắt đầu</th>
              <th>Kết thúc</th>
              <th>Trạng thái</th>
              <th style={{ width: '100px' }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  {searchTerm ? 'Không tìm thấy suất chiếu nào' : 'Chưa có suất chiếu nào'}
                </td>
              </tr>
            ) : (
              filtered.map((st, idx) => {
                const statusInfo = STATUS_MAP[st.status] || { label: st.status || '—', className: '' };
                return (
                  <tr key={st.showtimeId || idx}>
                    <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{st.movieName || '—'}</td>
                    <td>
                      <div>
                        <div style={{ color: 'var(--text-primary)' }}>{st.roomName || '—'}</div>
                        {st.roomType && (
                          <span className="movie-badge" style={{ marginTop: '3px', display: 'inline-block' }}>
                            {ROOM_TYPE_LABELS[st.roomType] || st.roomType}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>{st.branchName || '—'}</td>
                    <td>{formatDT(st.startTime)}</td>
                    <td>{formatDT(st.endTime)}</td>
                    <td>
                      <span className={`status-badge ${statusInfo.className}`}>{statusInfo.label}</span>
                    </td>
                    <td>
                      <div className="action-btns">
                        <button className="btn btn-ghost btn-sm" title="Sửa" onClick={() => handleOpenModal(st)}><EditIcon /></button>
                        <button className="btn btn-ghost btn-sm" title="Xóa" style={{ color: '#ef4444' }} onClick={() => handleDelete(st.showtimeId)}><TrashIcon /></button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ 
            maxWidth: '650px', 
            height: 'auto', 
            aspectRatio: 'unset', 
            overflowY: 'auto', 
            maxHeight: '90vh',
            background: 'var(--bg-card)', 
            padding: '28px 32px', 
            borderRadius: 'var(--radius-lg)' 
          }}>
            <h2 style={{ marginBottom: '20px', fontSize: '1.4rem', fontWeight: 700 }}>{isEditing ? 'Chỉnh sửa suất chiếu' : 'Thêm suất chiếu mới'}</h2>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="form-group">
                <label className="form-label">Chọn phim</label>
                <select 
                  className="input" 
                  value={formData.movieId} 
                  onChange={e => setFormData({...formData, movieId: e.target.value})}
                  required
                >
                  <option value="">-- Chọn phim --</option>
                  {movies.map(f => <option key={f.movieId} value={f.movieId}>{f.movieName}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Chi nhánh</label>
                  <select 
                    className="input" 
                    value={formData.branchId} 
                    onChange={e => setFormData({...formData, branchId: e.target.value, roomId: ''})}
                    required
                  >
                    <option value="">-- Chọn rạp --</option>
                    {branches.map(b => <option key={b.branchId} value={b.branchId}>{b.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Phòng chiếu</label>
                  <select 
                    className="input" 
                    value={formData.roomId} 
                    onChange={e => setFormData({...formData, roomId: e.target.value})}
                    required
                    disabled={!formData.branchId}
                  >
                    <option value="">-- Chọn phòng --</option>
                    {filteredRooms.map(r => <option key={r.id} value={r.id}>{r.name} ({ROOM_TYPE_LABELS[r.roomType] || r.roomType})</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Bắt đầu</label>
                  <input 
                    type="datetime-local" 
                    className="input" 
                    value={formData.startTime}
                    onChange={e => setFormData({...formData, startTime: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Kết thúc</label>
                  <input 
                    type="datetime-local" 
                    className="input" 
                    value={formData.endTime}
                    onChange={e => setFormData({...formData, endTime: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Trạng thái</label>
                <select 
                  className="input" 
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value})}
                >
                  <option value="OPEN">Mở bán</option>
                  <option value="CLOSED">Đóng</option>
                  <option value="CANCELLED">Đã hủy</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Lưu lại</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShowtimeManagement;
