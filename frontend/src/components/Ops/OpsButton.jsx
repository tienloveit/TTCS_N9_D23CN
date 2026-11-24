import { Link } from 'react-router-dom';

export default function OpsButton({
  variant = 'secondary', size = 'md', icon, to, block, loading, disabled,
  type = 'button', children, className = '', ...props
}) {
  const classes = ['o-btn', 'o-btn--' + variant, 'o-btn--' + size, block && 'o-btn--block',
    !children && icon && 'o-btn--icon', className].filter(Boolean).join(' ');
  const content = <>
    {icon && <span className="o-btn__icon" aria-hidden="true">{icon}</span>}
    {children && <span className="o-btn__label">{children}</span>}
    {loading && <span className="o-btn__spinner" aria-hidden="true" />}
  </>;
  const shared = { ...props, className: classes, 'aria-busy': loading || undefined };
  if (to && !(disabled || loading)) return <Link to={to} {...shared}>{content}</Link>;
  return <button type={type} disabled={disabled || loading} {...shared}>{content}</button>;
}
