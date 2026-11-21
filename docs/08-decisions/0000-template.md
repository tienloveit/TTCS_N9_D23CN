# ADR-XXXX: <Tên quyết định>

- **Trạng thái:** Đề xuất | Chấp nhận | Thay thế bởi ADR-YYYY (kèm link) | Bỏ
- **Ngày:** YYYY-MM-DD
- **Người quyết định:** <tên hoặc nhóm>
- **Liên quan:** <commit, PR, file code, ADR khác>

## Bối cảnh

Vấn đề cần giải quyết là gì? Ràng buộc nào đang có (nghiệp vụ, kỹ thuật, thời gian, kỹ năng nhóm)? Nếu không quyết định thì chuyện gì xảy ra?

## Quyết định

Chọn làm gì, viết ở thể khẳng định: "Chúng ta lưu ... trong ...". Đủ cụ thể để người đọc biết code phải trông thế nào.

## Phương án đã cân nhắc

| Phương án | Ưu điểm | Nhược điểm |
| --- | --- | --- |
| A (đã chọn) | | |
| B | | |
| C | | |

## Hệ quả

- Điều gì trở nên dễ hơn.
- Điều gì trở nên khó hơn, rủi ro nào được chấp nhận.
- Việc phải làm theo (migration, cập nhật tài liệu, test).

---

Quy tắc:

- Đặt tên file `NNNN-ten-ngan-bang-kebab-case.md`, số tăng dần, và thêm một dòng vào bảng ADR trong [docs/README.md](../README.md#08-decisions--lý-do-chọn-giải-pháp-adr).
- ADR đã chấp nhận thì không sửa nội dung. Chỉ được sửa dòng **Trạng thái** khi có ADR mới thay thế.
- Đổi quyết định: viết ADR mới, ghi ADR cũ trong mục "Liên quan", đổi trạng thái ADR cũ thành "Thay thế bởi ADR-YYYY".
