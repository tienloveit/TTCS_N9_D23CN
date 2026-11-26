import Button from '../../components/Common/Button';
import { BuildingIcon, ExternalLinkIcon, MapPinIcon, PhoneIcon } from '../../components/Common/CinemaIcons';

/** Tên rạp làm tiêu đề trang, địa chỉ một dòng, nút mở hộp thoại "Chọn rạp". */
export default function ScheduleHeader({ branch, canSwitch, pickerOpen, onSwitch }) {
  const address = [branch.address, branch.city].filter(Boolean).join(', ');
  const mapQuery = encodeURIComponent([branch.name, address].filter(Boolean).join(', '));

  return (
    <header className="sc-head">
      <h1 className="sc-head__title"><span className="sr-only">Lịch chiếu </span>{branch.name}</h1>
      {/* Hành động đứng trước dòng địa chỉ trong DOM để Tab đi Đổi rạp, Chỉ đường rồi mới tới số điện thoại. */}
      <div className="sc-head__actions">
        {canSwitch && (
          <Button
            variant="secondary"
            className="sc-head__button"
            icon={<BuildingIcon size={18} />}
            aria-haspopup="dialog"
            aria-expanded={pickerOpen}
            onClick={onSwitch}
          >
            Đổi rạp
          </Button>
        )}
        {address && (
          <a
            className="sc-head__map"
            href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Chỉ đường
            <ExternalLinkIcon size={15} />
            <span className="sr-only">(mở Google Maps trong tab mới)</span>
          </a>
        )}
      </div>
      {(address || branch.phone) && (
        <p className="sc-head__info">
          {address && <span className="sc-head__fact"><MapPinIcon size={16} />{address}</span>}
          {branch.phone && (
            <span className="sc-head__fact">
              <PhoneIcon size={16} />
              <a className="sc-head__link" href={`tel:${branch.phone}`}>{branch.phone}</a>
            </span>
          )}
        </p>
      )}
    </header>
  );
}
