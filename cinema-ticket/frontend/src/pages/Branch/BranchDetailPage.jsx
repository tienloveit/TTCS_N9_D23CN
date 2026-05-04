import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { branchApi, showtimeApi } from '../../api';
import { ClockIcon, FilmIcon, GlobeIcon, MapPinIcon } from '../../components/Common/CinemaIcons';

export default function BranchDetailPage() {
  const { branchId } = useParams();
  const navigate = useNavigate();
  const [branch, setBranch] = useState(null);
  const [movieShowtimes, setMovieShowtimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD
  });

  // Generate 7 days from today
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  useEffect(() => {
    const fetchBranch = async () => {
      try {
        const res = await branchApi.getById(branchId);
        setBranch(res.data.result);
      } catch (err) {
        console.error('Lỗi khi tải thông tin rạp', err);
      }
    };
    fetchBranch();
  }, [branchId]);

  useEffect(() => {
    const fetchShowtimes = async () => {
      setLoading(true);
      try {
        const res = await showtimeApi.getByBranch(branchId, selectedDate);
        setMovieShowtimes(res.data.result || []);
      } catch (err) {
        console.error('Lỗi khi tải suất chiếu', err);
        setMovieShowtimes([]);
      } finally {
        setLoading(false);
      }
    };
    fetchShowtimes();
  }, [branchId, selectedDate]);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return {
      dayName: dayNames[d.getDay()],
      dayNum: d.getDate(),
      monthNum: d.getMonth() + 1,
    };
  };

  const formatTime = (dateTimeStr) => {
    if (!dateTimeStr) return '';
    const d = new Date(dateTimeStr);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  return (
    <div className="page">
      <div className="container">
        {/* Header */}
        <div className="page-header">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/branches')} style={{ marginBottom: 12 }}>
            ← Quay lại danh sách rạp
          </button>
          <h1 className="page-title page-title-with-icon">
            <FilmIcon className="page-title-icon" />
            {branch?.name || 'Đang tải...'}
          </h1>
          {branch?.address && (
            <p className="page-subtitle page-subtitle-with-icon">
              <MapPinIcon className="inline-icon" />
              {branch.address}{branch.city ? `, ${branch.city}` : ''}
            </p>
          )}
        </div>

        {/* Date Picker */}
        <div className="date-picker-bar">
          {dates.map((date) => {
            const { dayName, dayNum, monthNum } = formatDate(date);
            const isActive = date === selectedDate;
            const isToday = date === new Date().toISOString().split('T')[0];
            return (
              <button
                key={date}
                className={`date-picker-item ${isActive ? 'date-picker-item--active' : ''}`}
                onClick={() => setSelectedDate(date)}
              >
                <span className="date-picker-day">{dayName}</span>
                <span className="date-picker-num">{dayNum}</span>
                <span className="date-picker-month">Th{monthNum}</span>
                {isToday && <span className="date-picker-today">Hôm nay</span>}
              </button>
            );
          })}
        </div>

        {/* Showtimes by Movie */}
        {loading ? (
          <div className="loading">
            <div className="spinner" />
          </div>
        ) : movieShowtimes.length === 0 ? (
          <div className="empty-text">
            Không có suất chiếu nào cho ngày này.
          </div>
        ) : (
          <div className="branch-showtimes">
            {movieShowtimes.map((movieGroup) => (
              <div key={movieGroup.movieId} className="branch-movie-card card">
                <div className="branch-movie-header">
                  <img
                    className="branch-movie-poster"
                    src={movieGroup.thumbnailUrl || 'https://placehold.co/120x180/1a2235/64748b?text=No+Image'}
                    alt={movieGroup.movieName}
                    onClick={() => navigate(`/movie/${movieGroup.movieId}`)}
                    onError={(e) => {
                      e.target.src = 'https://placehold.co/120x180/1a2235/64748b?text=No+Image';
                    }}
                  />
                  <div className="branch-movie-info">
                    <h3
                      className="branch-movie-name"
                      onClick={() => navigate(`/movie/${movieGroup.movieId}`)}
                    >
                      {movieGroup.movieName}
                    </h3>
                    <div className="branch-movie-meta">
                      {movieGroup.durationMinutes && (
                        <span>
                          <ClockIcon className="inline-icon" />
                          {movieGroup.durationMinutes} phút
                        </span>
                      )}
                      {movieGroup.ageRating && <span className="movie-badge">{movieGroup.ageRating}</span>}
                      {movieGroup.language && (
                        <span>
                          <GlobeIcon className="inline-icon" />
                          {movieGroup.language}
                        </span>
                      )}
                    </div>

                    {/* Showtimes grouped by room type */}
                    <div className="branch-showtime-groups">
                      {(() => {
                        // Group showtimes by roomType
                        const byType = {};
                        movieGroup.showtimes?.forEach((st) => {
                          const type = st.roomType || '2D';
                          if (!byType[type]) byType[type] = [];
                          byType[type].push(st);
                        });

                        return Object.entries(byType).map(([type, sts]) => (
                          <div key={type} className="showtime-type-group">
                            <span className="showtime-type-label">{type.replace('_', ' ')}</span>
                            <div className="showtime-time-list">
                              {sts.map((st) => (
                                <button
                                  key={st.showtimeId}
                                  className="showtime-time-btn"
                                  onClick={() => navigate(`/showtime/${st.showtimeId}/seats`)}
                                  title={`${st.roomName} • ${formatTime(st.startTime)} - ${formatTime(st.endTime)}`}
                                >
                                  {formatTime(st.startTime)}
                                </button>
                              ))}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
