# ADR-0007: Tách công nghệ phòng và định dạng chiếu

> Đối chiếu mã nguồn ngày 2026-11-21, commit `4319c45`.

- **Trạng thái:** Chấp nhận
- **Ngày:** 2026-11-21 (ghi lại quyết định áp dụng từ script `20261111_screening_format_room_technology.sql`)
- **Liên quan:** `Room.roomTechnology`, `Showtime.screeningFormat`, `RoomTechnology`, `ScreeningFormat`, `frontend/src/utils/cinemaFormats.js`; [glossary.md](../02-domain/glossary.md#vì-sao-tách-công-nghệ-phòng-và-định-dạng-chiếu)

## Bối cảnh

Trước đây phòng có một thuộc tính loại phòng gồm cả `2D`, `3D`, `IMAX`, `4DX`. Muốn chiếu bản 3D phải xếp vào phòng "3D", phòng IMAX không ghi được suất đang chiếu bản 2D hay 3D, và khách không biết suất IMAX là 2D hay 3D.

## Quyết định

- `Room.roomTechnology` mô tả thiết bị cố định của phòng: `STANDARD`, `IMAX`, `FOUR_DX`, `SCREEN_X`, `GOLD_CLASS`.
- `Showtime.screeningFormat` mô tả bản phim của từng suất: `TWO_D`, `THREE_D`.
- Giao diện ghép hai thuộc tính khi hiển thị (ví dụ "IMAX 3D") qua `cinemaFormats.js`.
- Dữ liệu cũ: phòng 2D/3D thành `STANDARD`, định dạng 3D chuyển sang suất chiếu.

## Phương án đã cân nhắc

| Phương án | Ưu điểm | Nhược điểm |
| --- | --- | --- |
| Hai thuộc tính độc lập (đã chọn) | Đúng thực tế. Một phòng chiếu được cả 2D và 3D. | Phải cập nhật màn tạo suất và bộ lọc |
| Giữ một thuộc tính trên phòng | Không phải migration | Không biểu diễn được suất IMAX 3D |
| Một thuộc tính tổ hợp trên suất (`IMAX_3D`...) | Một trường | Số giá trị tăng theo cấp số nhân, lặp thông tin của phòng |

## Hệ quả

- Tạo suất phải chọn định dạng chiếu, mặc định `TWO_D`.
- Giá vé hiện không phụ thuộc công nghệ hay định dạng, mà đặt riêng cho từng suất ở `ticketPrice`.
- Suất IMAX/4DX từ dữ liệu cũ cần kiểm tra lại định dạng sau migration.
