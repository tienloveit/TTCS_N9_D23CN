import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { promotionApi, userApi } from '../../api';
import Button from '../../components/Common/Button';
import { RefreshIcon } from '../../components/Common/CinemaIcons';
import AccountHeader from './AccountHeader';
import AccountState, { AccountSkeleton } from './AccountState';
import PasswordSection, { CURRENT_PASSWORD_ID } from './PasswordSection';
import ProfileInfoSection from './ProfileInfoSection';
import PromotionList from './PromotionList';
import './ProfilePage.css';

// Hash chỉ để cuộn tới phần tương ứng. Footer liên kết tới #promos.
const SECTIONS = [
  ['info', 'Thông tin cá nhân'],
  ['password', 'Mật khẩu'],
  ['promos', 'Ưu đãi của bạn'],
];

export default function ProfilePage({ isReload }) {
  const location = useLocation();
  const hash = location.hash.slice(1);
  const [profile, setProfile] = useState(null);
  const [profileState, setProfileState] = useState('loading');
  const [profileAttempt, setProfileAttempt] = useState(0);
  const [promotions, setPromotions] = useState([]);
  const [promoState, setPromoState] = useState('loading');
  const [promoAttempt, setPromoAttempt] = useState(0);
  const [passwordOpen, setPasswordOpen] = useState(hash === 'password');
  // Ghép key với hash: đổi hash trên thanh địa chỉ giữ nguyên location.key ("default").
  const locationId = `${location.key}${location.hash}`;
  const [seenLocation, setSeenLocation] = useState(locationId);
  const profileRetryFocus = useRef(false);
  const readyToScroll = !isReload && profileState === 'ready';

  // Vào lại bằng #password (kể cả khi đang ở trang) thì mở sẵn form đổi mật khẩu.
  if (seenLocation !== locationId) {
    setSeenLocation(locationId);
    if (hash === 'password') setPasswordOpen(true);
  }

  useLayoutEffect(() => {
    if (!isReload) return;
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    window.scrollTo({ top: 0, behavior: 'instant' });
    return () => { window.history.scrollRestoration = previousRestoration; };
  }, [isReload]);

  useEffect(() => {
    document.title = 'Tài khoản | MoviePTIT';
  }, []);

  useEffect(() => {
    let ignore = false;
    userApi.getMyInfo()
      .then(({ data }) => {
        if (ignore) return;
        if (!data.result) throw new Error('Missing profile data');
        setProfile(data.result);
        setProfileState('ready');
      })
      .catch(() => { if (!ignore) setProfileState('error'); });
    return () => { ignore = true; };
  }, [profileAttempt]);

  useEffect(() => {
    let ignore = false;
    promotionApi.getAvailable()
      .then(({ data }) => {
        if (ignore) return;
        const list = data.result ?? [];
        if (!Array.isArray(list)) throw new Error('Invalid promotion data');
        setPromotions(list);
        setPromoState('ready');
      })
      .catch(() => { if (!ignore) setPromoState('error'); });
    return () => { ignore = true; };
  }, [promoAttempt]);

  useEffect(() => {
    if (!readyToScroll || !SECTIONS.some(([id]) => id === hash)) return;
    if (profileRetryFocus.current && document.activeElement !== document.body) return;
    const heading = document.getElementById(`ac-${hash}-title`);
    if (!heading) return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    heading.scrollIntoView({ behavior: reduceMotion ? 'instant' : 'smooth', block: 'start' });
    const target = hash === 'password'
      ? heading.closest('section')?.querySelector(`#${CURRENT_PASSWORD_ID}`)
      : heading;
    (target || heading).focus({ preventScroll: true });
  }, [readyToScroll, hash, location.key]);

  useEffect(() => {
    if (!profileRetryFocus.current || profileState === 'loading') return;
    profileRetryFocus.current = false;
    if (document.activeElement === document.body) {
      document.getElementById('ac-account-title')?.focus();
    }
  }, [profileState]);

  function retryProfile() {
    profileRetryFocus.current = true;
    setProfileState('loading');
    setProfileAttempt((attempt) => attempt + 1);
  }

  function retryPromotions() {
    document.getElementById('ac-promos-title')?.focus({ preventScroll: true });
    setPromoState('loading');
    setPromoAttempt((attempt) => attempt + 1);
  }

  if (profileState === 'loading') {
    return <div className="ac-page"><AccountSkeleton /></div>;
  }

  if (profileState === 'error') {
    return (
      <div className="ac-page">
        <div className="ac-wrap ac-top">
          <AccountHeader />
          <AccountState error headingAs="h2" title="Không tải được thông tin tài khoản" detail="Kiểm tra kết nối mạng rồi bấm Thử lại.">
            <Button variant="primary" icon={<RefreshIcon size={16} />} onClick={retryProfile}>Thử lại</Button>
          </AccountState>
        </div>
      </div>
    );
  }

  return (
    <div className="ac-page">
      <div className="ac-wrap ac-top">
        <AccountHeader profile={profile} />
        <nav className="ac-jump" aria-label="Mục tài khoản">
          {SECTIONS.map(([id, label]) => (
            <Link key={id} to={{ search: location.search, hash: `#${id}` }}>{label}</Link>
          ))}
        </nav>
        <div className="ac-layout">
          <div className="ac-settings">
            <ProfileInfoSection profile={profile} onSaved={setProfile} />
            <PasswordSection open={passwordOpen} onOpenChange={setPasswordOpen} />
          </div>
          <PromotionList promotions={promotions} state={promoState} onRetry={retryPromotions} />
        </div>
      </div>
    </div>
  );
}
