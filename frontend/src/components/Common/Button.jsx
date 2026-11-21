import { Link } from 'react-router-dom';

const VARIANT_CLASS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
  'ghost-danger': 'btn-ghost-danger',
};

const SIZE_CLASS = {
  xs: 'btn-xs',
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
};

/**
 * Nút chuẩn của hệ thống, dựng trên các class .btn.
 * - variant: primary | secondary | ghost | danger | ghost-danger
 * - size: xs | sm | md | lg
 * - to: truyền vào để render <Link> thay cho <button>
 * - icon: phần tử đặt trước chữ; nút chỉ có icon cần aria-label
 */
export default function Button({
  variant = 'secondary',
  size = 'md',
  block = false,
  icon = null,
  to,
  type = 'button',
  className = '',
  children,
  ...props
}) {
  const iconOnly = Boolean(icon) && (children === undefined || children === null || children === false);
  const classes = ['btn', VARIANT_CLASS[variant], SIZE_CLASS[size], iconOnly && 'btn-icon-only', block && 'btn-block', className]
    .filter(Boolean)
    .join(' ');

  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {icon}
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} {...props}>
      {icon}
      {children}
    </button>
  );
}
