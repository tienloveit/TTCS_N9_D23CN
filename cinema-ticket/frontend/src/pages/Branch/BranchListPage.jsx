import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { branchApi } from '../../api';
import { FilmIcon, MapPinIcon, PhoneIcon } from '../../components/Common/CinemaIcons';

export default function BranchListPage() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await branchApi.getAll();
        setBranches(res.data.result || []);
      } catch (err) {
        console.error('Lỗi khi tải danh sách rạp', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBranches();
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title page-title-with-icon">
            <FilmIcon className="page-title-icon" />
            Rạp chiếu
          </h1>
          <p className="page-subtitle">Chọn rạp để xem lịch chiếu phim</p>
        </div>

        {branches.length === 0 ? (
          <p className="empty-text">Chưa có rạp chiếu nào.</p>
        ) : (
          <div className="branch-grid">
            {branches.map((branch) => (
              <div
                key={branch.branchId}
                className="branch-card card"
                onClick={() => navigate(`/branch/${branch.branchId}`)}
              >
                <div className="branch-card-icon">
                  <FilmIcon />
                </div>
                <div className="branch-card-body">
                  <h3 className="branch-card-name">{branch.name}</h3>
                  {branch.address && (
                    <p className="branch-card-address">
                      <MapPinIcon className="inline-icon" />
                      {branch.address}
                      {branch.city ? `, ${branch.city}` : ''}
                    </p>
                  )}
                  {branch.phone && (
                    <p className="branch-card-phone">
                      <PhoneIcon className="inline-icon" />
                      {branch.phone}
                    </p>
                  )}
                </div>
                <div className="branch-card-arrow">→</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
