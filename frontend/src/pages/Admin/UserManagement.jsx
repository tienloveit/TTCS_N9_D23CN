import { DataTable, FilterBar, OpsButton, OpsConfirm, OpsDialog, OpsPage, OpsPanel, Segmented, StatusBadge, Field, ChoiceCards } from '../../components/Ops';
import { useState, useEffect, useMemo } from 'react';
import { branchApi, userApi } from '../../api';
import { toast } from 'react-toastify';
import PasswordField from '../../components/Common/PasswordField';
import { useAuth } from '../../context/useAuth';
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
  const [loadError, setLoadError] = useState(false);
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
      setLoadError(true);
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
        toast.success(`Đã cập nhật người dùng "${formData.username}"`);
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
        toast.success(`Đã tạo tài khoản "${formData.username}"`);
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


  /* ─────────── RENDER ─────────── */
  return (
    <OpsPage title="Quản lý người dùng" description={isManager ? 'Quản lý nhân viên tại chi nhánh.' : 'Quản lý tài khoản trên toàn hệ thống.'} actions={<OpsButton variant="primary" icon={<PlusIcon />} onClick={openAddModal}>
          Thêm người dùng
        </OpsButton>}>
      {/* Page header */}

      {/* Table card */}
      <FilterBar search={searchTerm} onSearchChange={setSearchTerm} searchLabel="Tìm người dùng" searchPlaceholder="Tìm username, tên, email, SĐT..."
        filtered={Boolean(searchTerm || roleFilter !== 'ALL' || statusFilter !== 'ALL')} onReset={() => { setSearchTerm(''); setRoleFilter('ALL'); setStatusFilter('ALL'); }} resultLabel={`${filtered.length} người dùng`}>
        <Segmented label="Vai trò" value={roleFilter} onChange={setRoleFilter} options={(isManager
              ? [{ key: 'ALL', label: 'Tất cả' }, { key: 'STAFF', label: 'Staff' }]
              : [
                  { key: 'ALL', label: 'Tất cả' },
                  { key: 'ADMIN', label: 'Admin' },
                  { key: 'MANAGER', label: 'Manager' },
                  { key: 'STAFF', label: 'Staff' },
                  { key: 'USER', label: 'User' },
                ]).map(tab => {
                const count =
                tab.key === 'ALL'
                  ? users.length
                  : users.filter((u) => u.role === tab.key).length;
                return { value: tab.key, label: tab.label, count };
              })} />
        <Field label="Trạng thái tài khoản"><select
              className="o-input"
              aria-label="Lọc theo trạng thái tài khoản"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Mọi trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="BLOCKED">Bị khóa</option>
            </select></Field>
      </FilterBar>
      <OpsPanel flush title="Người dùng">

        <DataTable caption="Người dùng" rows={filtered} rowKey={user => user.id}
          state={loading ? 'loading' : loadError ? 'error' : 'ready'} onRetry={fetchUsers}
          empty={{ title: 'Không có người dùng phù hợp', action: { label: 'Làm mới', onClick: fetchUsers } }}
          columns={[
            { key: 'index', header: "#", render: (user, idx) => idx + 1 },
            { key: 'tai_khoan', header: "Tài khoản", render: user => <> <div className="o-media">
                        <div className="o-account__avatar" aria-hidden="true">
                          {(user.username || 'U').charAt(0).toUpperCase()}
                        </div>
                        <span className="o-table-value">{user.username}</span>
                      </div> </> },
            { key: 'ho_ten', header: "Họ tên", render: user => user.fullName || '—' },
            { key: 'email', header: "Email", render: user => user.email || '—' },
            { key: 'sdt', header: "SĐT", render: user => user.phoneNumber || '—' },
            { key: 'vai_tro', header: "Vai trò", render: user => {
              const roleInfo = getRoleInfo(user.role);
              return (<> <StatusBadge>{roleInfo.label}</StatusBadge> </>);
            } },
            { key: 'trang_thai', header: "Trạng thái", render: user => <> <StatusBadge
                        tone={user.status === 'ACTIVE' ? 'success' : user.status === 'BLOCKED' ? 'danger' : 'warning'}
                      >
                        {user.status === 'ACTIVE' ? 'Hoạt động' : user.status === 'BLOCKED' ? 'Bị khóa' : user.status || '—'}
                      </StatusBadge> </> },
            { key: 'ngay_tao', header: "Ngày tạo", render: user => formatDate(user.createdAt) },
            { key: 'hanh_dong', header: "Hành động", render: user => <> <div className="o-actions">
                        {/* Sửa */}
                        <OpsButton
                          variant="ghost"
                          size="sm"
                          title="Sửa người dùng"
                          aria-label={`Sửa tài khoản ${user.username}`}
                          icon={<EditIcon />}
                          onClick={() => openEditModal(user)}
                        />

                        {/* Khóa / Mở khóa */}
                        <OpsButton
                          variant="ghost"
                          size="sm"
                          title={user.status === 'BLOCKED' ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                          aria-label={`${user.status === 'BLOCKED' ? 'Mở khóa' : 'Khóa'} tài khoản ${user.username}`}
                          icon={user.status === 'BLOCKED' ? <UnlockIcon /> : <LockIcon />}
                          onClick={() => handleToggleStatus(user)}
                        />

                        {/* Xóa */}
                        <OpsButton
                          variant="ghost-danger"
                          size="sm"
                          title="Xóa tài khoản"
                          aria-label={`Xóa tài khoản ${user.username}`}
                          icon={<TrashIcon />}
                          onClick={() => handleDelete(user)}
                        />
                      </div> </> }
          ]} />
      </OpsPanel>

      {/* ─── Modal Thêm / Sửa ─── */}
      {isModalOpen && (
        <OpsDialog open title={editingUser ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'} onClose={closeModal} disabled={submitting} size="md" footer={<><OpsButton onClick={closeModal} disabled={submitting}>Hủy</OpsButton>
                <OpsButton type="submit" form="o-user-form" variant="primary" disabled={submitting}>
                  {submitting ? 'Đang lưu...' : editingUser ? 'Lưu tài khoản' : 'Tạo tài khoản'}
                </OpsButton></>}>

            {/* Form */}
            <form id="o-user-form" onSubmit={handleSubmit} className="o-form-grid">

              {/* Username — chỉ hiển thị khi thêm mới */}
              {!editingUser && (
                <div className="o-field">
                  <label className="o-field__label" htmlFor="user-username">Tên đăng nhập <span className="o-required" aria-hidden="true">*</span></label>
                  <input
                    id="user-username" type="text" name="username" className="o-input"
                    value={formData.username} onChange={handleInputChange}
                    required placeholder="Ví dụ: nguyenvana"
                  />
                </div>
              )}

              {/* Password — chỉ bắt buộc khi thêm mới */}
              {!editingUser && (
                <PasswordField appearance="ops" id="user-password" label="Mật khẩu" name="password"
                  autoComplete="new-password" value={formData.password} onChange={handleInputChange}
                  placeholder="Tối thiểu 6 ký tự" minLength={6} required />
              )}

              {/* Họ tên */}
              <div className={`o-field${editingUser ? '' : ' o-form-grid__wide'}`}>
                <label className="o-field__label" htmlFor="user-fullname">Họ và tên</label>
                <input
                  id="user-fullname" type="text" name="fullName" className="o-input"
                  value={formData.fullName} onChange={handleInputChange}
                  placeholder="Nguyễn Văn A"
                />
              </div>

              {/* Email */}
              <Field label="Email">
                <input
                  id="user-email" type="email" name="email" className="o-input"
                  value={formData.email} onChange={handleInputChange}
                  placeholder="example@gmail.com"
                />
              </Field>

              {/* SĐT */}
              <Field label="Số điện thoại">
                <input
                  id="user-phone" type="tel" name="phoneNumber" className="o-input"
                  value={formData.phoneNumber} onChange={handleInputChange}
                  placeholder="0901234567"
                />
              </Field>

              {/* Giới tính */}
              <Field label="Giới tính">
                <select id="user-gender" name="gender" className="o-input" value={formData.gender} onChange={handleInputChange}>
                  {GENDER_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>

              {/* Ngày sinh */}
              <Field label="Ngày sinh">
                <input
                  id="user-dob" type="date" name="dob" className="o-input"
                  value={formData.dob} onChange={handleInputChange}
                />
              </Field>

              {/* Vai trò — chỉ admin mới assign */}
              <ChoiceCards className="o-form-grid__wide" name="role" label="Vai trò" options={roleOptions}
                value={formData.role} onChange={role => handleInputChange({ target: { name: 'role', value: role } })} />

              {['MANAGER', 'STAFF'].includes(formData.role) && (
                <Field label="Chi nhánh quản lý" className="o-form-grid__wide">
                <select
                    id="user-branch"
                    name="branchId"
                    className="o-input"
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
              </Field>
              )}

              {/* Buttons */}

            </form>
          </OpsDialog>
      )}

      <OpsConfirm
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
        confirmText={confirmState?.type === 'DELETE' ? 'Xóa tài khoản' : confirmState?.payload?.status === 'BLOCKED' ? 'Mở khóa' : 'Khóa tài khoản'}
        variant={
          confirmState?.type === 'STATUS' && confirmState?.payload?.status === 'BLOCKED'
            ? 'primary'
            : 'danger'
        }
        loading={confirming}
        onConfirm={executeConfirmedAction}
        onCancel={() => setConfirmState(null)}
      />
    </OpsPage>
  );
};

export default UserManagement;
