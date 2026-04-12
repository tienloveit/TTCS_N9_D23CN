import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import MovieBanner from '../../components/MovieBooking/MovieBanner';
import MovieContent from '../../components/MovieBooking/MovieContent';
import Showtimes from '../../components/MovieBooking/Showtimes';
import './MovieDetail.css';

import { movieInfo, showtimesData, regionsData } from './mockData';

const MovieDetail = () => {
    const { id } = useParams();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [id]);

    return (
        <div className="movie-detail-container">
            <Header />
            <MovieBanner movie={movieInfo} />
            <div className="movie-detail-main">
                <MovieContent 
                    synopsis={movieInfo.synopsis} 
                    note={movieInfo.note} 
                />
                <Showtimes 
                    showtimesData={showtimesData}
                    regionsData={regionsData} 
                />
            </div>
            <Footer />
        </div>
    );
};

export default MovieDetail;
