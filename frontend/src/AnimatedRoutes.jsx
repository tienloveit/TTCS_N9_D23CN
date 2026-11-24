import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from './context/useAuth';
import { ROLE_HOME_PATHS } from './context/roleHomePaths';
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
import RefundManagementPage from './pages/Admin/RefundManagementPage';
import RevenueReportPage from './pages/Admin/RevenueReportPage';
import NotificationPage from './pages/Admin/NotificationPage';
import StaffLayout from './pages/Staff/StaffLayout';
import StaffDashboardPage from './pages/Staff/StaffDashboardPage';
import StaffBookingPage from './pages/Staff/booking/StaffBookingPage';
import CheckInPage from './pages/Staff/checkin/CheckInPage';
import ProfilePage from './pages/Profile/ProfilePage';

const OpsGallery = import.meta.env.DEV ? lazy(() => import('./components/Ops/OpsGallery')) : null;
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
  const location = useLocation();
  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin && !isManager) return <Navigate to={isStaff ? '/staff' : '/'} replace />;
  // MANAGER dùng khu /manager (menu và trang theo phạm vi chi nhánh); đưa link /admin/* về đúng khu.
  if (!isAdmin && isManager && /^\/admin(\/|$)/.test(location.pathname)) {
    const managerPath = location.pathname.replace(/^\/admin/, '/manager');
    return <Navigate to={`${managerPath}${location.search}`} replace />;
  }
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

function StaffBookings() {
  const { search } = useLocation();
  return <BookingManagement staff requestedBookingId={new URLSearchParams(search).get('booking')} />;
}

const AnimatedRoutes = () => {
  const location = useLocation();
  const { user } = useAuth();
  const roleHome = ROLE_HOME_PATHS[user?.role];

  if (location.pathname === '/' && roleHome) {
    return <Navigate to={roleHome} replace />;
  }

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {OpsGallery && <Route path="/ops-gallery" element={<Suspense><OpsGallery /></Suspense>} />}
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
          <Route path="dashboard" element={<StaffDashboardPage />} />
          <Route path="booking" element={<StaffBookingPage />} />
          <Route path="check-in" element={<CheckInPage />} />
          <Route path="bookings" element={<StaffBookings />} />
          <Route path="notifications" element={<NotificationPage staff />} />
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
          <Route index element={<AdminOnlyRoute><AdminDashboard /></AdminOnlyRoute>} />
          <Route path="movies" element={<AdminOnlyRoute><MovieManagement /></AdminOnlyRoute>} />
          <Route path="showtimes" element={<AdminOnlyRoute><ShowtimeManagement /></AdminOnlyRoute>} />
          <Route path="branches" element={<BranchManagement />} />
          <Route path="users" element={<AdminOnlyRoute><UserManagement /></AdminOnlyRoute>} />
          <Route path="bookings" element={<AdminOnlyRoute><BookingManagement /></AdminOnlyRoute>} />
          <Route path="foods" element={<AdminOnlyRoute><FoodManagement /></AdminOnlyRoute>} />
          <Route path="promotions" element={<AdminOnlyRoute><PromotionManagement /></AdminOnlyRoute>} />
          <Route path="operations" element={<OperationsReportPage />} />
          <Route path="refunds" element={<RefundManagementPage />} />
          <Route path="revenue" element={<RevenueReportPage />} />
          <Route path="audit-logs" element={<AuditLogPage />} />
          <Route path="notifications" element={<NotificationPage />} />
          <Route path="settings" element={<AdminOnlyRoute><SystemSettingsPage /></AdminOnlyRoute>} />
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
          <Route index element={<AdminDashboard />} />
          <Route path="movies" element={<Navigate to="/manager" replace />} />
          <Route path="showtimes" element={<ShowtimeManagement />} />
          <Route path="branches" element={<BranchManagement />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="bookings" element={<BookingManagement />} />
          <Route path="foods" element={<FoodManagement />} />
          <Route path="promotions" element={<PromotionManagement />} />
          <Route path="operations" element={<OperationsReportPage />} />
          <Route path="refunds" element={<RefundManagementPage />} />
          <Route path="revenue" element={<RevenueReportPage />} />
          <Route path="audit-logs" element={<AuditLogPage />} />
          <Route path="notifications" element={<NotificationPage />} />
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
