import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { authApi } from '../../api';
import { useAuth } from '../../context/useAuth';
import { EyeIcon, EyeOffIcon, MailIcon, KeyIcon } from '../../components/Common/CinemaIcons';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sentEmail, setSentEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loadingSend, setLoadingSend] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const getErrorMessage = (err, fallback) => err.response?.data?.message || fallback;

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoadingSend(true);

    try {
      const normalizedEmail = email.trim();
      await authApi.forgotPassword(normalizedEmail);
      setSentEmail(normalizedEmail);
      setOtp('');
      setOtpSent(true);
      toast.success('Mã OTP đã được gửi đến email của bạn.');
    } catch (err) {
      const msg = getErrorMessage(err, 'Không thể gửi mã OTP');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoadingSend(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      const msg = 'Mật khẩu xác nhận không khớp';
      setError(msg);
      toast.warn(msg);
      return;
    }

    setLoadingReset(true);
    try {
      await authApi.resetPassword({
        email: sentEmail,
        otp: otp.trim(),
        newPassword,
      });
      toast.success('Đặt lại mật khẩu thành công. Mời bạn đăng nhập.');
      navigate('/login', { replace: true });
    } catch (err) {
      const msg = getErrorMessage(err, 'Không thể đặt lại mật khẩu');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoadingReset(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-wide">
        <h1 className="auth-title">Quên mật khẩu</h1>
        <p className="auth-subtitle">Nhận mã OTP qua email để đặt lại mật khẩu MoviePTIT</p>

        {error && <div className="error-message">{error}</div>}
        {otpSent && !error && (
          <div className="success-message">Mã OTP có hiệu lực trong 5 phút.</div>
        )}

        <form className="auth-form" onSubmit={handleSendOtp}>
          <div className="form-group">
            <label className="form-label">Email tài khoản</label>
            <div className="auth-input-wrap">
              <MailIcon width={20} height={20} />
              <input
                className="input auth-input-with-icon"
                type="email"
                placeholder="Nhập email đã đăng ký"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                readOnly={otpSent}
                required
              />
            </div>
          </div>

          <button
            className="btn btn-secondary"
            type="submit"
            disabled={loadingSend}
            style={{ width: '100%' }}
          >
            {otpSent ? (loadingSend ? 'Đang gửi lại...' : 'Gửi lại OTP') : (loadingSend ? 'Đang gửi...' : 'Gửi OTP')}
          </button>
        </form>

        {otpSent && (
          <form className="auth-form forgot-reset-form" onSubmit={handleResetPassword}>
            <div className="form-group">
              <label className="form-label">Mã OTP</label>
              <div className="auth-input-wrap">
                <KeyIcon width={20} height={20} />
                <input
                  className="input auth-input-with-icon"
                  type="text"
                  inputMode="numeric"
                  placeholder="Nhập mã OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Mật khẩu mới</label>
              <div className="auth-input-wrap">
                <input
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu mới"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                  required
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOffIcon width={20} height={20} /> : <EyeIcon width={20} height={20} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Xác nhận mật khẩu mới</label>
              <div className="auth-input-wrap">
                <input
                  className="input"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Nhập lại mật khẩu mới"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                  required
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'}
                >
                  {showConfirmPassword ? <EyeOffIcon width={20} height={20} /> : <EyeIcon width={20} height={20} />}
                </button>
              </div>
            </div>

            <button
              className="btn btn-primary"
              type="submit"
              disabled={loadingReset}
              style={{ width: '100%', marginTop: 8 }}
            >
              {loadingReset ? 'Đang đặt lại...' : 'Đặt lại mật khẩu'}
            </button>
          </form>
        )}

        <div className="auth-footer">
          Đã nhớ mật khẩu? <Link to="/login">Đăng nhập</Link>
        </div>
      </div>
    </div>
  );
}
