import { useEffect, useLayoutEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { promotionApi, userApi } from '../../api';
import Button from '../../components/Common/Button';
import { RefreshIcon } from '../../components/Common/CinemaIcons';
import AccountHeader from './AccountHeader';
import AccountState, { AccountSkeleton } from './AccountState';
import MembershipLadder from './MembershipLadder';
import PasswordSection, { CURRENT_PASSWORD_ID } from './PasswordSection';
import ProfileInfoSection from './ProfileInfoSection';
import PromotionList from './PromotionList';
import './ProfilePage.css';

// Hash chỉ để cuộn tới phần tương ứng. Footer liên kết tới #promos.
const SECTIONS = ['promos', 'info', 'password'];

/** Trang tài khoản "Thang hạng". Xem docs/03-architecture/frontend.md. */
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
  const ready = profileState === 'ready';
  const readyToScroll = !isReload && ready && (hash === 'promos' || promoState !== 'loading');

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

  // Ưu đãi nằm trên thông tin và mật khẩu, nên đợi khối này tải xong trước khi cuộn tới hai mục đó.
  useEffect(() => {
    if (!readyToScroll || !SECTIONS.includes(hash)) return;
    const heading = document.getElementById(`ac-${hash}-title`);
    if (!heading) return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    heading.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    const target = hash === 'password' ? document.getElementById(CURRENT_PASSWORD_ID) : heading;
    (target || heading).focus({ preventScroll: true });
  }, [readyToScroll, hash, location.key]);

  function retryProfile() {
    setProfileState('loading');
    setProfileAttempt((attempt) => attempt + 1);
  }

  function retryPromotions() {
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
          <AccountState error title="Không tải được thông tin tài khoản" detail="Kiểm tra kết nối mạng rồi bấm Thử lại.">
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
        <div className="ac-layout">
          <div className="ac-side">
            <MembershipLadder tier={profile.membershipTier} spending={profile.totalSpending} />
          </div>
          <div className="ac-main">
            <PromotionList promotions={promotions} state={promoState} onRetry={retryPromotions} />
            <ProfileInfoSection profile={profile} onSaved={setProfile} />
            <PasswordSection open={passwordOpen} onOpenChange={setPasswordOpen} />
          </div>
        </div>
      </div>
    </div>
  );
}
