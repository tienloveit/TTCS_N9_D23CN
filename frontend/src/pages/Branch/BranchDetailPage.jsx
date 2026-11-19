import { Link, useParams } from 'react-router-dom';
import { ArrowLeftIcon, BuildingIcon } from '../../components/Common/CinemaIcons';
import { BranchMessage, BranchSchedule, BranchSpotlight } from './BranchSchedule';
import useActiveBranches from './useActiveBranches';
import './BranchPages.css';

export default function BranchDetailPage() {
  const { branchId } = useParams();
  const { branches, loading, error, retry } = useActiveBranches();
  const branch = branches.find((item) => String(item.branchId) === branchId);

  return (
    <div className="page br-page">
      <div className="br-wrap br-main">
        <Link to="/branches" className="br-back-link">
          <ArrowLeftIcon size={16} />
          Tất cả rạp
        </Link>

        {loading ? (
          <BranchMessage title="Đang tải thông tin rạp…" loading />
        ) : error ? (
          <BranchMessage title="Không tải được thông tin rạp" error onRetry={retry} />
        ) : !branch ? (
          <BranchMessage icon={<BuildingIcon size={23} />} title="Không tìm thấy rạp hoặc rạp đã ngừng hoạt động">
            <Link to="/branches" className="br-btn">Xem danh sách rạp</Link>
          </BranchMessage>
        ) : (
          <>
            <BranchSpotlight branch={branch} />
            {branches.length > 1 && (
              <nav className="br-switcher" aria-label="Đổi rạp">
                {branches.map((item) => (
                  <Link
                    key={item.branchId}
                    to={`/branch/${item.branchId}`}
                    className="br-btn"
                    aria-current={item.branchId === branch.branchId ? 'page' : undefined}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
            )}
            <BranchSchedule branchId={branch.branchId} emptyLink="/branches" emptyLinkLabel="Xem các rạp khác" />
          </>
        )}
      </div>
    </div>
  );
}
