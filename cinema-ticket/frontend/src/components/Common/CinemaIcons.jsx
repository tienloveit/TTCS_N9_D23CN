/**
 * Centralized Icon Adapter — Powered by `lucide-react`
 *
 * RULE: All UI icons across the frontend MUST use `lucide-react` (either imported
 * from `lucide-react` directly or through this centralized CinemaIcons module).
 * Do NOT hand-craft inline <svg> icons or use emojis as UI action icons.
 * Only official brand logos (e.g., MoviePTITLogoIcon) may use custom SVG geometry.
 */
import {
  AlertCircle,
  AlertTriangle,
  Armchair,
  ArrowLeft,
  ArrowRight,
  Award,
  Banknote,
  BarChart3,
  Bell,
  Boxes,
  Building2,
  Calculator,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Film,
  Flame,
  Gift,
  Globe,
  Image as ImageIcon,
  KeyRound,
  LayoutDashboard,
  List,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessageSquare,
  Pencil,
  Phone,
  Play,
  Plus,
  Popcorn,
  Printer,
  QrCode,
  RefreshCw,
  RotateCcw,
  ScanLine,
  Search,
  Send,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Ticket,
  Timer,
  Trash2,
  Unlock,
  Upload,
  User,
  Users,
  X,
  XCircle,
} from 'lucide-react';

export const MoviePTITLogoIcon = (props) => (
  <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" {...props}>
    <rect width="32" height="32" rx="4" fill="#272631" />
    <path d="M8 8h16l-7 7h8L12 27l3-9H7l7-10Z" fill="url(#movieptit-bolt-main)" />
    <path d="M8 8h16l-7 7h-9l6-7Z" fill="url(#movieptit-bolt-top)" opacity="0.96" />
    <defs>
      <linearGradient
        id="movieptit-bolt-main"
        x1="7"
        y1="8"
        x2="24.5"
        y2="26.5"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#FDE047" />
        <stop offset="0.44" stopColor="#F97316" />
        <stop offset="1" stopColor="#DC2626" />
      </linearGradient>
      <linearGradient
        id="movieptit-bolt-top"
        x1="8"
        y1="8"
        x2="22"
        y2="15"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#FFF7AD" />
        <stop offset="1" stopColor="#FB923C" />
      </linearGradient>
    </defs>
  </svg>
);

const withLucideDefaults = (LucideComponent) => {
  const Wrapped = ({ size = 20, strokeWidth = 2, ...props }) => (
    <LucideComponent size={size} strokeWidth={strokeWidth} aria-hidden="true" {...props} />
  );
  Wrapped.displayName = `Cinema${LucideComponent.displayName || LucideComponent.name || 'Icon'}`;
  return Wrapped;
};

// Existing CinemaIcons exports (backward-compatible across all pages)
export const FilmIcon = withLucideDefaults(Film);
export const SearchIcon = withLucideDefaults(Search);
export const ClockIcon = withLucideDefaults(Clock);
export const GlobeIcon = withLucideDefaults(Globe);
export const CalendarIcon = withLucideDefaults(Calendar);
export const SparkIcon = withLucideDefaults(Sparkles);
export const FlameIcon = withLucideDefaults(Flame);
export const MessageIcon = withLucideDefaults(MessageSquare);
export const SendIcon = withLucideDefaults(Send);
export const TicketIcon = withLucideDefaults(Ticket);
export const UserIcon = withLucideDefaults(User);
export const UsersIcon = withLucideDefaults(Users);
export const KeyIcon = withLucideDefaults(KeyRound);
export const MapPinIcon = withLucideDefaults(MapPin);
export const PhoneIcon = withLucideDefaults(Phone);
export const MailIcon = withLucideDefaults(Mail);
export const ChevronDownIcon = withLucideDefaults(ChevronDown);
export const ChevronLeftIcon = withLucideDefaults(ChevronLeft);
export const ChevronRightIcon = withLucideDefaults(ChevronRight);
export const CheckCircleIcon = withLucideDefaults(CheckCircle2);
export const XCircleIcon = withLucideDefaults(XCircle);
export const TimerIcon = withLucideDefaults(Timer);
export const DownloadIcon = withLucideDefaults(Download);
export const EyeIcon = withLucideDefaults(Eye);
export const EyeOffIcon = withLucideDefaults(EyeOff);
export const LogoutIcon = withLucideDefaults(LogOut);

// Additional standard icons for Admin, Staff POS, Gate Check-in, and CRUD tables
export const DashboardIcon = withLucideDefaults(LayoutDashboard);
export const BuildingIcon = withLucideDefaults(Building2);
export const ScanIcon = withLucideDefaults(ScanLine);
export const QrCodeIcon = withLucideDefaults(QrCode);
export const PopcornIcon = withLucideDefaults(Popcorn);
export const GiftIcon = withLucideDefaults(Gift);
export const ReportIcon = withLucideDefaults(BarChart3);
export const ShieldIcon = withLucideDefaults(ShieldCheck);
export const BellIcon = withLucideDefaults(Bell);
export const SettingsIcon = withLucideDefaults(Settings);
export const BoxIcon = withLucideDefaults(Boxes);
export const MenuIcon = withLucideDefaults(Menu);
export const ExternalLinkIcon = withLucideDefaults(ExternalLink);
export const ListIcon = withLucideDefaults(List);
export const PlusIcon = withLucideDefaults(Plus);
export const EditIcon = withLucideDefaults(Pencil);
export const TrashIcon = withLucideDefaults(Trash2);
export const LockIcon = withLucideDefaults(Lock);
export const UnlockIcon = withLucideDefaults(Unlock);
export const PrinterIcon = withLucideDefaults(Printer);
export const BanknoteIcon = withLucideDefaults(Banknote);
export const CreditCardIcon = withLucideDefaults(CreditCard);
export const CalculatorIcon = withLucideDefaults(Calculator);
export const CameraIcon = withLucideDefaults(Camera);
export const UploadIcon = withLucideDefaults(Upload);
export const ImageFileIcon = withLucideDefaults(ImageIcon);
export const RefreshIcon = withLucideDefaults(RefreshCw);
export const RotateCcwIcon = withLucideDefaults(RotateCcw);
export const ArmchairIcon = withLucideDefaults(Armchair);
export const AlertTriangleIcon = withLucideDefaults(AlertTriangle);
export const AlertCircleIcon = withLucideDefaults(AlertCircle);
export const CheckIcon = withLucideDefaults(Check);
export const XIcon = withLucideDefaults(X);
export const ArrowLeftIcon = withLucideDefaults(ArrowLeft);
export const ArrowRightIcon = withLucideDefaults(ArrowRight);
export const StarIcon = withLucideDefaults(Star);
export const PlayIcon = withLucideDefaults(Play);
export const CopyIcon = withLucideDefaults(Copy);
export const AwardIcon = withLucideDefaults(Award);
export const SlidersIcon = withLucideDefaults(SlidersHorizontal);
