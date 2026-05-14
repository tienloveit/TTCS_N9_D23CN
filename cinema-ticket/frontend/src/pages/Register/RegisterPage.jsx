import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { userApi } from '../../api';
import { useAuth } from '../../context/useAuth';
import { toast } from 'react-toastify';
import { EyeIcon, EyeOffIcon } from '../../components/Common/CinemaIcons';

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
      await userApi.create({
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
            <label className="form-label">Tên đăng nhập</label>
            <input className="input" name="username" placeholder="Nhập tên đăng nhập" value={form.username} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label className="form-label">Họ và tên</label>
            <input className="input" name="fullName" placeholder="Nhập họ và tên" value={form.fullName} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="input" name="email" type="email" placeholder="Nhập email" value={form.email} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label className="form-label">Số điện thoại</label>
            <input className="input" name="phoneNumber" placeholder="Nhập số điện thoại" value={form.phoneNumber} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label className="form-label">Mật khẩu</label>
            <div style={{ position: 'relative' }}>
              <input 
                className="input" 
                name="password" 
                type={showPassword ? 'text' : 'password'} 
                placeholder="Nhập mật khẩu" 
                value={form.password} 
                onChange={handleChange} 
                required 
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0
                }}
              >
                {showPassword ? <EyeOffIcon width={20} height={20} /> : <EyeIcon width={20} height={20} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Xác nhận mật khẩu</label>
            <div style={{ position: 'relative' }}>
              <input 
                className="input" 
                name="confirmPassword" 
                type={showConfirmPassword ? 'text' : 'password'} 
                placeholder="Nhập lại mật khẩu" 
                value={form.confirmPassword} 
                onChange={handleChange} 
                required 
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0
                }}
              >
                {showConfirmPassword ? <EyeOffIcon width={20} height={20} /> : <EyeIcon width={20} height={20} />}
              </button>
            </div>
          </div>

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
