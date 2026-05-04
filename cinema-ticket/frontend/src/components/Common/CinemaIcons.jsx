const baseProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

export const MoviePTITLogoIcon = (props) => (
  <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" {...props}>
    <rect width="32" height="32" rx="4" fill="#272631" />
    <path d="M8 8h16l-7 7h8L12 27l3-9H7l7-10Z" fill="url(#movieptit-bolt-main)" />
    <path d="M8 8h16l-7 7h-9l6-7Z" fill="url(#movieptit-bolt-top)" opacity="0.96" />
    <defs>
      <linearGradient id="movieptit-bolt-main" x1="7" y1="8" x2="24.5" y2="26.5" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FDE047" />
        <stop offset="0.44" stopColor="#F97316" />
        <stop offset="1" stopColor="#DC2626" />
      </linearGradient>
      <linearGradient id="movieptit-bolt-top" x1="8" y1="8" x2="22" y2="15" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFF7AD" />
        <stop offset="1" stopColor="#FB923C" />
      </linearGradient>
    </defs>
  </svg>
);

export const FilmIcon = (props) => (
  <svg {...baseProps} {...props}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M7 4v16" />
    <path d="M17 4v16" />
    <path d="M3 9h4" />
    <path d="M3 15h4" />
    <path d="M17 9h4" />
    <path d="M17 15h4" />
  </svg>
);

export const SearchIcon = (props) => (
  <svg {...baseProps} {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export const ClockIcon = (props) => (
  <svg {...baseProps} {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

export const GlobeIcon = (props) => (
  <svg {...baseProps} {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a14 14 0 0 1 0 18" />
    <path d="M12 3a14 14 0 0 0 0 18" />
  </svg>
);

export const CalendarIcon = (props) => (
  <svg {...baseProps} {...props}>
    <rect x="4" y="5" width="16" height="15" rx="2" />
    <path d="M8 3v4" />
    <path d="M16 3v4" />
    <path d="M4 10h16" />
  </svg>
);

export const SparkIcon = (props) => (
  <svg {...baseProps} {...props}>
    <path d="M13 2 5 14h6l-1 8 8-12h-6l1-8Z" />
  </svg>
);

export const MessageIcon = (props) => (
  <svg {...baseProps} {...props}>
    <path d="M21 12a8 8 0 0 1-8 8H7l-4 3 1.5-5.4A8 8 0 1 1 21 12Z" />
    <path d="M8 11h8" />
    <path d="M8 15h5" />
  </svg>
);

export const SendIcon = (props) => (
  <svg {...baseProps} {...props}>
    <path d="m22 2-7 20-4-9-9-4 20-7Z" />
    <path d="M22 2 11 13" />
  </svg>
);

export const TicketIcon = (props) => (
  <svg {...baseProps} {...props}>
    <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a3 3 0 0 0 0 6v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a3 3 0 0 0 0-6V7Z" />
    <path d="M13 5v3" />
    <path d="M13 16v3" />
    <path d="M13 11v2" />
  </svg>
);

export const UserIcon = (props) => (
  <svg {...baseProps} {...props}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </svg>
);

export const KeyIcon = (props) => (
  <svg {...baseProps} {...props}>
    <circle cx="7.5" cy="14.5" r="4.5" />
    <path d="M11 11 21 1" />
    <path d="m16 6 2 2" />
    <path d="m19 3 2 2" />
  </svg>
);

export const MapPinIcon = (props) => (
  <svg {...baseProps} {...props}>
    <path d="M12 21s7-5.2 7-12a7 7 0 1 0-14 0c0 6.8 7 12 7 12Z" />
    <circle cx="12" cy="9" r="2.5" />
  </svg>
);

export const PhoneIcon = (props) => (
  <svg {...baseProps} {...props}>
    <path d="M22 16.9v2.4a2 2 0 0 1-2.2 2 19.7 19.7 0 0 1-8.6-3.1 19.2 19.2 0 0 1-5.9-5.9 19.7 19.7 0 0 1-3.1-8.7A2 2 0 0 1 4.2 1.5h2.4a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.6a2 2 0 0 1-.5 2.1l-1 1a16 16 0 0 0 6.4 6.4l1-1a2 2 0 0 1 2.1-.5c.8.3 1.7.6 2.6.7a2 2 0 0 1 1.7 2Z" />
  </svg>
);

export const MailIcon = (props) => (
  <svg {...baseProps} {...props}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>
);

export const ChevronDownIcon = (props) => (
  <svg {...baseProps} {...props}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const ChevronLeftIcon = (props) => (
  <svg {...baseProps} {...props}>
    <path d="m15 18-6-6 6-6" />
  </svg>
);

export const ChevronRightIcon = (props) => (
  <svg {...baseProps} {...props}>
    <path d="m9 18 6-6-6-6" />
  </svg>
);

export const CheckCircleIcon = (props) => (
  <svg {...baseProps} {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12 2.5 2.5L16 9" />
  </svg>
);

export const XCircleIcon = (props) => (
  <svg {...baseProps} {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="m9 9 6 6" />
    <path d="m15 9-6 6" />
  </svg>
);

export const TimerIcon = (props) => (
  <svg {...baseProps} {...props}>
    <circle cx="12" cy="13" r="8" />
    <path d="M9 2h6" />
    <path d="M12 6V2" />
    <path d="M12 9v4l3 2" />
  </svg>
);

export const DownloadIcon = (props) => (
  <svg {...baseProps} {...props}>
    <path d="M12 3v12" />
    <path d="m7 10 5 5 5-5" />
    <path d="M5 21h14" />
  </svg>
);
