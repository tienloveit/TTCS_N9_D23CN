# Hướng dẫn AI cho MoviePTIT

Áp dụng cho toàn repository. Đọc [context dự án](CLAUDE.md) để nắm kiến trúc và hợp đồng liên tầng. Khi làm trong một khu vực, đọc thêm [hướng dẫn backend](backend/AGENTS.md) hoặc [hướng dẫn frontend](frontend/AGENTS.md). [README](README.md) chứa cách thiết lập và chạy ứng dụng.

- Giữ thay đổi trong phạm vi yêu cầu và bảo toàn thay đổi đang có trong working tree.
- Khi thay đổi API, đối chiếu controller, DTO, mapper, client Axios và các màn hình tiêu thụ dữ liệu. Kiểm tra đường chạy và quyền theo role/chi nhánh liên quan.
- Khi đổi setup, schema hoặc hành vi nghiệp vụ, cập nhật phần tương ứng trong README hoặc `CLAUDE.md` đúng phạm vi. Ghi quy tắc dành cho AI trong `AGENTS.md`.
- Dùng cấu hình mẫu để mô tả tên biến. Giữ thông tin bí mật ở môi trường cục bộ và kiểm tra phạm vi trước khi chạy thao tác xóa dữ liệu.

# Frontend UI & Icon System Rules (`frontend`)

- **Standard Icon Library (`lucide-react`)**: Always use **Lucide Icons** (`lucide-react`) via centralized exports in `frontend/src/components/Common/CinemaIcons.jsx` (or import from `lucide-react` and register in `CinemaIcons.jsx`).
- **NO AI-Generated Inline SVGs**: Never write raw `<svg>` / `<path>` elements inside React pages or components. Only `MoviePTITLogoIcon` in `CinemaIcons.jsx` may use custom brand SVG geometry.
- **NO Emoji Icons in UI**: Never use Unicode emojis (`🎬`, `🍿`, `🎟️`, `💳`, `🔔`, `⏳`, `✅`, `❌`, etc.) as icons for buttons, navigation items, status badges, headers, or action controls. Always use Lucide icon components.
