# Thêm một trang frontend

> Đối chiếu mã nguồn ngày 2026-11-24, commit `ef70b10`.

Ví dụ: thêm trang `/manager/vouchers-report` cho ADMIN và MANAGER.

## Checklist

- [ ] **1. Tạo file trang** trong `src/pages/<Khu>/`, ví dụ `src/pages/Admin/VoucherReportPage.jsx`, dùng `OpsPage` cho màn vận hành. Khi bộ component dùng chung chưa đủ, thêm file style vào `src/styles/ops/` và `@import` nó trong `src/components/Ops/ops.css`, cạnh các import hiện có. Không import CSS vận hành trong trang.
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
import { useEffect, useState } from 'react';
import { reportsApi } from '../../api';
import { Code, DataTable, Money, OpsButton, OpsPage, OpsPanel } from '../../components/Ops';
import { RefreshIcon } from '../../components/Common/CinemaIcons';

const columns = [
  { key: 'code', header: 'Mã khuyến mãi', render: (row) => <Code>{row.code}</Code> },
  { key: 'uses', header: 'Lượt dùng', align: 'end', render: (row) => row.usageCount },
  { key: 'discount', header: 'Tổng giảm', align: 'end', render: (row) => <Money value={row.totalDiscount} /> },
];

export default function VoucherReportPage() {
  const [rows, setRows] = useState([]);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let active = true;
    reportsApi
      .getVoucherReport()
      .then((res) => {
        if (!active) return;
        setRows(res.data.result || []);
        setState('ready');
      })
      .catch((err) => {
        if (!active) return;
        setError(err.response?.data?.message || 'Không tải được báo cáo khuyến mãi');
        setState('error');
      });
    return () => {
      active = false;
    };
  }, [reloadCount]);

  const refresh = () => {
    setState('loading');
    setReloadCount((count) => count + 1);
  };

  return (
    <OpsPage
      title="Báo cáo khuyến mãi"
      description="Lượt dùng và số tiền đã giảm của từng mã."
      actions={(
        <OpsButton variant="ghost" icon={<RefreshIcon size={16} />} onClick={refresh} disabled={state === 'loading'}>
          Làm mới
        </OpsButton>
      )}
    >
      <OpsPanel flush title="Mã đã dùng">
        <DataTable
          caption="Báo cáo khuyến mãi"
          columns={columns}
          rows={rows}
          rowKey={(row) => row.code}
          state={state}
          error={error}
          onRetry={refresh}
          stackOnMobile
          empty={{ title: 'Chưa có mã nào được dùng', description: 'Số liệu hiện ở đây khi khách áp mã thành công.' }}
        />
      </OpsPanel>
    </OpsPage>
  );
}
```

- `DataTable` tự hiển thị ba trạng thái qua `state` (`'loading' | 'error' | 'ready'`), `error`, `onRetry` và `empty` (`{ title, description, action }`). Không tự viết nhánh tải, lỗi, rỗng.
- Tải lại bằng cách tăng `reloadCount`. Cờ `active` bỏ phản hồi của lần gọi cũ. `setState('loading')` đặt trong handler, không gọi đồng bộ trong effect, để không vướng luật `react-hooks/set-state-in-effect`.
- Tiền dùng `Money`, mã dùng `Code`, ngày giờ dùng `src/utils/cinemaTime.js`.
- Cần lớp nổi thì dùng `OpsDialog`, `OpsDrawer` hoặc `OpsConfirm`, không dùng `ConfirmDialog` của khu khách.

`reportsApi.getVoucherReport` chỉ là ví dụ, chưa tồn tại. Icon chưa có thì thêm export vào `CinemaIcons.jsx`.

Khai báo route ở **cả** nhóm `/admin` và `/manager`. Route vận hành không bọc `PageWrapper`:

```jsx
// AnimatedRoutes.jsx
<Route path="vouchers-report" element={<VoucherReportPage />} />
```
