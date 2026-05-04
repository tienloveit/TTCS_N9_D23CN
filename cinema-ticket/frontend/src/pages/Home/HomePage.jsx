import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { chatApi, movieApi, showtimeApi } from '../../api';
import SafeImage from '../../components/Common/SafeImage';
import { SkeletonBox } from '../../components/Common/Skeleton';
import EmptyState from '../../components/Common/EmptyState';
import {
  CalendarIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  GlobeIcon,
  MessageIcon,
  SearchIcon,
  SendIcon,
  SparkIcon,
  TicketIcon,
  XCircleIcon,
} from '../../components/Common/CinemaIcons';

const AI_SUGGESTIONS = [
  'Hôm nay có phim nào đang chiếu?',
  'Gợi ý phim phù hợp để đi cùng bạn bè',
  'Có suất chiếu tối nay ở MoviePTIT không?',
];

const HERO_SLIDE_INTERVAL_MS = 5000;

const toDateKey = (dateStr) => {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getBranchKey = (showtime) =>
  showtime.branchId != null ? String(showtime.branchId) : `name:${showtime.branchName || 'unknown'}`;

const formatQuickDate = (dateKey) => {
  if (!dateKey) return '';
  const date = new Date(`${dateKey}T00:00:00`);
  const todayKey = toDateKey(new Date());
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = toDateKey(tomorrow);

  if (dateKey === todayKey) return 'Hôm nay';
  if (dateKey === tomorrowKey) return 'Ngày mai';

  return date.toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
};

const formatQuickTime = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

export default function HomePage() {
  const [nowShowing, setNowShowing] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [showtimes, setShowtimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [bannerIndex, setBannerIndex] = useState(0);
  const [bannerDirection, setBannerDirection] = useState(1);
  const [bannerPaused, setBannerPaused] = useState(false);
  const [quickMovieId, setQuickMovieId] = useState('');
  const [quickBranchKey, setQuickBranchKey] = useState('');
  const [quickDate, setQuickDate] = useState('');
  const [quickShowtimeId, setQuickShowtimeId] = useState('');
  const [aiInput, setAiInput] = useState('');
  const [aiSending, setAiSending] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiChatId] = useState(() => {
    const storedChatId = localStorage.getItem('movieptit-ai-chat-id');
    if (storedChatId) return storedChatId;

    const nextChatId = `home-${crypto.randomUUID?.() || Date.now()}`;
    localStorage.setItem('movieptit-ai-chat-id', nextChatId);
    return nextChatId;
  });
  const [aiMessages, setAiMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Xin chào, mình là trợ lý MoviePTIT. Bạn muốn tìm phim, xem suất chiếu hay hỏi giá vé hôm nay?',
    },
  ]);
  const navigate = useNavigate();
  const aiMessagesRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [nowRes, upRes, showtimeRes] = await Promise.allSettled([
          movieApi.getNowShowing(),
          movieApi.getUpcoming(),
          showtimeApi.getAll(),
        ]);
        if (nowRes.status === 'fulfilled') setNowShowing(nowRes.value.data.result || []);
        if (upRes.status === 'fulfilled') setUpcoming(upRes.value.data.result || []);
        if (showtimeRes.status === 'fulfilled') setShowtimes(showtimeRes.value.data.result || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Auto-slide banner
  const bannerMovies = nowShowing.length > 0 ? nowShowing.slice(0, 5) : [];
  useEffect(() => {
    if (bannerMovies.length <= 1 || bannerPaused) return undefined;

    const timer = window.setTimeout(() => {
      setBannerDirection(1);
      setBannerIndex((prev) => (prev + 1) % bannerMovies.length);
    }, HERO_SLIDE_INTERVAL_MS);

    return () => window.clearTimeout(timer);
  }, [bannerIndex, bannerMovies.length, bannerPaused]);

  useEffect(() => {
    if (bannerMovies.length === 0) return;
    setBannerIndex((prev) => prev % bannerMovies.length);
  }, [bannerMovies.length]);

  useEffect(() => {
    const messagesEl = aiMessagesRef.current;
    if (!messagesEl) return;
    messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: 'smooth' });
  }, [aiMessages, aiSending, aiOpen]);

  // Search filter
  const filteredNowShowing = nowShowing.filter((f) =>
    f.movieName?.toLowerCase().includes(search.toLowerCase())
  );
  const filteredUpcoming = upcoming.filter((f) =>
    f.movieName?.toLowerCase().includes(search.toLowerCase())
  );

  const quickShowtimes = useMemo(() => {
    const now = new Date();

    return showtimes
      .filter((showtime) => {
        if (!showtime.startTime || showtime.movieId == null) return false;
        if (showtime.status && showtime.status !== 'OPEN') return false;
        return new Date(showtime.startTime) > now;
      })
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  }, [showtimes]);

  const quickMovieOptions = useMemo(() => {
    const movieLookup = new Map();
    [...nowShowing, ...upcoming].forEach((movie) => {
      if (movie.movieId != null) movieLookup.set(String(movie.movieId), movie);
    });

    const movieMap = new Map();
    quickShowtimes.forEach((showtime) => {
      const key = String(showtime.movieId);
      if (movieMap.has(key)) return;

      const movie = movieLookup.get(key);
      movieMap.set(key, {
        movieId: showtime.movieId,
        movieName: movie?.movieName || showtime.movieName || 'Phim chưa xác định',
      });
    });

    return [...movieMap.values()].sort((a, b) => a.movieName.localeCompare(b.movieName, 'vi'));
  }, [nowShowing, quickShowtimes, upcoming]);

  const quickBranchOptions = useMemo(() => {
    const branchMap = new Map();
    quickShowtimes
      .filter((showtime) => String(showtime.movieId) === String(quickMovieId))
      .forEach((showtime) => {
        const key = getBranchKey(showtime);
        if (!branchMap.has(key)) {
          branchMap.set(key, {
            key,
            name: showtime.branchName || 'Rạp chưa xác định',
          });
        }
      });

    return [...branchMap.values()].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [quickMovieId, quickShowtimes]);

  const quickDateOptions = useMemo(() => {
    const dateMap = new Map();
    quickShowtimes
      .filter(
        (showtime) =>
          String(showtime.movieId) === String(quickMovieId) &&
          getBranchKey(showtime) === quickBranchKey
      )
      .forEach((showtime) => {
        const dateKey = toDateKey(showtime.startTime);
        if (dateKey && !dateMap.has(dateKey)) {
          dateMap.set(dateKey, {
            key: dateKey,
            label: formatQuickDate(dateKey),
          });
        }
      });

    return [...dateMap.values()].sort((a, b) => a.key.localeCompare(b.key));
  }, [quickBranchKey, quickMovieId, quickShowtimes]);

  const quickShowtimeOptions = useMemo(
    () =>
      quickShowtimes.filter(
        (showtime) =>
          String(showtime.movieId) === String(quickMovieId) &&
          getBranchKey(showtime) === quickBranchKey &&
          toDateKey(showtime.startTime) === quickDate
      ),
    [quickBranchKey, quickDate, quickMovieId, quickShowtimes]
  );

  useEffect(() => {
    if (quickMovieOptions.length === 0) {
      if (quickMovieId) setQuickMovieId('');
      return;
    }

    if (!quickMovieOptions.some((movie) => String(movie.movieId) === String(quickMovieId))) {
      setQuickMovieId(String(quickMovieOptions[0].movieId));
    }
  }, [quickMovieId, quickMovieOptions]);

  useEffect(() => {
    if (quickBranchOptions.length === 0) {
      if (quickBranchKey) setQuickBranchKey('');
      return;
    }

    if (!quickBranchOptions.some((branch) => branch.key === quickBranchKey)) {
      setQuickBranchKey(quickBranchOptions[0].key);
    }
  }, [quickBranchKey, quickBranchOptions]);

  useEffect(() => {
    if (quickDateOptions.length === 0) {
      if (quickDate) setQuickDate('');
      return;
    }

    if (!quickDateOptions.some((date) => date.key === quickDate)) {
      setQuickDate(quickDateOptions[0].key);
    }
  }, [quickDate, quickDateOptions]);

  useEffect(() => {
    if (quickShowtimeOptions.length === 0) {
      if (quickShowtimeId) setQuickShowtimeId('');
      return;
    }

    if (!quickShowtimeOptions.some((showtime) => String(showtime.showtimeId) === String(quickShowtimeId))) {
      setQuickShowtimeId(String(quickShowtimeOptions[0].showtimeId));
    }
  }, [quickShowtimeId, quickShowtimeOptions]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const sendAiMessage = async (messageText = aiInput) => {
    const trimmedMessage = messageText.trim();
    if (!trimmedMessage || aiSending) return;
    setAiOpen(true);

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmedMessage,
    };

    setAiInput('');
    setAiMessages((prev) => [...prev, userMessage]);
    setAiSending(true);

    try {
      const response = await chatApi.send({
        chatId: aiChatId,
        message: trimmedMessage,
      });
      const payload = response.data;

      if (payload?.code && payload.code !== 200) {
        throw new Error(payload.message || 'AI chưa thể phản hồi lúc này.');
      }

      setAiMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: payload?.result?.reply || 'Mình chưa có câu trả lời phù hợp, bạn thử hỏi lại nhé.',
        },
      ]);
    } catch (error) {
      setAiMessages((prev) => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          content:
            error.response?.data?.message ||
            error.message ||
            'Không thể kết nối trợ lý AI. Vui lòng thử lại sau.',
        },
      ]);
    } finally {
      setAiSending(false);
    }
  };

  const handleAiSubmit = (event) => {
    event.preventDefault();
    sendAiMessage();
  };

  const handleQuickMovieChange = (event) => {
    setQuickMovieId(event.target.value);
    setQuickBranchKey('');
    setQuickDate('');
    setQuickShowtimeId('');
  };

  const handleQuickBranchChange = (event) => {
    setQuickBranchKey(event.target.value);
    setQuickDate('');
    setQuickShowtimeId('');
  };

  const handleQuickDateChange = (event) => {
    setQuickDate(event.target.value);
    setQuickShowtimeId('');
  };

  const handleQuickBooking = (event) => {
    event.preventDefault();
    if (quickShowtimeId) {
      navigate(`/showtime/${quickShowtimeId}/seats`);
    }
  };

  const showBannerAt = (index, direction) => {
    if (bannerMovies.length <= 1) return;
    setBannerDirection(direction);
    setBannerIndex((index + bannerMovies.length) % bannerMovies.length);
  };

  if (loading) {
    return (
      <div className="page" style={{ padding: 0 }}>
        <div className="container" style={{ paddingTop: '80px' }}>
          <SkeletonBox height="450px" borderRadius="16px" className="mb-8" />
          <div className="movie-grid" style={{ marginTop: '32px' }}>
            <SkeletonBox count={4} height="400px" borderRadius="12px" />
          </div>
        </div>
      </div>
    );
  }

  const currentBanner = bannerMovies[bannerIndex];
  const previousBanner =
    bannerMovies.length > 1
      ? bannerMovies[(bannerIndex - 1 + bannerMovies.length) % bannerMovies.length]
      : null;
  const nextBanner =
    bannerMovies.length > 1 ? bannerMovies[(bannerIndex + 1) % bannerMovies.length] : null;

  return (
    <div className="page" style={{ padding: 0 }}>
      {/* ==================== HERO BANNER ==================== */}
      {currentBanner && (
        <div
          className={`hero-carousel ${
            bannerDirection >= 0 ? 'hero-carousel--next' : 'hero-carousel--prev'
          }`}
          onMouseEnter={() => setBannerPaused(true)}
          onMouseLeave={() => setBannerPaused(false)}
          onFocus={() => setBannerPaused(true)}
          onBlur={() => setBannerPaused(false)}
        >
          {previousBanner && (
            <button
              key={`hero-prev-${previousBanner.movieId}`}
              type="button"
              className="hero-side-card hero-side-card--prev"
              onClick={() => showBannerAt(bannerIndex - 1, -1)}
              aria-label="Chuyen sang phim truoc"
            >
              <SafeImage
                src={previousBanner.thumbnailUrl}
                alt={previousBanner.movieName}
                className="hero-side-img"
              />
              <span className="hero-side-shade" />
              <span className="hero-side-control">
                <ChevronLeftIcon />
              </span>
              <span className="hero-side-title">{previousBanner.movieName}</span>
            </button>
          )}

          <div
            key={`hero-main-${currentBanner.movieId}`}
            className="hero-banner"
            onClick={() => navigate(`/movie/${currentBanner.movieId}`)}
          >
            <div key={`backdrop-${currentBanner.movieId}`} className="hero-backdrop">
              <SafeImage
                src={currentBanner.thumbnailUrl}
                alt=""
                className="hero-backdrop-img"
                fallback=""
              />
              <div className="hero-gradient" />
            </div>

            <div key={`content-${currentBanner.movieId}`} className="hero-content">
              <div className="hero-info">
                <div className="hero-kicker">MoviePTIT Special</div>
                <div className="hero-badges">
                  {currentBanner.ageRating && (
                    <span className="movie-badge">{currentBanner.ageRating}</span>
                  )}
                  {currentBanner.durationMinutes && (
                    <span className="hero-meta-tag">
                      <ClockIcon className="inline-icon" />
                      {currentBanner.durationMinutes} phút
                    </span>
                  )}
                  {currentBanner.language && (
                    <span className="hero-meta-tag">
                      <GlobeIcon className="inline-icon" />
                      {currentBanner.language}
                    </span>
                  )}
                </div>
                <h1 className="hero-title">{currentBanner.movieName}</h1>
                <p className="hero-desc">
                  {currentBanner.description?.substring(0, 150)}
                  {currentBanner.description?.length > 150 ? '...' : ''}
                </p>
                <div className="hero-actions">
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/movie/${currentBanner.movieId}`);
                    }}
                  >
                    <TicketIcon className="btn-icon" />
                    Đặt vé ngay
                  </button>
                </div>
              </div>

              <div className="hero-visual" aria-hidden="true">
                <SafeImage
                  src={currentBanner.thumbnailUrl}
                  alt=""
                  className="hero-poster hero-poster--back"
                />
                <SafeImage
                  src={currentBanner.thumbnailUrl}
                  alt=""
                  className="hero-poster hero-poster--main"
                />
              </div>
            </div>

            {bannerMovies.length > 1 && (
              <>
                <button
                  type="button"
                  className="hero-nav hero-nav--prev"
                  onClick={(e) => {
                    e.stopPropagation();
                    showBannerAt(bannerIndex - 1, -1);
                  }}
                  aria-label="Chuyen sang phim truoc"
                >
                  <ChevronLeftIcon />
                </button>
                <button
                  type="button"
                  className="hero-nav hero-nav--next"
                  onClick={(e) => {
                    e.stopPropagation();
                    showBannerAt(bannerIndex + 1, 1);
                  }}
                  aria-label="Chuyen sang phim tiep theo"
                >
                  <ChevronRightIcon />
                </button>

                <div className="hero-dots">
                  {bannerMovies.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Chuyen den phim ${i + 1}`}
                      className={`hero-dot ${i === bannerIndex ? 'hero-dot--active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (i !== bannerIndex) {
                          setBannerDirection(i > bannerIndex ? 1 : -1);
                        }
                        setBannerIndex(i);
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {nextBanner && (
            <button
              key={`hero-next-${nextBanner.movieId}`}
              type="button"
              className="hero-side-card hero-side-card--next"
              onClick={() => showBannerAt(bannerIndex + 1, 1)}
              aria-label="Chuyen sang phim tiep theo"
            >
              <SafeImage
                src={nextBanner.thumbnailUrl}
                alt={nextBanner.movieName}
                className="hero-side-img"
              />
              <span className="hero-side-shade" />
              <span className="hero-side-control">
                <ChevronRightIcon />
              </span>
              <span className="hero-side-title">{nextBanner.movieName}</span>
            </button>
          )}
        </div>
      )}

      <div className={`quick-booking-shell container ${currentBanner ? '' : 'quick-booking-shell--standalone'}`}>
        <form className="quick-booking-card" aria-label="Mua vé nhanh" onSubmit={handleQuickBooking}>
          <div className="quick-booking-field">
            <label className="quick-booking-label" htmlFor="quick-movie">
              <span className="quick-booking-index">1</span>
              <span>Chọn phim</span>
            </label>
            <select
              id="quick-movie"
              className="quick-booking-select"
              value={quickMovieId}
              onChange={handleQuickMovieChange}
              disabled={quickMovieOptions.length === 0}
            >
              {quickMovieOptions.length === 0 ? (
                <option>Chưa có suất chiếu</option>
              ) : (
                quickMovieOptions.map((movie) => (
                  <option key={movie.movieId} value={movie.movieId}>
                    {movie.movieName}
                  </option>
                ))
              )}
            </select>
            <ChevronDownIcon className="quick-booking-chevron" />
          </div>

          <div className="quick-booking-field">
            <label className="quick-booking-label" htmlFor="quick-branch">
              <span className="quick-booking-index">2</span>
              <span>Chọn rạp</span>
            </label>
            <select
              id="quick-branch"
              className="quick-booking-select"
              value={quickBranchKey}
              onChange={handleQuickBranchChange}
              disabled={!quickMovieId || quickBranchOptions.length === 0}
            >
              {quickBranchOptions.length === 0 ? (
                <option>Chọn phim trước</option>
              ) : (
                quickBranchOptions.map((branch) => (
                  <option key={branch.key} value={branch.key}>
                    {branch.name}
                  </option>
                ))
              )}
            </select>
            <ChevronDownIcon className="quick-booking-chevron" />
          </div>

          <div className="quick-booking-field">
            <label className="quick-booking-label" htmlFor="quick-date">
              <span className="quick-booking-index">3</span>
              <span>Chọn ngày</span>
            </label>
            <select
              id="quick-date"
              className="quick-booking-select"
              value={quickDate}
              onChange={handleQuickDateChange}
              disabled={!quickBranchKey || quickDateOptions.length === 0}
            >
              {quickDateOptions.length === 0 ? (
                <option>Chọn rạp trước</option>
              ) : (
                quickDateOptions.map((date) => (
                  <option key={date.key} value={date.key}>
                    {date.label}
                  </option>
                ))
              )}
            </select>
            <ChevronDownIcon className="quick-booking-chevron" />
          </div>

          <div className="quick-booking-field">
            <label className="quick-booking-label" htmlFor="quick-showtime">
              <span className="quick-booking-index">4</span>
              <span>Chọn suất</span>
            </label>
            <select
              id="quick-showtime"
              className="quick-booking-select"
              value={quickShowtimeId}
              onChange={(event) => setQuickShowtimeId(event.target.value)}
              disabled={!quickDate || quickShowtimeOptions.length === 0}
            >
              {quickShowtimeOptions.length === 0 ? (
                <option>Chọn ngày trước</option>
              ) : (
                quickShowtimeOptions.map((showtime) => (
                  <option key={showtime.showtimeId} value={showtime.showtimeId}>
                    {formatQuickTime(showtime.startTime)} - {showtime.roomName || 'Phòng chiếu'}
                  </option>
                ))
              )}
            </select>
            <ChevronDownIcon className="quick-booking-chevron" />
          </div>

          <button
            type="submit"
            className="quick-booking-submit"
            disabled={!quickShowtimeId}
          >
            Mua vé nhanh
          </button>
        </form>
      </div>

      <div className="ai-chat-widget">
        {aiOpen && (
          <div className="ai-chat-panel">
            <div className="ai-chat-window" aria-label="Trợ lý MoviePTIT">
            <div className="ai-chat-header">
              <span className="ai-chat-avatar">
                <MessageIcon />
              </span>
              <div>
                <strong className="ai-chat-title">Trợ lý MoviePTIT</strong>
              </div>
              <button
                type="button"
                className="ai-chat-close"
                aria-label="Đóng chatbot"
                onClick={() => setAiOpen(false)}
              >
                <XCircleIcon />
              </button>
            </div>

            <div className="ai-chat-messages" ref={aiMessagesRef}>
              {aiMessages.map((message) => (
                <div
                  key={message.id}
                  className={`ai-message ai-message--${message.role}`}
                >
                  {message.content}
                </div>
              ))}
              {aiSending && (
                <div className="ai-message ai-message--assistant ai-message--typing">
                  <span />
                  <span />
                  <span />
                </div>
              )}
            </div>

            <div className="ai-suggestion-list ai-suggestion-list--compact">
              {AI_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="ai-suggestion-chip"
                  onClick={() => sendAiMessage(suggestion)}
                  disabled={aiSending}
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <form className="ai-chat-form" onSubmit={handleAiSubmit}>
              <input
                type="text"
                value={aiInput}
                onChange={(event) => setAiInput(event.target.value)}
                placeholder="Nhập câu hỏi về phim, suất chiếu..."
                disabled={aiSending}
              />
              <button
                type="submit"
                aria-label="Gửi tin nhắn"
                disabled={!aiInput.trim() || aiSending}
              >
                <SendIcon />
              </button>
            </form>
            </div>
          </div>
        )}

        <button
          type="button"
          className={`ai-chat-toggle ${aiOpen ? 'ai-chat-toggle--open' : ''}`}
          aria-label={aiOpen ? 'Đóng chatbot' : 'Mở chatbot'}
          aria-expanded={aiOpen}
          onClick={() => setAiOpen((open) => !open)}
        >
          <span className="ai-chat-toggle-icon">
            {aiOpen ? <XCircleIcon /> : <MessageIcon />}
          </span>
          {!aiOpen && <span className="ai-chat-toggle-dot" />}
        </button>
      </div>

      {/* ==================== SEARCH ==================== */}
      <div className="container" style={{ marginTop: 32 }}>
        <div className="search-bar">
          <SearchIcon className="search-icon" />
          <input
            className="search-input"
            type="text"
            placeholder="Tìm kiếm phim theo tên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch('')}>✕</button>
          )}
        </div>
      </div>

      {/* ==================== PHIM ĐANG CHIẾU ==================== */}
      <section className="container section">
        <div className="section-header">
          <h2 className="section-title">
            <SparkIcon className="section-icon" />
            Phim đang chiếu
          </h2>
          <span className="section-count">{filteredNowShowing.length} phim</span>
        </div>

        {filteredNowShowing.length === 0 ? (
          <EmptyState 
            title="Không tìm thấy phim"
            message={search ? `Không tìm thấy kết quả nào cho "${search}".` : "Hiện tại chưa có phim nào đang chiếu."}
            buttonText="Xem tất cả phim"
          />
        ) : (
          <div className="movie-grid">
            {filteredNowShowing.map((movie) => (
              <Motion.div
                key={movie.movieId}
                className="card movie-card"
                onClick={() => navigate(`/movie/${movie.movieId}`)}
                whileHover={{ y: -3, scale: 1.01 }}
                transition={{ duration: 0.2 }}
              >
                <div className="movie-poster-wrap">
                  <SafeImage
                    className="movie-poster"
                    src={movie.thumbnailUrl}
                    alt={movie.movieName}
                  />
                  <div className="movie-overlay">
                    <button className="btn btn-primary btn-sm">Đặt vé</button>
                  </div>
                </div>
                <div className="movie-info">
                  <h3 className="movie-title">{movie.movieName}</h3>
                  <div className="movie-meta">
                    {movie.durationMinutes && (
                      <span>
                        <ClockIcon className="inline-icon" />
                        {movie.durationMinutes}p
                      </span>
                    )}
                    {movie.ageRating && <span className="movie-badge">{movie.ageRating}</span>}
                  </div>
                </div>
              </Motion.div>
            ))}
          </div>
        )}
      </section>

      {/* ==================== PHIM SẮP CHIẾU ==================== */}
      {filteredUpcoming.length > 0 && (
        <section className="container section">
          <div className="section-header">
            <h2 className="section-title">
              <CalendarIcon className="section-icon" />
              Phim sắp chiếu
            </h2>
            <span className="section-count">{filteredUpcoming.length} phim</span>
          </div>

          <div className="movie-grid">
            {filteredUpcoming.map((movie) => (
              <Motion.div
                key={movie.movieId}
                className="card movie-card movie-card--upcoming"
                onClick={() => navigate(`/movie/${movie.movieId}`)}
                whileHover={{ y: -3, scale: 1.01 }}
                transition={{ duration: 0.2 }}
              >
                <div className="movie-poster-wrap">
                  <SafeImage
                    className="movie-poster"
                    src={movie.thumbnailUrl}
                    alt={movie.movieName}
                  />
                  <div className="movie-upcoming-badge">Sắp chiếu</div>
                </div>
                <div className="movie-info">
                  <h3 className="movie-title">{movie.movieName}</h3>
                  <div className="movie-meta">
                    {movie.releaseDate && (
                      <span>
                        <CalendarIcon className="inline-icon" />
                        {formatDate(movie.releaseDate)}
                      </span>
                    )}
                    {movie.ageRating && <span className="movie-badge">{movie.ageRating}</span>}
                  </div>
                </div>
              </Motion.div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
