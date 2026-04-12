import React, { useState } from 'react';
import './MovieBooking.css';

const Showtimes = ({ showtimesData, regionsData = {} }) => {
    // Generate dates starting from today dynamically as agreed.
    const [currentDateIndex, setCurrentDateIndex] = useState(0);
    const [selectedRegion, setSelectedRegion] = useState('Toàn quốc');
    const [selectedCinema, setSelectedCinema] = useState('Tất cả rạp');

    // ... handle default selections when regions mount or change
    const regions = Object.keys(regionsData);
    const cinemasInRegion = selectedRegion === 'Toàn quốc' ? [] : (regionsData[selectedRegion] || []);

    const handleRegionChange = (e) => {
        setSelectedRegion(e.target.value);
        setSelectedCinema('Tất cả rạp'); // reset rạp khi đổi khu vực
    };

    const generateDates = () => {
        const dates = [];
        const today = new Date();
        const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
        
        for (let i = 0; i < 7; i++) {
            const nextDate = new Date(today);
            nextDate.setDate(today.getDate() + i);
            const dayName = i === 0 ? 'Hôm nay' : days[nextDate.getDay()];
            const dateStr = `${nextDate.getDate().toString().padStart(2, '0')}/${(nextDate.getMonth() + 1).toString().padStart(2, '0')}`;
            dates.push({ day: dayName, date: dateStr, fullDate: nextDate });
        }
        return dates;
    };

    const datesList = generateDates();
    const visibleDates = 4; // Show 4 dates at a time

    const handlePrevDate = () => {
        if (currentDateIndex > 0) setCurrentDateIndex(currentDateIndex - 1);
    };

    const handleNextDate = () => {
        if (currentDateIndex < datesList.length - visibleDates) {
            setCurrentDateIndex(currentDateIndex + 1);
        }
    };

    return (
        <div className="showtimes-section">
            <h2 className="section-title">Lịch Chiếu</h2>

            <div className="showtimes-filters">
                {/* Date Slider */}
                <div className="date-selector-wrapper">
                    <button className="date-nav-btn" onClick={handlePrevDate}>&#10094;</button>
                    
                    <div className="date-track-container">
                        {datesList.slice(currentDateIndex, currentDateIndex + visibleDates).map((item, idx) => (
                            <div key={idx} className={`date-item ${idx === 0 ? 'active' : ''}`}> {/* Giả định ngày đầu tiên ở view đang active */}
                                <span className="date-day">{item.day}</span>
                                <span className="date-date">{item.date}</span>
                            </div>
                        ))}
                    </div>

                    <button className="date-nav-btn" onClick={handleNextDate}>&#10095;</button>
                </div>

                {/* Location Filters */}
                <div className="location-filters">
                    <select className="filter-select" value={selectedRegion} onChange={handleRegionChange}>
                        {regions.map((region, idx) => (
                            <option key={idx} value={region}>{region}</option>
                        ))}
                    </select>

                    <select className="filter-select" value={selectedCinema} onChange={(e) => setSelectedCinema(e.target.value)}>
                        <option value="Tất cả rạp">Tất cả rạp</option>
                        {cinemasInRegion.map((cinema, idx) => (
                            <option key={idx} value={cinema}>{cinema}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Cinema List and Showtimes */}
            <div className="cinema-schedule-list">
                {showtimesData.filter(data => {
                    const matchRegion = selectedRegion === 'Toàn quốc' || data.region === selectedRegion;
                    const matchCinema = selectedCinema === 'Tất cả rạp' || data.cinema === selectedCinema;
                    return matchRegion && matchCinema;
                }).map((cinemaData, index) => (
                    <div key={index} className="cinema-item">
                        <div className="cinema-name">{cinemaData.cinema}</div>
                        {cinemaData.formats.map((format, fIdx) => (
                            <div key={fIdx} className="format-group">
                                <span className="format-type">{format.type}</span>
                                <div className="times-list">
                                    {format.times.map((time, tIdx) => (
                                        <button key={tIdx} className="time-btn">{time}</button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Showtimes;
