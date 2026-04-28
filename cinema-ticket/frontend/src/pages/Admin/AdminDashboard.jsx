import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { movieApi, bookingApi, branchApi } from '../../api';
import { SkeletonBox } from '../../components/Common/Skeleton';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const AdminDashboard = () => {
  const [stats, setStats] = useState({ movies: 0, bookings: 0, branches: 0, revenue: 0 });
  const [recentBookings, setRecentBookings] = useState([]);
  const [allData, setAllData] = useState({ movies: [], bookings: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [moviesRes, bookingsRes, branchesRes] = await Promise.allSettled([
          movieApi.getAll(),
          bookingApi.getAll(),
          branchApi.getAll(),
        ]);

        const movies = moviesRes.status === 'fulfilled' ? moviesRes.value.data.result : [];
        const bookings = bookingsRes.status === 'fulfilled' ? bookingsRes.value.data.result : [];
        const branches = branchesRes.status === 'fulfilled' ? branchesRes.value.data.result : [];

        setAllData({ movies, bookings });

        const totalRevenue = bookings
          .filter(b => b.paymentStatus === 'COMPLETED' || b.status === 'COMPLETED')
          .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

        setStats({
          movies: movies.length,
          bookings: bookings.length,
          branches: branches.length,
          revenue: totalRevenue,
        });

        setRecentBookings(
          bookings
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5)
        );
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Process data for Line Chart (Revenue 7 days)
  const chartData = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    return last7Days.map(date => {
      const dayRevenue = allData.bookings
        .filter(b => (b.paymentStatus === 'COMPLETED' || b.status === 'COMPLETED') && b.createdAt.startsWith(date))
        .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
      
      return {
        name: new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
        revenue: dayRevenue
      };
    });
  }, [allData.bookings]);

  // Process data for Pie Chart (Genre Mix)
  const genreData = useMemo(() => {
    const genreMap = {};
    allData.bookings.forEach(b => {
      const movie = allData.movies.find(f => f.movieId === b.movieId || f.movieName === b.movieName);
      if (movie && movie.genres) {
        movie.genres.forEach(g => {
          const name = g.name || g;
          genreMap[name] = (genreMap[name] || 0) + 1;
        });
      }
    });

    return Object.entries(genreMap).map(([name, value]) => ({ name, value }));
  }, [allData]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

  const StatCard = ({ icon: Icon, label, value, color, loadingStat }) => (
    <div className="stat-card">
      <div className="stat-icon" style={{ backgroundColor: `${color}15`, color }}>
        <Icon />
      </div>
      <div className="stat-info">
        <span className="stat-label">{label}</span>
        {loadingStat ? (
          <SkeletonBox width="100px" height="28px" borderRadius="4px" />
        ) : (
          <h3 className="stat-value">{value}</h3>
        )}
      </div>
    </div>
  );

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="page-title">Tổng quan hệ thống</h1>
        <p className="page-subtitle">Thống kê chi tiết doanh thu và hoạt động.</p>
      </div>

      <div className="stats-grid">
        <StatCard
          icon={() => (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
              <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          )}
          label="DOANH THU"
          value={formatCurrency(stats.revenue)}
          color="#10b981"
          loadingStat={loading}
        />
        <StatCard
          icon={() => (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
            </svg>
          )}
          label="ĐƠN ĐẶT VÉ"
          value={stats.bookings}
          color="#6366f1"
          loadingStat={loading}
        />
        <StatCard
          icon={() => (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" />
            </svg>
          )}
          label="PHIM"
          value={stats.movies}
          color="#f59e0b"
          loadingStat={loading}
        />
        <StatCard
          icon={() => (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
              <path d="M3 21h18" /><path d="M3 7v1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7H3l2-4h14l2 4" /><path d="M5 21V10.85" /><path d="M19 21V10.85" /><path d="M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4" />
            </svg>
          )}
          label="CHI NHÁNH"
          value={stats.branches}
          color="#8b5cf6"
          loadingStat={loading}
        />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        {/* Line Chart */}
        <div className="card" style={{ padding: '24px', height: '400px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '24px' }}>Doanh thu 7 ngày qua</h3>
          {loading ? (
            <SkeletonBox height="300px" />
          ) : (
            <ResponsiveContainer width="100%" height="85%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" vertical={false} />
                <XAxis dataKey="name" stroke="#a0aec0" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#a0aec0" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a202c', border: '1px solid #2d3748', borderRadius: '8px' }}
                  formatter={(v) => formatCurrency(v)}
                />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie Chart */}
        <div className="card" style={{ padding: '24px', height: '400px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '24px' }}>Thị phần theo Thể loại</h3>
          {loading ? (
            <SkeletonBox height="300px" />
          ) : genreData.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80%', color: 'var(--text-muted)' }}>
              Chưa có dữ liệu thể loại.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="85%">
              <PieChart>
                <Pie
                  data={genreData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {genreData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="admin-table-card">
        <div className="table-header">
          <h3 className="section-title">Đơn hàng mới nhất</h3>
          <Link to="/admin/bookings" className="btn btn-ghost btn-sm">Quản lý vé</Link>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>MÃ ĐƠN</th>
              <th>PHIM</th>
              <th>NGÀY ĐẶT</th>
              <th>TỔNG TIỀN</th>
              <th>TRẠNG THÁI</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows />
            ) : recentBookings.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>Chưa có đơn hàng nào</td></tr>
            ) : (
              recentBookings.map((b, idx) => (
                <tr key={b.bookingId || idx}>
                  <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{b.bookingCode || `#${b.bookingId?.slice(0, 8)}`}</td>
                  <td>{b.movieName || '—'}</td>
                  <td>{new Date(b.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(b.totalAmount)}</td>
                  <td>
                    <span className={`status-badge ${b.status === 'COMPLETED' ? 'status--active' : 'status--pending'}`}>
                      {b.status === 'COMPLETED' ? 'Thành công' : 'Chờ TT'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SkeletonRows = () => (
  <>
    {[...Array(5)].map((_, i) => (
      <tr key={i}>
        <td><SkeletonBox width="100px" height="16px" /></td>
        <td><SkeletonBox width="150px" height="16px" /></td>
        <td><SkeletonBox width="90px" height="16px" /></td>
        <td><SkeletonBox width="90px" height="16px" /></td>
        <td><SkeletonBox width="100px" height="24px" borderRadius="100px" /></td>
      </tr>
    ))}
  </>
);

export default AdminDashboard;
