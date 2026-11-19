import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { userApi, authApi, promotionApi } from '../../api';
import { SkeletonBox } from '../../components/Common/Skeleton';
import {
  AlertCircleIcon,
  ArrowRightIcon,
  AwardIcon,
  CheckIcon,
  CopyIcon,
  EditIcon,
  EyeIcon,
  EyeOffIcon,
  GiftIcon,
  KeyIcon,
  RefreshIcon,
  SearchIcon,
  TicketIcon,
  UserIcon,
} from '../../components/Common/CinemaIcons';
import './ProfilePage.css';

const TIERS = {
  BRONZE: { name: 'Đồng', next: 'SILVER', nextAmount: 500000 },
  SILVER: { name: 'Bạc', next: 'GOLD', nextAmount: 2000000 },
  GOLD: { name: 'Vàng', next: 'PLATINUM', nextAmount: 5000000 },
  PLATINUM: { name: 'Bạch Kim' },
};
const GENDERS = { MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác' };
const SECTIONS = [
  ['info', 'Hồ sơ & hạng thẻ', <UserIcon size={19} />],
  ['promos', 'Ưu đãi', <GiftIcon size={19} />],
  ['password', 'Đổi mật khẩu', <KeyIcon size={19} />],
];
const EMPTY_PASSWORDS = { currentPassword: '', newPassword: '', confirmPassword: '' };
const PASSWORD_FIELDS = [
  ['currentPassword', 'Mật khẩu hiện tại', 'current-password'],
  ['newPassword', 'Mật khẩu mới', 'new-password'],
  ['confirmPassword', 'Xác nhận mật khẩu mới', 'new-password'],
];
const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
const money = (amount) => currency.format(Number(amount));
const tierName = (tier) => TIERS[tier]?.name || tier;

function dateValue(value) {
  return Array.isArray(value)
    ? value.slice(0, 3).map((part, index) => String(part).padStart(index === 0 ? 4 : 2, '0')).join('-')
    : value?.slice(0, 10) || '';
}

function formatDate(value) {
  return dateValue(value).split('-').reverse().join('/');
}

function formatExpiry(value) {
  const time = Array.isArray(value)
    ? value.slice(3, 5).map((part) => String(part).padStart(2, '0')).join(':')
    : value?.slice(11, 16);
  return [time, formatDate(value)].filter(Boolean).join(' · ');
}

function PanelState({ loading, error, onRetry, title, detail, children }) {
  if (loading) return (
    <div className="pf-state pf-state--loading" role="status">
      <p>{title}</p>
      <div aria-hidden="true"><SkeletonBox height="84px" count={2} /></div>
    </div>
  );

  return (
    <div className="pf-state">
      <span className="pf-state-icon" aria-hidden="true">{error ? <AlertCircleIcon size={24} /> : <GiftIcon size={24} />}</span>
      <div role={error ? 'alert' : 'status'}>
        <h3>{title}</h3>
        {detail && <p>{detail}</p>}
      </div>
      {onRetry && <button type="button" className="btn btn-secondary" onClick={onRetry}><RefreshIcon size={16} />Thử lại</button>}
      {children}
    </div>
  );
}

function MembershipCard({ profile, promotions }) {
  const tier = profile.membershipTier || 'BRONZE';
  const details = TIERS[tier];
  const spending = profile.totalSpending == null ? null : Number(profile.totalSpending);
  const remaining = details?.nextAmount != null && spending != null
    ? Math.max(0, details.nextAmount - spending)
    : null;
  const tierOffers = promotions?.filter((promotion) => promotion.minMembershipTier === tier).length;

  return (
    <section className={`pf-membership pf-membership--${tier.toLowerCase()}`} aria-labelledby="pf-tier-heading">
      <div className="pf-tier-main">
        <div className="pf-tier-title">
          <span className="pf-tier-icon"><AwardIcon size={29} /></span>
          <div>
            <p>Hạng thành viên MoviePTIT</p>
            <h2 id="pf-tier-heading">{tierName(tier)}</h2>
          </div>
        </div>
        {spending != null && (
          <div className="pf-spending"><span>Chi tiêu tích lũy</span><strong>{money(spending)}</strong></div>
        )}
        {remaining != null && (
          <div className="pf-tier-progress">
            <progress aria-label={`Tiến độ lên hạng ${tierName(details.next)}`} max={details.nextAmount} value={Math.min(details.nextAmount, Math.max(0, spending))} />
            <p>Còn <strong>{money(remaining)}</strong> để lên hạng {tierName(details.next)}.</p>
          </div>
        )}
        {tier === 'PLATINUM' && <p className="pf-tier-top"><CheckIcon size={17} />Hạng cao nhất của MoviePTIT</p>}
      </div>
      <div className="pf-tier-benefits">
        <h3><GiftIcon size={19} />Ưu đãi theo hạng</h3>
        <p>Dùng mã phù hợp với hạng thành viên khi mã còn hiệu lực và đơn đáp ứng điều kiện áp dụng.</p>
        {tierOffers != null && (
          <p className="pf-tier-offer-count">
            {tierOffers > 0 ? `${tierOffers} mã hiện có yêu cầu tối thiểu hạng ${tierName(tier)}.` : `Chưa có mã yêu cầu tối thiểu hạng ${tierName(tier)}.`}
          </p>
        )}
        <Link to="/profile#promos" replace className="pf-tier-link">Xem ưu đãi khả dụng <ArrowRightIcon size={17} /></Link>
      </div>
    </section>
  );
}

function PromotionsPanel({ promotions, state, onRetry }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [clipboard, setClipboard] = useState(null);
  const query = search.trim().toLocaleLowerCase('vi');
  const filtered = promotions.filter((promotion) => (
    (filter !== 'tier' || promotion.minMembershipTier) &&
    (filter !== 'branch' || promotion.branchId != null) &&
    (!query || [promotion.code, promotion.description, promotion.branchName]
      .some((value) => value?.toLocaleLowerCase('vi').includes(query)))
  ));

  function clearFilters() {
    setSearch('');
    setFilter('all');
  }

  async function copyCode(code) {
    try {
      await navigator.clipboard.writeText(code);
      setClipboard({ code, text: `Đã sao chép mã ${code}.` });
    } catch {
      setClipboard({ text: `Không sao chép được. Hãy chọn và sao chép mã ${code}.` });
    }
  }

  return (
    <section className="card pf-panel" aria-labelledby="pf-promos-title">
      <header className="pf-panel-header">
        <div>
          <h2 id="pf-promos-title" tabIndex={-1}>Ưu đãi khả dụng</h2>
          <p>Điều kiện áp dụng và mức giảm được kiểm tra khi bạn nhập mã lúc thanh toán.</p>
        </div>
      </header>
      {state === 'loading' ? <PanelState loading title="Đang tải ưu đãi…" /> : state === 'error' ? (
        <PanelState error title="Không tải được ưu đãi" onRetry={onRetry} />
      ) : promotions.length === 0 ? (
        <PanelState title="Hiện chưa có mã ưu đãi" detail="Mã khả dụng cho tài khoản của bạn sẽ xuất hiện tại đây." />
      ) : (
        <>
          <div className="pf-promo-filters">
            <div>
              <label htmlFor="pf-promo-search" className="form-label">Tìm ưu đãi</label>
              <div className="pf-search">
                <SearchIcon size={17} />
                <input className="input" id="pf-promo-search" value={search} placeholder="Mã, mô tả hoặc rạp…" onChange={(event) => setSearch(event.target.value)} />
              </div>
            </div>
            <div>
              <label htmlFor="pf-promo-scope" className="form-label">Phạm vi áp dụng</label>
              <select className="input" id="pf-promo-scope" value={filter} onChange={(event) => setFilter(event.target.value)}>
                <option value="all">Tất cả ưu đãi</option>
                <option value="tier">Yêu cầu hạng thành viên</option>
                <option value="branch">Áp dụng tại rạp cụ thể</option>
              </select>
            </div>
          </div>
          {filtered.length === 0 ? (
            <PanelState title="Không tìm thấy ưu đãi phù hợp" detail="Thử từ khóa khác hoặc xóa bộ lọc.">
              <button type="button" className="btn btn-secondary" onClick={clearFilters}>Xóa bộ lọc</button>
            </PanelState>
          ) : (
            <>
              <p className="pf-results" role="status">{filtered.length} mã ưu đãi</p>
              <div className="pf-promos">
                {filtered.map((promotion) => (
                  <article className="pf-offer" key={promotion.id ?? promotion.code}>
                    <div className="pf-offer-header">
                      <h3>{promotion.code}</h3>
                      <strong>Giảm {promotion.discountPercent}%</strong>
                    </div>
                    {promotion.description && <p>{promotion.description}</p>}
                    <dl>
                      {promotion.maxDiscount > 0 && <div><dt>Giảm tối đa</dt><dd>{money(promotion.maxDiscount)}</dd></div>}
                      {promotion.minOrderAmount > 0 && <div><dt>Đơn tối thiểu</dt><dd>{money(promotion.minOrderAmount)}</dd></div>}
                      {promotion.minMembershipTier && <div><dt>Hạng tối thiểu</dt><dd>{tierName(promotion.minMembershipTier)}</dd></div>}
                      {promotion.branchId != null && <div><dt>Rạp áp dụng</dt><dd>{promotion.branchName || `Rạp #${promotion.branchId}`}</dd></div>}
                      {promotion.endDate && <div><dt>Hạn sử dụng</dt><dd>{formatExpiry(promotion.endDate)}</dd></div>}
                    </dl>
                    <button className="btn btn-secondary" type="button" onClick={() => copyCode(promotion.code)}
                      aria-label={`${clipboard?.code === promotion.code ? 'Đã sao chép mã' : 'Sao chép mã'} ${promotion.code}`}>
                      {clipboard?.code === promotion.code ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
                      {clipboard?.code === promotion.code ? 'Đã sao chép' : 'Sao chép mã'}
                    </button>
                  </article>
                ))}
              </div>
            </>
          )}
          <p className="pf-feedback" role="status">{clipboard?.text}</p>
        </>
      )}
    </section>
  );
}

function PasswordPanel() {
  const [passwords, setPasswords] = useState(EMPTY_PASSWORDS);
  const [visible, setVisible] = useState({});
  const [errors, setErrors] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [saving, setSaving] = useState(false);

  async function changePassword(event) {
    event.preventDefault();
    if (saving) return;
    const form = event.currentTarget;
    const nextErrors = {};
    if (!passwords.currentPassword) nextErrors.currentPassword = 'Nhập mật khẩu hiện tại.';
    if (passwords.newPassword.length < 6) nextErrors.newPassword = 'Mật khẩu mới cần ít nhất 6 ký tự.';
    if (!passwords.confirmPassword) nextErrors.confirmPassword = 'Nhập lại mật khẩu mới.';
    else if (passwords.confirmPassword !== passwords.newPassword) nextErrors.confirmPassword = 'Mật khẩu xác nhận không khớp.';
    setErrors(nextErrors);
    setFeedback(null);
    const invalidField = Object.keys(nextErrors)[0];
    if (invalidField) {
      form.elements.namedItem(invalidField)?.focus();
      return;
    }

    setSaving(true);
    try {
      await authApi.changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setPasswords(EMPTY_PASSWORDS);
      setVisible({});
      setFeedback({ text: 'Đã cập nhật mật khẩu.' });
    } catch (error) {
      const response = error.response;
      if (response?.status === 401 && response.data?.message === 'Password incorrect') {
        setErrors({ currentPassword: 'Mật khẩu hiện tại không chính xác.' });
        form.elements.namedItem('currentPassword')?.focus();
      } else {
        setFeedback({ error: true, text: response?.data?.message || 'Không thể đổi mật khẩu. Vui lòng thử lại.' });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card pf-panel" aria-labelledby="pf-password-title">
      <header className="pf-panel-header">
        <div>
          <h2 id="pf-password-title" tabIndex={-1}>Đổi mật khẩu</h2>
          <p>Nhập mật khẩu hiện tại để xác nhận thay đổi.</p>
        </div>
      </header>
      <form className="pf-password-form" onSubmit={changePassword} noValidate aria-busy={saving}>
        {PASSWORD_FIELDS.map(([name, label, autoComplete]) => {
          const errorId = errors[name] ? `pf-error-${name}` : '';
          return (
            <div className="pf-field" key={name}>
              <label className="form-label" htmlFor={`pf-${name}`}>{label}</label>
              <div className="pf-password-control">
                <input
                  id={`pf-${name}`} name={name} className="input" type={visible[name] ? 'text' : 'password'}
                  autoComplete={autoComplete} value={passwords[name]} required readOnly={saving}
                  aria-invalid={Boolean(errorId)}
                  aria-describedby={[name === 'newPassword' && 'pf-password-hint', errorId].filter(Boolean).join(' ') || undefined}
                  onChange={(event) => {
                    const value = event.target.value;
                    setPasswords((current) => ({ ...current, [name]: value }));
                    setErrors((current) => ({
                      ...current, [name]: '', ...(name === 'newPassword' && { confirmPassword: '' }),
                    }));
                    setFeedback(null);
                  }}
                />
                <button type="button" aria-label={`${visible[name] ? 'Ẩn' : 'Hiện'} ${label.toLowerCase()}`}
                  onClick={() => setVisible((current) => ({ ...current, [name]: !current[name] }))}>
                  {visible[name] ? <EyeOffIcon size={19} /> : <EyeIcon size={19} />}
                </button>
              </div>
              {name === 'newPassword' && <p id="pf-password-hint" className="pf-field-help">Ít nhất 6 ký tự.</p>}
              {errorId && <p id={errorId} className="pf-field-error" role="alert">{errors[name]}</p>}
            </div>
          );
        })}
        {feedback && <p className={`pf-feedback ${feedback.error ? 'pf-field-error' : ''}`} role={feedback.error ? 'alert' : 'status'}>{feedback.text}</p>}
        <div className="pf-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}><CheckIcon size={17} />{saving ? 'Đang cập nhật…' : 'Cập nhật mật khẩu'}</button>
        </div>
      </form>
    </section>
  );
}

export default function ProfilePage() {
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [profileState, setProfileState] = useState('loading');
  const [profileAttempt, setProfileAttempt] = useState(0);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [promotions, setPromotions] = useState([]);
  const [promoState, setPromoState] = useState('loading');
  const [promoAttempt, setPromoAttempt] = useState(0);
  const editButton = useRef(null);
  const nameInput = useRef(null);
  const restoreEditFocus = useRef(false);
  const hash = location.hash.slice(1);
  const active = hash === 'promos' || hash === 'password' ? hash : 'info';
  const editing = draft !== null;
  const previousSection = useRef(active);

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
    const sectionChanged = previousSection.current !== active;
    previousSection.current = active;
    if (active === 'info' && editing) nameInput.current?.focus();
    else if (active === 'info' && restoreEditFocus.current) {
      restoreEditFocus.current = false;
      editButton.current?.focus();
    } else if (sectionChanged) document.getElementById(`pf-${active}-title`)?.focus();
  }, [editing, active]);

  function cancelEdit() {
    restoreEditFocus.current = true;
    setDraft(null);
    setFeedback(null);
  }

  async function handleUpdateProfile(event) {
    event.preventDefault();
    if (!draft || saving) return;
    setSaving(true);
    setFeedback(null);
    try {
      const { data } = await userApi.updateMyInfo({
        fullName: draft.fullName,
        email: draft.email,
        phoneNumber: draft.phoneNumber,
        dob: draft.dob || null,
        gender: draft.gender || null,
      });
      if (!data.result) throw new Error('Missing profile data');
      setProfile(data.result);
      restoreEditFocus.current = true;
      setDraft(null);
      setFeedback({ text: 'Đã lưu thông tin cá nhân.' });
    } catch (error) {
      setFeedback({ error: true, text: error.response?.data?.message || 'Không thể lưu hồ sơ. Vui lòng thử lại.' });
    } finally {
      setSaving(false);
    }
  }

  function startEdit() {
    setFeedback(null);
    setDraft({
      fullName: profile.fullName ?? null,
      email: profile.email ?? null,
      phoneNumber: profile.phoneNumber ?? null,
      dob: dateValue(profile.dob),
      gender: profile.gender || '',
    });
  }

  function updateDraft(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
    setFeedback(null);
  }

  const accountFields = profile ? [
    ['Tên đăng nhập', profile.username],
    ['Họ và tên', profile.fullName],
    ['Email', profile.email],
    ['Số điện thoại', profile.phoneNumber],
    ['Ngày sinh', formatDate(profile.dob)],
    ['Giới tính', GENDERS[profile.gender]],
  ] : [];

  return (
    <div className="page pf-page">
      <div className="pf-layout">
        <header className="pf-page-header">
          <h1>Tài khoản của tôi</h1>
          <p>Quản lý hồ sơ, hạng thành viên và bảo mật tài khoản MoviePTIT.</p>
        </header>
        <div className="pf-dashboard">
          <aside className="pf-sidebar">
            <nav aria-label="Quản lý tài khoản">
              {SECTIONS.map(([id, label, icon]) => (
                <Link key={id} to={`/profile#${id}`} replace aria-current={active === id ? 'page' : undefined}>
                  {icon}<span>{label}</span>
                </Link>
              ))}
              <Link to="/my-bookings"><TicketIcon size={19} /><span>Vé của tôi</span></Link>
            </nav>
          </aside>
          <div className="pf-content">
            {active === 'info' && (profileState === 'loading' ? (
              <PanelState loading title="Đang tải hồ sơ…" />
            ) : profileState === 'error' ? (
              <PanelState error title="Không tải được hồ sơ" onRetry={() => {
                setProfileState('loading');
                setProfileAttempt((attempt) => attempt + 1);
              }} />
            ) : (
              <>
                <MembershipCard profile={profile} promotions={promoState === 'ready' ? promotions : null} />
                <section className="card pf-panel" aria-labelledby="pf-info-title">
                  <header className="pf-panel-header">
                    <div><h2 id="pf-info-title" tabIndex={-1}>Thông tin cá nhân</h2><p>{editing ? 'Tên đăng nhập được giữ cố định.' : 'Thông tin bạn đã lưu trên MoviePTIT.'}</p></div>
                    <button type="button" ref={editButton} className="btn btn-secondary" onClick={startEdit} hidden={editing}><EditIcon size={17} />Sửa hồ sơ</button>
                  </header>
                  {feedback && <p className={`pf-feedback ${feedback.error ? 'pf-field-error' : ''}`} role={feedback.error ? 'alert' : 'status'}>{feedback.text}</p>}
                  {editing ? (
                    <form onSubmit={handleUpdateProfile} aria-busy={saving}>
                      <div className="pf-fields">
                        <div className="pf-field pf-field--static"><div className="form-label">Tên đăng nhập</div><p>{profile.username || 'Chưa cập nhật'}</p></div>
                        <div className="pf-field">
                          <label className="form-label" htmlFor="pf-fullname">Họ và tên</label>
                          <input id="pf-fullname" className="input" ref={nameInput} autoComplete="name" maxLength={255} value={draft.fullName ?? ''} onChange={(event) => updateDraft('fullName', event.target.value)} readOnly={saving} />
                        </div>
                        <div className="pf-field">
                          <label className="form-label" htmlFor="pf-email">Email</label>
                          <input id="pf-email" className="input" type="email" autoComplete="email" maxLength={255} value={draft.email ?? ''} onChange={(event) => updateDraft('email', event.target.value)} readOnly={saving} />
                        </div>
                        <div className="pf-field">
                          <label className="form-label" htmlFor="pf-phone">Số điện thoại</label>
                          <input id="pf-phone" className="input" type="tel" autoComplete="tel" maxLength={20} value={draft.phoneNumber ?? ''} onChange={(event) => updateDraft('phoneNumber', event.target.value)} readOnly={saving} />
                        </div>
                        <div className="pf-field">
                          <label className="form-label" htmlFor="pf-birthday">Ngày sinh</label>
                          <input id="pf-birthday" className="input" type="date" autoComplete="bday" max={new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format()} value={draft.dob} onChange={(event) => updateDraft('dob', event.target.value)} readOnly={saving} required={Boolean(profile.dob)} />
                        </div>
                        <div className="pf-field">
                          <label className="form-label" htmlFor="pf-gender">Giới tính</label>
                          <select id="pf-gender" className="input" value={draft.gender} onChange={(event) => updateDraft('gender', event.target.value)} disabled={saving}>
                            <option value="" disabled={Boolean(profile.gender)}>Chưa cập nhật</option>
                            {Object.entries(GENDERS).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="pf-actions">
                        <button type="button" className="btn btn-secondary" onClick={cancelEdit} disabled={saving}>Hủy</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}><CheckIcon size={17} />{saving ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
                      </div>
                    </form>
                  ) : (
                    <dl className="pf-details">
                      {accountFields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Chưa cập nhật'}</dd></div>)}
                    </dl>
                  )}
                </section>
              </>
            ))}
            {active === 'promos' && <PromotionsPanel promotions={promotions} state={promoState} onRetry={() => {
              setPromoState('loading');
              setPromoAttempt((attempt) => attempt + 1);
            }} />}
            {active === 'password' && <PasswordPanel />}
          </div>
        </div>
      </div>
    </div>
  );
}
