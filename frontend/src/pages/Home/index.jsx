import React from 'react';
import Header from '../../components/Header';
import Banner from '../../components/Banner';
import MovieList from '../../components/MovieList';
import Footer from '../../components/Footer';
import './Home.css'; // Nếu bạn có file CSS cho trang Home

const Home = () => {
    return (
        <div className="home-container">
            <Header />
            <Banner />
            <main className="home-content">
                <MovieList />
                {/* Nội dung trang chủ của bạn viết gõ vào bên dưới này */}

            </main>
            <Footer />
        </div>
    );
};

export default Home;