import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from './context/useAuth';
import Layout from './components/Layout/Layout';
import LoginPage from './pages/Login/LoginPage';
import ForgotPasswordPage from './pages/Login/ForgotPasswordPage';
import OAuth2CallbackPage from './pages/Login/OAuth2CallbackPage';
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
import FoodManagement from './pages/Admin/FoodManagement';
import PromotionManagement from './pages/Admin/PromotionManagement';
import OperationsReportPage from './pages/Admin/OperationsReportPage';
import AuditLogPage from './pages/Admin/AuditLogPage';
import SystemSettingsPage from './pages/Admin/SystemSettingsPage';
import StaffLayout from './pages/Staff/StaffLayout';
import StaffDashboardPage from './pages/Staff/StaffDashboardPage';
import StaffBookingPage from './pages/Staff/StaffBookingPage';
import StaffSchedulePage from './pages/Staff/StaffSchedulePage';
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

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { user, loading, isAdmin, isManager, isStaff } = useAuth();
  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin && !isManager) return <Navigate to={isStaff ? '/staff' : '/'} replace />;
  return children;
};

const AdminOnlyRoute = ({ children }) => {
  const { user, loading, isAdmin, isManager } = useAuth();
  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to={isManager ? '/manager' : '/'} replace />;
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
        <Route path="/oauth2/callback" element={<PageWrapper><OAuth2CallbackPage /></PageWrapper>} />
        <Route path="/forgot-password" element={<PageWrapper><ForgotPasswordPage /></PageWrapper>} />
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
          <Route index element={<Navigate to="/staff/dashboard" replace />} />
          <Route path="dashboard" element={<PageWrapper><StaffDashboardPage /></PageWrapper>} />
          <Route path="schedules" element={<PageWrapper><StaffSchedulePage /></PageWrapper>} />
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
          <Route index element={<AdminOnlyRoute><PageWrapper><AdminDashboard /></PageWrapper></AdminOnlyRoute>} />
          <Route path="movies" element={<AdminOnlyRoute><PageWrapper><MovieManagement /></PageWrapper></AdminOnlyRoute>} />
          <Route path="showtimes" element={<AdminOnlyRoute><PageWrapper><ShowtimeManagement /></PageWrapper></AdminOnlyRoute>} />
          <Route path="branches" element={<PageWrapper><BranchManagement /></PageWrapper>} />
          <Route path="users" element={<AdminOnlyRoute><PageWrapper><UserManagement /></PageWrapper></AdminOnlyRoute>} />
          <Route path="bookings" element={<AdminOnlyRoute><PageWrapper><BookingManagement /></PageWrapper></AdminOnlyRoute>} />
          <Route path="foods" element={<AdminOnlyRoute><PageWrapper><FoodManagement /></PageWrapper></AdminOnlyRoute>} />
          <Route path="promotions" element={<AdminOnlyRoute><PageWrapper><PromotionManagement /></PageWrapper></AdminOnlyRoute>} />
          <Route path="operations" element={<PageWrapper><OperationsReportPage /></PageWrapper>} />
          <Route path="audit-logs" element={<PageWrapper><AuditLogPage /></PageWrapper>} />
          <Route path="settings" element={<AdminOnlyRoute><PageWrapper><SystemSettingsPage /></PageWrapper></AdminOnlyRoute>} />
        </Route>

        {/* Manager routes */}
        <Route
          path="/manager"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<PageWrapper><AdminDashboard /></PageWrapper>} />
          <Route path="movies" element={<Navigate to="/manager" replace />} />
          <Route path="showtimes" element={<PageWrapper><ShowtimeManagement /></PageWrapper>} />
          <Route path="branches" element={<PageWrapper><BranchManagement /></PageWrapper>} />
          <Route path="users" element={<PageWrapper><UserManagement /></PageWrapper>} />
          <Route path="bookings" element={<PageWrapper><BookingManagement /></PageWrapper>} />
          <Route path="foods" element={<PageWrapper><FoodManagement /></PageWrapper>} />
          <Route path="promotions" element={<PageWrapper><PromotionManagement /></PageWrapper>} />
          <Route path="operations" element={<PageWrapper><OperationsReportPage /></PageWrapper>} />
          <Route path="audit-logs" element={<PageWrapper><AuditLogPage /></PageWrapper>} />
          <Route path="settings" element={<Navigate to="/manager" replace />} />
        </Route>

        {/* Main pages */}
        <Route element={<Layout />}>
          <Route path="/" element={<PageWrapper><HomePage /></PageWrapper>} />
          <Route path="/movies" element={<PageWrapper><MovieListPage /></PageWrapper>} />
          <Route path="/movie/:id" element={<PageWrapper><MovieDetailPage /></PageWrapper>} />
          <Route path="/branches" element={<PageWrapper><BranchListPage /></PageWrapper>} />
          <Route path="/branch/:branchId" element={<PageWrapper><BranchDetailPage /></PageWrapper>} />
          <Route path="/profile" element={<PrivateRoute><PageWrapper><ProfilePage /></PageWrapper></PrivateRoute>} />
          <Route path="/my-bookings" element={<PrivateRoute><PageWrapper><MyBookingsPage /></PageWrapper></PrivateRoute>} />
          <Route path="/booking/:bookingId/payment" element={<PrivateRoute><PageWrapper><PaymentPage /></PageWrapper></PrivateRoute>} />
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
