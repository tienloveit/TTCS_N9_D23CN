import { Navigate, useParams } from 'react-router-dom';

/** Link cũ /branch/:branchId chuyển sang trang lịch chiếu với rạp đã chọn. */
export default function LegacyBranchRedirect() {
  const { branchId } = useParams();
  return <Navigate to={`/branches?rap=${encodeURIComponent(branchId)}`} replace />;
}
