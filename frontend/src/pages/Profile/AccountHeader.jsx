import Button from '../../components/Common/Button';
import { TicketIcon } from '../../components/Common/CinemaIcons';
import { dateKeyParts, toCinemaDateKey } from '../../utils/cinemaTime';

/** "11/2025" theo giờ rạp. Intl của vi-VN ra "tháng 11, 2025" nên ghép từ khóa ngày. */
function joinedMonth(createdAt) {
  const key = toCinemaDateKey(createdAt);
  if (!key) return null;
  const { mm, year } = dateKeyParts(key);
  return `${mm}/${year}`;
}

/** Tên khách là h1, dòng phụ là tên đăng nhập và tháng tham gia, bên phải là nút sang Vé của tôi. Đăng xuất nằm trong menu tài khoản trên Navbar. */
export default function AccountHeader({ profile }) {
  const username = profile?.username;
  const name = profile?.fullName?.trim() || username;
  const joined = joinedMonth(profile?.createdAt);

  return (
    <header className="ac-head">
      <div className="ac-head__id">
        <h1 id="ac-account-title" className="ac-head__title" tabIndex={-1}>
          {name ? <><span className="sr-only">Tài khoản của </span>{name}</> : 'Tài khoản của tôi'}
        </h1>
        {(username || joined) && (
          <p className="ac-head__meta">
            {username && <span>@{username}</span>}
            {joined && <span>Thành viên từ {joined}</span>}
          </p>
        )}
      </div>
      <div className="ac-head__actions">
        <Button variant="primary" to="/my-bookings" icon={<TicketIcon size={18} />}>Vé của tôi</Button>
      </div>
    </header>
  );
}
