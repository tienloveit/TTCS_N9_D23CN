import { Link } from 'react-router-dom';
import SafeImage from '../../components/Common/SafeImage';
import { ClockIcon, GlobeIcon } from '../../components/Common/CinemaIcons';
import { getAgeRatingLabel } from '../../utils/ageRatings';
import ShowtimeStub from './ShowtimeStub';
import { groupByFormat } from './scheduleModel';

/** Nhãn độ tuổi trung tính; mô tả đầy đủ cho trình đọc màn hình. */
export function AgeBadge({ rating, describe = true }) {
  if (!rating) return null;
  const description = getAgeRatingLabel(rating);
  return (
    <span className="sc-age" title={description}>
      {rating}
      {describe && <span className="sr-only">: {description}</span>}
    </span>
  );
}

function MovieBlock({ movie, now }) {
  const movieUrl = `/movie/${movie.movieId}`;
  const headingId = `sc-movie-${movie.movieId}`;

  return (
    <article className="sc-movie" aria-labelledby={headingId}>
      <Link to={movieUrl} className="sc-movie__poster" tabIndex={-1} aria-hidden="true">
        <SafeImage key={movie.thumbnailUrl} src={movie.thumbnailUrl} alt="" className="sc-movie__image" fallback="/assets/img/empty-cinema.png" />
      </Link>
      <div className="sc-movie__body">
        <div className="sc-movie__head">
          <AgeBadge rating={movie.ageRating} />
          <h3 id={headingId} className="sc-movie__title"><Link className="sc-movie__link" to={movieUrl}>{movie.movieName}</Link></h3>
        </div>
        {(Boolean(movie.durationMinutes) || movie.language) && (
          <p className="sc-movie__meta">
            {Boolean(movie.durationMinutes) && <span className="sc-movie__fact"><ClockIcon size={15} />{movie.durationMinutes} phút</span>}
            {movie.language && <span className="sc-movie__fact"><GlobeIcon size={15} />{movie.language}</span>}
          </p>
        )}
        {groupByFormat(movie.showtimes).map(({ format, showtimes }) => (
          <section className="sc-format" key={format} aria-label={`${movie.movieName}, ${format}`}>
            <h4 className="sc-format__title">{format}</h4>
            <ul className="sc-stubs">
              {showtimes.map((slot) => (
                <li key={slot.showtimeId} className="sc-stubs__item"><ShowtimeStub slot={slot} now={now} /></li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </article>
  );
}

/** Chế độ "Theo phim": danh sách phẳng, mỗi phim nhóm suất theo định dạng. */
export default function MovieSchedule({ movies, now }) {
  return (
    <div className="sc-movies">
      {movies.map((movie) => <MovieBlock key={movie.movieId} movie={movie} now={now} />)}
    </div>
  );
}
