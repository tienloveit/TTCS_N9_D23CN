# Yêu cầu môi trường

> Đối chiếu mã nguồn ngày 2026-11-21, commit `4319c45`.

## Phần mềm cần có

| Thành phần | Phiên bản | Kiểm tra | Ghi chú |
| --- | --- | --- | --- |
| JDK | 21 | `java -version`, `javac -version` | `JAVA_HOME` phải trỏ tới JDK 21. Không cần cài Maven vì backend có Maven Wrapper (`mvnw`, `mvnw.cmd`). |
| Node.js và npm | 20.19+ (dòng 20) hoặc 22.12+ | `node -v`, `npm -v` | Vite 8 yêu cầu mức phiên bản này. Node còn được dùng để chạy test frontend và `backend/scripts/demo-seed.mjs`. |
| MySQL | 8.0.16 trở lên | `mysql --version` | Migration dùng ràng buộc `CHECK` và `information_schema.TABLE_CONSTRAINTS`, chỉ có hiệu lực từ 8.0.16. |
| Redis | 6 trở lên, khuyến nghị 7 | `redis-cli ping` trả `PONG` | Dùng cho JWT, OTP và giữ ghế. Backend gọi Lua script và `SET NX` có TTL. |
| Git | bản bất kỳ | `git --version` | Clone đầy đủ lịch sử, không dùng `--depth 1`. Spotless so sánh với commit baseline `bf27d26c`, nếu thiếu commit này thì Maven dừng ở bước `validate`. |

Không bắt buộc:

- MySQL client (`mysql`) khi chạy `demo-seed.mjs`, vì script ghi một phần dữ liệu bằng SQL.
- Docker, nếu không muốn cài MySQL và Redis trực tiếp.
- Tài khoản VNPay sandbox, Google Cloud và Gmail khi cần thử thanh toán, đăng nhập Google và gửi mail. Xem [06-integrations](../06-integrations/).

## Cài đặt gợi ý

### Windows

```powershell
winget install EclipseAdoptium.Temurin.21.JDK
winget install OpenJS.NodeJS.LTS
winget install Oracle.MySQL
```

Redis không có bản chính thức cho Windows. Chạy Redis bằng Docker (mục dưới) hoặc trong WSL (`sudo apt install redis-server`).

### macOS

```bash
brew install openjdk@21 node mysql redis
brew services start mysql
brew services start redis
```

### Dùng Docker cho MySQL và Redis

Hai lệnh dưới chỉ mở cổng trên `127.0.0.1`. Thay `<mat_khau>` bằng mật khẩu của bạn và điền cùng giá trị vào `SPRING_DATASOURCE_PASSWORD` (xem [configuration.md](configuration.md)).

```powershell
docker run -d --name movieptit-mysql -p 127.0.0.1:3306:3306 `
  -e MYSQL_ROOT_PASSWORD=<mat_khau> -e MYSQL_DATABASE=cinema `
  mysql:8.4 --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci

docker run -d --name movieptit-redis -p 127.0.0.1:6379:6379 redis:7
docker exec movieptit-redis redis-cli ping
```

Trên macOS/Linux, thay dấu `` ` `` cuối dòng bằng `\`.

## Bước tiếp theo

Điền biến môi trường theo [configuration.md](configuration.md), rồi chạy theo [run-local.md](run-local.md).
