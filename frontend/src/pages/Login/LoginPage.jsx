import { useState } from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { authApi } from '../../api';
import { useAuth } from '../../context/useAuth';
import { ROLE_HOME_PATHS } from '../../context/roleHomePaths';
import { toast } from 'react-toastify';
import PasswordField from '../../components/Common/PasswordField';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user, isAuthenticated } = useAuth();
  const location = useLocation();
  const oauth2Error = new URLSearchParams(location.search).get('oauth2Error');

  if (isAuthenticated) {
    return <Navigate to={ROLE_HOME_PATHS[user?.role] || location.state?.from || '/'} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      toast.success('Đăng nhập thành công!');
    } catch (err) {
      const msg = err.response?.data?.message || 'Đăng nhập thất bại';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = authApi.getGoogleLoginUrl();
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Đăng nhập</h1>
        <p className="auth-subtitle">Chào mừng bạn trở lại MoviePTIT</p>

        {(error || oauth2Error) && <div className="error-message">{error || oauth2Error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-username">Tên đăng nhập</label>
            <input
              id="login-username"
              className="input"
              type="text"
              placeholder="Nhập tên đăng nhập"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <PasswordField
            id="login-password"
            label="Mật khẩu"
            placeholder="Nhập mật khẩu"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            style={{ width: '100%', marginTop: 8 }}
          >
            {loading ? 'Đang xử lý...' : 'Đăng nhập'}
          </button>
        </form>

        <div className="auth-divider">
          <span>hoặc</span>
        </div>

        <button
          className="btn btn-secondary auth-google-button"
          type="button"
          onClick={handleGoogleLogin}
        >
          <span className="auth-google-mark">G</span>
          Tiếp tục với Google
        </button>

        <div className="auth-inline-action">
          <Link to="/forgot-password">Quên mật khẩu?</Link>
        </div>

        <div className="auth-footer">
          Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
        </div>
      </div>
    </div>
  );
}
