---
name: ops-ui
description: Use when creating, changing or reviewing any screen, component or CSS for /staff, /manager or /admin (frontend/src/pages/Admin, pages/Staff, components/Ops, styles/ops). Enforces the "Bảng suất chiếu" operations design system and takes precedence over generic design skills such as ui-ux-pro-max, design-system and frontend-design.
---

# Dựng và review màn vận hành

Luật nằm trong `docs/03-architecture/ops-design-system.md`. Skill này chỉ là quy trình, không chép lại luật.

## Khi dựng hoặc sửa màn

1. **Đọc luật.** Nếu `docs/03-architecture/ops-design-system.md` chưa có trong ngữ cảnh, đọc toàn bộ bằng Read trước khi sửa.
2. **Chọn thành phần** theo bảng "Thành phần" của tài liệu. Chỉ dùng `components/Ops`. Thiếu thành phần thì dừng lại hỏi người dùng, không tự dựng trong trang hay ngoài `components/Ops`.
3. **Màn mới** bắt đầu từ "Khung trang mẫu" trong `docs/07-development/how-to/add-page.md`, rồi làm theo checklist của file đó (route ở cả `/admin` và `/manager`, menu trong `opsNav.js`).
4. **Kiểm tra máy.** Sau khi sửa, chạy trong `frontend/`:
   - `npm run lint:ops`
   - `npm run lint`
   Sửa mọi lỗi theo đúng thông báo. Không nới luật, không sửa `scripts/ops-rules.mjs` để qua lint.
5. **Checklist review.** Đi qua từng mục của `## Checklist review` trong tài liệu. Trong câu trả lời, ghi kết quả từng mục: đạt, không áp dụng, hoặc chưa đạt kèm lý do.
6. **Không gọi skill thiết kế chung** (`ui-ux-pro-max`, `design-system`, `frontend-design`) cho khu này. Tài liệu design system vận hành thắng các skill đó.

## Khi được nhờ review

1. Chạy bước 4 trên code hiện tại.
2. Đi qua bước 5 trên diff.
3. Báo từng vi phạm theo dạng `file:dòng`, kèm mục luật hoặc mục checklist bị vi phạm.

## Khi luật cần đổi

Không tự đổi. Hỏi người dùng trước. Nếu được đồng ý, sửa tài liệu, code và `ops-rules.mjs` cùng test trong một commit, theo mục "Thay đổi design system" của tài liệu.
