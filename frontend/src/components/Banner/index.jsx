import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Banner.css';

// Import các hình ảnh từ thư mục images
import banner1 from '../../images/Banner1.png';
import banner2 from '../../images/Banner2.png';
import banner3 from '../../images/Banner3.png';
import banner4 from '../../images/Banner4.png';
import banner5 from '../../images/Banner5.png';

const banners = [
    { id: 1, img: banner1, link: '/movie/1' },
    { id: 2, img: banner2, link: '/movie/2' },
    { id: 3, img: banner3, link: '/movie/3' },
    { id: 4, img: banner4, link: '/movie/4' },
    { id: 5, img: banner5, link: '/movie/5' }
];

const Banner = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const navigate = useNavigate();

    // Chuyển slide tự động sau mỗi 5 giây
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prevIndex) => (prevIndex === banners.length - 1 ? 0 : prevIndex + 1));
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const goToSlide = (index) => {
        setCurrentIndex(index);
    };

    const prevSlide = () => {
        setCurrentIndex((prevIndex) => (prevIndex === 0 ? banners.length - 1 : prevIndex - 1));
    };

    const nextSlide = () => {
        setCurrentIndex((prevIndex) => (prevIndex === banners.length - 1 ? 0 : prevIndex + 1));
    };

    return (
        <div className="banner-slider">
            <div
                className="banner-track"
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
                {banners.map((banner, index) => (
                    <div
                        className="banner-slide"
                        key={banner.id}
                        onClick={() => navigate(banner.link)}
                        style={{ cursor: 'pointer' }}
                    >
                        <img src={banner.img} alt={`Banner ${banner.id}`} />
                    </div>
                ))}
            </div>

            {/* Các nút điều hướng cơ bản */}
            <button className="nav-button prev-button" onClick={prevSlide}>
                &#10094;
            </button>
            <button className="nav-button next-button" onClick={nextSlide}>
                &#10095;
            </button>

            {/* Dấu chấm chỉ báo */}
            <div className="banner-dots">
                {banners.map((_, index) => (
                    <span
                        key={index}
                        className={`dot ${currentIndex === index ? 'active' : ''}`}
                        onClick={() => goToSlide(index)}
                    ></span>
                ))}
            </div>
        </div>
    );
};

export default Banner;
