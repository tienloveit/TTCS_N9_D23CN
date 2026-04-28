import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout/Layout';
import LoginPage from './pages/Login/LoginPage';
import RegisterPage from './pages/Register/RegisterPage';
import HomePage from './pages/Home/HomePage';
import MovieListPage from './pages/MovieList/MovieListPage';
import MovieDetailPage from './pages/MovieDetail/MovieDetailPage';
import BranchListPage from './pages/Branch/BranchListPage';
import BranchDetailPage from './pages/Branch/BranchDetailPage';
import MyBookingsPage from './pages/MyBookings/MyBookingsPage';
import PaymentPage from './pages/Payment/PaymentPage';
import PaymentResultPage from './pages/Payment/PaymentResultPage';
import { lazy, Suspense } from 'react';
import NotFoundPage from './pages/NotFound/NotFoundPage';

// Admin and staff pages
import AdminLayout from './pages/Admin/AdminLayout';
import AdminDashboard from './pages/Admin/AdminDashboard';
import MovieManagement from './pages/Admin/MovieManagement';
import ShowtimeManagement from './pages/Admin/ShowtimeManagement';
import BranchManagement from './pages/Admin/BranchManagement';
import UserManagement from './pages/Admin/UserManagement';
import BookingManagement from './pages/Admin/BookingManagement';
import StaffLayout from './pages/Staff/StaffLayout';
import StaffBookingPage from './pages/Staff/StaffBookingPage';
import CheckInPage from './pages/Staff/CheckInPage';
import ProfilePage from './pages/Profile/ProfilePage';

const SeatSelectPage = lazy(() => import('./pages/SeatSelect/SeatSelectPage'));

// Animation variants
const pageVariants = {
  initial: { opacity: 0, scale: 0.99 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 1.01 },
};

const MotionDiv = motion.div;

const PageWrapper = ({ children }) => (
  <MotionDiv
    variants={pageVariants}
    initial="initial"
    animate="animate"
    exit="exit"
    transition={{ duration: 0.3, ease: "easeInOut" }}
    style={{ width: '100%' }}
  >
    {children}
  </MotionDiv>
);

const AdminRoute = ({ children }) => {
  const { user, loading, isAdmin, isStaff } = useAuth();
  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to={isStaff ? '/staff' : '/'} replace />;
  return children;
};

const StaffRoute = ({ children }) => {
  const { user, loading, isStaffOrAdmin } = useAuth();
  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isStaffOrAdmin) return <Navigate to="/" replace />;
  return children;
};

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Auth pages */}
        <Route path="/login" element={<PageWrapper><LoginPage /></PageWrapper>} />
        <Route path="/register" element={<PageWrapper><RegisterPage /></PageWrapper>} />

        {/* Legacy staff links */}
        <Route path="/admin/staff-booking" element={<Navigate to="/staff/booking" replace />} />
        <Route path="/admin/check-in" element={<Navigate to="/staff/check-in" replace />} />

        {/* Staff routes */}
        <Route
          path="/staff"
          element={
            <StaffRoute>
              <StaffLayout />
            </StaffRoute>
          }
        >
          <Route index element={<Navigate to="/staff/booking" replace />} />
          <Route path="booking" element={<PageWrapper><StaffBookingPage /></PageWrapper>} />
          <Route path="check-in" element={<PageWrapper><CheckInPage /></PageWrapper>} />
          <Route path="bookings" element={<PageWrapper><BookingManagement /></PageWrapper>} />
        </Route>

        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<PageWrapper><AdminDashboard /></PageWrapper>} />
          <Route path="movies" element={<PageWrapper><MovieManagement /></PageWrapper>} />
          <Route path="showtimes" element={<PageWrapper><ShowtimeManagement /></PageWrapper>} />
          <Route path="branches" element={<PageWrapper><BranchManagement /></PageWrapper>} />
          <Route path="users" element={<PageWrapper><UserManagement /></PageWrapper>} />
          <Route path="bookings" element={<PageWrapper><BookingManagement /></PageWrapper>} />
        </Route>

        {/* Main pages */}
        <Route element={<Layout />}>
          <Route path="/" element={<PageWrapper><HomePage /></PageWrapper>} />
          <Route path="/movies" element={<PageWrapper><MovieListPage /></PageWrapper>} />
          <Route path="/movie/:id" element={<PageWrapper><MovieDetailPage /></PageWrapper>} />
          <Route path="/branches" element={<PageWrapper><BranchListPage /></PageWrapper>} />
          <Route path="/branch/:branchId" element={<PageWrapper><BranchDetailPage /></PageWrapper>} />
          <Route path="/profile" element={<PageWrapper><ProfilePage /></PageWrapper>} />
          <Route path="/my-bookings" element={<PageWrapper><MyBookingsPage /></PageWrapper>} />
          <Route path="/booking/:bookingId/payment" element={<PageWrapper><PaymentPage /></PageWrapper>} />
          <Route path="/payment/vnpay-return" element={<PageWrapper><PaymentResultPage /></PageWrapper>} />
          <Route
            path="/showtime/:showtimeId/seats"
            element={
              <Suspense fallback={<div className="loading"><div className="spinner" /></div>}>
                <PageWrapper><SeatSelectPage /></PageWrapper>
              </Suspense>
            }
          />
          <Route path="*" element={<PageWrapper><NotFoundPage /></PageWrapper>} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
};

export default AnimatedRoutes;
