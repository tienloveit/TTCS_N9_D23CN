import { Link } from 'react-router-dom';
import SafeImage from '../Common/SafeImage';
import { CalendarIcon, ChevronRightIcon, ClockIcon, FilmIcon, StarIcon, TicketIcon } from '../Common/CinemaIcons';
import './MovieBrowse.css';

const STATUSES = {
  NOW_SHOWING: { label: 'Đang chiếu', tone: 'now' },
  UPCOMING: { label: 'Sắp chiếu', tone: 'upcoming' },
  ENDED: { label: 'Đã ngừng chiếu', tone: 'ended' },
};

export default function MovieCard({ movie, status = movie.status }) {
  const currentStatus = STATUSES[status];
  const path = '/movie/' + movie.movieId;
  const bookable = status === 'NOW_SHOWING';
  const releaseDate = movie.releaseDate && new Date(movie.releaseDate);
  const releaseLabel = releaseDate && !Number.isNaN(releaseDate.getTime())
    ? releaseDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })
    : '';
  const genres = (movie.genres || []).map((genre) => genre.name || genre.genreName).filter(Boolean).slice(0, 2);
  const rating = Number(movie.averageRating).toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  return (
    <article className="catalog-card">
      <div className="catalog-card-art">
        <Link className="catalog-card-poster-link" to={path} aria-label={'Xem chi tiết ' + movie.movieName}>
          <SafeImage key={movie.thumbnailUrl} className="catalog-card-poster" src={movie.thumbnailUrl} alt="" />
        </Link>
        {currentStatus && <span className={'catalog-status catalog-status--' + currentStatus.tone}>{currentStatus.label}</span>}
        {movie.ageRating && <span className="catalog-card-age" title={'Phân loại ' + movie.ageRating}>{movie.ageRating}</span>}
      </div>
      <div className="catalog-card-body">
        <div className="catalog-card-title"><Link to={path} title={movie.movieName}>{movie.movieName}</Link></div>
        {genres.length > 0 && <p className="catalog-card-genres" title={genres.join(', ')}>{genres.join(' · ')}</p>}
        <div className="catalog-card-meta">
          {movie.durationMinutes > 0 && <span><ClockIcon size={15} /> {movie.durationMinutes} phút</span>}
          {movie.ratingCount > 0 && <span className="catalog-card-rating" title={movie.ratingCount + ' lượt đánh giá'}><StarIcon size={15} /> {rating}</span>}
          {status === 'UPCOMING' && releaseLabel && <span><CalendarIcon size={15} /> {releaseLabel}</span>}
        </div>
        <Link className={'catalog-button catalog-card-action ' + (bookable ? 'catalog-button--soft' : 'catalog-button--secondary')}
          to={bookable ? path + '#movie-schedule' : path}
          aria-label={(bookable ? 'Đặt vé ' : 'Xem chi tiết ') + movie.movieName}>
          {bookable ? <TicketIcon size={17} /> : <ChevronRightIcon size={17} />}
          {bookable ? 'Đặt vé' : 'Chi tiết'}
        </Link>
      </div>
    </article>
  );
}

export function CatalogEmpty({ title, message, action, onAction }) {
  return (
    <div className="catalog-empty">
      <FilmIcon size={25} />
      <strong>{title}</strong>
      <p>{message}</p>
      {onAction ? (
        <button type="button" className="catalog-button catalog-button--secondary" onClick={onAction}>{action}</button>
      ) : (
        <Link to="/movies" className="catalog-button catalog-button--secondary">{action}</Link>
      )}
    </div>
  );
}
