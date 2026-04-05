import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import HomePage from './pages/HomePage'
import MoviesPage from './pages/MoviesPage'
import MovieDetailPage from './pages/MovieDetailPage'
import BookingPage from './pages/BookingPage'
import CinemaPage from './pages/CinemaPage'
import EventPage from './pages/EventPage'
import StarShopPage from './pages/StarShopPage'
import ContentPage from './pages/ContentPage'
import AuthModal from './components/AuthModal'
import useAuth from './hooks/useAuth'
import './App.css'

function App() {
  const { user, showAuthModal, setShowAuthModal, handleAuthSuccess, handleLogout } = useAuth()

  return (
    <BrowserRouter>
      <div className="galaxycinema-app">
        <Header user={user} onAuthClick={() => setShowAuthModal(true)} onLogout={handleLogout} />

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/movies" element={<MoviesPage />} />
          <Route path="/movie/:movieId" element={<MovieDetailPage />} />
          <Route path="/booking" element={<BookingPage />} />
          <Route path="/booking/:movieId" element={<BookingPage />} />
          <Route path="/cinema" element={<CinemaPage />} />
          <Route path="/event" element={<EventPage />} />
          <Route path="/shop" element={<StarShopPage />} />
          <Route path="/content" element={<ContentPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>

        {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} onAuthSuccess={handleAuthSuccess} />}
      </div>
    </BrowserRouter>
  )
}

export default App

