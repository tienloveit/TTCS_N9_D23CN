import { AlertCircleIcon } from '../../components/Common/CinemaIcons';

/** Trạng thái ngoài dữ liệu, căn trái: lỗi dùng role="alert", rỗng dùng role="status", kèm hành động nếu có. */
export default function AccountState({ icon, title, detail, error = false, children, headingAs = 'h3' }) {
  const Heading = headingAs;
  return (
    <div className="ac-state" role={error ? 'alert' : 'status'}>
      <span className="ac-state__icon" data-tone={error ? 'danger' : undefined} aria-hidden="true">
        {error ? <AlertCircleIcon size={24} /> : icon}
      </span>
      <Heading className="ac-state__title">{title}</Heading>
      {detail && <p className="ac-state__detail">{detail}</p>}
      {children && <div className="ac-state__actions">{children}</div>}
    </div>
  );
}

/** Khung giả theo bố cục thật: đầu trang, đường hạng, ba tab và ngăn đang mở. */
export function AccountSkeleton() {
  return (
    <div className="ac-wrap ac-top">
      <h1 className="sr-only">Tài khoản của tôi</h1>
      <span className="sr-only" role="status">Đang tải tài khoản</span>
      <div className="ac-head" aria-hidden="true">
        <div className="ac-head__id">
          <span className="ac-skeleton ac-skeleton--title" />
          <span className="ac-skeleton ac-skeleton--meta" />
        </div>
      </div>
      <div className="ac-tier" aria-hidden="true">
        <div className="ac-tier__summary">
          <span className="ac-skeleton ac-skeleton--tier" />
          <span className="ac-skeleton ac-skeleton--amount" />
        </div>
        <div className="ac-track">
          {[0, 1, 2, 3].map((index) => (
            <span className="ac-track__stop" key={index}>
              <span className="ac-track__node" />
              <span className="ac-skeleton ac-skeleton--stop" />
            </span>
          ))}
        </div>
      </div>
      <div className="ac-account" aria-hidden="true">
        <div className="ac-tabs">
          {[0, 1, 2].map((index) => <span className="ac-skeleton ac-skeleton--tab" key={index} />)}
        </div>
        <div className="ac-panel">
          <span className="ac-skeleton ac-skeleton--heading" />
          {[0, 1, 2].map((index) => <span className="ac-skeleton ac-skeleton--row" key={index} />)}
        </div>
      </div>
    </div>
  );
}

/** Ba dòng ưu đãi giả trong lúc tải. */
export function PromotionSkeleton() {
  return (
    <>
      <span className="sr-only" role="status">Đang tải ưu đãi</span>
      <PromotionPlaceholder />
    </>
  );
}

function PromotionPlaceholder() {
  return (
    <div className="ac-promos__loading" aria-busy="true">
      {[0, 1, 2].map((index) => (
        <span className="ac-skeleton ac-skeleton--promo" key={index} aria-hidden="true" />
      ))}
    </div>
  );
}
