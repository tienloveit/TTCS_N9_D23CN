import React from 'react';
import './MovieBooking.css';

const MovieContent = ({ synopsis, note }) => {
    return (
        <div className="movie-content-section">
            <h2 className="section-title">Nội Dung Phim</h2>
            
            <div className="synopsis-text">
                {synopsis && synopsis.map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                ))}
            </div>

            {note && (
                <p className="note-text">{note}</p>
            )}
        </div>
    );
};

export default MovieContent;
