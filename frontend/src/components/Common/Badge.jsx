/**
 * Nhãn trạng thái ngắn.
 * - tone: neutral | success | warning | danger | info | brand
 * - dot: thêm chấm tròn trước chữ
 */
export default function Badge({ tone = 'neutral', dot = false, className = '', children, ...props }) {
  const classes = ['badge', tone !== 'neutral' && `badge--${tone}`, dot && 'badge--dot', className]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} {...props}>
      {children}
    </span>
  );
}
