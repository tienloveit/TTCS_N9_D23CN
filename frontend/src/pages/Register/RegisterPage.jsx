import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { userApi } from '../../api';
import { useAuth } from '../../context/useAuth';
import { toast } from 'react-toastify';
import PasswordField from '../../components/Common/PasswordField';

export default function RegisterPage() {
  const [form, setForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    email: '',
    phoneNumber: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      const msg = 'Mật khẩu xác nhận không khớp';
      setError(msg);
      toast.warn(msg);
      return;
    }

    setLoading(true);
    try {
      await userApi.register({
        username: form.username,
        password: form.password,
        fullName: form.fullName,
        email: form.email,
        phoneNumber: form.phoneNumber,
      });
      toast.success('Đăng ký tài khoản thành công! Mời bạn đăng nhập.');
      navigate('/login');
    } catch (err) {
      const msg = err.response?.data?.message || 'Đăng ký thất bại';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Đăng ký</h1>
        <p className="auth-subtitle">Tạo tài khoản mới tại MoviePTIT</p>

        {error && <div className="error-message">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="register-username">Tên đăng nhập</label>
            <input id="register-username" className="input" name="username" autoComplete="username" placeholder="Nhập tên đăng nhập" value={form.username} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-fullName">Họ và tên</label>
            <input id="register-fullName" className="input" name="fullName" autoComplete="name" placeholder="Nhập họ và tên" value={form.fullName} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-email">Email</label>
            <input id="register-email" className="input" name="email" autoComplete="email" type="email" placeholder="Nhập email" value={form.email} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-phoneNumber">Số điện thoại</label>
            <input id="register-phoneNumber" className="input" name="phoneNumber" autoComplete="tel" placeholder="Nhập số điện thoại" value={form.phoneNumber} onChange={handleChange} required />
          </div>

          <PasswordField
            id="register-password"
            label="Mật khẩu"
            name="password"
            placeholder="Nhập mật khẩu"
            autoComplete="new-password"
            value={form.password}
            onChange={handleChange}
            required
          />

          <PasswordField
            id="register-confirm-password"
            label="Xác nhận mật khẩu"
            toggleLabel="mật khẩu xác nhận"
            name="confirmPassword"
            placeholder="Nhập lại mật khẩu"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={handleChange}
            required
          />

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: 8 }}>
            {loading ? 'Đang xử lý...' : 'Đăng ký'}
          </button>
        </form>

        <div className="auth-footer">
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </div>
      </div>
    </div>
  );
}
