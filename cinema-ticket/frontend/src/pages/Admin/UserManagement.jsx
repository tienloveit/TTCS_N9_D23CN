import { useState, useEffect, useMemo } from 'react';
import { branchApi, staffApi, userApi } from '../../api';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/useAuth';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import {
  EditIcon as LucideEditIcon,
  EyeIcon,
  LockIcon as LucideLockIcon,
  PlusIcon as LucidePlusIcon,
  SearchIcon,
  TrashIcon as LucideTrashIcon,
  UnlockIcon as LucideUnlockIcon,
  XIcon,
} from '../../components/Common/CinemaIcons';

/* ─── Icons ─────────────────────────────────────────────── */
const LockIcon = () => <LucideLockIcon size={15} />;
const UnlockIcon = () => <LucideUnlockIcon size={15} />;
const EditIcon = () => <LucideEditIcon size={15} />;
const TrashIcon = () => <LucideTrashIcon size={15} />;
const PlusIcon = () => <LucidePlusIcon size={18} />;
const DetailIcon = () => <EyeIcon size={15} />;

/* ─── Constants ──────────────────────────────────────────── */
const ROLE_OPTIONS = [
  { value: 'MANAGER', label: 'Manager' },
  { value: 'USER', label: 'User' },
  { value: 'STAFF', label: 'Staff' },
  { value: 'ADMIN', label: 'Admin' },
];

const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Nam' },
  { value: 'FEMALE', label: 'Nữ' },
  { value: 'OTHER', label: 'Khác' },
];

const EMPTY_FORM = {
  username: '',
  fullName: '',
  email: '',
  phoneNumber: '',
  password: '',
  gender: 'MALE',
  dob: '',
  role: 'USER',
  branchId: '',
};

/* ─── Component ──────────────────────────────────────────── */
const UserManagement = () => {
  const { isManager, user } = useAuth();
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [confirmState, setConfirmState] = useState(null); // { type: 'DELETE' | 'STATUS' | 'SCHEDULE', payload }
  const [confirming, setConfirming] = useState(false);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);   // null = add mode
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [staffDetail, setStaffDetail] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({
    startTime: '',
    endTime: '',
    position: 'Quầy vé',
    note: '',
  });
  const roleOptions = isManager
    ? ROLE_OPTIONS.filter((option) => option.value === 'STAFF')
    : ROLE_OPTIONS;

  /* ── Fetch ── */
  const fetchUsers = async () => {
    try {
      const res = await userApi.getAll();
      const result = res.data.result;
      setUsers(result?.data || result || []);
    } catch (err) {
      console.error('Lỗi khi tải người dùng:', err);
      toast.error('Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await branchApi.getAll();
      setBranches(res.data.result || []);
    } catch {
      setBranches([]);
    }
  };

  useEffect(() => { fetchUsers(); fetchBranches(); }, []);

  /* ── Modal helpers ── */
  const openAddModal = () => {
    setEditingUser(null);
    setFormData({
      ...EMPTY_FORM,
      role: isManager ? 'STAFF' : EMPTY_FORM.role,
      branchId: isManager ? String(user?.branchId || '') : '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username || '',
      fullName: user.fullName || '',
      email: user.email || '',
      phoneNumber: user.phoneNumber || '',
      password: '',                          // không gửi password khi edit
      gender: user.gender || 'MALE',
      dob: user.dob || '',
      role: user.role || 'CUSTOMER',
      branchId: user.branchId ? String(user.branchId) : '',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openDetailModal = async (staff) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setStaffDetail(null);
    try {
      const res = await staffApi.getStaffDetail(staff.id);
      setStaffDetail(res.data.result);
    } catch (err) {
      toast.error('Không tải được chi tiết nhân viên: ' + (err.response?.data?.message || err.message));
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const reloadStaffDetail = async () => {
    if (!staffDetail?.staff?.id) return;
    const res = await staffApi.getStaffDetail(staffDetail.staff.id);
    setStaffDetail(res.data.result);
  };

  const handleScheduleInputChange = (event) => {
    const { name, value } = event.target;
    setScheduleForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateSchedule = async (event) => {
    event.preventDefault();
    if (!staffDetail?.staff?.id) return;
    try {
      await staffApi.createSchedule({
        staffId: staffDetail.staff.id,
        startTime: scheduleForm.startTime,
        endTime: scheduleForm.endTime,
        position: scheduleForm.position,
        note: scheduleForm.note,
      });
      toast.success('Đã lên lịch trực');
      setScheduleForm({ startTime: '', endTime: '', position: 'Quầy vé', note: '' });
      await reloadStaffDetail();
    } catch (err) {
      toast.error('Không tạo được lịch trực: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleCancelSchedule = (scheduleId) => {
    setConfirmState({ type: 'SCHEDULE', payload: scheduleId });
  };

  /* ── Submit (Add / Edit) ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingUser) {
        // Sửa: dùng UpdateUserRequest (fullName, dob, phoneNumber, gender, email, role)
        const payload = {
          fullName: formData.fullName,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          gender: formData.gender,
          dob: formData.dob || null,
          role: isManager ? 'STAFF' : formData.role,
          branchId: ['MANAGER', 'STAFF'].includes(isManager ? 'STAFF' : formData.role) ? Number(formData.branchId) : null,
        };
        await userApi.update(editingUser.id, payload);
        toast.success(`Cập nhật người dùng "${formData.username}" thành công!`);
      } else {
        // Thêm mới: dùng CreateUserRequest
        const payload = {
          username: formData.username,
          fullName: formData.fullName,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          password: formData.password,
          gender: formData.gender,
          dob: formData.dob || null,
          role: isManager ? 'STAFF' : formData.role,
          branchId: ['MANAGER', 'STAFF'].includes(isManager ? 'STAFF' : formData.role) ? Number(formData.branchId) : null,
        };
        await userApi.create(payload);
        toast.success(`Tạo tài khoản "${formData.username}" thành công!`);
      }
      closeModal();
      fetchUsers();
    } catch (err) {
      toast.error('Lỗi: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Delete ── */
  const handleDelete = (targetUser) => {
    setConfirmState({ type: 'DELETE', payload: targetUser });
  };

  /* ── Toggle status ── */
  const handleToggleStatus = (targetUser) => {
    setConfirmState({ type: 'STATUS', payload: targetUser });
  };

  const executeConfirmedAction = async () => {
    if (!confirmState) return;
    setConfirming(true);
    try {
      if (confirmState.type === 'DELETE') {
        const target = confirmState.payload;
        await userApi.delete(target.id);
        toast.success(`Đã xoá tài khoản "${target.username}"`);
        fetchUsers();
      } else if (confirmState.type === 'STATUS') {
        const target = confirmState.payload;
        const newStatus = target.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED';
        await userApi.updateStatus(target.id, newStatus);
        toast.success(newStatus === 'BLOCKED' ? 'Đã khoá tài khoản' : 'Đã mở khoá tài khoản');
        fetchUsers();
      } else if (confirmState.type === 'SCHEDULE') {
        await staffApi.cancelSchedule(confirmState.payload);
        toast.success('Đã huỷ lịch trực');
        await reloadStaffDetail();
      }
      setConfirmState(null);
    } catch (err) {
      toast.error('Thao tác thất bại: ' + (err.response?.data?.message || err.message));
    } finally {
      setConfirming(false);
    }
  };

  /* ── Helpers ── */
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
  const formatDateTime = (d) => d ? new Date(d).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }) : '—';
  const formatCurrency = (amount) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(amount || 0));
  const formatDuration = (minutes) => {
    if (minutes == null) return '—';
    const hours = Math.floor(Number(minutes) / 60);
    const mins = Number(minutes) % 60;
    return hours > 0 ? `${hours} giờ ${mins} phút` : `${mins} phút`;
  };

  const getRoleInfo = (role) => {
    const map = {
      MANAGER: { label: 'Manager', color: 'rgba(139,92,246,0.1)', text: 'var(--purple)' },
      ADMIN: { label: 'Admin', color: 'rgba(229,9,20,0.1)', text: 'var(--accent)' },
      STAFF: { label: 'Staff', color: 'rgba(59,130,246,0.1)', text: 'var(--blue)' },
      USER: { label: 'User', color: 'rgba(16,185,129,0.1)', text: 'var(--green)' },
    };
    return map[role] || { label: role, color: 'transparent', text: 'var(--text-muted)' };
  };

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
      if (statusFilter !== 'ALL' && u.status !== statusFilter) return false;
      const q = searchTerm.toLowerCase().trim();
      if (!q) return true;
      return [u.username, u.fullName, u.email, u.phoneNumber].some((f) =>
        f?.toLowerCase().includes(q)
      );
    });
  }, [users, roleFilter, statusFilter, searchTerm]);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  /* ─────────── RENDER ─────────── */
  return (
    <div>
      {/* Page header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Quản lý Người dùng</h1>
          <p className="page-subtitle">
            Tổng cộng <strong>{users.length}</strong> tài khoản trong hệ thống.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <PlusIcon />
          Thêm người dùng
        </button>
      </div>

      {/* Table card */}
      <div className="admin-table-card">
        <div className="console-toolbar">
          <div className="console-status-tabs">
            {(isManager
              ? [{ key: 'ALL', label: 'Tất cả' }, { key: 'STAFF', label: 'Staff' }]
              : [
                  { key: 'ALL', label: 'Tất cả' },
                  { key: 'ADMIN', label: 'Admin' },
                  { key: 'MANAGER', label: 'Manager' },
                  { key: 'STAFF', label: 'Staff' },
                  { key: 'USER', label: 'User' },
                ]
            ).map((tab) => {
              const count =
                tab.key === 'ALL'
                  ? users.length
                  : users.filter((u) => u.role === tab.key).length;
              return (
                <button
                  key={tab.key}
                  type="button"
                  className={`console-status-tab ${roleFilter === tab.key ? 'is-active' : ''}`}
                  onClick={() => setRoleFilter(tab.key)}
                >
                  <span>{tab.label}</span>
                  <span className="console-status-count">{count}</span>
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              className="input"
              style={{ width: 'auto', height: 38, fontSize: '0.84rem' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Mọi trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="BLOCKED">Bị khoá</option>
            </select>

            <div style={{ position: 'relative', minWidth: '250px' }}>
              <SearchIcon
                size={16}
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}
              />
              <input
                type="text"
                className="input"
                placeholder="Tìm username, tên, email, SĐT..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '40px', height: 38, background: 'var(--bg-input)' }}
              />
            </div>
          </div>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>#</th>
              <th>Tài khoản</th>
              <th>Họ tên</th>
              <th>Email</th>
              <th>SĐT</th>
              <th>Vai trò</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
              <th style={{ width: '130px' }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  {searchTerm ? 'Không tìm thấy người dùng phù hợp' : 'Chưa có người dùng nào'}
                </td>
              </tr>
            ) : (
              filtered.map((user, idx) => {
                const roleInfo = getRoleInfo(user.role);
                return (
                  <tr key={user.id || idx}>
                    <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                          background: 'linear-gradient(135deg, var(--purple), var(--blue))',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: '0.8rem', color: '#fff',
                        }}>
                          {(user.username || 'U').charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.username}</span>
                      </div>
                    </td>
                    <td>{user.fullName || '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{user.email || '—'}</td>
                    <td>{user.phoneNumber || '—'}</td>
                    <td>
                      <span className="status-badge" style={{ background: roleInfo.color, color: roleInfo.text }}>
                        {roleInfo.label}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${user.status === 'ACTIVE' ? 'status--active' : user.status === 'BLOCKED' ? 'status--inactive' : 'status--pending'}`}>
                        {user.status === 'ACTIVE' ? 'Hoạt động' : user.status === 'BLOCKED' ? 'Bị khoá' : user.status || '—'}
                      </span>
                    </td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td>
                      <div className="action-btns">
                        {user.role === 'STAFF' && (
                          <button
                            className="btn btn-ghost btn-sm"
                            title="Xem lịch làm việc / lịch trực"
                            onClick={() => openDetailModal(user)}
                          >
                            <DetailIcon />
                          </button>
                        )}
                        {/* Sửa */}
                        <button
                          className="btn btn-ghost btn-sm"
                          title="Chỉnh sửa người dùng"
                          onClick={() => openEditModal(user)}
                        >
                          <EditIcon />
                        </button>

                        {/* Khoá / Mở khoá */}
                        <button
                          className="btn btn-ghost btn-sm"
                          title={user.status === 'BLOCKED' ? 'Mở khoá tài khoản' : 'Khoá tài khoản'}
                          style={{ color: user.status === 'BLOCKED' ? '#10b981' : '#f59e0b' }}
                          onClick={() => handleToggleStatus(user)}
                        >
                          {user.status === 'BLOCKED' ? <UnlockIcon /> : <LockIcon />}
                        </button>

                        {/* Xoá */}
                        <button
                          className="btn btn-ghost btn-sm"
                          title="Xoá tài khoản"
                          style={{ color: '#ef4444' }}
                          onClick={() => handleDelete(user)}
                        >
                          <TrashIcon />
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

      {/* ─── Modal Thêm / Sửa ─── */}
      {detailOpen && (
        <div className="modal-overlay" onClick={() => setDetailOpen(false)}>
          <div
            className="modal-content admin-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '1100px', maxHeight: '92vh', overflowY: 'auto', padding: 28 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 4 }}>Chi tiết nhân viên</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Xem lịch trực được phân công và lịch sử ca làm tại chi nhánh.
                </p>
              </div>
              <button type="button" onClick={() => setDetailOpen(false)} className="modal-close" style={{ position: 'static', width: 34, height: 34 }} aria-label="Đóng">
                <XIcon size={18} />
              </button>
            </div>

            {detailLoading ? (
              <div className="loading"><div className="spinner" /></div>
            ) : staffDetail ? (
              <div style={{ display: 'grid', gap: 20 }}>
                <div className="analytics-list-row">
                  <div className="analytics-list-main">
                    <strong>{staffDetail.staff?.fullName || staffDetail.staff?.username}</strong>
                    <span>{staffDetail.staff?.email || '—'} · {staffDetail.staff?.phoneNumber || '—'}</span>
                  </div>
                  <div className="analytics-list-value">
                    <strong>{staffDetail.staff?.username}</strong>
                    <span>Chi nhánh #{staffDetail.staff?.branchId || '—'}</span>
                  </div>
                </div>

                <section className="analytics-card" style={{ padding: 18 }}>
                  <div className="analytics-card-header">
                    <h3>Lên lịch trực</h3>
                    <span>{staffDetail.staff?.username}</span>
                  </div>
                  <form onSubmit={handleCreateSchedule} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                    <label>
                      <span className="form-label">Bắt đầu</span>
                      <input type="datetime-local" className="input" name="startTime" value={scheduleForm.startTime} onChange={handleScheduleInputChange} required />
                    </label>
                    <label>
                      <span className="form-label">Kết thúc</span>
                      <input type="datetime-local" className="input" name="endTime" value={scheduleForm.endTime} onChange={handleScheduleInputChange} required />
                    </label>
                    <label>
                      <span className="form-label">Vị trí</span>
                      <input className="input" name="position" value={scheduleForm.position} onChange={handleScheduleInputChange} placeholder="Quầy vé" />
                    </label>
                    <label>
                      <span className="form-label">Ghi chú</span>
                      <input className="input" name="note" value={scheduleForm.note} onChange={handleScheduleInputChange} placeholder="Ví dụ: ca tối" />
                    </label>
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <button className="btn btn-primary" style={{ width: '100%' }}>Thêm lịch</button>
                    </div>
                  </form>
                </section>

                <div className="admin-table-card">
                  <div className="table-header">
                    <h3>Lịch trực</h3>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{staffDetail.schedules?.length || 0} lịch</span>
                  </div>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Thời gian</th>
                        <th>Vị trí</th>
                        <th>Thời lượng</th>
                        <th>Trạng thái</th>
                        <th>Chấm công</th>
                        <th>Người tạo</th>
                        <th>Ghi chú</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(staffDetail.schedules || []).length === 0 ? (
                        <tr><td colSpan="8" style={{ textAlign: 'center', padding: 28, color: 'var(--text-muted)' }}>Chưa có lịch trực.</td></tr>
                      ) : (
                        staffDetail.schedules.map((schedule) => (
                          <tr key={schedule.scheduleId}>
                            <td>
                              <div style={{ display: 'grid', gap: 3 }}>
                                <span>{formatDateTime(schedule.startTime)}</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Đến {formatDateTime(schedule.endTime)}</span>
                              </div>
                            </td>
                            <td>{schedule.position || '—'}</td>
                            <td>{formatDuration(schedule.durationMinutes)}</td>
                            <td>
                              <span className={`status-badge ${schedule.status === 'CANCELLED' ? 'status--inactive' : schedule.status === 'COMPLETED' ? 'status--active' : 'status--pending'}`}>
                                {schedule.status === 'CANCELLED' ? 'Đã huỷ' : schedule.status === 'COMPLETED' ? 'Hoàn tất' : 'Đã lên lịch'}
                              </span>
                            </td>
                            <td>
                              <span className={`status-badge ${schedule.attendanceStatus === 'MISSED' || schedule.attendanceStatus === 'IRREGULAR' ? 'status--pending' : schedule.attendanceStatus === 'ON_TIME' ? 'status--active' : 'status--inactive'}`}>
                                {schedule.attendanceStatus || 'SCHEDULED'}
                              </span>
                              {(schedule.lateMinutes > 0 || schedule.earlyLeaveMinutes > 0) && (
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem', marginTop: 4 }}>
                                  Muộn {schedule.lateMinutes || 0}p, sớm {schedule.earlyLeaveMinutes || 0}p
                                </div>
                              )}
                            </td>
                            <td>{schedule.createdByUsername || '—'}</td>
                            <td>{schedule.note || '—'}</td>
                            <td>{schedule.status !== 'CANCELLED' && <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }} onClick={() => handleCancelSchedule(schedule.scheduleId)}>Huỷ</button>}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="admin-table-card">
                  <div className="table-header">
                    <h3>Lịch sử ca làm</h3>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{staffDetail.shiftHistory?.length || 0} ca</span>
                  </div>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Ca</th>
                        <th>Thời gian</th>
                        <th>Doanh thu</th>
                        <th>Tiền mặt</th>
                        <th>Chênh lệch</th>
                        <th>Đơn/Vé</th>
                        <th>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(staffDetail.shiftHistory || []).length === 0 ? (
                        <tr><td colSpan="7" style={{ textAlign: 'center', padding: 28, color: 'var(--text-muted)' }}>Chưa có ca làm.</td></tr>
                      ) : (
                        staffDetail.shiftHistory.map((shift) => (
                          <tr key={shift.shiftId}>
                            <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>#{shift.shiftId}</td>
                            <td>
                              <div style={{ display: 'grid', gap: 3 }}>
                                <span>{formatDateTime(shift.openedAt)}</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{shift.closedAt ? `Đóng: ${formatDateTime(shift.closedAt)}` : 'Đang mở'}</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{formatDuration(shift.durationMinutes)}</span>
                              </div>
                            </td>
                            <td>{formatCurrency(shift.totalSales)}</td>
                            <td>
                              <div style={{ display: 'grid', gap: 3 }}>
                                <span>Đầu: {formatCurrency(shift.openingCash)}</span>
                                <span>Dự kiến: {formatCurrency(shift.expectedCash)}</span>
                                {shift.closingCash != null && <span>Thực: {formatCurrency(shift.closingCash)}</span>}
                              </div>
                            </td>
                            <td style={{ fontWeight: 700, color: Number(shift.cashDifference || 0) === 0 ? 'var(--text-primary)' : '#ef4444' }}>{shift.cashDifference == null ? '—' : formatCurrency(shift.cashDifference)}</td>
                            <td>{shift.paidBookings} đơn · {shift.ticketsSold} vé</td>
                            <td>
                              <span className={`status-badge ${shift.status === 'OPEN' ? 'status--pending' : 'status--active'}`}>{shift.status === 'OPEN' ? 'Đang mở' : 'Đã đóng'}</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className="modal-content admin-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', padding: '32px' }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '4px' }}>
                  {editingUser ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {editingUser
                    ? `Đang sửa tài khoản: ${editingUser.username}`
                    : 'Điền đầy đủ thông tin để tạo tài khoản mới'}
                </p>
              </div>
              <button type="button" onClick={closeModal} className="modal-close" style={{ position: 'static', width: 34, height: 34 }} aria-label="Đóng">
                <XIcon size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="auth-form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

              {/* Username — chỉ hiển thị khi thêm mới */}
              {!editingUser && (
                <div className="form-group">
                  <label className="form-label">Tên đăng nhập <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="text" name="username" className="input"
                    value={formData.username} onChange={handleInputChange}
                    required placeholder="Ví dụ: nguyenvana"
                  />
                </div>
              )}

              {/* Password — chỉ bắt buộc khi thêm mới */}
              {!editingUser && (
                <div className="form-group">
                  <label className="form-label">Mật khẩu <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="password" name="password" className="input"
                    value={formData.password} onChange={handleInputChange}
                    required minLength={6} placeholder="Tối thiểu 6 ký tự"
                  />
                </div>
              )}

              {/* Họ tên */}
              <div className="form-group" style={editingUser ? {} : { gridColumn: 'span 2' }}>
                <label className="form-label">Họ và tên</label>
                <input
                  type="text" name="fullName" className="input"
                  value={formData.fullName} onChange={handleInputChange}
                  placeholder="Nguyễn Văn A"
                />
              </div>

              {/* Email */}
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email" name="email" className="input"
                  value={formData.email} onChange={handleInputChange}
                  placeholder="example@gmail.com"
                />
              </div>

              {/* SĐT */}
              <div className="form-group">
                <label className="form-label">Số điện thoại</label>
                <input
                  type="tel" name="phoneNumber" className="input"
                  value={formData.phoneNumber} onChange={handleInputChange}
                  placeholder="0901234567"
                />
              </div>

              {/* Giới tính */}
              <div className="form-group">
                <label className="form-label">Giới tính</label>
                <select name="gender" className="input" value={formData.gender} onChange={handleInputChange}>
                  {GENDER_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Ngày sinh */}
              <div className="form-group">
                <label className="form-label">Ngày sinh</label>
                <input
                  type="date" name="dob" className="input"
                  value={formData.dob} onChange={handleInputChange}
                />
              </div>

              {/* Vai trò — chỉ admin mới assign */}
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Vai trò</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {roleOptions.map(o => (
                    <label key={o.value} style={{
                      display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                      flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-md)',
                      border: `2px solid ${formData.role === o.value ? 'var(--accent)' : 'var(--border)'}`,
                      background: formData.role === o.value ? 'var(--accent-glow)' : 'transparent',
                      transition: 'all 0.2s',
                    }}>
                      <input
                        type="radio" name="role" value={o.value}
                        checked={formData.role === o.value}
                        onChange={handleInputChange}
                        style={{ accentColor: 'var(--accent)' }}
                      />
                      <span style={{
                        fontWeight: 600, fontSize: '0.85rem',
                        color: formData.role === o.value ? 'var(--accent)' : 'var(--text-secondary)',
                      }}>
                        {o.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {['MANAGER', 'STAFF'].includes(formData.role) && (
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Chi nhánh quản lý</label>
                  <select
                    name="branchId"
                    className="input"
                    value={formData.branchId}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">-- Chọn chi nhánh --</option>
                    {branches.map((branch) => (
                      <option key={branch.branchId} value={branch.branchId}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Buttons */}
              <div style={{ gridColumn: 'span 2', display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submitting}>
                  {submitting ? 'Đang lưu...' : editingUser ? 'Lưu thay đổi' : 'Tạo tài khoản'}
                </button>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={closeModal}>
                  Huỷ bỏ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmState)}
        title={
          confirmState?.type === 'DELETE'
            ? 'Xoá tài khoản người dùng'
            : confirmState?.type === 'STATUS'
            ? confirmState?.payload?.status === 'BLOCKED'
              ? 'Mở khoá tài khoản'
              : 'Khoá tài khoản'
            : 'Huỷ lịch trực'
        }
        message={
          confirmState?.type === 'DELETE'
            ? `Bạn có chắc chắn muốn xoá tài khoản "${confirmState?.payload?.username}"?\nHành động này không thể hoàn tác.`
            : confirmState?.type === 'STATUS'
            ? confirmState?.payload?.status === 'BLOCKED'
              ? `Mở khoá hoạt động cho tài khoản "${confirmState?.payload?.username}"?`
              : `Khoá quyền truy cập của tài khoản "${confirmState?.payload?.username}"?`
            : 'Bạn có chắc chắn muốn huỷ ca trực này?'
        }
        confirmText="Xác nhận"
        variant={
          confirmState?.type === 'STATUS' && confirmState?.payload?.status === 'BLOCKED'
            ? 'primary'
            : 'danger'
        }
        loading={confirming}
        onConfirm={executeConfirmedAction}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
};

export default UserManagement;
