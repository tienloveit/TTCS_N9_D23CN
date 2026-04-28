import { useState, useEffect } from 'react';
import { userApi } from '../../api';
import { toast } from 'react-toastify';

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

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await userApi.getAll();
      const result = res.data.result;
      setUsers(result?.data || result || []);
    } catch (err) {
      console.error('Lỗi khi tải người dùng:', err);
      toast.error('Lỗi khi tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED';
    const confirmMsg = user.status === 'BLOCKED' 
      ? `Bạn có chắc chắn muốn mở khoá tài khoản ${user.username}?`
      : `Bạn có chắc chắn muốn khoá tài khoản ${user.username}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await userApi.updateStatus(user.id, newStatus);
      toast.success(user.status === 'BLOCKED' ? 'Mở khoá thành công' : 'Khoá tài khoản thành công');
      fetchUsers();
    } catch (err) {
      toast.error('Cập nhật trạng thái thất bại');
      console.error(err);
    }
  };

  const filtered = users.filter((u) =>
    [u.username, u.fullName, u.email].some((f) =>
      f?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('vi-VN') : '—';

  const getRoleLabel = (role, status) => {
    if (role === 'ADMIN') return 'Admin';
    if (role === 'STAFF') return 'Nhan vien';
    return status === 'BLOCKED' ? 'Bi khoa' : 'Khach hang';
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Quản lý Người dùng</h1>
          <p className="page-subtitle">Tổng cộng <strong>{users.length}</strong> tài khoản.</p>
        </div>
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
              placeholder="Tìm username, tên, email..."
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
              <th>#</th>
              <th>Tài khoản</th>
              <th>Họ tên</th>
              <th>Email</th>
              <th>SĐT</th>
              <th>Vai trò</th>
              <th>Ngày tạo</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  {searchTerm ? 'Không tìm thấy người dùng' : 'Chưa có người dùng nào'}
                </td>
              </tr>
            ) : (
              filtered.map((user, idx) => (
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
                    <span className={`status-badge ${user.role === 'ADMIN' ? '' : (user.status === 'BLOCKED' ? 'status--inactive' : 'status--active')}`}
                      style={user.role === 'ADMIN' ? { background: 'rgba(229,9,20,0.1)', color: 'var(--accent)' } : {}}>
                      {getRoleLabel(user.role, user.status)}
                    </span>
                  </td>
                  <td>{formatDate(user.createdAt)}</td>
                  <td>
                    <div className="action-btns">
                      <button className="btn btn-ghost btn-sm" title="Xem chi tiết">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                      <button 
                        className="btn btn-ghost btn-sm" 
                        title={user.status === 'BLOCKED' ? 'Mở khoá tài khoản' : 'Khoá tài khoản'} 
                        style={{ color: user.status === 'BLOCKED' ? '#10b981' : '#ef4444' }}
                        onClick={() => handleToggleStatus(user)}
                      >
                        {user.status === 'BLOCKED' ? <UnlockIcon /> : <LockIcon />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;
