import { useEffect, useMemo, useState } from 'react';
import { branchApi, roomApi, seatApi } from '../../api';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/useAuth';
import { ArmchairIcon, EditIcon, PlusIcon, TrashIcon } from '../../components/Common/CinemaIcons';
import { Code, DataTable, Field, FilterBar, OpsButton, OpsConfirm, OpsDialog, OpsPage,
  OpsPanel, Select, StateBlock, StatusBadge, TextInput } from '../../components/Ops';

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

const BranchManagement = () => {
  const { isAdmin } = useAuth();
  const [branchModal, setBranchModal] = useState(false);
  const [roomModal, setRoomModal] = useState(false);
  const [seatMapModal, setSeatMapModal] = useState(false);
  const [branches, setBranches] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [seatMapError, setSeatMapError] = useState('');
  const [destination, setDestination] = useState('');

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
      setLoadError('');
      const [branchRes, roomRes] = await Promise.allSettled([branchApi.getAll(), roomApi.getAll()]);
      setBranches(branchRes.status === 'fulfilled' ? branchRes.value.data.result || [] : []);
      setRooms(roomRes.status === 'fulfilled' ? roomRes.value.data.result || [] : []);
      if (branchRes.status === 'rejected' || roomRes.status === 'rejected') {
        setLoadError('Không tải được đầy đủ danh sách chi nhánh và phòng.');
      }
    } catch {
      setLoadError('Không tải được danh sách chi nhánh và phòng.');
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
      setRoomForm({ code: '', name: '', roomTechnology: 'STANDARD', seatCapacity: 100, branchId: roomBranchFilter === 'ALL' ? (branches.length === 1 ? String(branches[0].branchId) : '') : roomBranchFilter, status: 'ACTIVE' });
    }
    setRoomModal(true);
  };

  const openSeatMapModal = async (room) => {
    setSeatMapRoom(room);
    setSeatMapModal(true);
    setSeatMapLoading(true);
    setSeatMapError('');
    setDestination('');
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
      setSeatMapError('Không tải được sơ đồ ghế.');
      setSeats([]);
    } finally {
      setSeatMapLoading(false);
    }
  };

  const handleBranchSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      if (editingBranch) {
        await branchApi.update(editingBranch.branchId, branchForm);
        toast.success('Đã cập nhật chi nhánh');
      } else {
        await branchApi.create(branchForm);
        toast.success('Đã thêm chi nhánh');
      }
      setBranchModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không lưu được thay đổi');
    } finally {
      setSaving(false);
    }
  };

  const handleRoomSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const payload = {
        ...roomForm,
        branchId: Number(roomForm.branchId),
        seatCapacity: Number(roomForm.seatCapacity),
      };
      if (editingRoom) {
        await roomApi.update(editingRoom.id, payload);
        toast.success('Đã cập nhật phòng');
      } else {
        await roomApi.create(payload);
        toast.success('Đã thêm phòng và tạo sơ đồ ghế');
      }
      setRoomModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không lưu được thay đổi');
    } finally {
      setSaving(false);
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

  const getRoomCount = branchId => rooms.filter(room => String(room.branchId) === String(branchId)).length;

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
    setDestination('');
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
    if (!seatMapRoom || savingSeatMap) return;
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
    if (savingSeatMap) return;
    setSeatMapModal(false);
    setSeatMapRoom(null);
    setSeats([]);
    setSelectedSeatId(null);
    setDraggedSeatId(null);
  };


  const selectedBranch = branches.find(branch => String(branch.branchId) === roomBranchFilter);
  const title = 'Rạp và phòng';
  const resetRoomFilters = () => { setRoomSearch(''); setRoomTypeFilter('ALL'); setRoomBranchFilter('ALL'); };
  const roomColumns = [
    { key: 'code', header: 'Mã phòng', render: room => <Code>{room.code}</Code> },
    { key: 'name', header: 'Tên phòng' },
    { key: 'type', header: 'Công nghệ', render: room => roomTypeMap[room.roomTechnology] || room.roomTechnology },
    { key: 'seatCapacity', header: 'Sức chứa', align: 'end' },
    ...(!selectedBranch ? [{ key: 'branch', header: 'Chi nhánh', render: room =>
      branches.find(item => String(item.branchId) === String(room.branchId))?.name || '—' }] : []),
    { key: 'status', header: 'Trạng thái', render: room => <StatusBadge tone={roomStatusTone[room.status]}>
      {roomStatusMap[room.status] || room.status}
    </StatusBadge> },
    { key: 'actions', header: 'Thao tác', render: room => <div className="o-actions">
      <OpsButton variant="ghost" icon={<ArmchairIcon size={16} />} aria-label={'Sửa sơ đồ ghế ' + room.name}
        onClick={() => openSeatMapModal(room)} />
      <OpsButton variant="ghost" icon={<EditIcon size={16} />} aria-label={'Sửa phòng ' + room.name}
        onClick={() => openRoomModal(room)} />
      <OpsButton variant="ghost-danger" icon={<TrashIcon size={16} />} aria-label={'Xóa phòng ' + room.name}
        onClick={() => handleDeleteRoom(room.id, room.name)} />
    </div> },
  ];
  const updateBranch = key => event => setBranchForm(current => ({ ...current, [key]: event.target.value }));
  const updateRoom = key => event => setRoomForm(current => ({ ...current, [key]: event.target.value }));
  const deleteLabel = confirmTarget?.type === 'BRANCH' ? 'Xóa chi nhánh' : 'Xóa phòng chiếu';
  return (
    <OpsPage title={title} description={branches.length + ' chi nhánh, ' + rooms.length + ' phòng chiếu'}
      actions={<>
        <OpsButton variant={isAdmin ? 'secondary' : 'primary'} icon={<PlusIcon size={16} />} disabled={!branches.length}
          onClick={() => openRoomModal()}>Thêm phòng</OpsButton>
        {isAdmin && <OpsButton variant="primary" icon={<PlusIcon size={16} />} onClick={() => openBranchModal()}>Thêm chi nhánh</OpsButton>}
      </>}>
      {loadError && <StateBlock state="error" title={loadError} onRetry={fetchData} />}
      <div className="o-branch-layout">
        <OpsPanel title="Chi nhánh">
          {loading && !branches.length ? <StateBlock state="loading" title="Đang tải chi nhánh" /> :
            branches.length ? <>
              <div className="o-branch-select">
                <Field label="Chi nhánh đang xem"><Select value={roomBranchFilter} onChange={event => setRoomBranchFilter(event.target.value)}>
                  <option value="ALL">Tất cả chi nhánh</option>
                  {branches.map(branch => <option key={branch.branchId} value={branch.branchId}>{branch.name}</option>)}
                </Select></Field>
              </div>
              <div className="o-branch-list" role="group" aria-label="Chọn chi nhánh">
                <OpsButton aria-pressed={roomBranchFilter === 'ALL'} onClick={() => setRoomBranchFilter('ALL')}>Tất cả chi nhánh</OpsButton>
                {branches.map(branch => <OpsButton key={branch.branchId} aria-pressed={roomBranchFilter === String(branch.branchId)}
                  onClick={() => setRoomBranchFilter(String(branch.branchId))}>
                  {branch.name} <small className="o-subline">{getRoomCount(branch.branchId)} phòng</small>
                </OpsButton>)}
              </div>
            </> : <StateBlock title="Chưa có chi nhánh" action={isAdmin ? { label: 'Thêm chi nhánh', onClick: () => openBranchModal() } : undefined} />}
        </OpsPanel>
        <div className="o-form">
          {selectedBranch && <OpsPanel title={selectedBranch.name} actions={<>
            <OpsButton icon={<EditIcon size={16} />} onClick={() => openBranchModal(selectedBranch)}>Sửa chi nhánh</OpsButton>
            {isAdmin && <OpsButton variant="ghost-danger" icon={<TrashIcon size={16} />}
              onClick={() => handleDeleteBranch(selectedBranch.branchId, selectedBranch.name)}>Xóa chi nhánh</OpsButton>}
          </>}>
            <dl className="o-facts">
              <div><dt>Mã chi nhánh</dt><dd><Code>{selectedBranch.branchCode}</Code></dd></div>
              <div><dt>Thành phố</dt><dd>{selectedBranch.city || '—'}</dd></div>
              <div><dt>Địa chỉ</dt><dd>{selectedBranch.address || '—'}</dd></div>
              <div><dt>Điện thoại</dt><dd>{selectedBranch.phone || '—'}</dd></div>
              <div><dt>Số phòng</dt><dd>{getRoomCount(selectedBranch.branchId)}</dd></div>
            </dl>
          </OpsPanel>}
          <FilterBar search={roomSearch} onSearchChange={setRoomSearch} searchLabel="Tìm mã hoặc tên phòng"
            filtered={Boolean(roomSearch || roomTypeFilter !== 'ALL' || roomBranchFilter !== 'ALL')}
            onReset={resetRoomFilters} resultLabel={filteredRooms.length + ' phòng'}>
            <Field label="Công nghệ"><Select value={roomTypeFilter} onChange={event => setRoomTypeFilter(event.target.value)}>
              <option value="ALL">Mọi công nghệ</option>
              {Object.entries(roomTypeMap).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select></Field>
          </FilterBar>
          <OpsPanel flush title="Phòng chiếu">
            <DataTable caption="Phòng chiếu" columns={roomColumns} rows={filteredRooms} rowKey="id"
              state={loading ? 'loading' : 'ready'} stackOnMobile
              empty={{ title: 'Không có phòng chiếu phù hợp', action: { label: 'Xóa bộ lọc', onClick: resetRoomFilters } }} />
          </OpsPanel>
        </div>
      </div>

      <OpsDialog open={branchModal} title={editingBranch ? 'Sửa chi nhánh' : 'Thêm chi nhánh'} onClose={() => setBranchModal(false)} disabled={saving}
        footer={<><OpsButton disabled={saving} onClick={() => setBranchModal(false)}>Quay lại</OpsButton>
          <OpsButton type="submit" form="o-branch-form" variant="primary" loading={saving}>{editingBranch ? 'Lưu thay đổi' : 'Thêm chi nhánh'}</OpsButton></>}>
        <form className="o-form-grid" id="o-branch-form" onSubmit={handleBranchSubmit}>
          <Field label="Mã chi nhánh" required><TextInput value={branchForm.branchCode} onChange={updateBranch('branchCode')} /></Field>
          <Field label="Tên rạp" required><TextInput value={branchForm.name} onChange={updateBranch('name')} /></Field>
          <Field label="Thành phố"><TextInput value={branchForm.city || ''} onChange={updateBranch('city')} /></Field>
          <Field label="Điện thoại"><TextInput value={branchForm.phone || ''} type="tel" onChange={updateBranch('phone')} /></Field>
          <Field label="Địa chỉ" className="o-form-grid__wide"><TextInput value={branchForm.address || ''} onChange={updateBranch('address')} /></Field>
          <Field label="Trạng thái rạp"><Select value={branchForm.status || 'ACTIVE'} onChange={updateBranch('status')}>
            <option value="ACTIVE">Hoạt động</option><option value="INACTIVE">Tạm dừng</option>
          </Select></Field>
        </form>
      </OpsDialog>
      <OpsDialog open={roomModal} title={editingRoom ? 'Sửa phòng chiếu' : 'Thêm phòng'} onClose={() => setRoomModal(false)} disabled={saving}
        footer={<><OpsButton disabled={saving} onClick={() => setRoomModal(false)}>Quay lại</OpsButton>
          <OpsButton type="submit" form="o-room-form" variant="primary" loading={saving}>{editingRoom ? 'Lưu thay đổi' : 'Thêm phòng'}</OpsButton></>}>
        <form className="o-form-grid" id="o-room-form" onSubmit={handleRoomSubmit}>
          <Field label="Chi nhánh" required className="o-form-grid__wide"><Select value={roomForm.branchId || ''} onChange={updateRoom('branchId')}>
            <option value="">Chọn rạp</option>
            {branches.map(branch => <option key={branch.branchId} value={branch.branchId}>{branch.name}</option>)}
          </Select></Field>
          <Field label="Mã phòng" required><TextInput value={roomForm.code || ''} onChange={updateRoom('code')} /></Field>
          <Field label="Tên phòng" required><TextInput value={roomForm.name || ''} onChange={updateRoom('name')} /></Field>
          <Field label="Công nghệ phòng"><Select value={roomForm.roomTechnology || 'STANDARD'} onChange={updateRoom('roomTechnology')}>
            {Object.entries(roomTypeMap).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select></Field>
          <Field label="Tổng số ghế" required><TextInput type="number" min={1} value={roomForm.seatCapacity ?? ''} onChange={updateRoom('seatCapacity')} /></Field>
          <Field label="Trạng thái phòng"><Select value={roomForm.status || 'ACTIVE'} onChange={updateRoom('status')}>
            {Object.entries(roomStatusMap).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select></Field>
        </form>
      </OpsDialog>

      <OpsDialog open={seatMapModal} size="lg" title={'Sơ đồ ghế ' + (seatMapRoom?.name || '')}
        description="Kéo ghế đến vị trí mới hoặc chọn vị trí trong mục Thuộc tính ghế."
        onClose={closeSeatMapModal} disabled={savingSeatMap}
        footer={<>
          <OpsButton disabled={savingSeatMap || seatMapLoading} onClick={() => setExtraColumns(value => value + 1)}>Thêm cột trống</OpsButton>
          <OpsButton disabled={savingSeatMap} onClick={closeSeatMapModal}>Đóng</OpsButton>
          <OpsButton variant="primary" loading={savingSeatMap} disabled={seatMapLoading || Boolean(seatMapError)}
            onClick={saveSeatLayout}>Lưu sơ đồ</OpsButton>
        </>}>
        {seatMapLoading ? <StateBlock state="loading" title="Đang tải sơ đồ ghế" /> :
          seatMapError ? <StateBlock state="error" title={seatMapError} onRetry={() => openSeatMapModal(seatMapRoom)} /> :
          !seatRows.length ? <StateBlock title="Phòng này chưa có ghế" /> :
          <div className="o-seat-editor">
            <div className="o-seat-editor__canvas" role="region" aria-label="Sơ đồ ghế" tabIndex={0}>
              <p className="o-seat-editor__screen">Màn hình</p>
              <div className="o-seat-editor__grid">
                {seatRows.map(rowLabel => (
                  <div key={rowLabel} className="o-seat-editor__row" style={{ '--o-seat-cols': gridColumns.length }}>
                    <span>{rowLabel}</span>
                    {gridColumns.map(seatNumber => {
                      const seat = getSeatAt(rowLabel, seatNumber);
                      return <div key={seatNumber} className="o-seat-editor__cell" data-empty={!seat || undefined}
                        onDragOver={event => event.preventDefault()} onDrop={() => !savingSeatMap && handleDrop(rowLabel, seatNumber)}>
                        {seat && <button type="button" draggable={!savingSeatMap} className="o-seat-editor__seat" data-tier={seat.seatType}
                          aria-label={seat.seatCode + ', ' + (seatTypeMap[seat.seatType] || seat.seatType)}
                          aria-pressed={seat.seatId === selectedSeatId}
                          onDragStart={() => setDraggedSeatId(seat.seatId)} onDragEnd={() => setDraggedSeatId(null)}
                          onClick={() => { setSelectedSeatId(seat.seatId); setDestination(''); }}>{seat.seatCode}</button>}
                      </div>;
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div className="o-form">
              <h3>Thuộc tính ghế</h3>
              {selectedSeat && <>
                <p>Ghế <Code>{selectedSeat.seatCode}</Code></p>
                <Field label="Loại ghế"><Select value={selectedSeat.seatType || 'STANDARD'} disabled={savingSeatMap}
                  onChange={event => updateSeatLocal(selectedSeat.seatId, { seatType: event.target.value })}>
                  {Object.entries(seatTypeMap).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </Select></Field>
                <Field label="Chuyển vị trí" hint="Nếu vị trí đã có ghế, hai ghế sẽ đổi chỗ."><Select value={destination}
                  disabled={savingSeatMap} onChange={event => setDestination(event.target.value)}>
                  <option value="">Chọn vị trí</option>
                  {seatRows.map(row => <optgroup key={row} label={'Hàng ' + row}>
                    {gridColumns.map(column => <option key={column} value={row + '/' + column}
                      disabled={row === selectedSeat.rowLabel && column === selectedSeat.seatNumber}>{row}{column}</option>)}
                  </optgroup>)}
                </Select></Field>
                <OpsButton disabled={!destination || savingSeatMap} onClick={() => {
                  const [row, column] = destination.split('/');
                  moveSeatTo(selectedSeat.seatId, row, Number(column));
                }}>Chuyển ghế</OpsButton>
                <div>
                  <p>Đổi cả hàng {selectedSeat.rowLabel}</p>
                  <div className="o-actions">
                    {Object.entries(seatTypeMap).map(([value, label]) => <OpsButton size="sm" key={value} disabled={savingSeatMap}
                      onClick={() => updateRowSeatsLocal(selectedSeat.rowLabel, { seatType: value })}>{label}</OpsButton>)}
                  </div>
                </div>
              </>}
              <ul className="o-seat-editor__legend" aria-label="Chú thích loại ghế">
                {Object.entries(seatTypeMap).map(([value, label]) => <li key={value}>
                  <span className="o-seat-editor__swatch" data-tier={value} aria-hidden="true" />{label}
                </li>)}
              </ul>
            </div>
          </div>}
      </OpsDialog>
      <OpsConfirm open={Boolean(confirmTarget)} title={deleteLabel}
        message={confirmTarget && deleteLabel + ' ' + confirmTarget.name + '? Thao tác này không thể hoàn tác.'}
        confirmLabel={deleteLabel} loading={deleting} onConfirm={executeConfirmDelete} onClose={() => setConfirmTarget(null)} />
    </OpsPage>
  );
};

export default BranchManagement;
