# Quy trình Git

> Đối chiếu mã nguồn ngày 2026-11-25, commit `4961b4d`.

Remote: `git@github.com:tienloveit/TTCS_N9_D23CN.git`. Quy tắc Git bắt buộc cho AI agent nằm trong [AGENTS.md](../../AGENTS.md#quy-tắc-git).

## Nhánh

| Nhánh | Tên rút gọn được chấp nhận | Vai trò | Tách từ | Merge về |
| --- | --- | --- | --- | --- |
| `main` | | Chỉ chứa bản ổn định, sẵn sàng triển khai production | | |
| `dev` | | Nhánh tích hợp các tính năng đang phát triển (trong Git Flow gọi là `develop`) | `main` (một lần) | |
| `feature/<tên>` | `feat/<tên>` | Tính năng mới | `dev` | `dev` |
| `bugfix/<tên>` | `fix/<tên>` | Sửa lỗi trong quá trình phát triển | `dev` | `dev` |
| `release/<x.y.z>` | | Chuẩn bị phát hành: sửa lỗi nhỏ, cập nhật phiên bản, tài liệu | `dev` | `main` và `dev` |
| `hotfix/<tên>` | | Sửa lỗi khẩn cấp trên production | `main` | `main` và `dev` |

Việc không phải tính năng hay sửa lỗi thì đặt tiền tố bằng `type` commit tương ứng: `chore/`, `docs/`, `ci/`, `build/`, `refactor/`, `perf/`, `test/`. Các nhánh này tách từ `dev` và merge về `dev`.

Tên đầy đủ và tên rút gọn có giá trị như nhau, chọn một kiểu là được. Không đổi tên nhánh đã có trên remote chỉ để đổi kiểu tiền tố. Mọi nhánh trừ `main` và `dev` là nhánh ngắn hạn, phải xóa sau khi merge.

## Đặt tên

- Tên nhánh viết bằng tiếng Anh, chữ thường, kebab-case, mô tả việc làm: `feature/counter-refund-dialog`, `feat/ops-design-system`, `fix/seat-hold-expiry`, `chore/jwt-filter-and-ui-cleanup`, `hotfix/vnpay-return-signature`, `release/1.1.0`.
- Commit theo [Conventional Commits](https://www.conventionalcommits.org/), mô tả tiếng Anh ở thể mệnh lệnh, viết thường:

```text
<type>(<scope>): <mô tả ngắn>
```

| `type` | Khi nào |
| --- | --- |
| `feat` | Chức năng mới |
| `fix` | Sửa lỗi |
| `refactor` | Đổi cấu trúc code, không đổi hành vi |
| `perf` | Cải thiện hiệu năng, không đổi hành vi |
| `test` | Thêm hoặc sửa test |
| `docs` | Chỉ tài liệu |
| `build` | Hệ thống build, phụ thuộc (`pom.xml`, `package.json`) |
| `ci` | Cấu hình CI (`.github/workflows`) |
| `chore` | Việc khác không đổi mã chạy: cấu hình công cụ, script, dọn dẹp |

`scope` thường gặp: `backend`, `frontend`, `auth`, `booking`, `admin`. Có thể bỏ scope khi thay đổi trải rộng. Ví dụ từ lịch sử:

```text
fix(auth): end the refresh session on logout
perf(backend): make many-to-one associations lazy with batch fetching
ci(frontend): run lint, operations rules, tests and build on pull requests
feat: paginate the booking management list on the server
```

Mỗi commit là một thay đổi có nghĩa và build được. Không gộp sửa định dạng hàng loạt với thay đổi nghiệp vụ. Không commit `.env`, secrets, credentials, `target/`, `dist/`, `node_modules/`, `uploads/` (đã có trong `.gitignore`).

## Làm một thay đổi

1. Đồng bộ nhánh nguồn rồi tách nhánh:

   ```powershell
   git switch dev
   git pull
   git switch -c feature/ten-chuc-nang
   ```

2. Không commit hoặc push trực tiếp vào `main` và `dev`. Không force-push lên hai nhánh này. Mọi thay đổi vào đó đi qua pull request.
3. Trước khi mở pull request, chạy lint, build và test liên quan theo [testing.md](testing.md).
4. Đẩy nhánh và mở pull request vào `dev` (`hotfix/*` và `release/*` xem bên dưới). GitHub điền sẵn mô tả theo [pull_request_template.md](../../.github/pull_request_template.md): làm gì, vì sao, cách kiểm tra, ảnh chụp nếu đổi giao diện, migration và biến môi trường mới, checklist điều kiện merge.
5. Ít nhất một thành viên khác review. Người review chạy thử luồng bị ảnh hưởng, không chỉ đọc diff. Sửa theo góp ý bằng commit mới trên cùng nhánh.
6. Người mở pull request merge sau khi CI xanh và được duyệt. Lịch sử dùng merge commit.
7. Xóa nhánh trên remote sau khi merge, rồi dọn ở máy:

   ```powershell
   git switch dev
   git pull
   git branch -d feature/ten-chuc-nang
   git fetch --prune
   ```

### Điều kiện merge

Chỉ merge khi CI thành công và đã có review duyệt. CI `frontend` ([frontend.yml](../../.github/workflows/frontend.yml)) chạy `npm run lint` (gồm `lint:ops`), test frontend thường và với `TZ=UTC`, và `npm run build` cho pull request đổi `frontend/`. Backend chưa có CI, nên chạy các kiểm tra sau ở máy trước khi merge:

- [ ] `.\mvnw.cmd test` pass trong `backend/` (gồm Spotless).
- [ ] `npm run lint`, `npm run build` và `node --experimental-vm-modules --test tests/*.test.mjs` pass trong `frontend/`.
- [ ] Có migration mới thì đã khởi động thử trên database rỗng và bản sao có dữ liệu.
- [ ] Đổi API thì đã đối chiếu controller, DTO, mapper, client Axios và các màn hình dùng dữ liệu đó, và cập nhật [endpoints.md](../04-api/endpoints.md).
- [ ] Đổi quyền thì đã thử với từng role và chi nhánh liên quan.
- [ ] Tài liệu trong `docs/` đã cập nhật cùng thay đổi.
- [ ] Không có bí mật trong diff.

## Phát hành

Phiên bản theo [Semantic Versioning](https://semver.org/) `MAJOR.MINOR.PATCH`: tăng `MAJOR` khi phá vỡ hợp đồng API hoặc dữ liệu, `MINOR` khi thêm chức năng, `PATCH` khi chỉ sửa lỗi. Mỗi bản phát hành có một annotated tag `vX.Y.Z` trên `main`. Tag `v1.0` có từ trước quy ước này và được giữ nguyên. Bản kế tiếp đánh số từ `v1.1.0`.

### Release

1. Tách `release/<x.y.z>` từ `dev` mới nhất. Trên nhánh này chỉ sửa lỗi, cập nhật phiên bản và tài liệu, không thêm chức năng.
2. Chạy lại toàn bộ kiểm tra và demo các luồng chính theo [test-cases](../09-report/test-cases/).
3. Mở pull request `release/<x.y.z>` vào `main`. Sau khi merge, gắn tag trên `main`:

   ```powershell
   git switch main
   git pull
   git tag -a v1.1.0 -m "Release 1.1.0"
   git push origin v1.1.0
   ```

4. Mở pull request `release/<x.y.z>` vào `dev` để đưa các sửa lỗi về, rồi xóa nhánh release.

### Hotfix

1. Tách `hotfix/<tên>` từ `main` mới nhất.
2. Mở pull request vào `main`. Sau khi merge, gắn tag tăng `PATCH`, ví dụ `v1.1.1`.
3. Mở pull request `hotfix/<tên>` vào `dev` (hoặc vào `release/*` đang mở, nếu có), rồi xóa nhánh hotfix.
