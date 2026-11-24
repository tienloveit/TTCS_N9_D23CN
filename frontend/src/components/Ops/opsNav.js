const staff = ['STAFF'];
const office = ['MANAGER', 'ADMIN'];
const admin = ['ADMIN'];

const groups = [
  ['Ca làm việc', [
    ['dashboard', 'Tổng quan ca', 'Dashboard', staff],
    ['booking', 'Bán vé tại quầy', 'Ticket', staff],
    ['check-in', 'Soát vé', 'Scan', staff],
    ['bookings', 'Tra cứu đơn', 'List', staff],
    ['notifications', 'Thông báo', 'Bell', staff],
  ]],
  ['Bàn làm việc', [
    ['', 'Tổng quan', 'Dashboard', office, { MANAGER: 'Tổng quan chi nhánh' }],
    ['operations', 'Báo cáo vận hành', 'Report', office],
    ['revenue', 'Doanh thu', 'Banknote', office],
  ]],
  ['Rạp và vé', [
    ['movies', 'Phim', 'Film', admin],
    ['showtimes', 'Suất chiếu', 'Calendar', office],
    ['branches', 'Rạp và phòng', 'Building', office],
    ['bookings', 'Đơn đặt vé', 'Ticket', office],
    ['refunds', 'Hoàn tiền', 'RotateCcw', office],
  ]],
  ['Bắp nước và khuyến mãi', [
    ['foods', 'Bắp nước', 'Popcorn', office],
    ['promotions', 'Khuyến mãi', 'Gift', office],
  ]],
  ['Hệ thống', [
    ['users', 'Người dùng', 'Users', office, { MANAGER: 'Nhân viên' }],
    ['notifications', 'Thông báo', 'Bell', office],
    ['audit-logs', 'Nhật ký hệ thống', 'Shield', office],
    ['settings', 'Cấu hình', 'Settings', admin],
  ]],
];

export function opsNavigation(area) {
  const role = area.toUpperCase();
  return groups.map(([label, links]) => ({
    label,
    items: links.filter(([, , , roles]) => roles.includes(role)).map(([path, name, icon, , labelByRole]) => ({
      path: '/' + area + (path ? '/' + path : ''), label: labelByRole?.[role] || name, icon,
    })),
  })).filter(group => group.items.length);
}
