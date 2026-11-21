# Cập nhật ghế realtime

> Đối chiếu mã nguồn ngày 2026-11-21, commit `4319c45`.

Khi một ghế đổi trạng thái, backend phát sự kiện tới mọi trình duyệt đang mở sơ đồ ghế của suất đó, gồm cả trang khách và màn bán vé tại quầy. Sự kiện chỉ để cập nhật giao diện. Backend vẫn kiểm tra lại ghế khi tạo đơn.

## Kết nối

| Thành phần | Giá trị | Nơi cấu hình |
| --- | --- | --- |
| Endpoint SockJS | `${VITE_API_BASE_URL}/ws`, mặc định `http://localhost:8081/api/ws` | `WebSocketConfig.registerStompEndpoints` |
| Origin được phép | Mọi origin (`setAllowedOriginPatterns("*")`), cấu hình riêng với CORS của REST | `WebSocketConfig` |
| Xác thực | Không. `/ws/**` là route công khai, client không gửi token. | `SecurityConfig` |
| Broker | Simple broker trong bộ nhớ, prefix `/topic` | `configureMessageBroker` |
| Prefix gửi lên server | `/app`. Hiện không có `@MessageMapping` nào, client chỉ đăng ký nhận. | |
| Topic ghế | `/topic/showtime/{showtimeId}/seats` | |

Simple broker chạy trong tiến trình backend. Nếu chạy nhiều bản backend, client chỉ nhận sự kiện từ bản mà nó kết nối. Muốn mở rộng cần chuyển sang broker ngoài (RabbitMQ, ActiveMQ).

## Payload

`SeatStatusEvent`:

```json
{ "seatId": 152, "status": "HOLDING" }
```

| Trường | Kiểu | Ý nghĩa |
| --- | --- | --- |
| `seatId` | number | ID ghế (`seats.id`), khớp `TicketResponse.seatId` |
| `status` | string | `AVAILABLE`, `HOLDING` hoặc `BOOKED` |

Payload không có mã đơn hay thông tin khách.

## Khi nào server phát

Mọi sự kiện được phát **sau khi transaction commit** (`BookingTransactionEffects.afterCommit`), nên client không bao giờ thấy trạng thái bị rollback. Lỗi khi phát chỉ ghi log WARN.

| Sự kiện nghiệp vụ | `status` | Nơi phát |
| --- | --- | --- |
| Tạo đơn online, hoặc đơn quầy chọn VNPay | `HOLDING` | `BookingCheckoutService.assignTickets` |
| Đơn quầy thu tiền mặt | `BOOKED` | `BookingCheckoutService.assignTickets` |
| Thanh toán VNPay thành công | `BOOKED` | `VnpayService.confirmPaid` |
| Hủy đơn, job hết hạn, VNPay thất bại, thanh toán trễ, hoàn tiền thành công | `AVAILABLE` | `BookingReleaseService.releaseSeats` |

Khóa Redis hết TTL tự nhiên **không** phát sự kiện. Ghế chỉ được phát `AVAILABLE` khi job dọn đơn hết hạn chạy, tối đa khoảng 2 phút sau `expiresAt`.

## Client xử lý

Hai trang dùng cùng cách: [SeatSelectPage.jsx](../../frontend/src/pages/SeatSelect/SeatSelectPage.jsx) và [StaffBookingPage.jsx](../../frontend/src/pages/Staff/booking/StaffBookingPage.jsx).

1. Tải sơ đồ ban đầu bằng `GET /ticket/showtime/{showtimeId}`. Mỗi vé có `displayStatus` đã gộp DB và Redis.
2. Tạo `Client` của `@stomp/stompjs` với `webSocketFactory: () => new SockJS(...)`, `reconnectDelay: 5000`.
3. Trong `onConnect`, đăng ký topic của suất. Mỗi tin nhắn cập nhật `displayStatus` của vé có `seatId` tương ứng.
4. Nếu `status` khác `AVAILABLE` và ghế đó đang được chọn, bỏ ghế khỏi lựa chọn. Màn quầy hiện thêm cảnh báo.
5. Rời trang hoặc đổi suất thì `client.deactivate()`.

```js
const client = new Client({
  webSocketFactory: () => new SockJS(`${API_BASE_URL}/ws`),
  reconnectDelay: 5000,
  onConnect: () => {
    client.subscribe(`/topic/showtime/${showtimeId}/seats`, (message) => {
      const { seatId, status } = JSON.parse(message.body);
      // cập nhật displayStatus, bỏ ghế khỏi lựa chọn nếu status !== 'AVAILABLE'
    });
  },
});
client.activate();
```

## Mất kết nối

- SockJS tự thử lại mỗi 5 giây và đăng ký lại topic trong `onConnect`.
- Broker không lưu lịch sử. Sự kiện phát ra trong lúc mất kết nối bị mất, và trang hiện không tải lại sơ đồ sau khi kết nối lại, nên sơ đồ có thể cũ cho tới khi người dùng tải lại trang.
- Không có hậu quả về dữ liệu: nếu người dùng chọn một ghế thực ra đã bị giữ, `POST /booking` trả `TICKET_NOT_AVAILABLE`.
- Cải tiến nên làm khi sửa trang: gọi lại `GET /ticket/showtime/{id}` trong `onConnect` từ lần kết nối thứ hai trở đi.

Kiểm tra kết nối: tab Network của DevTools có request `.../api/ws/info` trả 200 và một kết nối WebSocket hoặc xhr-streaming. Nếu `info` lỗi, kiểm tra `VITE_API_BASE_URL` và backend có đang chạy.
