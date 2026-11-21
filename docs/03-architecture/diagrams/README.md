# Nguồn sơ đồ

> Đối chiếu mã nguồn ngày 2026-11-21, commit `4319c45`.

Sơ đồ viết bằng [Mermaid](https://mermaid.js.org/). Mỗi file `.mmd` ở đây là bản sao của một khối ` ```mermaid ` trong tài liệu, tách ra để xuất ảnh cho báo cáo và slide. GitHub và VS Code (với extension Mermaid) hiển thị trực tiếp các khối trong file `.md`.

| File nguồn | Hiển thị trong | Ảnh xuất |
| --- | --- | --- |
| `system-context.mmd` | [03-architecture/overview.md](../overview.md#sơ-đồ-khối) | `system-context.png` |
| `use-case.mmd` | [02-domain/overview.md](../../02-domain/overview.md#người-dùng) | `use-case.png` |
| `booking-state.mmd` | [booking-lifecycle.md](../../02-domain/booking-lifecycle.md#booking) | `booking-state.png` |
| `ticket-state.mmd` | [booking-lifecycle.md](../../02-domain/booking-lifecycle.md#ticket) | `ticket-state.png` |
| `payment-state.mmd` | [booking-lifecycle.md](../../02-domain/booking-lifecycle.md#payment) | `payment-state.png` |
| `booking-online-sequence.mmd` | [booking-lifecycle.md](../../02-domain/booking-lifecycle.md#đặt-vé-online) | `booking-online-sequence.png` |
| `refund-sequence.mmd` | [payment-refund.md](../../02-domain/payment-refund.md#hoàn-qua-vnpay) | `refund-sequence.png` |
| `erd.mmd` | [05-database/erd.md](../../05-database/erd.md) | `erd.png` |

## Sửa sơ đồ

Sửa khối Mermaid trong file `.md` trước, rồi chép đúng nội dung khối đó sang file `.mmd` tương ứng trong cùng commit. Hai bản phải giống nhau từng dòng. Kiểm tra nhanh với ERD:

```bash
diff <(awk '/^```mermaid$/{f=1;next} /^```$/{if(f){exit}} f' docs/05-database/erd.md) docs/03-architecture/diagrams/erd.mmd
```

## Xuất ảnh PNG

Dùng Mermaid CLI. Lần đầu chạy, `npx` tải Chromium nên mất vài phút.

```powershell
cd docs/03-architecture/diagrams
npx -y @mermaid-js/mermaid-cli -i erd.mmd -o erd.png -w 2400 -b white
```

Xuất tất cả:

```powershell
Get-ChildItem *.mmd | ForEach-Object { npx -y @mermaid-js/mermaid-cli -i $_.Name -o ($_.BaseName + ".png") -w 2400 -b white }
```

Cách không cần cài đặt: dán nội dung `.mmd` vào [mermaid.live](https://mermaid.live), tải PNG hoặc SVG.

Ảnh `.png` đặt cùng thư mục, cùng tên với file nguồn, và commit cùng lúc với nguồn. Báo cáo và slide dùng ảnh ở đây, không chụp màn hình sơ đồ.

Sơ đồ vẽ bằng draw.io thì lưu file `.drawio` cùng thư mục và xuất `.png` cùng tên.
