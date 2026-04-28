import { useState, useEffect } from 'react';
import { userApi, authApi } from '../../api';
import { toast } from 'react-toastify';
import { SkeletonBox } from '../../components/Common/Skeleton';

const ProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  
  // States for password change
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await userApi.getMyInfo();
      setProfile(res.data.result);
    } catch (err) {
      toast.error('Không thể tải thông tin cá nhân');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await userApi.updateMyInfo({
        fullName: profile.fullName,
        email: profile.email,
        phoneNumber: profile.phoneNumber,
        birthday: profile.birthday,
        gender: profile.gender
      });
      setProfile(res.data.result);
      setIsEditing(false);
      toast.success('Cập nhật thông tin thành công!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cập nhật thất bại');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.warn('Mật khẩu mới không khớp');
      return;
    }
    try {
      await authApi.changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      });
      toast.success('Đổi mật khẩu thành công!');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Đổi mật khẩu thất bại');
    }
  };

  if (loading) {
    return (
      <div className="page container">
        <SkeletonBox height="40px" width="200px" className="mb-8" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
          <SkeletonBox height="400px" borderRadius="16px" />
          <SkeletonBox height="400px" borderRadius="16px" />
        </div>
      </div>
    );
  }

  return (
    <div className="page container">
      <h1 className="page-title mb-8">Trang cá nhân</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '32px' }}>
        {/* Info Section */}
        <div className="card" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Thông tin cá nhân</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => setIsEditing(!isEditing)}>
              {isEditing ? 'Huỷ' : 'Chỉnh sửa'}
            </button>
          </div>

          <form onSubmit={handleUpdateProfile}>
            <div className="form-group">
              <label className="form-label">Tên đăng nhập</label>
              <input className="input" value={profile.username} disabled style={{ opacity: 0.7 }} />
            </div>

            <div className="form-group">
              <label className="form-label">Họ và tên</label>
              <input 
                className="input" 
                value={profile.fullName} 
                onChange={e => setProfile({...profile, fullName: e.target.value})}
                disabled={!isEditing}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input 
                className="input" 
                type="email"
                value={profile.email} 
                onChange={e => setProfile({...profile, email: e.target.value})}
                disabled={!isEditing}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Số điện thoại</label>
              <input 
                className="input" 
                value={profile.phoneNumber} 
                onChange={e => setProfile({...profile, phoneNumber: e.target.value})}
                disabled={!isEditing}
              />
            </div>

            {isEditing && (
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Lưu thay đổi</button>
            )}
          </form>
        </div>

        {/* Password Section */}
        <div className="card" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '24px' }}>Đổi mật khẩu</h2>
          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label className="form-label">Mật khẩu hiện tại</label>
              <input 
                className="input" 
                type="password"
                value={passwords.currentPassword}
                onChange={e => setPasswords({...passwords, currentPassword: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mật khẩu mới</label>
              <input 
                className="input" 
                type="password"
                value={passwords.newPassword}
                onChange={e => setPasswords({...passwords, newPassword: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Xác nhận mật khẩu mới</label>
              <input 
                className="input" 
                type="password"
                value={passwords.confirmPassword}
                onChange={e => setPasswords({...passwords, confirmPassword: e.target.value})}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Cập nhật mật khẩu</button>
          </form> 
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
