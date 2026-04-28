import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { branchApi, movieApi, roomApi, showtimeApi } from '../../api';
import SafeImage from '../../components/Common/SafeImage';
import { useAuth } from '../../context/AuthContext';

const DATE_WINDOW_SIZE = 5;

const toLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDateFromKey = (dateKey) => new Date(`${dateKey}T00:00:00`);

const getRoomTypeLabel = (roomType) => {
  const map = {
    TWO_D: '2D',
    THREE_D: '3D',
    IMAX: 'IMAX',
    FOUR_DX: '4DX',
  };
  return map[roomType] || roomType?.replace('_', ' ') || '2D';
};

const getSubtitleLabel = (subtitle) => {
  if (!subtitle) return '';
  return subtitle.toLowerCase().includes('lồng') ? 'Lồng tiếng' : 'Phụ Đề';
};

export default function MovieDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [movie, setMovie] = useState(null);
  const [showtimes, setShowtimes] = useState([]);
  const [branches, setBranches] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTrailer, setShowTrailer] = useState(false);
  const [userRating, setUserRating] = useState(null);
  const [hoverRating, setHoverRating] = useState(0);
  const [ratingSaving, setRatingSaving] = useState(false);
  const [ratingMessage, setRatingMessage] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => toLocalDateKey());
  const [dateWindowOffset, setDateWindowOffset] = useState(0);
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [selectedBranchKey, setSelectedBranchKey] = useState('ALL');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const movieRes = await movieApi.getById(id);
        setMovie(movieRes.data.result);
      } catch (err) {
        console.error('Movie fetch error:', err);
      }

      try {
        const [showtimeRes, branchRes, roomRes] = await Promise.allSettled([
          showtimeApi.getByMovie(id),
          branchApi.getAll(),
          roomApi.getAll(),
        ]);

        if (showtimeRes.status === 'fulfilled') setShowtimes(showtimeRes.value.data.result || []);
        if (branchRes.status === 'fulfilled') setBranches(branchRes.value.data.result || []);
        if (roomRes.status === 'fulfilled') setRooms(roomRes.value.data.result || []);
      } catch (err) {
        console.error('Showtime/Branch fetch error:', err);
      }

      setLoading(false);
    };

    fetchData();
  }, [id]);

  useEffect(() => {
    if (!isAuthenticated) {
      setUserRating(null);
      return;
    }

    movieApi
      .getMyRating(id)
      .then((res) => setUserRating(res.data.result?.score || null))
      .catch(() => setUserRating(null));
  }, [id, isAuthenticated]);

  const branchById = useMemo(() => {
    const map = new Map();
    branches.forEach((branch) => {
      if (branch.branchId != null) {
        map.set(String(branch.branchId), branch);
      }
    });
    return map;
  }, [branches]);

  const roomById = useMemo(() => {
    const map = new Map();
    rooms.forEach((room) => {
      if (room.id != null) {
        map.set(String(room.id), room);
      }
    });
    return map;
  }, [rooms]);

  const scheduleDates = useMemo(
    () =>
      Array.from({ length: DATE_WINDOW_SIZE }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() + dateWindowOffset + index);
        return toLocalDateKey(date);
      }),
    [dateWindowOffset]
  );

  const showtimesWithMeta = useMemo(() => {
    const subtitleLabel = getSubtitleLabel(movie?.subtitle);

    return [...showtimes]
      .map((showtime) => {
        const room = roomById.get(String(showtime.roomId));
        const branchId = showtime.branchId ?? room?.branchId ?? null;
        const branch = branchId != null ? branchById.get(String(branchId)) : null;
        const branchName = showtime.branchName || branch?.name || 'Rạp chưa xác định';
        const roomName = showtime.roomName || room?.name || 'Phòng chưa xác định';

        return {
          ...showtime,
          dateKey: showtime.startTime ? showtime.startTime.split('T')[0] : '',
          branchId,
          branchKey: branchId != null ? String(branchId) : `name:${branchName}`,
          branchName,
          city: branch?.city || 'Khác',
          roomName,
          roomTypeLabel: getRoomTypeLabel(showtime.roomType || room?.roomType),
          subtitleLabel,
        };
      })
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  }, [branchById, movie?.subtitle, roomById, showtimes]);

  const cityOptions = useMemo(() => {
    const cities = new Set();
    showtimesWithMeta.forEach((showtime) => {
      if (showtime.city && showtime.city !== 'Khác') {
        cities.add(showtime.city);
      }
    });
    return [...cities].sort((a, b) => a.localeCompare(b, 'vi'));
  }, [showtimesWithMeta]);

  const branchOptions = useMemo(() => {
    const map = new Map();
    showtimesWithMeta
      .filter((showtime) => selectedCity === 'ALL' || showtime.city === selectedCity)
      .forEach((showtime) => {
        map.set(showtime.branchKey, showtime.branchName);
      });

    return [...map.entries()]
      .map(([key, name]) => ({ key, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [selectedCity, showtimesWithMeta]);

  const filteredShowtimes = useMemo(
    () =>
      showtimesWithMeta.filter((showtime) => {
        const matchesDate = showtime.dateKey === selectedDate;
        const matchesCity = selectedCity === 'ALL' || showtime.city === selectedCity;
        const matchesBranch =
          selectedBranchKey === 'ALL' || showtime.branchKey === selectedBranchKey;
        return matchesDate && matchesCity && matchesBranch;
      }),
    [selectedBranchKey, selectedCity, selectedDate, showtimesWithMeta]
  );

  const groupedSchedule = useMemo(() => {
    const branchMap = new Map();

    filteredShowtimes.forEach((showtime) => {
      if (!branchMap.has(showtime.branchKey)) {
        branchMap.set(showtime.branchKey, {
          branchKey: showtime.branchKey,
          branchName: showtime.branchName,
          city: showtime.city,
          rows: new Map(),
        });
      }

      const branchGroup = branchMap.get(showtime.branchKey);
      const rowKey = `${showtime.roomId || showtime.roomName}:${showtime.roomTypeLabel}:${
        showtime.subtitleLabel
      }`;

      if (!branchGroup.rows.has(rowKey)) {
        branchGroup.rows.set(rowKey, {
          rowKey,
          formatLabel: [showtime.roomTypeLabel, showtime.subtitleLabel].filter(Boolean).join(' '),
          roomName: showtime.roomName,
          showtimes: [],
        });
      }

      branchGroup.rows.get(rowKey).showtimes.push(showtime);
    });

    return [...branchMap.values()]
      .sort((a, b) => a.branchName.localeCompare(b.branchName, 'vi'))
      .map((branchGroup) => ({
        ...branchGroup,
        rows: [...branchGroup.rows.values()].map((row) => ({
          ...row,
          showtimes: row.showtimes.sort((a, b) => new Date(a.startTime) - new Date(b.startTime)),
        })),
      }));
  }, [filteredShowtimes]);

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = getDateFromKey(dateStr);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getDateTabLabel = (dateKey) => {
    const todayKey = toLocalDateKey();
    const date = getDateFromKey(dateKey);
    const weekday = date.toLocaleDateString('vi-VN', { weekday: 'long' });

    return {
      title: dateKey === todayKey ? 'Hôm Nay' : weekday.charAt(0).toUpperCase() + weekday.slice(1),
      date: date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
    };
  };

  const getEmbedUrl = (url) => {
    if (!url) return '';
    try {
      if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) {
        return `https://www.youtube.com/embed/${url.trim()}?autoplay=1`;
      }

      const parsedUrl = new URL(url);

      if (parsedUrl.hostname.includes('youtube.com')) {
        if (parsedUrl.pathname === '/watch') {
          const v = parsedUrl.searchParams.get('v');
          if (v) return `https://www.youtube.com/embed/${v}?autoplay=1`;
        }
        if (parsedUrl.pathname.startsWith('/shorts/')) {
          const videoId = parsedUrl.pathname.split('/shorts/')[1].split('/')[0];
          if (videoId) return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
        }
        if (parsedUrl.pathname.startsWith('/embed/')) {
          if (!parsedUrl.searchParams.has('autoplay')) {
            parsedUrl.searchParams.set('autoplay', '1');
          }
          return parsedUrl.toString();
        }
      }

      if (parsedUrl.hostname === 'youtu.be') {
        const videoId = parsedUrl.pathname.substring(1).split('?')[0];
        if (videoId) return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
      }

      const regExp =
        /(?:youtu\.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|&v=)([a-zA-Z0-9_-]+)/;
      const match = url.match(regExp);
      if (match?.[1]) {
        return `https://www.youtube.com/embed/${match[1]}?autoplay=1`;
      }

      return url;
    } catch {
      const regExp =
        /(?:youtu\.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|&v=)([a-zA-Z0-9_-]+)/;
      const match = url.match(regExp);
      if (match?.[1]) {
        return `https://www.youtube.com/embed/${match[1]}?autoplay=1`;
      }
      return url;
    }
  };

  const handleRateMovie = async (score) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setRatingSaving(true);
    setRatingMessage('');

    try {
      const res = await movieApi.rate(id, score);
      const rating = res.data.result;

      setUserRating(score);
      setMovie((prev) =>
        prev
          ? {
              ...prev,
              averageRating: rating.averageRating,
              ratingCount: rating.ratingCount,
            }
          : prev
      );
      setRatingMessage('Đã lưu đánh giá của bạn.');
    } catch {
      setRatingMessage('Không thể lưu đánh giá. Vui lòng thử lại.');
    } finally {
      setRatingSaving(false);
    }
  };

  const handleCityChange = (event) => {
    setSelectedCity(event.target.value);
    setSelectedBranchKey('ALL');
  };

  const moveDateWindow = (direction) => {
    const nextOffset = Math.max(0, dateWindowOffset + direction * DATE_WINDOW_SIZE);
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + nextOffset);
    setDateWindowOffset(nextOffset);
    setSelectedDate(toLocalDateKey(nextDate));
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="page">
        <div className="container">
          <p>Không tìm thấy phim.</p>
        </div>
      </div>
    );
  }

  const ratingCount = movie.ratingCount || 0;
  const averageRating = Number(movie.averageRating || 0);
  const activeRating = hoverRating || userRating || 0;
  const ratingPanel = (
    <div className="movie-rating-panel">
      <div className="movie-rating-summary">
        <span className="movie-rating-score">
          {ratingCount > 0 ? averageRating.toFixed(1) : 'Chưa có'}
        </span>
        <span className="movie-rating-stars" aria-label={`Điểm trung bình ${averageRating}`}>
          {[1, 2, 3, 4, 5].map((star) => (
            <span key={star} className={star <= Math.round(averageRating) ? 'is-active' : ''}>
              ★
            </span>
          ))}
        </span>
        <span className="movie-rating-count">
          {ratingCount > 0 ? `${ratingCount} đánh giá` : 'Hãy là người đầu tiên đánh giá'}
        </span>
      </div>

      <div className="movie-rating-action">
        <span>{userRating ? 'Đánh giá của bạn' : 'Bạn đánh giá phim này'}</span>
        <div className="movie-rating-input" onMouseLeave={() => setHoverRating(0)}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className={star <= activeRating ? 'is-active' : ''}
              onMouseEnter={() => setHoverRating(star)}
              onFocus={() => setHoverRating(star)}
              onClick={() => handleRateMovie(star)}
              disabled={ratingSaving}
              aria-label={`Đánh giá ${star} sao`}
            >
              ★
            </button>
          ))}
        </div>
        {ratingMessage && <small>{ratingMessage}</small>}
      </div>
    </div>
  );

  return (
    <div className="page">
      <div className="container">
        <div className="movie-detail-layout">
          <div className="movie-detail-poster-wrap">
            <SafeImage
              src={movie.thumbnailUrl}
              alt={movie.movieName}
              className="movie-detail-poster"
            />

            {movie.trailerUrl && (
              <button
                className="btn btn-primary movie-trailer-play"
                onClick={() => setShowTrailer(true)}
                title="Xem trailer"
              >
                ▶
              </button>
            )}
          </div>

          <div className="movie-detail-content">
            <h1 className="page-title movie-detail-title">{movie.movieName}</h1>

            <div className="movie-detail-meta">
              {movie.ageRating && <span className="movie-badge">{movie.ageRating}</span>}
              {movie.durationMinutes && <span>{movie.durationMinutes} phút</span>}
              {movie.language && <span>{movie.language}</span>}
            </div>

            {(movie.genres?.length > 0 || movie.directorName) && (
              <div className="movie-detail-facts">
                {movie.genres?.length > 0 && (
                  <div className="movie-detail-fact-row">
                    <span className="movie-detail-fact-label">Thể loại:</span>
                    <div className="movie-detail-pills">
                      {movie.genres.map((genre) => (
                        <span key={genre.id || genre.genreId || genre.name} className="movie-detail-pill">
                          {genre.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {movie.directorName && (
                  <div className="movie-detail-fact-row">
                    <span className="movie-detail-fact-label">Đạo diễn:</span>
                    <div className="movie-detail-pills">
                      <span className="movie-detail-pill">{movie.directorName}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {movie.description && <p className="movie-detail-description">{movie.description}</p>}

            {movie.releaseDate && (
              <p className="movie-detail-release">Khởi chiếu: {formatDate(movie.releaseDate)}</p>
            )}

            {movie.trailerUrl && (
              <button className="btn btn-secondary" onClick={() => setShowTrailer(true)}>
                Xem trailer
              </button>
            )}
          </div>
        </div>

        <section className="movie-schedule-panel">
          <h2 className="movie-section-title">Lịch Chiếu</h2>

          <div className="movie-schedule-toolbar">
            <div className="movie-date-strip">
              <button
                type="button"
                className="movie-date-nav"
                onClick={() => moveDateWindow(-1)}
                disabled={dateWindowOffset === 0}
                aria-label="Ngày trước"
              >
                ‹
              </button>

              {scheduleDates.map((dateKey) => {
                const label = getDateTabLabel(dateKey);
                const isActive = selectedDate === dateKey;
                return (
                  <button
                    key={dateKey}
                    type="button"
                    className={`movie-date-tab ${isActive ? 'movie-date-tab--active' : ''}`}
                    onClick={() => setSelectedDate(dateKey)}
                  >
                    <span>{label.title}</span>
                    <strong>{label.date}</strong>
                  </button>
                );
              })}

              <button
                type="button"
                className="movie-date-nav"
                onClick={() => moveDateWindow(1)}
                aria-label="Ngày sau"
              >
                ›
              </button>
            </div>

            <div className="movie-schedule-filters">
              <select className="movie-schedule-select" value={selectedCity} onChange={handleCityChange}>
                <option value="ALL">Toàn quốc</option>
                {cityOptions.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>

              <select
                className="movie-schedule-select"
                value={selectedBranchKey}
                onChange={(event) => setSelectedBranchKey(event.target.value)}
              >
                <option value="ALL">Tất cả rạp</option>
                {branchOptions.map((branch) => (
                  <option key={branch.key} value={branch.key}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {showtimesWithMeta.length === 0 ? (
            <p className="empty-text">Chưa có suất chiếu cho phim này.</p>
          ) : groupedSchedule.length === 0 ? (
            <p className="empty-text">Không có suất chiếu phù hợp với bộ lọc.</p>
          ) : (
            <div className="cinema-schedule-list">
              {groupedSchedule.map((branchGroup) => (
                <div key={branchGroup.branchKey} className="cinema-schedule-branch">
                  <h3 className="cinema-schedule-branch-name">{branchGroup.branchName}</h3>

                  {branchGroup.rows.map((row) => (
                    <div key={row.rowKey} className="cinema-schedule-format-row">
                      <div className="cinema-schedule-format">
                        <span>{row.formatLabel}</span>
                        <small>{row.roomName}</small>
                      </div>

                      <div className="cinema-schedule-times">
                        {row.showtimes.map((showtime) => (
                          <button
                            key={showtime.showtimeId}
                            type="button"
                            className="cinema-showtime-btn"
                            onClick={() => navigate(`/showtime/${showtime.showtimeId}/seats`)}
                            title={`${row.roomName} • ${formatTime(showtime.startTime)} - ${formatTime(
                              showtime.endTime
                            )}`}
                          >
                            {formatTime(showtime.startTime)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="movie-detail-rating">{ratingPanel}</div>
      </div>

      {showTrailer && movie.trailerUrl && (
        <div className="modal-overlay" onClick={() => setShowTrailer(false)}>
          <div className="modal-content modal-video" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowTrailer(false)}>
              ×
            </button>
            <iframe
              width="100%"
              height="100%"
              src={getEmbedUrl(movie.trailerUrl)}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  );
}
