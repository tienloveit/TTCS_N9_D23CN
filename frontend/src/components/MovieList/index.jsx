import React, { useState } from 'react';
import './MovieList.css';
import { FaStar, FaMapMarkerAlt } from 'react-icons/fa';

// Hàm lấy URL ảnh động trong Vite
const getImageUrl = (name) => {
    return new URL(`../../images/${name}.png`, import.meta.url).href;
};

// Tạo data giả định từ các ảnh có sẵn trong thư mục images
const SHOWING_MOVIES = [
    { id: 's1', title: "Quyết Tâm Chia Tay", image: getImageUrl('showing1'), rating: "8.5", age: "T18" },
    { id: 's2', title: "Đêm Tối Rực Rỡ", image: getImageUrl('showing2'), rating: "7.9", age: "T16" },
    { id: 's3', title: "Tình Người Duyên Ma", image: getImageUrl('showing3'), rating: "9.1", age: "T13" },
    { id: 's4', title: "Ký Sinh Trùng", image: getImageUrl('showing4'), rating: "9.5", age: "T18" },
    { id: 's5', title: "Em Và Trịnh", image: getImageUrl('showing5'), rating: "8.2", age: "T13" },
    { id: 's6', title: "Chuyến Tàu Sinh Tử", image: getImageUrl('showing6'), rating: "9.0", age: "T16" },
    { id: 's7', title: "Nghề Siêu Dễ", image: getImageUrl('showing7'), rating: "8.0", age: "P" },
    { id: 's8', title: "Nhà Bà Nữ", image: getImageUrl('showing8'), rating: "8.6", age: "T16" },
];

const COMING_MOVIES = [
    { id: 'c1', title: "Lật Mặt 7", image: getImageUrl('coming1'), rating: "8.8", age: "T16" },
    { id: 'c2', title: "Quỷ Cẩu", image: getImageUrl('coming2'), rating: "7.5", age: "T18" },
    { id: 'c3', title: "Siêu Lừa Gặp Siêu Lầy", image: getImageUrl('coming3'), rating: "8.1", age: "T13" },
    { id: 'c4', title: "Mai", image: getImageUrl('coming4'), rating: "9.2", age: "T18" },
    { id: 'c5', title: "Kẻ Ẩn Danh", image: getImageUrl('coming5'), rating: "7.8", age: "T16" },
    { id: 'c6', title: "Người Mặt Trời", image: getImageUrl('coming6'), rating: "7.2", age: "T18" },
    { id: 'c7', title: "Giao Lộ 8675", image: getImageUrl('coming7'), rating: "8.0", age: "P" },
];

const IMAX_MOVIES = [
    { id: 'i1', title: "Avatar: Dòng Chảy Của Nước", image: getImageUrl('imax1'), rating: "9.6", age: "T13" },
    { id: 'i2', title: "Oppenheimer", image: getImageUrl('imax2'), rating: "9.5", age: "T18" },
    { id: 'i3', title: "Dune: Hành Tinh Cát", image: getImageUrl('imax3'), rating: "9.0", age: "T13" },
    { id: 'i4', title: "Interstellar", image: getImageUrl('imax4'), rating: "9.5", age: "P" },
    { id: 'i5', title: "Avengers: Hồi Kết", image: getImageUrl('imax5'), rating: "9.8", age: "T13" },
    { id: 'i6', title: "The Dark Knight", image: getImageUrl('imax6'), rating: "9.7", age: "T16" },
    { id: 'i7', title: "Inception", image: getImageUrl('imax7'), rating: "9.4", age: "T13" },
    { id: 'i8', title: "Transformers", image: getImageUrl('imax8'), rating: "8.5", age: "T13" },
];

const MOVIES_DATA = {
    'Đang chiếu': SHOWING_MOVIES,
    'Sắp chiếu': COMING_MOVIES,
    'Phim IMAX': IMAX_MOVIES
};

const MovieList = () => {
    const [activeTab, setActiveTab] = useState('Đang chiếu');
    const tabs = ['Đang chiếu', 'Sắp chiếu', 'Phim IMAX'];

    const currentMovies = MOVIES_DATA[activeTab];

    return (
        <section className="movie-list-section">
            <div className="container">
                {/* Header Section */}
                <div className="movie-list-header">
                    <div className="header-left">
                        <h2 className="section-title"><span>|</span> PHIM</h2>
                        <div className="movie-tabs">
                            {tabs.map((tab) => (
                                <button 
                                    key={tab} 
                                    className={`tab-button ${activeTab === tab ? 'active' : ''}`}
                                    onClick={() => setActiveTab(tab)}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="header-right">
                        <button className="location-selector">
                            <FaMapMarkerAlt className="location-icon" /> Toàn quốc
                        </button>
                    </div>
                </div>

                {/* Movie Grid Section */}
                <div className="movie-grid">
                    {currentMovies.map((movie) => (
                        <div className="movie-card" key={movie.id}>
                            <div className="movie-poster-container">
                                <img src={movie.image} alt={movie.title} className="movie-poster" />
                                
                                <div className="movie-badges">
                                    <div className="rating-badge">
                                        <FaStar className="star-icon" /> {movie.rating}
                                    </div>
                                    <div className={`age-badge age-${movie.age.toLowerCase()}`}>
                                        {movie.age}
                                    </div>
                                </div>
                            </div>
                            <h3 className="movie-title">{movie.title}</h3>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default MovieList;
