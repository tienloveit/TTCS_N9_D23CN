import { useState, useEffect } from 'react';
import { branchApi, roomApi } from '../../api';
import { toast } from 'react-toastify';

const BranchManagement = () => {
  const [branches, setBranches] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [branchModal, setBranchModal] = useState(false);
  const [roomModal, setRoomModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [editingRoom, setEditingRoom] = useState(null);

  const [branchForm, setBranchForm] = useState({
    branchCode: '',
    name: '',
    city: '',
    address: '',
    phone: '',
    status: 'ACTIVE'
  });

  const [roomForm, setRoomForm] = useState({
    code: '',
    name: '',
    roomType: 'TWO_D',
    seatCapacity: 100,
    branchId: '',
    status: 'ACTIVE'
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [branchRes, roomRes] = await Promise.allSettled([
        branchApi.getAll(),
        roomApi.getAll(),
      ]);
      setBranches(branchRes.status === 'fulfilled' ? branchRes.value.data.result : []);
      setRooms(roomRes.status === 'fulfilled' ? roomRes.value.data.result : []);
    } catch (err) {
      toast.error('Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openBranchModal = (branch = null) => {
    if (branch) {
      setEditingBranch(branch);
      setBranchForm({ ...branch });
    } else {
      setEditingBranch(null);
      setBranchForm({ branchCode: '', name: '', city: '', address: '', phone: '', status: 'ACTIVE' });
    }
    setBranchModal(true);
  };

  const openRoomModal = (room = null) => {
    if (room) {
      setEditingRoom(room);
      setRoomForm({ ...room });
    } else {
      setEditingRoom(null);
      setRoomForm({ code: '', name: '', roomType: 'TWO_D', seatCapacity: 100, branchId: '', status: 'ACTIVE' });
    }
    setRoomModal(true);
  };

  const handleBranchSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingBranch) {
        await branchApi.update(editingBranch.branchId, branchForm);
        toast.success('Cập nhật chi nhánh thành công!');
      } else {
        await branchApi.create(branchForm);
        toast.success('Thêm chi nhánh thành công!');
      }
      setBranchModal(false);
      fetchData();
    } catch (err) {
      toast.error('Thực hiện thất bại');
    }
  };

  const handleRoomSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingRoom) {
        await roomApi.update(editingRoom.id, roomForm);
        toast.success('Cập nhật phòng thành công!');
      } else {
        await roomApi.create(roomForm);
        toast.success('Thêm phòng thành công! Sơ đồ ghế đã được tự động khởi tạo.');
      }
      setRoomModal(false);
      fetchData();
    } catch (err) {
      toast.error('Thực hiện thất bại');
    }
  };

  const handleDeleteBranch = async (id) => {
    if (!window.confirm('Xóa chi nhánh này sẽ ảnh hưởng đến các phòng thuộc rạp. Tiếp tục?')) return;
    try {
      await branchApi.delete(id);
      toast.success('Xóa thành công');
      fetchData();
    } catch (err) {
      toast.error('Xóa thất bại');
    }
  };

  const handleDeleteRoom = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa phòng này?')) return;
    try {
      await roomApi.delete(id);
      toast.success('Xóa thành công');
      fetchData();
    } catch (err) {
      toast.error('Xóa thất bại');
    }
  };

  const getRoomCount = (branchId) =>
    rooms.filter(r => r.branchId === branchId).length;

  if (loading && branches.length === 0) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Quản lý Rạp &amp; Phòng</h1>
          <p className="page-subtitle">
            <strong>{branches.length}</strong> chi nhánh · <strong>{rooms.length}</strong> phòng chiếu
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={() => openRoomModal()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Thêm phòng
          </button>
          <button className="btn btn-primary" onClick={() => openBranchModal()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Thêm chi nhánh
          </button>
        </div>
      </div>

      {/* Branches */}
      <div className="admin-table-card" style={{ marginBottom: '28px' }}>
        <div className="table-header">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Chi nhánh</h3>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Mã chi nhánh</th>
              <th>Tên chi nhánh</th>
              <th>Thành phố</th>
              <th>Địa chỉ</th>
              <th>SĐT</th>
              <th>Số phòng</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {branches.length === 0 ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Chưa có chi nhánh</td></tr>
            ) : (
              branches.map((b, idx) => (
                <tr key={b.branchId || idx}>
                  <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                  <td><span className="movie-badge">{b.branchCode}</span></td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{b.name}</td>
                  <td>{b.city || '—'}</td>
                  <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.address || '—'}</td>
                  <td>{b.phone || '—'}</td>
                  <td style={{ fontWeight: 600 }}>{getRoomCount(b.branchId)}</td>
                  <td>
                    <div className="action-btns">
                      <button className="btn btn-ghost btn-sm" title="Sửa" onClick={() => openBranchModal(b)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      </button>
                      <button className="btn btn-ghost btn-sm" title="Xóa" style={{ color: '#ef4444' }} onClick={() => handleDeleteBranch(b.branchId)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Rooms */}
      <div className="admin-table-card">
        <div className="table-header">
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Phòng chiếu</h3>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Mã phòng</th>
              <th>Tên phòng</th>
              <th>Loại phòng</th>
              <th>Sức chứa</th>
              <th>Chi nhánh</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {rooms.length === 0 ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Chưa có phòng chiếu</td></tr>
            ) : (
              rooms.map((r, idx) => {
                const branch = branches.find(b => b.branchId === r.branchId);
                const roomTypeMap = {
                  TWO_D: '2D', THREE_D: '3D', IMAX: 'IMAX', FOUR_DX: '4DX',
                };
                return (
                  <tr key={r.id || idx}>
                    <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td><span className="movie-badge">{r.code}</span></td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.name}</td>
                    <td>
                      <span className="status-badge status--active" style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--blue)' }}>
                        {roomTypeMap[r.roomType] || r.roomType}
                      </span>
                    </td>
                    <td>{r.seatCapacity || '—'}</td>
                    <td>{branch?.name || '—'}</td>
                    <td>
                      <span className={`status-badge ${r.status === 'ACTIVE' ? 'status--active' : 'status--inactive'}`}>
                        {r.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm đóng'}
                      </span>
                    </td>
                    <td>
                      <div className="action-btns">
                        <button className="btn btn-ghost btn-sm" title="Sửa" onClick={() => openRoomModal(r)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                        </button>
                        <button className="btn btn-ghost btn-sm" title="Xóa" style={{ color: '#ef4444' }} onClick={() => handleDeleteRoom(r.id)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* BRANCH MODAL */}
      {branchModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px', height: 'auto', aspectRatio: 'unset', overflow: 'visible', background: 'var(--bg-card)', padding: '32px', borderRadius: 'var(--radius-lg)' }}>
            <h2 style={{ marginBottom: '24px' }}>{editingBranch ? 'Sửa chi nhánh' : 'Thêm chi nhánh mới'}</h2>
            <form onSubmit={handleBranchSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Mã chi nhánh</label>
                <input className="input" value={branchForm.branchCode} onChange={e => setBranchForm({...branchForm, branchCode: e.target.value})} placeholder="VD: MPT-HANOI" required />
              </div>
              <div className="form-group">
                <label className="form-label">Tên rạp</label>
                <input className="input" value={branchForm.name} onChange={e => setBranchForm({...branchForm, name: e.target.value})} placeholder="VD: MoviePTIT Cầu Giấy" required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Thành phố</label>
                  <input className="input" value={branchForm.city} onChange={e => setBranchForm({...branchForm, city: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Điện thoại</label>
                  <input className="input" value={branchForm.phone} onChange={e => setBranchForm({...branchForm, phone: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Địa chỉ</label>
                <input className="input" value={branchForm.address} onChange={e => setBranchForm({...branchForm, address: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Trạng thái rạp</label>
                <select className="input" value={branchForm.status} onChange={e => setBranchForm({...branchForm, status: e.target.value})}>
                  <option value="ACTIVE">Hoạt động</option>
                  <option value="INACTIVE">Tạm dừng</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setBranchModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Lưu lại</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ROOM MODAL */}
      {roomModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px', height: 'auto', aspectRatio: 'unset', overflow: 'visible', background: 'var(--bg-card)', padding: '32px', borderRadius: 'var(--radius-lg)' }}>
            <h2 style={{ marginBottom: '24px' }}>{editingRoom ? 'Sửa phòng chiếu' : 'Thêm phòng mới'}</h2>
            <form onSubmit={handleRoomSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Thuộc chi nhánh</label>
                <select className="input" value={roomForm.branchId} onChange={e => setRoomForm({...roomForm, branchId: e.target.value})} required>
                  <option value="">-- Chọn rạp --</option>
                  {branches.map(b => <option key={b.branchId} value={b.branchId}>{b.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Mã phòng</label>
                  <input className="input" value={roomForm.code} onChange={e => setRoomForm({...roomForm, code: e.target.value})} placeholder="P01" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Tên phòng</label>
                  <input className="input" value={roomForm.name} onChange={e => setRoomForm({...roomForm, name: e.target.value})} placeholder="Phòng số 1" required />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Loại phòng</label>
                  <select className="input" value={roomForm.roomType} onChange={e => setRoomForm({...roomForm, roomType: e.target.value})}>
                    <option value="TWO_D">2D</option>
                    <option value="THREE_D">3D</option>
                    <option value="IMAX">IMAX</option>
                    <option value="FOUR_DX">4DX</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Tổng số ghế (Sức chứa)</label>
                  <input type="number" className="input" value={roomForm.seatCapacity} onChange={e => setRoomForm({...roomForm, seatCapacity: parseInt(e.target.value)})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Trạng thái phòng</label>
                  <select className="input" value={roomForm.status} onChange={e => setRoomForm({...roomForm, status: e.target.value})}>
                    <option value="ACTIVE">Hoạt động</option>
                    <option value="INACTIVE">Tạm dừng</option>
                    <option value="MAINTENANCE">Bảo trì</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setRoomModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Lưu lại</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchManagement;
