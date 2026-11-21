import { Navigate, useParams } from 'react-router-dom';

/**
 * Trang rạp riêng trước đây trùng nội dung với /branches.
 * Giữ route để link cũ vẫn chạy, chuyển sang trang lịch chiếu với rạp đã chọn.
 */
export default function BranchDetailPage() {
  const { branchId } = useParams();
  return <Navigate to={`/branches?rap=${encodeURIComponent(branchId)}`} replace />;
}
