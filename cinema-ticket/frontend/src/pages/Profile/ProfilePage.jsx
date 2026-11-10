import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { userApi, authApi, promotionApi } from '../../api';
import { toast } from 'react-toastify';
import { SkeletonBox } from '../../components/Common/Skeleton';
import {
  AwardIcon,
  CheckIcon,
  CopyIcon,
  EditIcon,
  GiftIcon,
  KeyIcon,
  SparkIcon,
  UserIcon,
} from '../../components/Common/CinemaIcons';

const TIER_CONFIG = {
  BRONZE: { name: 'Đồng', color: '#cd7f32', gradient: 'linear-gradient(135deg, #cd7f32, #a0522d)', next: 'SILVER', nextAmount: 500000 },
  SILVER: { name: 'Bạc', color: '#94a3b8', gradient: 'linear-gradient(135deg, #64748b, #475569)', next: 'GOLD', nextAmount: 2000000 },
  GOLD: { name: 'Vàng', color: '#f59e0b', gradient: 'linear-gradient(135deg, #d97706, #b45309)', next: 'PLATINUM', nextAmount: 5000000 },
  PLATINUM: { name: 'Bạch Kim', color: '#4f46e5', gradient: 'linear-gradient(135deg, #312e81, #4338ca)', next: null, nextAmount: null },
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(amount || 0));

const ProfilePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [promotions, setPromotions] = useState([]);
  const [copiedCode, setCopiedCode] = useState('');

  // States for password change
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const activeSection =
    location.hash === '#password'
      ? 'password'
      : location.hash === '#promos'
        ? 'promos'
        : 'info';

  const switchSection = (hash) => {
    navigate(`/profile${hash}`, { replace: true });
  };

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

  const handleCopyPromo = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success(`Đã sao chép mã ${code}!`);
      window.setTimeout(() => setCopiedCode(''), 2000);
    } catch {
      toast.info(`Mã khuyến mãi: ${code}`);
    }
  };

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
        <div className="pf-wrap">
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
      <div className="pf-wrap">
        <div className="page-header" style={{ marginBottom: 20 }}>
          <h1 className="page-title page-title-with-icon">
            <UserIcon className="page-title-icon" />
            Tài khoản của tôi
          </h1>
          <p className="page-subtitle">
            Quản lý hồ sơ cá nhân, hạng thẻ thành viên và ưu đãi dành riêng cho bạn
          </p>
        </div>

        {/* Segmented Navigation Tabs */}
        <div className="pf-tabs" role="tablist" aria-label="Quản lý tài khoản">
          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'info'}
            className={`pf-tab ${activeSection === 'info' ? 'is-active' : ''}`}
            onClick={() => switchSection('#info')}
          >
            <UserIcon size={16} />
            Hồ sơ & Hạng thẻ
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'promos'}
            className={`pf-tab ${activeSection === 'promos' ? 'is-active' : ''}`}
            onClick={() => switchSection('#promos')}
          >
            <GiftIcon size={16} />
            Ưu đãi khả dụng ({promotions.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'password'}
            className={`pf-tab ${activeSection === 'password' ? 'is-active' : ''}`}
            onClick={() => switchSection('#password')}
          >
            <KeyIcon size={16} />
            Đổi mật khẩu
          </button>
        </div>

        {/* Membership Card (shown on Info & Promos tabs) */}
        {(activeSection === 'info' || activeSection === 'promos') && (
          <div className="pf-tier-card" style={{ background: tierInfo.gradient }}>
            <div className="pf-tier-watermark">
              <AwardIcon size={76} />
            </div>
            <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: 4 }}>Hạng thành viên MoviePTIT</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AwardIcon size={24} />
              <span>Hạng {tierInfo.name}</span>
            </div>
            <div style={{ fontSize: '0.88rem', opacity: 0.95, marginBottom: 8 }}>
              Tổng chi tiêu tích luỹ: <strong>{formatCurrency(totalSpending)}</strong>
            </div>
            {tierInfo.next ? (
              <>
                <div style={{
                  width: '100%', height: 8, borderRadius: 4,
                  background: 'rgba(255,255,255,0.28)', marginBottom: 8,
                }}>
                  <div style={{
                    width: `${progressPercent}%`, height: '100%', borderRadius: 4,
                    background: '#fff', transition: 'width 0.5s ease',
                  }} />
                </div>
                <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                  Còn <strong>{formatCurrency(Math.max(0, tierInfo.nextAmount - totalSpending))}</strong> nữa để thăng hạng {TIER_CONFIG[tierInfo.next]?.name}
                </div>
              </>
            ) : (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', opacity: 0.95 }}>
                <SparkIcon size={16} />
                <span>Bạn đã đạt hạng thành viên cao nhất của MoviePTIT!</span>
              </div>
            )}
          </div>
        )}

        {/* Available Promotions Section */}
        {(activeSection === 'promos' || (activeSection === 'info' && promotions.length > 0)) && (
          <div id="promos" className="card" style={{ padding: '24px 32px', marginBottom: 24 }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.15rem', fontWeight: 800, marginBottom: 16 }}>
              <GiftIcon size={20} style={{ color: 'var(--accent)' }} />
              <span>Mã khuyến mãi khả dụng</span>
            </h2>
            {promotions.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>
                Hiện tại chưa có mã khuyến mãi nào đang mở.
              </p>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {promotions.map((p) => {
                  const isCopied = copiedCode === p.code;
                  return (
                    <div key={p.id || p.code} className="pf-promo-card">
                      <div>
                        <strong style={{ color: 'var(--accent)', letterSpacing: '0.5px', fontSize: '1rem' }}>
                          {p.code}
                        </strong>
                        <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                          {p.description || `Giảm ${p.discountPercent}%`}
                          {p.maxDiscount && ` (tối đa ${formatCurrency(p.maxDiscount)})`}
                        </div>
                        {p.minMembershipTier && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Áp dụng từ hạng {TIER_CONFIG[p.minMembershipTier]?.name || p.minMembershipTier}
                          </span>
                        )}
                      </div>
                      <div className="pf-promo-actions">
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent)' }}>
                          -{p.discountPercent}%
                        </div>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleCopyPromo(p.code)}
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        >
                          {isCopied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
                          {isCopied ? 'Đã chép' : 'Sao chép'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Info Section */}
        {activeSection === 'info' && (
          <div id="info" className="card profile-section-card" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Thông tin cá nhân</h2>
              <button
                type="button"
                className={`btn ${isEditing ? 'btn-ghost' : 'btn-secondary'} btn-sm`}
                onClick={() => setIsEditing(!isEditing)}
              >
                <EditIcon size={15} />
                {isEditing ? 'Huỷ chỉnh sửa' : 'Chỉnh sửa hồ sơ'}
              </button>
            </div>

            <form onSubmit={handleUpdateProfile}>
              <div className="pf-form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="pf-username">Tên đăng nhập</label>
                  <input
                    id="pf-username"
                    className="input"
                    value={profile?.username || ''}
                    disabled
                    style={{ opacity: 0.7 }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="pf-fullname">Họ và tên</label>
                  <input
                    id="pf-fullname"
                    className="input"
                    value={profile?.fullName || ''}
                    onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="pf-email">Email</label>
                  <input
                    id="pf-email"
                    className="input"
                    type="email"
                    value={profile?.email || ''}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="pf-phone">Số điện thoại</label>
                  <input
                    id="pf-phone"
                    className="input"
                    value={profile?.phoneNumber || ''}
                    onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="pf-birthday">Ngày sinh</label>
                  <input
                    id="pf-birthday"
                    className="input"
                    type="date"
                    value={profile?.birthday ? String(profile.birthday).substring(0, 10) : ''}
                    onChange={(e) => setProfile({ ...profile, birthday: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="pf-gender">Giới tính</label>
                  <select
                    id="pf-gender"
                    className="input"
                    value={profile?.gender || ''}
                    onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                    disabled={!isEditing}
                  >
                    <option value="">Chưa cập nhật</option>
                    <option value="MALE">Nam</option>
                    <option value="FEMALE">Nữ</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </div>
              </div>

              {isEditing && (
                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setIsEditing(false);
                      fetchProfile();
                    }}
                  >
                    Huỷ
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <CheckIcon size={18} />
                    Lưu thay đổi
                  </button>
                </div>
              )}
            </form>
          </div>
        )}

        {/* Password Section */}
        {activeSection === 'password' && (
          <div id="password" className="card profile-section-card" style={{ padding: '32px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '24px' }}>Đổi mật khẩu</h2>
            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label className="form-label" htmlFor="pf-cur-pass">Mật khẩu hiện tại</label>
                <input
                  id="pf-cur-pass"
                  className="input"
                  type="password"
                  autoComplete="current-password"
                  value={passwords.currentPassword}
                  onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="pf-new-pass">Mật khẩu mới</label>
                <input
                  id="pf-new-pass"
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="pf-cfm-pass">Xác nhận mật khẩu mới</label>
                <input
                  id="pf-cfm-pass"
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                <CheckIcon size={18} />
                Cập nhật mật khẩu
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
