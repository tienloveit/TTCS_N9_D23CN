import { useEffect, useMemo, useState } from 'react';
import { branchApi, roomApi, seatApi } from '../../api';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/useAuth';
import Badge from '../../components/Common/Badge';
import Button from '../../components/Common/Button';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import useModalDialog from '../../components/Common/useModalDialog';
import './BranchManagement.css';
import {
  ArmchairIcon,
  EditIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
  XIcon,
} from '../../components/Common/CinemaIcons';

const roomTypeMap = {
  STANDARD: 'Standard',
  SCREEN_X: 'ScreenX',
  GOLD_CLASS: 'Gold Class',
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

const roomStatusTone = {
  ACTIVE: 'success',
  INACTIVE: 'danger',
  MAINTENANCE: 'warning',
};

const seatTypeClass = {
  VIP: 'seat-editor-seat--vip',
  COUPLE: 'seat-editor-seat--couple',
};

const Icon = ({ name }) => {
  if (name === 'plus') return <PlusIcon size={18} />;
  if (name === 'edit') return <EditIcon size={15} />;
  if (name === 'trash') return <TrashIcon size={15} />;
  return <ArmchairIcon size={15} />;
};

const BranchManagement = () => {
  const { isAdmin } = useAuth();
  const [branchModal, setBranchModal] = useState(false);
  const [roomModal, setRoomModal] = useState(false);
  const [seatMapModal, setSeatMapModal] = useState(false);
  const branchDialog = useModalDialog(branchModal, () => setBranchModal(false));
  const roomDialog = useModalDialog(roomModal, () => setRoomModal(false));
  // Sơ đồ ghế có thay đổi chưa lưu: không đóng bằng Esc/click nền, chỉ bằng nút trong modal.
  const seatMapDialog = useModalDialog(seatMapModal, null, { disabled: true });
  const [branches, setBranches] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editingBranch, setEditingBranch] = useState(null);
  const [editingRoom, setEditingRoom] = useState(null);

  const [seatMapRoom, setSeatMapRoom] = useState(null);
  const [seats, setSeats] = useState([]);
  const [seatMapLoading, setSeatMapLoading] = useState(false);
  const [savingSeatMap, setSavingSeatMap] = useState(false);
  const [draggedSeatId, setDraggedSeatId] = useState(null);
  const [selectedSeatId, setSelectedSeatId] = useState(null);
  const [extraColumns, setExtraColumns] = useState(2);

  // Room filter states
  const [roomBranchFilter, setRoomBranchFilter] = useState('ALL');
  const [roomTypeFilter, setRoomTypeFilter] = useState('ALL');
  const [roomSearch, setRoomSearch] = useState('');

  // Confirm Dialog state
  const [confirmTarget, setConfirmTarget] = useState(null); // { type: 'BRANCH' | 'ROOM', id, name }
  const [deleting, setDeleting] = useState(false);

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
    roomTechnology: 'STANDARD',
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
      setRoomForm({ code: '', name: '', roomTechnology: 'STANDARD', seatCapacity: 100, branchId: '', status: 'ACTIVE' });
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

  const handleDeleteBranch = (id, name = '') => {
    setConfirmTarget({ type: 'BRANCH', id, name });
  };

  const handleDeleteRoom = (id, name = '') => {
    setConfirmTarget({ type: 'ROOM', id, name });
  };

  const executeConfirmDelete = async () => {
    if (!confirmTarget) return;
    setDeleting(true);
    try {
      if (confirmTarget.type === 'BRANCH') {
        await branchApi.delete(confirmTarget.id);
      } else {
        await roomApi.delete(confirmTarget.id);
      }
      toast.success('Xóa thành công');
      setConfirmTarget(null);
      fetchData();
    } catch {
      toast.error('Xóa thất bại');
    } finally {
      setDeleting(false);
    }
  };

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      if (roomBranchFilter !== 'ALL' && String(room.branchId) !== String(roomBranchFilter)) return false;
      if (roomTypeFilter !== 'ALL' && room.roomTechnology !== roomTypeFilter) return false;
      if (!roomSearch.trim()) return true;
      const q = roomSearch.toLowerCase().trim();
      return (
        (room.name || '').toLowerCase().includes(q) ||
        (room.code || '').toLowerCase().includes(q)
      );
    });
  }, [rooms, roomBranchFilter, roomTypeFilter, roomSearch]);

  const updateRowSeatsLocal = (rowLabel, patch) => {
    if (!rowLabel) return;
    setSeats((currentSeats) =>
      currentSeats.map((seat) =>
        seat.rowLabel === rowLabel ? { ...seat, ...patch } : seat
      )
    );
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
      <div className="page-header page-header--split">
        <div>
          <h1 className="page-title">Quản lý rạp &amp; phòng</h1>
          <p className="page-subtitle">
            <strong>{branches.length}</strong> chi nhánh, <strong>{rooms.length}</strong> phòng chiếu
          </p>
        </div>
        <div className="page-header-actions">
          <Button icon={<Icon name="plus" />} onClick={() => openRoomModal()}>
            Thêm phòng
          </Button>
          {isAdmin && (
            <Button variant="primary" icon={<Icon name="plus" />} onClick={() => openBranchModal()}>
              Thêm chi nhánh
            </Button>
          )}
        </div>
      </div>

      <div className="admin-table-card admin-table-card--spaced">
        <div className="table-header">
          <h3 className="admin-section-title">Chi nhánh</h3>
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
                <td colSpan="8" className="admin-table-empty">
                  Chưa có chi nhánh. Bấm “Thêm chi nhánh” để tạo rạp đầu tiên.
                </td>
              </tr>
            ) : (
              branches.map((branch, index) => (
                <tr key={branch.branchId || index}>
                  <td className="cell-index">{index + 1}</td>
                  <td><span className="movie-badge">{branch.branchCode}</span></td>
                  <td className="cell-strong">{branch.name}</td>
                  <td>{branch.city || '-'}</td>
                  <td className="cell-truncate" title={branch.address || undefined}>
                    {branch.address || '-'}
                  </td>
                  <td>{branch.phone || '-'}</td>
                  <td className="cell-strong">{getRoomCount(branch.branchId)}</td>
                  <td>
                    <div className="action-btns">
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Sửa chi nhánh"
                        aria-label={`Sửa chi nhánh ${branch.name}`}
                        icon={<Icon name="edit" />}
                        onClick={() => openBranchModal(branch)}
                      />
                      {isAdmin && (
                        <Button
                          variant="ghost-danger"
                          size="sm"
                          title="Xóa chi nhánh"
                          aria-label={`Xóa chi nhánh ${branch.name}`}
                          icon={<Icon name="trash" />}
                          onClick={() => handleDeleteBranch(branch.branchId, branch.name)}
                        />
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
        <div className="console-toolbar">
          <h3 className="admin-section-title">
            Phòng chiếu ({filteredRooms.length})
          </h3>
          <div className="admin-toolbar-filters">
            <div className="admin-search">
              <SearchIcon size={15} className="input-leading-icon" aria-hidden="true" />
              <input
                type="search"
                className="input input-sm"
                placeholder="Tìm mã, tên phòng..."
                aria-label="Tìm phòng chiếu theo mã hoặc tên"
                value={roomSearch}
                onChange={(e) => setRoomSearch(e.target.value)}
              />
            </div>
            <select
              className="input input-sm input-auto"
              aria-label="Lọc theo chi nhánh"
              value={roomBranchFilter}
              onChange={(e) => setRoomBranchFilter(e.target.value)}
            >
              <option value="ALL">Tất cả chi nhánh</option>
              {branches.map((b) => (
                <option key={b.branchId} value={b.branchId}>{b.name}</option>
              ))}
            </select>
            <select
              className="input input-sm input-auto"
              aria-label="Lọc theo công nghệ phòng"
              value={roomTypeFilter}
              onChange={(e) => setRoomTypeFilter(e.target.value)}
            >
              <option value="ALL">Mọi công nghệ phòng</option>
              {Object.entries(roomTypeMap).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Mã phòng</th>
              <th>Tên phòng</th>
              <th>Công nghệ phòng</th>
              <th>Sức chứa</th>
              <th>Chi nhánh</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filteredRooms.length === 0 ? (
              <tr>
                <td colSpan="8" className="admin-table-empty">
                  Không tìm thấy phòng chiếu phù hợp. Thử bỏ bớt bộ lọc.
                </td>
              </tr>
            ) : (
              filteredRooms.map((room, index) => {
                const branch = branches.find((item) => item.branchId === room.branchId);
                return (
                  <tr key={room.id || index}>
                    <td className="cell-index">{index + 1}</td>
                    <td><span className="movie-badge">{room.code}</span></td>
                    <td className="cell-strong">{room.name}</td>
                    <td>
                      <Badge tone="info">{roomTypeMap[room.roomTechnology] || room.roomTechnology}</Badge>
                    </td>
                    <td>{room.seatCapacity || '-'}</td>
                    <td>{branch?.name || '-'}</td>
                    <td>
                      <Badge tone={roomStatusTone[room.status] || 'neutral'} dot>
                        {roomStatusMap[room.status] || room.status}
                      </Badge>
                    </td>
                    <td>
                      <div className="action-btns">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Sơ đồ ghế"
                          aria-label={`Sửa sơ đồ ghế ${room.name}`}
                          icon={<Icon name="seat" />}
                          onClick={() => openSeatMapModal(room)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Sửa phòng"
                          aria-label={`Sửa phòng ${room.name}`}
                          icon={<Icon name="edit" />}
                          onClick={() => openRoomModal(room)}
                        />
                        <Button
                          variant="ghost-danger"
                          size="sm"
                          title="Xóa phòng"
                          aria-label={`Xóa phòng ${room.name}`}
                          icon={<Icon name="trash" />}
                          onClick={() => handleDeleteRoom(room.id, room.name)}
                        />
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
        <div className="modal-overlay" {...branchDialog.overlayProps}>
          <div className="modal-content admin-modal admin-modal--md" {...branchDialog.contentProps}>
            <div className="admin-modal-header">
              <h2 id={branchDialog.titleId}>{editingBranch ? 'Sửa chi nhánh' : 'Thêm chi nhánh mới'}</h2>
              <button type="button" className="modal-close modal-close--inline" onClick={() => setBranchModal(false)} aria-label="Đóng">
                <XIcon size={16} />
              </button>
            </div>
            <form onSubmit={handleBranchSubmit} className="admin-form">
              <div className="form-group">
                <label className="form-label">Mã chi nhánh</label>
                <input className="input" value={branchForm.branchCode} onChange={(e) => setBranchForm({ ...branchForm, branchCode: e.target.value })} placeholder="VD: MPT-HANOI" required />
              </div>
              <div className="form-group">
                <label className="form-label">Tên rạp</label>
                <input className="input" value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} placeholder="VD: MoviePTIT Cầu Giấy" required />
              </div>
              <div className="admin-form-row">
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
              <div className="admin-form-actions">
                <Button onClick={() => setBranchModal(false)}>Hủy</Button>
                <Button type="submit" variant="primary">{editingBranch ? 'Lưu chi nhánh' : 'Thêm chi nhánh'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {roomModal && (
        <div className="modal-overlay" {...roomDialog.overlayProps}>
          <div className="modal-content admin-modal admin-modal--md" {...roomDialog.contentProps}>
            <div className="admin-modal-header">
              <h2 id={roomDialog.titleId}>{editingRoom ? 'Sửa phòng chiếu' : 'Thêm phòng mới'}</h2>
              <button type="button" className="modal-close modal-close--inline" onClick={() => setRoomModal(false)} aria-label="Đóng">
                <XIcon size={16} />
              </button>
            </div>
            <form onSubmit={handleRoomSubmit} className="admin-form">
              <div className="form-group">
                <label className="form-label">Thuộc chi nhánh</label>
                <select className="input" value={roomForm.branchId || ''} onChange={(e) => setRoomForm({ ...roomForm, branchId: e.target.value })} required>
                  <option value="">-- Chọn rạp --</option>
                  {branches.map((branch) => (
                    <option key={branch.branchId} value={branch.branchId}>{branch.name}</option>
                  ))}
                </select>
              </div>
              <div className="admin-form-row">
                <div className="form-group">
                  <label className="form-label">Mã phòng</label>
                  <input className="input" value={roomForm.code || ''} onChange={(e) => setRoomForm({ ...roomForm, code: e.target.value })} placeholder="P01" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Tên phòng</label>
                  <input className="input" value={roomForm.name || ''} onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })} placeholder="Phòng số 1" required />
                </div>
              </div>
              <div className="admin-form-row">
                <div className="form-group">
                  <label className="form-label">Công nghệ phòng</label>
                  <select className="input" value={roomForm.roomTechnology || 'STANDARD'} onChange={(e) => setRoomForm({ ...roomForm, roomTechnology: e.target.value })}>
                    {Object.entries(roomTypeMap).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
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
              <div className="admin-form-actions">
                <Button onClick={() => setRoomModal(false)}>Hủy</Button>
                <Button type="submit" variant="primary">{editingRoom ? 'Lưu phòng' : 'Thêm phòng'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {seatMapModal && (
        <div className="modal-overlay">
          <div className="modal-content seat-editor" {...seatMapDialog.contentProps}>
            <div className="seat-editor-header">
              <div>
                <h2 id={seatMapDialog.titleId}>Sơ đồ ghế: {seatMapRoom?.name}</h2>
                <p>
                  {sortedSeats.length} ghế. Kéo ghế sang ô trống để tạo lối đi, kéo vào ghế khác để đổi chỗ.
                </p>
              </div>
              <div className="page-header-actions">
                <Button onClick={() => setExtraColumns((value) => value + 1)}>Thêm cột trống</Button>
                <Button onClick={closeSeatMapModal}>Đóng</Button>
                <Button variant="primary" onClick={saveSeatLayout} disabled={savingSeatMap || seatMapLoading}>
                  {savingSeatMap ? 'Đang lưu...' : 'Lưu sơ đồ'}
                </Button>
              </div>
            </div>

            <div className="seat-editor-body">
              <div className="seat-editor-canvas">
                <div className="seat-editor-stage">
                  <div className="seat-editor-screen">Màn hình</div>

                  {seatMapLoading ? (
                    <div className="seat-editor-state">
                      <div className="spinner" />
                    </div>
                  ) : seatRows.length === 0 ? (
                    <div className="seat-editor-state">Phòng này chưa có ghế.</div>
                  ) : (
                    <div className="seat-editor-grid">
                      {seatRows.map((rowLabel) => (
                        <div key={rowLabel} className="seat-editor-row" style={{ '--seat-cols': gridColumns.length }}>
                          <div className="seat-editor-row-label">{rowLabel}</div>
                          {gridColumns.map((seatNumber) => {
                            const seat = getSeatAt(rowLabel, seatNumber);
                            const isSelected = seat?.seatId === selectedSeatId;
                            return (
                              <div
                                key={`${rowLabel}-${seatNumber}`}
                                className={`seat-editor-cell${seat ? '' : ' seat-editor-cell--empty'}`}
                                onDragOver={(event) => event.preventDefault()}
                                onDrop={() => handleDrop(rowLabel, seatNumber)}
                              >
                                {seat && (
                                  <button
                                    type="button"
                                    draggable
                                    className={['seat-editor-seat', seatTypeClass[seat.seatType], isSelected && 'is-selected']
                                      .filter(Boolean)
                                      .join(' ')}
                                    aria-pressed={isSelected}
                                    onDragStart={() => setDraggedSeatId(seat.seatId)}
                                    onDragEnd={() => setDraggedSeatId(null)}
                                    onClick={() => setSelectedSeatId(seat.seatId)}
                                    title={`${seat.seatCode} - ${seatTypeMap[seat.seatType] || seat.seatType}`}
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

              <aside className="seat-editor-panel">
                <h3>Thuộc tính ghế</h3>
                {selectedSeat ? (
                  <div className="seat-editor-panel-body">
                    <div className="seat-editor-current">
                      <small>Ghế đang chọn</small>
                      <strong>{selectedSeat.seatCode}</strong>
                      <p>Hàng {selectedSeat.rowLabel}, cột {selectedSeat.seatNumber}</p>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="seat-editor-type">Loại ghế</label>
                      <select
                        id="seat-editor-type"
                        className="input"
                        value={selectedSeat.seatType || 'STANDARD'}
                        onChange={(event) => updateSeatLocal(selectedSeat.seatId, { seatType: event.target.value })}
                      >
                        {Object.entries(seatTypeMap).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="seat-editor-bulk">
                      <p>Đổi cả hàng {selectedSeat.rowLabel} sang</p>
                      <div className="seat-editor-bulk-actions">
                        {Object.entries(seatTypeMap).map(([value, label]) => (
                          <Button
                            key={value}
                            size="xs"
                            onClick={() => updateRowSeatsLocal(selectedSeat.rowLabel, { seatType: value })}
                          >
                            {label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="seat-editor-legend">
                      <div className="seat-editor-legend-item">
                        <span className="seat-editor-swatch" aria-hidden="true" />
                        <span>Ghế thường</span>
                      </div>
                      <div className="seat-editor-legend-item">
                        <span className="seat-editor-swatch seat-editor-swatch--vip" aria-hidden="true" />
                        <span>Ghế VIP</span>
                      </div>
                      <div className="seat-editor-legend-item">
                        <span className="seat-editor-swatch seat-editor-swatch--couple" aria-hidden="true" />
                        <span>Ghế đôi</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="seat-editor-hint">Chọn một ghế để đổi loại ghế.</p>
                )}
              </aside>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmTarget)}
        title={confirmTarget?.type === 'BRANCH' ? 'Xóa chi nhánh' : 'Xóa phòng chiếu'}
        message={
          confirmTarget?.type === 'BRANCH'
            ? `Xóa chi nhánh "${confirmTarget?.name || ''}" sẽ ảnh hưởng đến các phòng chiếu thuộc rạp. Tiếp tục?`
            : `Bạn có chắc chắn muốn xóa phòng "${confirmTarget?.name || ''}"?`
        }
        confirmText="Xóa"
        loading={deleting}
        onConfirm={executeConfirmDelete}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
};

export default BranchManagement;
