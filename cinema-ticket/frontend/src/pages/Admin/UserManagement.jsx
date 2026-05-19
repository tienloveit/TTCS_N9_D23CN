import { useState, useEffect } from 'react';
import { branchApi, userApi } from '../../api';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/useAuth';

/* ─── Icons ─────────────────────────────────────────────── */
const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const UnlockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 9.9-1" />
  </svg>
);

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

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

/* ─── Constants ──────────────────────────────────────────── */
const ROLE_OPTIONS = [
  { value: 'MANAGER', label: 'Manager' },
  { value: 'USER',  label: 'Khách hàng' },
  { value: 'STAFF', label: 'Nhân viên'  },
  { value: 'ADMIN', label: 'Admin'       },
];

const GENDER_OPTIONS = [
  { value: 'MALE',   label: 'Nam'   },
  { value: 'FEMALE', label: 'Nữ'    },
  { value: 'OTHER',  label: 'Khác'  },
];

const EMPTY_FORM = {
  username:    '',
  fullName:    '',
  email:       '',
  phoneNumber: '',
  password:    '',
  gender:      'MALE',
  dob:         '',
  role:        'USER',
  branchId:    '',
};

/* ─── Component ──────────────────────────────────────────── */
const UserManagement = () => {
  const { isManager, user } = useAuth();
  const [users,       setUsers]       = useState([]);
  const [branches,    setBranches]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [searchTerm,  setSearchTerm]  = useState('');

  // Modal
  const [isModalOpen,  setIsModalOpen]  = useState(false);
  const [editingUser,  setEditingUser]  = useState(null);   // null = add mode
  const [formData,     setFormData]     = useState(EMPTY_FORM);
  const [submitting,   setSubmitting]   = useState(false);
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
      username:    user.username    || '',
      fullName:    user.fullName    || '',
      email:       user.email       || '',
      phoneNumber: user.phoneNumber || '',
      password:    '',                          // không gửi password khi edit
      gender:      user.gender      || 'MALE',
      dob:         user.dob         || '',
      role:        user.role        || 'CUSTOMER',
      branchId:    user.branchId ? String(user.branchId) : '',
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
          fullName:    formData.fullName,
          email:       formData.email,
          phoneNumber: formData.phoneNumber,
          gender:      formData.gender,
          dob:         formData.dob || null,
          role:        isManager ? 'STAFF' : formData.role,
          branchId:    ['MANAGER', 'STAFF'].includes(isManager ? 'STAFF' : formData.role) ? Number(formData.branchId) : null,
        };
        await userApi.update(editingUser.id, payload);
        toast.success(`Cập nhật người dùng "${formData.username}" thành công!`);
      } else {
        // Thêm mới: dùng CreateUserRequest
        const payload = {
          username:    formData.username,
          fullName:    formData.fullName,
          email:       formData.email,
          phoneNumber: formData.phoneNumber,
          password:    formData.password,
          gender:      formData.gender,
          dob:         formData.dob || null,
          role:        isManager ? 'STAFF' : formData.role,
          branchId:    ['MANAGER', 'STAFF'].includes(isManager ? 'STAFF' : formData.role) ? Number(formData.branchId) : null,
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
  const handleDelete = async (user) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xoá tài khoản "${user.username}"?\nHành động này không thể hoàn tác.`)) return;
    try {
      await userApi.delete(user.id);
      toast.success(`Đã xoá tài khoản "${user.username}"`);
      fetchUsers();
    } catch (err) {
      toast.error('Xoá thất bại: ' + (err.response?.data?.message || err.message));
    }
  };

  /* ── Toggle status ── */
  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED';
    const msg = user.status === 'BLOCKED'
      ? `Mở khoá tài khoản "${user.username}"?`
      : `Khoá tài khoản "${user.username}"?`;
    if (!window.confirm(msg)) return;
    try {
      await userApi.updateStatus(user.id, newStatus);
      toast.success(newStatus === 'BLOCKED' ? 'Đã khoá tài khoản' : 'Đã mở khoá tài khoản');
      fetchUsers();
    } catch {
      toast.error('Cập nhật trạng thái thất bại');
    }
  };

  /* ── Helpers ── */
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

  const getRoleInfo = (role) => {
    const map = {
      MANAGER: { label: 'Manager', color: 'rgba(139,92,246,0.1)', text: 'var(--purple)' },
      ADMIN: { label: 'Admin',      color: 'rgba(229,9,20,0.1)',    text: 'var(--accent)' },
      STAFF: { label: 'Nhân viên',  color: 'rgba(59,130,246,0.1)', text: 'var(--blue)'   },
      USER:  { label: 'Khách hàng', color: 'rgba(16,185,129,0.1)', text: 'var(--green)'  },
    };
    return map[role] || { label: role, color: 'transparent', text: 'var(--text-muted)' };
  };

  const filtered = users.filter((u) =>
    [u.username, u.fullName, u.email, u.phoneNumber].some((f) =>
      f?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

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
        <div className="table-header">
          <div style={{ position: 'relative', maxWidth: '340px', flex: 1 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"
              style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="input"
              placeholder="Tìm username, tên, email, SĐT..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '40px', background: 'var(--bg-input)' }}
            />
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {filtered.length} kết quả
          </span>
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
              <button onClick={closeModal} className="modal-close" style={{ position: 'static', fontSize: '1.5rem' }}>✕</button>
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
    </div>
  );
};

export default UserManagement;
