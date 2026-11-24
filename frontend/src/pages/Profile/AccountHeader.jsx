import Button from '../../components/Common/Button';
import { LogoutIcon, TicketIcon } from '../../components/Common/CinemaIcons';
import useLogout from '../../context/useLogout';
import { dateKeyParts, toCinemaDateKey } from '../../utils/cinemaTime';

/** "11/2025" theo giờ rạp. Intl của vi-VN ra "tháng 11, 2025" nên ghép từ khóa ngày. */
function joinedMonth(createdAt) {
  const key = toCinemaDateKey(createdAt);
  if (!key) return null;
  const { mm, year } = dateKeyParts(key);
  return `${mm}/${year}`;
}

/** Tên khách là h1, dòng phụ là tên đăng nhập và tháng tham gia. */
export default function AccountHeader({ profile }) {
  const { logout, pending } = useLogout();
  const username = profile?.username;
  const name = profile?.fullName?.trim() || username;
  const joined = joinedMonth(profile?.createdAt);

  return (
    <header className="ac-head">
      <h1 className="ac-head__title">
        {name ? <><span className="sr-only">Tài khoản của </span>{name}</> : 'Tài khoản của tôi'}
      </h1>
      {(username || joined) && (
        <p className="ac-head__meta">
          {username && <span>@{username}</span>}
          {joined && <span>Thành viên từ {joined}</span>}
        </p>
      )}
      <div className="ac-head__actions">
        <Button variant="secondary" className="ac-head__button" to="/my-bookings" icon={<TicketIcon size={18} />}>Vé của tôi</Button>
        <Button variant="ghost" icon={<LogoutIcon size={18} />} onClick={logout} disabled={pending}>
          {pending ? 'Đang đăng xuất…' : 'Đăng xuất'}
        </Button>
      </div>
    </header>
  );
}
