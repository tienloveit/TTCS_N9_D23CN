import Button from '../../../components/Common/Button';
import { CheckIcon, PlusIcon, PopcornIcon, PrinterIcon } from '../../../components/Common/CinemaIcons';
import DigitalTicket from '../../../components/Ticket/DigitalTicket';
import { StaffPageHeading } from '../StaffUI';

/** Màn sau khi xuất vé: vé điện tử, bắp nước cần giao, in phiếu và bán tiếp. */
export default function StaffSaleComplete({ booking, onPrint, onNewSale }) {
  const foods = booking.foods || [];
  return (
    <section className="staff-sale-complete">
      <StaffPageHeading icon={CheckIcon} title="Đã xuất vé tại quầy"
        description={booking.bookingCode ? `Mã đơn ${booking.bookingCode}` : undefined} />
      <DigitalTicket
        booking={{
          ...booking,
          startTime: booking.showtimeStart,
          seatCodes: booking.seatCodes || (booking.tickets || []).map((t) => t.seatCode),
          status: 'COMPLETED',
        }}
      />
      {foods.length > 0 && (
        <div className="staff-sale-foods">
          <h3><PopcornIcon size={18} aria-hidden="true" /> Bắp nước cần giao</h3>
          <ul>
            {foods.map((food, index) => (
              <li key={food.foodId ?? index}>
                <strong>{food.quantity} ×</strong> {food.foodName}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="staff-sale-actions">
        <Button icon={<PrinterIcon size={18} />} onClick={onPrint}>In vé / hóa đơn nhiệt (80mm)</Button>
        <Button variant="primary" icon={<PlusIcon size={17} />} onClick={onNewSale}>Bán vé tiếp</Button>
      </div>
    </section>
  );
}
