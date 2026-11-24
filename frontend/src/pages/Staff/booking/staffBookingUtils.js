// Hàm thuần dùng cho màn bán vé tại quầy (định dạng, phiếu in, bộ lọc giờ).
import {
  formatDate as formatCinemaDate,
  formatDateTime as formatCinemaDateTime,
  formatTime as formatCinemaTime,
  getCinemaWeekday,
  toCinemaDateKey,
} from '../../../utils/cinemaTime';

export const formatCurrency = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

// Giờ suất chiếu luôn hiển thị theo giờ rạp, không theo múi giờ của máy quầy.
export const formatTime = (value) => (value ? formatCinemaTime(value) : '');

export const formatDateTime = (value) => (value ? formatCinemaDateTime(value) : '');

const WEEKDAYS_LONG = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

export const formatDate = (value) => {
  const weekday = getCinemaWeekday(value);
  if (weekday === null) return '';
  return `${WEEKDAYS_LONG[weekday]}, ${formatCinemaDate(value)}`;
};

export const toLocalDateKey = (value) => toCinemaDateKey(value);

export const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

export const buildPrintDocument = (booking) => {
  const seatCodes = booking.seatCodes || (booking.tickets || []).map((ticket) => ticket.seatCode);
  const foods = booking.foods || [];
  const foodRows = foods.length
    ? foods
        .map(
          (food) => `
            <tr>
              <td>${escapeHtml(food.foodName)}</td>
              <td>${escapeHtml(food.quantity)}</td>
              <td>${formatCurrency(food.subtotal)}</td>
            </tr>
          `
        )
        .join('')
    : '<tr><td colspan="3">Không có đồ ăn kèm</td></tr>';

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(booking.bookingCode || 'Hoa don')}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; margin: 0; color: CanvasText; }
          .ticket { width: 80mm; padding: 14px; }
          .brand { text-align: center; border-bottom: 1px dashed GrayText; padding-bottom: 10px; margin-bottom: 10px; }
          .brand h1 { font-size: 18px; margin: 0 0 4px; }
          .brand p, .muted { color: CanvasText; font-size: 12px; margin: 0; }
          .row { display: flex; justify-content: space-between; gap: 12px; margin: 7px 0; font-size: 13px; }
          .row strong { text-align: right; }
          .section { border-top: 1px dashed GrayText; margin-top: 10px; padding-top: 10px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          td, th { padding: 5px 0; border-bottom: 1px solid GrayText; text-align: left; }
          td:last-child, th:last-child { text-align: right; }
          .total { font-size: 18px; font-weight: 800; text-align: right; margin-top: 10px; }
          .code { font-family: monospace; font-size: 13px; text-align: center; margin-top: 12px; }
          @media print {
            @page { size: 80mm auto; margin: 0; }
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="brand">
            <h1>MoviePTIT</h1>
            <p>Vé xem phim / Hóa đơn tại quầy</p>
          </div>

          <div class="row"><span>Mã đơn</span><strong>${escapeHtml(booking.bookingCode)}</strong></div>
          <div class="row"><span>Phim</span><strong>${escapeHtml(booking.movieName)}</strong></div>
          <div class="row"><span>Suất chiếu</span><strong>${formatDateTime(booking.showtimeStart)}</strong></div>
          <div class="row"><span>Phòng</span><strong>${escapeHtml(booking.roomName || '')}</strong></div>
          <div class="row"><span>Ghế</span><strong>${escapeHtml(seatCodes.join(', '))}</strong></div>
          <div class="row"><span>Thanh toán</span><strong>${escapeHtml(booking.paymentMethod || 'CASH')}</strong></div>

          <div class="section">
            <table>
              <thead>
                <tr><th>Món</th><th>SL</th><th>Tiền</th></tr>
              </thead>
              <tbody>${foodRows}</tbody>
            </table>
          </div>

          ${booking.discountAmount > 0 ? `<div class="row section"><span>Giảm giá</span><strong>-${formatCurrency(booking.discountAmount)}</strong></div>` : ''}
          <div class="total">${formatCurrency(booking.totalAmount)}</div>
          <div class="code">${escapeHtml(booking.bookingCode)}</div>
          <p class="muted" style="text-align:center;margin-top:10px">Vui lòng giữ vé để check-in.</p>
        </div>
        <script>
          window.onload = () => {
            window.print();
            setTimeout(() => window.close(), 300);
          };
        </script>
      </body>
    </html>
  `;
};

export const TIME_FILTERS = [
  { key: 'ALL', label: 'Cả ngày' },
  { key: 'MORNING', label: 'Sáng' },
  { key: 'AFTERNOON', label: 'Chiều' },
  { key: 'EVENING', label: 'Tối' },
  { key: 'NIGHT', label: 'Khuya' },
];

/** "còn 13 phút", "còn 1 giờ 28 phút", "Đã chiếu 12 phút" theo mốc bắt đầu (ms) và hiện tại (ms). */
export const formatStartsIn = (startMs, nowMs) => {
  const minutes = Math.round((startMs - nowMs) / 60000);
  if (minutes < 0) return `Đã chiếu ${-minutes} phút`;
  if (minutes === 0) return 'Đang bắt đầu';
  if (minutes < 60) return `còn ${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `còn ${hours} giờ ${rest} phút` : `còn ${hours} giờ`;
};

const ticketStatus = (ticket) => ticket.displayStatus || ticket.ticketStatus;

/**
 * Gợi ý `count` ghế liền nhau còn trống: cùng hàng, số ghế liên tiếp, cùng loại ghế.
 * Ưu tiên hàng gần khoảng giữa phòng (hơi lùi về sau), rồi cụm gần trục giữa hàng.
 * `rows` là [nhãn hàng, vé đã sắp theo số ghế] như sơ đồ ghế. Trả về seatId, rỗng nếu không còn cụm nào đủ.
 */
export const pickAdjacentSeats = (rows, count) => {
  if (!count || count < 1 || rows.length === 0) return [];
  const targetRow = Math.floor(rows.length * 0.55);
  let best = null;
  rows.forEach(([, seats], rowIndex) => {
    const numbers = seats.map((ticket) => Number(ticket.seatNumber) || 0);
    const rowCenter = (Math.min(...numbers) + Math.max(...numbers)) / 2;
    for (let start = 0; start + count <= seats.length; start += 1) {
      const block = seats.slice(start, start + count);
      const usable = block.every((ticket, index) =>
        ticketStatus(ticket) === 'AVAILABLE'
        && ticket.seatType === block[0].seatType
        && (index === 0 || Number(ticket.seatNumber) === Number(block[index - 1].seatNumber) + 1));
      if (!usable) continue;
      const blockCenter = (Number(block[0].seatNumber) + Number(block[count - 1].seatNumber)) / 2;
      const score = Math.abs(rowIndex - targetRow) * 1.5 + Math.abs(blockCenter - rowCenter);
      if (!best || score < best.score) best = { score, seatIds: block.map((ticket) => ticket.seatId) };
    }
  });
  return best ? best.seatIds : [];
};

/** Hai chữ cái đầu của tên đã che ("Ng*** Văn A*" → "NA") cho ô đại diện khách. */
export const maskedInitials = (name) => {
  const letters = String(name || '').split(/\s+/).map((word) => word.replace(/[^\p{L}]/gu, '').charAt(0)).filter(Boolean);
  if (letters.length === 0) return '?';
  return (letters[0] + (letters.length > 1 ? letters[letters.length - 1] : '')).toUpperCase();
};

/** Có SĐT hoặc email để tra cứu khách hay chưa. */
export const hasCustomerContact = (customer) =>
  Boolean(customer?.customerPhone?.trim() || customer?.customerEmail?.trim());

/** Khóa so sánh liên hệ: đổi SĐT/email thì phải tra cứu và xác nhận lại. */
export const customerContactKey = (customer) =>
  [customer?.customerPhone?.trim() || '', (customer?.customerEmail?.trim() || '').toLowerCase()].join('|');
