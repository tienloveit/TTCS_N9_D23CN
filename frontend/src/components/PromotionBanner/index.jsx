import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './PromotionBanner.css';

// Import images
import discount1 from '../../images/discount_info1.png';
import discount2 from '../../images/discount_info2.png';
import discount3 from '../../images/discount_info3.png';
import discount4 from '../../images/discount_info4.png';
import discount5 from '../../images/discount_info5.png';
import discount6 from '../../images/discount_info6.png';

const promotions = [
    { id: 1, img: discount1, title: 'U22 Vui Vẻ - Bắp Nước Siêu Hạt Dẻ', link: '/khuyenmai/1' },
    { id: 2, img: discount2, title: 'Tháng Phim Việt - Đặt vé Phim Trên Zalopay, Rẻ Hơn 50%', link: '/khuyenmai/2' },
    { id: 3, img: discount3, title: 'Ngày Tri Ân Của Galaxy Cinema - Ngày Thứ Hai ĐẦU TIÊN Mỗi Tháng', link: '/khuyenmai/3' },
    { id: 4, img: discount4, title: 'Giá Vé U22 - Chỉ Từ 45k', link: '/khuyenmai/4' },
    { id: 5, img: discount5, title: 'Đặc Quyền Hội Viên - Nhận Ngay Nhiều Ưu Đãi', link: '/khuyenmai/5' },
    { id: 6, img: discount6, title: 'Combo Trọn Vị - Xem Phim Thêm Vui', link: '/khuyenmai/6' },
];

const PromotionBanner = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [itemsPerView, setItemsPerView] = useState(4);
    const navigate = useNavigate();

    // Xử lý reponsive để hiển thị số lượng banner trên 1 khung hình tuỳ thuộc độ phân giải
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth <= 480) {
                setItemsPerView(1);
            } else if (window.innerWidth <= 768) {
                setItemsPerView(2);
            } else if (window.innerWidth <= 1024) {
                setItemsPerView(3);
            } else {
                setItemsPerView(4);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const maxIndex = Math.max(0, promotions.length - itemsPerView);

    // Tự động chuyển cảnh (Tùy chọn) 
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex(prev => prev >= maxIndex ? 0 : prev + 1);
        }, 6000); // Đổi slide tự động mỗi 6s
        return () => clearInterval(interval);
    }, [maxIndex]);

    const prevSlide = () => {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : maxIndex));
    };

    const nextSlide = () => {
        setCurrentIndex((prev) => (prev < maxIndex ? prev + 1 : 0));
    };

    return (
        <section className="promotion-section">
            <h2 className="promotion-title">KHUYẾN MÃI</h2>
            <div className="promotion-carousel">
                {/* Nút lùi */}
                <button 
                    className="promo-nav-button promo-prev" 
                    onClick={prevSlide}
                    aria-label="Previous Promotion"
                >
                    &#10094;
                </button>

                {/* Khung hiển thị các banner */}
                <div className="promo-track-container">
                    <div 
                        className="promo-track"
                        style={{ transform: `translateX(-${currentIndex * (100 / itemsPerView)}%)` }}
                    >
                        {promotions.map((promo) => (
                            <div 
                                className="promo-slide" 
                                key={promo.id}
                                onClick={() => navigate(promo.link)}
                                style={{ flex: `0 0 ${100 / itemsPerView}%`, maxWidth: `${100 / itemsPerView}%`, cursor: 'pointer' }}
                            >
                                <div className="promo-card">
                                    <div className="promo-img-wrapper">
                                        <img src={promo.img} alt={promo.title} />
                                    </div>
                                    <div className="promo-info">
                                        <p>{promo.title}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Nút tiến */}
                <button 
                    className="promo-nav-button promo-next" 
                    onClick={nextSlide}
                    aria-label="Next Promotion"
                >
                    &#10095;
                </button>
            </div>
        </section>
    );
};

export default PromotionBanner;
