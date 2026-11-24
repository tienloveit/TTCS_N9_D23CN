import { AlertTriangleIcon, CheckCircleIcon, ScanIcon, XCircleIcon } from '../Common/CinemaIcons';

const icons = { danger: XCircleIcon, warning: AlertTriangleIcon, success: CheckCircleIcon, neutral: ScanIcon };
export default function Verdict({ tone = 'neutral', title, icon, children, className = '', ...props }) {
  const Icon = icon || icons[tone] || icons.neutral;
  return <section className={'o-verdict o-verdict--' + tone + ' ' + className} {...props}>
    <div className="o-verdict__head"><Icon size={32} aria-hidden="true" /><h2>{title}</h2></div>
    {children}
  </section>;
}
