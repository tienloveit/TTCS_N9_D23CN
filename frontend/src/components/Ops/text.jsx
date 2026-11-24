import { useState } from 'react';
import { CheckIcon, CopyIcon } from '../Common/CinemaIcons';
import { formatDate, formatTime, parseLocalDateTime } from '../../utils/cinemaTime';
import { formatDateLabel, formatMoney } from '../../utils/opsFormat';
import OpsButton from './OpsButton';

export function Money({ value, className = '', ...props }) {
  return <span className={'o-money ' + className} data-negative={Number(value) < 0 || undefined} {...props}>{formatMoney(value)}</span>;
}

export function Code({ children, value, copy = false, className = '', ...props }) {
  const code = value ?? children;
  const [feedback, setFeedback] = useState(null);
  async function copyCode() {
    try {
      await navigator.clipboard.writeText(String(code));
      setFeedback({ code, ok: true });
    } catch {
      setFeedback({ code, ok: false });
    }
  }
  const feedbackVisible = feedback && feedback.code === code;
  return (
    <span className={'o-code ' + className} {...props}>
      {code ?? '—'}
      {copy && code != null && <OpsButton variant="ghost" size="sm" aria-label={'Sao chép mã ' + code} onClick={copyCode}
        icon={feedbackVisible && feedback.ok ? <CheckIcon size={14} /> : <CopyIcon size={14} />} />}
      {copy && <span role="status" className={feedbackVisible && !feedback.ok ? 'o-field__error' : 'o-sr-only'}>
        {feedbackVisible && (feedback.ok ? 'Đã sao chép mã' : 'Không thể sao chép mã')}
      </span>}
    </span>
  );
}

export function ShowTime({ value, size, className = '', ...props }) {
  return <time className={'o-show-time ' + className} data-size={size} dateTime={parseLocalDateTime(value)?.toISOString()} {...props}>
    {formatTime(value)}
  </time>;
}

export function DateLabel({ value, now, className = '', ...props }) {
  return <time className={'o-date ' + className} dateTime={parseLocalDateTime(value)?.toISOString()} title={formatDate(value)} {...props}>
    {formatDateLabel(value, now)}
  </time>;
}
