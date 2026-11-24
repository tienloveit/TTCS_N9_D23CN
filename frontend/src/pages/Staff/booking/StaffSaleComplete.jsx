import { Code, Money, OpsButton } from '../../../components/Ops';
import { PlusIcon, PopcornIcon, PrinterIcon } from '../../../components/Common/CinemaIcons';
import DigitalTicket from '../../../components/Ticket/DigitalTicket';

/** Màn sau khi xuất vé: vé điện tử, bắp nước cần giao, in phiếu và bán tiếp. */
export default function StaffSaleComplete({ booking, onPrint, onNewSale }) {
  const foods = booking.foods || [];
  return (
    <section className="o-staff-sale-complete">
      <h2>Đã thu <Money value={booking.totalAmount} /></h2>
      <p>Mã đơn <Code copy>{booking.bookingCode || '#' + booking.bookingId}</Code></p>
      <DigitalTicket
        booking={{
          ...booking,
          startTime: booking.showtimeStart,
          seatCodes: booking.seatCodes || (booking.tickets || []).map((t) => t.seatCode),
          status: 'COMPLETED',
        }}
      />
      {foods.length > 0 && (
        <div className="o-staff-sale-foods">
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

      <div className="o-staff-sale-actions">
        <OpsButton icon={<PrinterIcon size={18} />} onClick={onPrint}>In vé</OpsButton>
        <OpsButton variant="primary" icon={<PlusIcon size={17} />} onClick={onNewSale}>Bán đơn mới</OpsButton>
      </div>
    </section>
  );
}
