import { useState, useEffect, useMemo } from 'react';
import { branchApi, userApi } from '../../api';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/useAuth';
import Badge from '../../components/Common/Badge';
import Button from '../../components/Common/Button';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import useModalDialog from '../../components/Common/useModalDialog';
import {
  EditIcon as LucideEditIcon,
  LockIcon as LucideLockIcon,
  PlusIcon as LucidePlusIcon,
  SearchIcon,
  TrashIcon as LucideTrashIcon,
  UnlockIcon as LucideUnlockIcon,
  XIcon,
} from '../../components/Common/CinemaIcons';
import { formatDate as formatCinemaDate } from '../../utils/cinemaTime';

/* ─── Icons ─────────────────────────────────────────────── */
const LockIcon = () => <LucideLockIcon size={15} />;
const UnlockIcon = () => <LucideUnlockIcon size={15} />;
const EditIcon = () => <LucideEditIcon size={15} />;
const TrashIcon = () => <LucideTrashIcon size={15} />;
const PlusIcon = () => <LucidePlusIcon size={18} />;

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
  const [confirmState, setConfirmState] = useState(null); // { type: 'DELETE' | 'STATUS', payload }
  const [confirming, setConfirming] = useState(false);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);   // null = add mode
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const dialog = useModalDialog(isModalOpen, () => closeModal(), { disabled: submitting });
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
        toast.success(`Đã xóa tài khoản "${target.username}"`);
        fetchUsers();
      } else if (confirmState.type === 'STATUS') {
        const target = confirmState.payload;
        const newStatus = target.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED';
        await userApi.updateStatus(target.id, newStatus);
        toast.success(newStatus === 'BLOCKED' ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản');
        fetchUsers();
      }
      setConfirmState(null);
    } catch (err) {
      toast.error('Thao tác thất bại: ' + (err.response?.data?.message || err.message));
    } finally {
      setConfirming(false);
    }
  };

  /* ── Helpers ── */
  const formatDate = (d) => formatCinemaDate(d);
  const getRoleInfo = (role) => {
    const map = {
      MANAGER: { label: 'Manager', tone: 'info' },
      ADMIN: { label: 'Admin', tone: 'brand' },
      STAFF: { label: 'Staff', tone: 'warning' },
      USER: { label: 'User', tone: 'neutral' },
    };
    return map[role] || { label: role, tone: 'neutral' };
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
      <div className="page-header page-header--split">
        <div>
          <h1 className="page-title">Quản lý người dùng</h1>
          <p className="page-subtitle">
            Tổng cộng <strong>{users.length}</strong> tài khoản trong hệ thống.
          </p>
        </div>
        <Button variant="primary" icon={<PlusIcon />} onClick={openAddModal}>
          Thêm người dùng
        </Button>
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

          <div className="admin-toolbar-filters">
            <select
              className="input input-sm input-auto"
              aria-label="Lọc theo trạng thái tài khoản"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Mọi trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="BLOCKED">Bị khóa</option>
            </select>

            <div className="admin-search">
              <SearchIcon size={16} className="input-leading-icon" aria-hidden="true" />
              <input
                type="search"
                className="input input-sm"
                placeholder="Tìm username, tên, email, SĐT..."
                aria-label="Tìm người dùng"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th className="col-index">#</th>
              <th>Tài khoản</th>
              <th>Họ tên</th>
              <th>Email</th>
              <th>SĐT</th>
              <th>Vai trò</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
              <th className="col-actions">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="9" className="admin-table-empty">
                  {searchTerm ? 'Không tìm thấy người dùng phù hợp. Thử từ khóa khác.' : 'Chưa có người dùng nào.'}
                </td>
              </tr>
            ) : (
              filtered.map((user, idx) => {
                const roleInfo = getRoleInfo(user.role);
                return (
                  <tr key={user.id || idx}>
                    <td className="cell-index">{idx + 1}</td>
                    <td>
                      <div className="admin-media-cell">
                        <div className="admin-avatar" aria-hidden="true">
                          {(user.username || 'U').charAt(0).toUpperCase()}
                        </div>
                        <span className="cell-strong">{user.username}</span>
                      </div>
                    </td>
                    <td>{user.fullName || '—'}</td>
                    <td className="cell-muted cell-break">{user.email || '—'}</td>
                    <td>{user.phoneNumber || '—'}</td>
                    <td>
                      <Badge tone={roleInfo.tone}>{roleInfo.label}</Badge>
                    </td>
                    <td>
                      <Badge
                        tone={user.status === 'ACTIVE' ? 'success' : user.status === 'BLOCKED' ? 'danger' : 'warning'}
                        dot
                      >
                        {user.status === 'ACTIVE' ? 'Hoạt động' : user.status === 'BLOCKED' ? 'Bị khóa' : user.status || '—'}
                      </Badge>
                    </td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td>
                      <div className="action-btns">
                        {/* Sửa */}
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Sửa người dùng"
                          aria-label={`Sửa tài khoản ${user.username}`}
                          icon={<EditIcon />}
                          onClick={() => openEditModal(user)}
                        />

                        {/* Khóa / Mở khóa */}
                        <Button
                          variant="ghost"
                          size="sm"
                          title={user.status === 'BLOCKED' ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                          aria-label={`${user.status === 'BLOCKED' ? 'Mở khóa' : 'Khóa'} tài khoản ${user.username}`}
                          icon={user.status === 'BLOCKED' ? <UnlockIcon /> : <LockIcon />}
                          onClick={() => handleToggleStatus(user)}
                        />

                        {/* Xóa */}
                        <Button
                          variant="ghost-danger"
                          size="sm"
                          title="Xóa tài khoản"
                          aria-label={`Xóa tài khoản ${user.username}`}
                          icon={<TrashIcon />}
                          onClick={() => handleDelete(user)}
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

      {/* ─── Modal Thêm / Sửa ─── */}
      {isModalOpen && (
        <div className="modal-overlay" {...dialog.overlayProps}>
          <div className="modal-content admin-modal admin-modal--md" {...dialog.contentProps}>
            {/* Header */}
            <div className="admin-modal-header">
              <div>
                <h2 id={dialog.titleId}>
                  {editingUser ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}
                </h2>
                <p>
                  {editingUser
                    ? `Tài khoản: ${editingUser.username}`
                    : 'Trường có dấu * là bắt buộc.'}
                </p>
              </div>
              <button type="button" onClick={closeModal} className="modal-close modal-close--inline modal-close--lg" aria-label="Đóng">
                <XIcon size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="admin-form admin-form--grid">

              {/* Username — chỉ hiển thị khi thêm mới */}
              {!editingUser && (
                <div className="form-group">
                  <label className="form-label" htmlFor="user-username">Tên đăng nhập <span className="required-mark" aria-hidden="true">*</span></label>
                  <input
                    id="user-username" type="text" name="username" className="input"
                    value={formData.username} onChange={handleInputChange}
                    required placeholder="Ví dụ: nguyenvana"
                  />
                </div>
              )}

              {/* Password — chỉ bắt buộc khi thêm mới */}
              {!editingUser && (
                <div className="form-group">
                  <label className="form-label" htmlFor="user-password">Mật khẩu <span className="required-mark" aria-hidden="true">*</span></label>
                  <input
                    id="user-password" type="password" name="password" className="input"
                    value={formData.password} onChange={handleInputChange}
                    required minLength={6} placeholder="Tối thiểu 6 ký tự"
                  />
                </div>
              )}

              {/* Họ tên */}
              <div className={`form-group${editingUser ? '' : ' span-full'}`}>
                <label className="form-label" htmlFor="user-fullname">Họ và tên</label>
                <input
                  id="user-fullname" type="text" name="fullName" className="input"
                  value={formData.fullName} onChange={handleInputChange}
                  placeholder="Nguyễn Văn A"
                />
              </div>

              {/* Email */}
              <div className="form-group">
                <label className="form-label" htmlFor="user-email">Email</label>
                <input
                  id="user-email" type="email" name="email" className="input"
                  value={formData.email} onChange={handleInputChange}
                  placeholder="example@gmail.com"
                />
              </div>

              {/* SĐT */}
              <div className="form-group">
                <label className="form-label" htmlFor="user-phone">Số điện thoại</label>
                <input
                  id="user-phone" type="tel" name="phoneNumber" className="input"
                  value={formData.phoneNumber} onChange={handleInputChange}
                  placeholder="0901234567"
                />
              </div>

              {/* Giới tính */}
              <div className="form-group">
                <label className="form-label" htmlFor="user-gender">Giới tính</label>
                <select id="user-gender" name="gender" className="input" value={formData.gender} onChange={handleInputChange}>
                  {GENDER_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Ngày sinh */}
              <div className="form-group">
                <label className="form-label" htmlFor="user-dob">Ngày sinh</label>
                <input
                  id="user-dob" type="date" name="dob" className="input"
                  value={formData.dob} onChange={handleInputChange}
                />
              </div>

              {/* Vai trò — chỉ admin mới assign */}
              <fieldset className="form-group span-full">
                <legend className="form-label">Vai trò</legend>
                <div className="admin-choice-group">
                  {roleOptions.map(o => (
                    <label
                      key={o.value}
                      className={`admin-choice${formData.role === o.value ? ' is-checked' : ''}`}
                    >
                      <input
                        type="radio" name="role" value={o.value}
                        checked={formData.role === o.value}
                        onChange={handleInputChange}
                      />
                      <span>{o.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {['MANAGER', 'STAFF'].includes(formData.role) && (
                <div className="form-group span-full">
                  <label className="form-label" htmlFor="user-branch">Chi nhánh quản lý</label>
                  <select
                    id="user-branch"
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
              <div className="admin-form-actions span-full">
                <Button onClick={closeModal}>Hủy</Button>
                <Button type="submit" variant="primary" disabled={submitting}>
                  {submitting ? 'Đang lưu...' : editingUser ? 'Lưu tài khoản' : 'Tạo tài khoản'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmState)}
        title={
          confirmState?.type === 'DELETE'
            ? 'Xóa tài khoản người dùng'
            : confirmState?.payload?.status === 'BLOCKED'
              ? 'Mở khóa tài khoản'
              : 'Khóa tài khoản'
        }
        message={
          confirmState?.type === 'DELETE'
            ? `Bạn có chắc chắn muốn xóa tài khoản "${confirmState?.payload?.username}"?\nHành động này không thể hoàn tác.`
            : confirmState?.payload?.status === 'BLOCKED'
              ? `Mở khóa hoạt động cho tài khoản "${confirmState?.payload?.username}"?`
              : `Khóa quyền truy cập của tài khoản "${confirmState?.payload?.username}"?`
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
