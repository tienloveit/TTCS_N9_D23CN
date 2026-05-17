import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { userApi, authApi, promotionApi } from '../../api';
import { toast } from 'react-toastify';
import { SkeletonBox } from '../../components/Common/Skeleton';

const TIER_CONFIG = {
  BRONZE:   { name: 'Đồng',     color: '#cd7f32', gradient: 'linear-gradient(135deg, #cd7f32, #a0522d)', next: 'SILVER',   nextAmount: 500000 },
  SILVER:   { name: 'Bạc',      color: '#c0c0c0', gradient: 'linear-gradient(135deg, #c0c0c0, #808080)', next: 'GOLD',     nextAmount: 2000000 },
  GOLD:     { name: 'Vàng',     color: '#ffd700', gradient: 'linear-gradient(135deg, #ffd700, #daa520)', next: 'PLATINUM', nextAmount: 5000000 },
  PLATINUM: { name: 'Bạch Kim', color: '#e5e4e2', gradient: 'linear-gradient(135deg, #e5e4e2, #b0b0b0)', next: null,       nextAmount: null },
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(amount || 0));

const ProfilePage = () => {
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [promotions, setPromotions] = useState([]);

  // States for password change
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const activeSection = location.hash === '#password' ? 'password' : 'info';

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await userApi.getMyInfo();
      setProfile(res.data.result);
    } catch {
      toast.error('Không thể tải thông tin cá nhân');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    promotionApi.getAvailable()
      .then((res) => setPromotions(res.data.result || []))
      .catch(() => setPromotions([]));
  }, []);

  useEffect(() => {
    if (loading || !location.hash) return;

    const target = document.querySelector(location.hash);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [loading, location.hash]);

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
        <div className="profile-section-wrap">
          <SkeletonBox height="400px" borderRadius="16px" />
        </div>
      </div>
    );
  }

  const tier = profile?.membershipTier || 'BRONZE';
  const tierInfo = TIER_CONFIG[tier] || TIER_CONFIG.BRONZE;
  const totalSpending = Number(profile?.totalSpending || 0);
  const progressPercent = tierInfo.nextAmount
    ? Math.min(100, Math.round((totalSpending / tierInfo.nextAmount) * 100))
    : 100;

  return (
    <div className="page container">
      <h1 className="page-title mb-8">
        {activeSection === 'password' ? 'Đổi mật khẩu' : 'Thông tin cá nhân'}
      </h1>

      <div className="profile-section-wrap">
        {/* Membership Card */}
        {activeSection === 'info' && (
          <div className="card" style={{
            padding: '28px 32px', marginBottom: 24,
            background: tierInfo.gradient, color: '#fff', borderRadius: 'var(--radius-lg)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 16, right: 24, fontSize: '2.5rem', opacity: 0.25 }}>⭐</div>
            <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: 4 }}>Hạng thành viên</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 12 }}>{tierInfo.name}</div>
            <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: 6 }}>
              Tổng chi tiêu: <strong>{formatCurrency(totalSpending)}</strong>
            </div>
            {tierInfo.next && (
              <>
                <div style={{
                  width: '100%', height: 8, borderRadius: 4,
                  background: 'rgba(255,255,255,0.3)', marginBottom: 6,
                }}>
                  <div style={{
                    width: `${progressPercent}%`, height: '100%', borderRadius: 4,
                    background: '#fff', transition: 'width 0.5s ease',
                  }} />
                </div>
                <div style={{ fontSize: '0.78rem', opacity: 0.85 }}>
                  Còn {formatCurrency(tierInfo.nextAmount - totalSpending)} nữa để lên hạng {TIER_CONFIG[tierInfo.next]?.name}
                </div>
              </>
            )}
            {!tierInfo.next && (
              <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>🎉 Bạn đã đạt hạng cao nhất!</div>
            )}
          </div>
        )}

        {/* Available Promotions */}
        {activeSection === 'info' && promotions.length > 0 && (
          <div className="card" style={{ padding: '24px 32px', marginBottom: 24 }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 16 }}>🎁 Mã khuyến mãi khả dụng</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              {promotions.map((p) => (
                <div key={p.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px 18px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--border)',
                }}>
                  <div>
                    <strong style={{ color: 'var(--accent)', letterSpacing: '0.5px', fontSize: '1rem' }}>{p.code}</strong>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                      {p.description || `Giảm ${p.discountPercent}%`}
                      {p.maxDiscount && ` (tối đa ${formatCurrency(p.maxDiscount)})`}
                    </div>
                    {p.minMembershipTier && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Hạng {TIER_CONFIG[p.minMembershipTier]?.name || p.minMembershipTier}+
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent)' }}>
                    -{p.discountPercent}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Section */}
        {activeSection === 'info' && (
        <div id="info" className="card profile-section-card" style={{ padding: '32px' }}>
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
        )}

        {/* Password Section */}
        {activeSection === 'password' && (
        <div id="password" className="card profile-section-card" style={{ padding: '32px' }}>
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
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
