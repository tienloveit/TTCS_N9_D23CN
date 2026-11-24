import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { promotionApi, userApi } from '../../api';
import Button from '../../components/Common/Button';
import { RefreshIcon } from '../../components/Common/CinemaIcons';
import AccountHeader from './AccountHeader';
import AccountState, { AccountSkeleton } from './AccountState';
import AccountTabs from './AccountTabs';
import { ACCOUNT_TABS, isTabHash, tabFromHash } from './accountTabsModel';
import MembershipTrack from './MembershipTrack';
import PasswordSection, { CURRENT_PASSWORD_ID } from './PasswordSection';
import ProfileInfoSection from './ProfileInfoSection';
import PromotionList from './PromotionList';
import './ProfilePage.css';

export default function ProfilePage({ isReload }) {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = tabFromHash(location.hash);
  const [profile, setProfile] = useState(null);
  const [profileState, setProfileState] = useState('loading');
  const [profileAttempt, setProfileAttempt] = useState(0);
  const [promotions, setPromotions] = useState([]);
  const [promoState, setPromoState] = useState('loading');
  const [promoAttempt, setPromoAttempt] = useState(0);
  const profileRetryFocus = useRef(false);
  // Đổi hash do bấm tab: không cuộn, focus ở lại trên tab.
  const tabClick = useRef(false);
  const readyToScroll = !isReload && profileState === 'ready';

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

  // Vào trang bằng hash của một tab (Footer, Back/Forward): cuộn tới vùng tab và focus tiêu đề ngăn.
  useEffect(() => {
    if (tabClick.current) { tabClick.current = false; return; }
    if (!readyToScroll || !isTabHash(location.hash)) return;
    if (profileRetryFocus.current && document.activeElement !== document.body) return;
    const tablist = document.getElementById('ac-tabs');
    if (!tablist) return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    tablist.scrollIntoView({ behavior: reduceMotion ? 'instant' : 'smooth', block: 'start' });
    const id = tabFromHash(location.hash);
    const target = id === 'password'
      ? document.getElementById(CURRENT_PASSWORD_ID)
      : document.getElementById(`ac-${id}-title`);
    target?.focus({ preventScroll: true });
  }, [readyToScroll, location.key, location.hash]);

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

  function selectTab(id) {
    if (id === activeTab) return;
    tabClick.current = true;
    navigate({ search: location.search, hash: `#${id}` }, { replace: true });
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
        <MembershipTrack tier={profile.membershipTier} spending={profile.totalSpending} />
        <div className="ac-account">
          <AccountTabs
            tabs={ACCOUNT_TABS}
            active={activeTab}
            onSelect={selectTab}
            promoCount={promoState === 'ready' ? promotions.length : 0}
          />
          {/* Cả ba ngăn luôn render để giữ bản nháp, chữ đã gõ và bộ lọc khi đổi tab. */}
          <div className="ac-panels">
            <div className="ac-panel" role="tabpanel" id="ac-panel-promos" aria-labelledby="ac-tab-promos" hidden={activeTab !== 'promos'}>
              <PromotionList promotions={promotions} state={promoState} onRetry={retryPromotions} />
            </div>
            <div className="ac-panel" role="tabpanel" id="ac-panel-info" aria-labelledby="ac-tab-info" hidden={activeTab !== 'info'}>
              <ProfileInfoSection profile={profile} onSaved={setProfile} />
            </div>
            <div className="ac-panel" role="tabpanel" id="ac-panel-password" aria-labelledby="ac-tab-password" hidden={activeTab !== 'password'}>
              <PasswordSection />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
