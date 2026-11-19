import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/useAuth';

const parseOAuthParams = (location) => {
  const hashParams = new URLSearchParams(location.hash.replace(/^#/, ''));
  const searchParams = new URLSearchParams(location.search);
  return hashParams.size > 0 ? hashParams : searchParams;
};

export default function OAuth2CallbackPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { loginWithTokens } = useAuth();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) {
      return;
    }
    handledRef.current = true;

    const params = parseOAuthParams(location);
    const oauth2Error = params.get('oauth2Error') || params.get('error');
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');

    if (oauth2Error) {
      toast.error(oauth2Error);
      navigate(`/login?oauth2Error=${encodeURIComponent(oauth2Error)}`, { replace: true });
      return;
    }

    if (!accessToken || !refreshToken) {
      const message = 'Google login did not return valid tokens';
      toast.error(message);
      navigate(`/login?oauth2Error=${encodeURIComponent(message)}`, { replace: true });
      return;
    }

    loginWithTokens(accessToken, refreshToken);
    toast.success('Đăng nhập thành công');
    navigate('/', { replace: true });
  }, [location, loginWithTokens, navigate]);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Đang đăng nhập</h1>
        <p className="auth-subtitle">Vui lòng chờ trong giây lát.</p>
        <div className="loading">
          <div className="spinner" />
        </div>
      </div>
    </div>
  );
}
