import React from 'react';
import './MovieBooking.css';

const MovieBanner = ({ movie }) => {
    return (
        <div className="movie-banner">
            {/* Background Image Banner (làm mờ) */}
            <div 
                className="movie-banner-bg" 
                style={{ backgroundImage: `url(${movie.poster})` }}
            ></div>

            <div className="movie-banner-content">
                {/* Poster Box */}
                <div className="movie-poster-container">
                    <img src={movie.poster} alt={movie.title} />
                </div>

                {/* Info Detail */}
                <div className="movie-info">
                    <div className="movie-title-wrap">
                        <h1>{movie.title}</h1>
                        <span className="age-rating">{movie.ageRating}</span>
                    </div>

                    <div className="movie-sub-info">
                        <span>🕒 {movie.duration} Phút</span>
                        <span>🗓️ {movie.releaseDate}</span>
                    </div>

                    <div className="movie-rating">
                        <span className="movie-rating-score">⭐ {movie.rating}</span>
                        <span className="movie-rating-votes">({movie.voteCount} votes)</span>
                    </div>

                    <div className="movie-meta-grid">
                        <span className="meta-label">Quốc gia:</span>
                        <span className="meta-value">{movie.country}</span>

                        <span className="meta-label">Nhà sản xuất:</span>
                        <span className="meta-value">{movie.producer}</span>

                        <span className="meta-label">Thể loại:</span>
                        <div className="genre-tags">
                            {movie.genres.map((genre, idx) => (
                                <span key={idx} className="tag-btn">{genre}</span>
                            ))}
                        </div>

                        <span className="meta-label">Đạo diễn:</span>
                        <span className="meta-value">{movie.director}</span>

                        <span className="meta-label">Diễn viên:</span>
                        <div className="cast-tags">
                            {movie.cast.map((c, idx) => (
                                <span key={idx} className="tag-btn">{c}</span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MovieBanner;
