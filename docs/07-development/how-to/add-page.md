# Thêm một trang frontend

> Đối chiếu mã nguồn ngày 2026-11-24, commit `262d041`.

Ví dụ: thêm trang `/manager/vouchers-report` cho ADMIN và MANAGER.

## Checklist

- [ ] **1. Tạo file trang** trong `src/pages/<Khu>/`, ví dụ `src/pages/Admin/VoucherReportPage.jsx`, dùng `OpsPage` cho màn vận hành. Thêm style đặc thù vào `src/styles/ops/` khi bộ component dùng chung chưa đủ.
- [ ] **2. Khai báo route** trong [AnimatedRoutes.jsx](../../../frontend/src/AnimatedRoutes.jsx), đặt trong đúng nhóm và guard:

  | Ai được vào | Đặt dưới | Guard |
  | --- | --- | --- |
  | Mọi người | Nhóm `<Route element={<Layout />}>` | Không |
  | Người đã đăng nhập | Nhóm `Layout` | `PrivateRoute` |
  | STAFF, ADMIN | `/staff` | `StaffRoute` (đã bọc ở route cha) |
  | ADMIN, MANAGER | `/admin` và `/manager` | `AdminRoute` (đã bọc ở route cha) |
  | Chỉ ADMIN | `/admin` | Bọc thêm `AdminOnlyRoute`, và chuyển `/manager/<trang>` về `/manager` |

  Trang dùng cho cả ADMIN và MANAGER phải khai báo ở **cả** `/admin` và `/manager`, vì MANAGER mở `/admin/*` sẽ bị chuyển sang `/manager/*`.

- [ ] **3. Thêm vào menu** qua `components/Ops/opsNav.js` cho màn vận hành hoặc `Navbar.jsx` cho trang khách.
- [ ] **4. Gọi API** qua hàm trong [src/api/index.js](../../../frontend/src/api/index.js), đọc `res.data.result`. Thiếu hàm thì thêm vào đó trước.
- [ ] **5. Xử lý trạng thái:**
  - Đang tải: `StateBlock state="loading"` hoặc `Skeleton` ở trang khách.
  - Lỗi: thông báo kèm nút thử lại. Lỗi thao tác dùng `toast.error`.
  - Rỗng: `StateBlock` hoặc `EmptyState` ở trang khách.
  - Nhiều lần gọi chồng nhau: chỉ nhận phản hồi của lần gọi mới nhất.
- [ ] **6. Dùng thành phần có sẵn:** dùng `DataTable` trong `OpsPanel flush`, `FilterBar` cho tìm và lọc, `Field` cho form, `OpsDialog` hoặc `OpsDrawer` cho lớp nổi. Icon lấy từ `CinemaIcons.jsx`. CSS vận hành dùng class `o-*`, kiểm tra bằng `npm run lint:ops`. Danh sách ở [frontend.md](../../03-architecture/frontend.md#thành-phần-dùng-chung).
- [ ] **7. Dùng token màu** `var(--...)`, không thêm mã hex. Thời gian dùng `src/utils/cinemaTime.js`.
- [ ] **8. Kiểm tra quyền:** đăng nhập bằng từng role được phép và một role không được phép. Nhớ rằng guard chỉ để điều hướng, backend phải tự chặn.
- [ ] **9. Kiểm tra:** `npm run lint`, `npm run build`. Hàm thuần mới nên có test trong `frontend/tests/`.
- [ ] **10. Tài liệu:** thêm trang vào bảng màn hình ở [frontend.md](../../03-architecture/frontend.md#màn-hình-chính) và bảng route nếu có route mới.

## Khung trang mẫu

```jsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { reportsApi } from '../../api';
import EmptyState from '../../components/Common/EmptyState';
import Button from '../../components/Common/Button';
import { RefreshIcon } from '../../components/Common/CinemaIcons';

export default function VoucherReportPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const current = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const res = await reportsApi.getVoucherReport();
      if (current === requestId.current) setRows(res.data.result || []);
    } catch (err) {
      if (current === requestId.current) {
        setError(err.response?.data?.message || 'Không tải được báo cáo');
      }
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (error) {
    return (
      <div className="admin-notice">
        {error}
        <Button variant="secondary" size="sm" onClick={load}><RefreshIcon /> Thử lại</Button>
      </div>
    );
  }
  if (rows.length === 0) {
    return <EmptyState title="Chưa có dữ liệu" message="Chưa có mã nào được dùng." showButton={false} />;
  }

  return <table className="admin-table">{/* ... */}</table>;
}
```

`EmptyState` mặc định hiện nút "Khám phá ngay" dẫn tới `/movies`, nên trang quản trị truyền `showButton={false}`. `reportsApi.getVoucherReport` chỉ là ví dụ, chưa tồn tại. Icon chưa có thì thêm export vào `CinemaIcons.jsx`.

```jsx
// AnimatedRoutes.jsx, trong cả nhóm /admin và /manager
<Route path="vouchers-report" element={<PageWrapper><VoucherReportPage /></PageWrapper>} />
```
