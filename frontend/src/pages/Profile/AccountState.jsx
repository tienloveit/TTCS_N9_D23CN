import { AlertCircleIcon } from '../../components/Common/CinemaIcons';

/** Trạng thái ngoài dữ liệu: lỗi dùng role="alert", rỗng dùng role="status", kèm hành động nếu có. */
export default function AccountState({ icon, title, detail, error = false, children }) {
  return (
    <div className="ac-state" role={error ? 'alert' : 'status'}>
      <span className="ac-state__icon" data-tone={error ? 'danger' : undefined} aria-hidden="true">
        {error ? <AlertCircleIcon size={24} /> : icon}
      </span>
      <h3 className="ac-state__title">{title}</h3>
      {detail && <p className="ac-state__detail">{detail}</p>}
      {children && <div className="ac-state__actions">{children}</div>}
    </div>
  );
}

/** Khung xám của cả trang trong lúc tải hồ sơ: tiêu đề, thang hạng 4 bậc, 6 dòng thông tin. */
export function AccountSkeleton() {
  return (
    <div className="ac-wrap ac-top">
      <h1 className="sr-only">Tài khoản của tôi</h1>
      <span className="sr-only" role="status">Đang tải tài khoản</span>
      <div className="ac-head" aria-hidden="true">
        <span className="ac-skeleton ac-skeleton--title" />
        <span className="ac-skeleton ac-skeleton--line" />
      </div>
      <div className="ac-layout" aria-hidden="true">
        <div className="ac-tier">
          <span className="ac-skeleton ac-skeleton--heading" />
          <span className="ac-skeleton ac-skeleton--figure" />
          {[0, 1, 2, 3].map((index) => <span className="ac-skeleton ac-skeleton--step" key={index} />)}
        </div>
        <div className="ac-main">
          {[0, 1, 2, 3, 4, 5].map((index) => <span className="ac-skeleton ac-skeleton--row" key={index} />)}
        </div>
      </div>
    </div>
  );
}

/** Ba dòng ưu đãi giả trong lúc tải. */
export function PromotionSkeleton() {
  return (
    <div className="ac-promos__loading" aria-busy="true">
      <span className="sr-only" role="status">Đang tải ưu đãi</span>
      {[0, 1, 2].map((index) => (
        <span className="ac-skeleton ac-skeleton--promo" key={index} aria-hidden="true" />
      ))}
    </div>
  );
}
