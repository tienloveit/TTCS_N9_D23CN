# Quy trình Git

> Đối chiếu mã nguồn ngày 2026-11-21, commit `4319c45`.

Remote: `git@github.com:tienloveit/TTCS_N9_D23CN.git`.

## Nhánh

| Nhánh | Vai trò | Ai đẩy vào |
| --- | --- | --- |
| `main` | Bản ổn định, dùng để nộp và demo | Chỉ merge từ `dev` khi tới mốc |
| `dev` | Nhánh tích hợp hằng ngày | Merge từ nhánh tính năng qua pull request |
| `feature/<tên>` | Chức năng mới | Một người hoặc một nhóm nhỏ |
| `fix/<tên>` | Sửa lỗi | |
| `chore/<tên>` | Cấu hình, dọn dẹp, tài liệu | |

Ví dụ trong repo: `feature/manager`, `fix/booking-module-hardening`, `chore/jwt-filter-and-ui-cleanup`. Tên nhánh viết thường, kebab-case, mô tả việc làm.

Tạo nhánh mới từ `dev` mới nhất:

```powershell
git switch dev
git pull
git switch -c feature/ten-chuc-nang
```

Không commit thẳng lên `main`. Không force-push lên `main` hay `dev`.

## Commit

Dùng Conventional Commits, mô tả tiếng Anh ở thể mệnh lệnh, viết thường:

```text
<type>(<scope>): <mô tả ngắn>
```

| `type` | Khi nào |
| --- | --- |
| `feat` | Chức năng mới |
| `fix` | Sửa lỗi |
| `perf` | Cải thiện hiệu năng, không đổi hành vi |
| `refactor` | Đổi cấu trúc code, không đổi hành vi |
| `test` | Thêm hoặc sửa test |
| `docs` | Chỉ tài liệu |
| `chore` | Cấu hình, script, phụ thuộc |

`scope` thường gặp: `backend`, `frontend`, `auth`, `booking`, `admin`. Có thể bỏ scope khi thay đổi trải rộng.

Ví dụ từ lịch sử:

```text
fix(auth): end the refresh session on logout
perf(backend): make many-to-one associations lazy with batch fetching
feat(frontend): redesign staff dashboard and counter booking steps
feat: paginate the booking management list on the server
```

Mỗi commit là một thay đổi có nghĩa và build được. Không gộp sửa định dạng hàng loạt với thay đổi nghiệp vụ. Không commit `.env`, `target/`, `dist/`, `node_modules/`, thư mục `uploads/` (đã có trong `.gitignore`).

## Pull request

1. Đẩy nhánh lên remote và mở pull request vào `dev`.
2. Mô tả: làm gì, vì sao, cách kiểm tra, ảnh chụp nếu đổi giao diện. Ghi rõ nếu có migration mới hay biến môi trường mới.
3. Ít nhất một thành viên khác review. Người review chạy thử luồng bị ảnh hưởng, không chỉ đọc diff.
4. Sửa theo góp ý bằng commit mới trên cùng nhánh.
5. Người mở PR merge sau khi được duyệt. Lịch sử hiện dùng merge commit.

### Điều kiện merge

Repo chưa có CI, nên chạy các kiểm tra sau ở máy trước khi merge:

- [ ] `.\mvnw.cmd test` pass trong `backend/` (gồm Spotless).
- [ ] `npm run lint`, `npm run build` và `node --experimental-vm-modules --test tests/*.test.mjs` pass trong `frontend/`.
- [ ] Có migration mới thì đã khởi động thử trên database rỗng và bản sao có dữ liệu.
- [ ] Đổi API thì đã đối chiếu controller, DTO, mapper, client Axios và các màn hình dùng dữ liệu đó, và cập nhật [endpoints.md](../04-api/endpoints.md).
- [ ] Đổi quyền thì đã thử với từng role và chi nhánh liên quan.
- [ ] Tài liệu trong `docs/` đã cập nhật cùng thay đổi.
- [ ] Không có bí mật trong diff.

Chi tiết từng lệnh ở [testing.md](testing.md).

## Đưa lên `main`

Khi `dev` đạt một mốc (nộp báo cáo, demo), mở PR từ `dev` vào `main`, chạy lại toàn bộ kiểm tra và demo các luồng chính theo [test-cases](../09-report/test-cases/). Gắn tag nếu cần đánh dấu bản nộp, ví dụ `git tag -a v1.0-bao-cao -m "Bản nộp báo cáo"`.
