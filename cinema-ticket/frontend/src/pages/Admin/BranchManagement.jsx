import { useEffect, useMemo, useState } from 'react';
import { branchApi, roomApi, seatApi } from '../../api';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/useAuth';

const roomTypeMap = {
  TWO_D: '2D',
  THREE_D: '3D',
  IMAX: 'IMAX',
  FOUR_DX: '4DX',
};

const roomStatusMap = {
  ACTIVE: 'Hoạt động',
  INACTIVE: 'Tạm đóng',
  MAINTENANCE: 'Bảo trì',
};

const seatTypeMap = {
  STANDARD: 'Thường',
  VIP: 'VIP',
  COUPLE: 'Ghế đôi',
};

const seatTypeStyles = {
  STANDARD: {
    background: '#eef2f7',
    borderColor: '#cbd5e1',
    color: '#334155',
  },
  VIP: {
    background: '#dbeafe',
    borderColor: '#2563eb',
    color: '#1d4ed8',
  },
  COUPLE: {
    background: '#fce7f3',
    borderColor: '#db2777',
    color: '#be185d',
  },
};

const Icon = ({ name }) => {
  if (name === 'plus') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    );
  }

  if (name === 'edit') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    );
  }

  if (name === 'trash') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 9h2M11 9h2M15 9h2M7 13h2M11 13h2M15 13h2" />
    </svg>
  );
};

const BranchManagement = () => {
  const { isAdmin } = useAuth();
  const [branches, setBranches] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  const [branchModal, setBranchModal] = useState(false);
  const [roomModal, setRoomModal] = useState(false);
  const [seatMapModal, setSeatMapModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [editingRoom, setEditingRoom] = useState(null);

  const [seatMapRoom, setSeatMapRoom] = useState(null);
  const [seats, setSeats] = useState([]);
  const [seatMapLoading, setSeatMapLoading] = useState(false);
  const [savingSeatMap, setSavingSeatMap] = useState(false);
  const [draggedSeatId, setDraggedSeatId] = useState(null);
  const [selectedSeatId, setSelectedSeatId] = useState(null);
  const [extraColumns, setExtraColumns] = useState(2);

  const [branchForm, setBranchForm] = useState({
    branchCode: '',
    name: '',
    city: '',
    address: '',
    phone: '',
    status: 'ACTIVE',
  });

  const [roomForm, setRoomForm] = useState({
    code: '',
    name: '',
    roomType: 'TWO_D',
    seatCapacity: 100,
    branchId: '',
    status: 'ACTIVE',
  });

  const sortedSeats = useMemo(
    () =>
      [...seats].sort((a, b) => {
        const rowCompare = String(a.rowLabel || '').localeCompare(String(b.rowLabel || ''));
        return rowCompare || Number(a.seatNumber || 0) - Number(b.seatNumber || 0);
      }),
    [seats],
  );

  const seatRows = useMemo(
    () => Array.from(new Set(sortedSeats.map((seat) => seat.rowLabel))).filter(Boolean),
    [sortedSeats],
  );

  const gridColumns = useMemo(() => {
    const maxSeatNumber = sortedSeats.reduce((max, seat) => Math.max(max, Number(seat.seatNumber || 0)), 0);
    return Array.from({ length: Math.max(1, maxSeatNumber + extraColumns) }, (_, index) => index + 1);
  }, [sortedSeats, extraColumns]);

  const selectedSeat = useMemo(
    () => seats.find((seat) => seat.seatId === selectedSeatId) || null,
    [seats, selectedSeatId],
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      const [branchRes, roomRes] = await Promise.allSettled([branchApi.getAll(), roomApi.getAll()]);
      setBranches(branchRes.status === 'fulfilled' ? branchRes.value.data.result : []);
      setRooms(roomRes.status === 'fulfilled' ? roomRes.value.data.result : []);
    } catch {
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

  const openSeatMapModal = async (room) => {
    setSeatMapRoom(room);
    setSeatMapModal(true);
    setSeatMapLoading(true);
    setSelectedSeatId(null);
    setExtraColumns(2);
    try {
      const res = await seatApi.getByRoom(room.id);
      const roomSeats = (res.data.result || []).map((seat) => ({
        ...seat,
        rowLabel: String(seat.rowLabel || '').toUpperCase(),
        seatNumber: Number(seat.seatNumber || 0),
        isActive: seat.isActive !== false,
      }));
      setSeats(roomSeats);
      setSelectedSeatId(roomSeats[0]?.seatId || null);
    } catch {
      toast.error('Không tải được sơ đồ ghế');
      setSeats([]);
    } finally {
      setSeatMapLoading(false);
    }
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
    } catch {
      toast.error('Thực hiện thất bại');
    }
  };

  const handleRoomSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...roomForm,
        branchId: Number(roomForm.branchId),
        seatCapacity: Number(roomForm.seatCapacity),
      };
      if (editingRoom) {
        await roomApi.update(editingRoom.id, payload);
        toast.success('Cập nhật phòng thành công!');
      } else {
        await roomApi.create(payload);
        toast.success('Thêm phòng thành công! Sơ đồ ghế đã được tự động khởi tạo.');
      }
      setRoomModal(false);
      fetchData();
    } catch {
      toast.error('Thực hiện thất bại');
    }
  };

  const handleDeleteBranch = async (id) => {
    if (!window.confirm('Xóa chi nhánh này sẽ ảnh hưởng đến các phòng thuộc rạp. Tiếp tục?')) return;
    try {
      await branchApi.delete(id);
      toast.success('Xóa thành công');
      fetchData();
    } catch {
      toast.error('Xóa thất bại');
    }
  };

  const handleDeleteRoom = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa phòng này?')) return;
    try {
      await roomApi.delete(id);
      toast.success('Xóa thành công');
      fetchData();
    } catch {
      toast.error('Xóa thất bại');
    }
  };

  const getRoomCount = (branchId) => rooms.filter((room) => room.branchId === branchId).length;

  const getSeatAt = (rowLabel, seatNumber) =>
    seats.find((seat) => seat.rowLabel === rowLabel && Number(seat.seatNumber) === Number(seatNumber));

  const moveSeatTo = (seatId, rowLabel, seatNumber) => {
    const movingSeat = seats.find((seat) => seat.seatId === seatId);
    if (!movingSeat) return;

    const targetSeat = getSeatAt(rowLabel, seatNumber);
    if (targetSeat?.seatId === seatId) return;

    setSeats((currentSeats) =>
      currentSeats.map((seat) => {
        if (seat.seatId === seatId) {
          return { ...seat, rowLabel, seatNumber, seatCode: `${rowLabel}${seatNumber}` };
        }
        if (targetSeat && seat.seatId === targetSeat.seatId) {
          return {
            ...seat,
            rowLabel: movingSeat.rowLabel,
            seatNumber: movingSeat.seatNumber,
            seatCode: `${movingSeat.rowLabel}${movingSeat.seatNumber}`,
          };
        }
        return seat;
      }),
    );
    setSelectedSeatId(seatId);
  };

  const handleDrop = (rowLabel, seatNumber) => {
    if (draggedSeatId) {
      moveSeatTo(draggedSeatId, rowLabel, seatNumber);
      setDraggedSeatId(null);
    }
  };

  const updateSeatLocal = (seatId, patch) => {
    setSeats((currentSeats) =>
      currentSeats.map((seat) =>
        seat.seatId === seatId
          ? { ...seat, ...patch, seatCode: `${patch.rowLabel || seat.rowLabel}${patch.seatNumber || seat.seatNumber}` }
          : seat,
      ),
    );
  };

  const saveSeatLayout = async () => {
    if (!seatMapRoom) return;
    try {
      setSavingSeatMap(true);
      const payload = {
        seats: seats.map((seat) => ({
          seatId: seat.seatId,
          rowLabel: seat.rowLabel,
          seatNumber: Number(seat.seatNumber),
          seatType: seat.seatType,
          isActive: seat.isActive !== false,
        })),
      };
      const res = await seatApi.updateLayout(seatMapRoom.id, payload);
      setSeats(res.data.result || []);
      toast.success('Đã lưu sơ đồ ghế');
    } catch {
      toast.error('Không lưu được sơ đồ ghế');
    } finally {
      setSavingSeatMap(false);
    }
  };

  const closeSeatMapModal = () => {
    setSeatMapModal(false);
    setSeatMapRoom(null);
    setSeats([]);
    setSelectedSeatId(null);
    setDraggedSeatId(null);
  };

  if (loading && branches.length === 0) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Quản lý Rạp &amp; Phòng</h1>
          <p className="page-subtitle">
            <strong>{branches.length}</strong> chi nhánh · <strong>{rooms.length}</strong> phòng chiếu
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => openRoomModal()}>
            <Icon name="plus" />
            Thêm phòng
          </button>
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => openBranchModal()}>
              <Icon name="plus" />
              Thêm chi nhánh
            </button>
          )}
        </div>
      </div>

      <div className="admin-table-card" style={{ marginBottom: 28 }}>
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
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  Chưa có chi nhánh
                </td>
              </tr>
            ) : (
              branches.map((branch, index) => (
                <tr key={branch.branchId || index}>
                  <td style={{ color: 'var(--text-muted)' }}>{index + 1}</td>
                  <td><span className="movie-badge">{branch.branchCode}</span></td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{branch.name}</td>
                  <td>{branch.city || '-'}</td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {branch.address || '-'}
                  </td>
                  <td>{branch.phone || '-'}</td>
                  <td style={{ fontWeight: 600 }}>{getRoomCount(branch.branchId)}</td>
                  <td>
                    <div className="action-btns">
                      <button className="btn btn-ghost btn-sm" title="Sửa" onClick={() => openBranchModal(branch)}>
                        <Icon name="edit" />
                      </button>
                      {isAdmin && (
                        <button className="btn btn-ghost btn-sm" title="Xóa" style={{ color: '#ef4444' }} onClick={() => handleDeleteBranch(branch.branchId)}>
                          <Icon name="trash" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  Chưa có phòng chiếu
                </td>
              </tr>
            ) : (
              rooms.map((room, index) => {
                const branch = branches.find((item) => item.branchId === room.branchId);
                return (
                  <tr key={room.id || index}>
                    <td style={{ color: 'var(--text-muted)' }}>{index + 1}</td>
                    <td><span className="movie-badge">{room.code}</span></td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{room.name}</td>
                    <td>
                      <span className="status-badge status--active" style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--blue)' }}>
                        {roomTypeMap[room.roomType] || room.roomType}
                      </span>
                    </td>
                    <td>{room.seatCapacity || '-'}</td>
                    <td>{branch?.name || '-'}</td>
                    <td>
                      <span className={`status-badge ${room.status === 'ACTIVE' ? 'status--active' : 'status--inactive'}`}>
                        {roomStatusMap[room.status] || room.status}
                      </span>
                    </td>
                    <td>
                      <div className="action-btns">
                        <button className="btn btn-ghost btn-sm" title="Sơ đồ ghế" onClick={() => openSeatMapModal(room)}>
                          <Icon name="seat" />
                        </button>
                        <button className="btn btn-ghost btn-sm" title="Sửa" onClick={() => openRoomModal(room)}>
                          <Icon name="edit" />
                        </button>
                        <button className="btn btn-ghost btn-sm" title="Xóa" style={{ color: '#ef4444' }} onClick={() => handleDeleteRoom(room.id)}>
                          <Icon name="trash" />
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

      {branchModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 650, height: 'auto', aspectRatio: 'unset', overflow: 'visible', background: 'var(--bg-card)', padding: 32, borderRadius: 'var(--radius-lg)' }}>
            <h2 style={{ marginBottom: 24 }}>{editingBranch ? 'Sửa chi nhánh' : 'Thêm chi nhánh mới'}</h2>
            <form onSubmit={handleBranchSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Mã chi nhánh</label>
                <input className="input" value={branchForm.branchCode} onChange={(e) => setBranchForm({ ...branchForm, branchCode: e.target.value })} placeholder="VD: MPT-HANOI" required />
              </div>
              <div className="form-group">
                <label className="form-label">Tên rạp</label>
                <input className="input" value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} placeholder="VD: MoviePTIT Cầu Giấy" required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Thành phố</label>
                  <input className="input" value={branchForm.city || ''} onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Điện thoại</label>
                  <input className="input" value={branchForm.phone || ''} onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Địa chỉ</label>
                <input className="input" value={branchForm.address || ''} onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Trạng thái rạp</label>
                <select className="input" value={branchForm.status || 'ACTIVE'} onChange={(e) => setBranchForm({ ...branchForm, status: e.target.value })}>
                  <option value="ACTIVE">Hoạt động</option>
                  <option value="INACTIVE">Tạm dừng</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setBranchModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Lưu lại</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {roomModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 650, height: 'auto', aspectRatio: 'unset', overflow: 'visible', background: 'var(--bg-card)', padding: 32, borderRadius: 'var(--radius-lg)' }}>
            <h2 style={{ marginBottom: 24 }}>{editingRoom ? 'Sửa phòng chiếu' : 'Thêm phòng mới'}</h2>
            <form onSubmit={handleRoomSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Thuộc chi nhánh</label>
                <select className="input" value={roomForm.branchId || ''} onChange={(e) => setRoomForm({ ...roomForm, branchId: e.target.value })} required>
                  <option value="">-- Chọn rạp --</option>
                  {branches.map((branch) => (
                    <option key={branch.branchId} value={branch.branchId}>{branch.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Mã phòng</label>
                  <input className="input" value={roomForm.code || ''} onChange={(e) => setRoomForm({ ...roomForm, code: e.target.value })} placeholder="P01" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Tên phòng</label>
                  <input className="input" value={roomForm.name || ''} onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })} placeholder="Phòng số 1" required />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Loại phòng</label>
                  <select className="input" value={roomForm.roomType || 'TWO_D'} onChange={(e) => setRoomForm({ ...roomForm, roomType: e.target.value })}>
                    <option value="TWO_D">2D</option>
                    <option value="THREE_D">3D</option>
                    <option value="IMAX">IMAX</option>
                    <option value="FOUR_DX">4DX</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Tổng số ghế</label>
                  <input type="number" className="input" value={roomForm.seatCapacity || 1} onChange={(e) => setRoomForm({ ...roomForm, seatCapacity: e.target.value })} min="1" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Trạng thái phòng</label>
                  <select className="input" value={roomForm.status || 'ACTIVE'} onChange={(e) => setRoomForm({ ...roomForm, status: e.target.value })}>
                    <option value="ACTIVE">Hoạt động</option>
                    <option value="INACTIVE">Tạm dừng</option>
                    <option value="MAINTENANCE">Bảo trì</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setRoomModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Lưu lại</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {seatMapModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: 'min(1180px, 96vw)', maxWidth: 1180, height: 'min(86vh, 860px)', aspectRatio: 'unset', overflow: 'hidden', background: 'var(--bg-card)', padding: 0, borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ padding: '22px 26px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.35rem' }}>Sơ đồ ghế - {seatMapRoom?.name}</h2>
                  <p style={{ margin: '6px 0 0', color: 'var(--text-muted)' }}>
                    {sortedSeats.length} ghế · kéo ghế sang ô trống để tạo lối đi, kéo vào ghế khác để đổi chỗ
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setExtraColumns((value) => value + 1)}>
                    Thêm cột trống
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={closeSeatMapModal}>
                    Đóng
                  </button>
                  <button type="button" className="btn btn-primary" onClick={saveSeatLayout} disabled={savingSeatMap || seatMapLoading}>
                    {savingSeatMap ? 'Đang lưu...' : 'Lưu sơ đồ'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', minHeight: 0, flex: 1 }}>
                <div style={{ padding: 24, overflow: 'auto', background: '#f8fafc' }}>
                  <div style={{ width: '100%', minWidth: 640 }}>
                    <div style={{ height: 34, maxWidth: 560, margin: '0 auto 24px', borderRadius: 4, background: 'linear-gradient(135deg, #1f2937, #64748b)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, letterSpacing: 0 }}>
                      MÀN HÌNH
                    </div>

                    {seatMapLoading ? (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                        <div className="spinner" />
                      </div>
                    ) : seatRows.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Phòng này chưa có ghế</div>
                    ) : (
                      <div style={{ display: 'grid', gap: 8, justifyContent: 'center' }}>
                        {seatRows.map((rowLabel) => (
                          <div key={rowLabel} style={{ display: 'grid', gridTemplateColumns: `34px repeat(${gridColumns.length}, 44px)`, gap: 8, alignItems: 'center' }}>
                            <div style={{ textAlign: 'center', fontWeight: 800, color: 'var(--text-secondary)' }}>{rowLabel}</div>
                            {gridColumns.map((seatNumber) => {
                              const seat = getSeatAt(rowLabel, seatNumber);
                              const isSelected = seat?.seatId === selectedSeatId;
                              const baseStyle = seat ? seatTypeStyles[seat.seatType] || seatTypeStyles.STANDARD : null;
                              return (
                                <div
                                  key={`${rowLabel}-${seatNumber}`}
                                  onDragOver={(event) => event.preventDefault()}
                                  onDrop={() => handleDrop(rowLabel, seatNumber)}
                                  style={{
                                    width: 44,
                                    height: 40,
                                    border: seat ? 'none' : '1px dashed #cbd5e1',
                                    borderRadius: 6,
                                    background: seat ? 'transparent' : '#fff',
                                  }}
                                >
                                  {seat && (
                                    <button
                                      type="button"
                                      draggable
                                      onDragStart={() => setDraggedSeatId(seat.seatId)}
                                      onDragEnd={() => setDraggedSeatId(null)}
                                      onClick={() => setSelectedSeatId(seat.seatId)}
                                      title={`${seat.seatCode} - ${seatTypeMap[seat.seatType] || seat.seatType}${seat.isActive === false ? ' - khóa/hỏng' : ''}`}
                                      style={{
                                        width: 44,
                                        height: 40,
                                        borderRadius: 6,
                                        border: `2px solid ${isSelected ? '#0f172a' : baseStyle.borderColor}`,
                                        background: seat.isActive === false ? '#e5e7eb' : baseStyle.background,
                                        color: seat.isActive === false ? '#64748b' : baseStyle.color,
                                        fontWeight: 800,
                                        fontSize: 12,
                                        cursor: 'grab',
                                        opacity: seat.isActive === false ? 0.72 : 1,
                                        boxShadow: isSelected ? '0 0 0 3px rgba(15, 23, 42, 0.12)' : 'none',
                                      }}
                                    >
                                      {seat.seatCode}
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <aside style={{ borderLeft: '1px solid var(--border)', padding: 22, overflow: 'auto', background: 'var(--bg-card)' }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: '1rem' }}>Thuộc tính ghế</h3>
                  {selectedSeat ? (
                    <div style={{ display: 'grid', gap: 16 }}>
                      <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Ghế đang chọn</div>
                        <div style={{ fontSize: 28, lineHeight: 1, fontWeight: 800 }}>{selectedSeat.seatCode}</div>
                        <div style={{ marginTop: 8, color: 'var(--text-muted)' }}>
                          Hàng {selectedSeat.rowLabel}, cột {selectedSeat.seatNumber}
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Loại ghế</label>
                        <select
                          className="input"
                          value={selectedSeat.seatType || 'STANDARD'}
                          onChange={(event) => updateSeatLocal(selectedSeat.seatId, { seatType: event.target.value })}
                        >
                          <option value="STANDARD">Thường</option>
                          <option value="VIP">VIP</option>
                          <option value="COUPLE">Ghế đôi</option>
                        </select>
                      </div>

                      <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700 }}>
                        <input
                          type="checkbox"
                          checked={selectedSeat.isActive !== false}
                          onChange={(event) => updateSeatLocal(selectedSeat.seatId, { isActive: event.target.checked })}
                          style={{ width: 18, height: 18 }}
                        />
                        Có thể bán vé
                      </label>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <button type="button" className="btn btn-secondary" onClick={() => updateSeatLocal(selectedSeat.seatId, { isActive: false })}>
                          Khóa/hỏng
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => updateSeatLocal(selectedSeat.seatId, { isActive: true })}>
                          Mở bán
                        </button>
                      </div>

                      <div style={{ display: 'grid', gap: 8, paddingTop: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ width: 22, height: 18, borderRadius: 4, background: seatTypeStyles.STANDARD.background, border: `1px solid ${seatTypeStyles.STANDARD.borderColor}` }} />
                          <span>Ghế thường</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ width: 22, height: 18, borderRadius: 4, background: seatTypeStyles.VIP.background, border: `1px solid ${seatTypeStyles.VIP.borderColor}` }} />
                          <span>Ghế VIP</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ width: 22, height: 18, borderRadius: 4, background: seatTypeStyles.COUPLE.background, border: `1px solid ${seatTypeStyles.COUPLE.borderColor}` }} />
                          <span>Ghế đôi</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ width: 22, height: 18, borderRadius: 4, background: '#e5e7eb', border: '1px dashed #94a3b8' }} />
                          <span>Khóa/hỏng</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)' }}>Chọn một ghế để chỉnh loại ghế hoặc trạng thái bán.</div>
                  )}
                </aside>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchManagement;
