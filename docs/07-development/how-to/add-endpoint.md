# Thêm một endpoint

> Đối chiếu mã nguồn ngày 2026-11-25, nhánh `fix/backend-review-cleanup` (tách từ commit `7105c25`).

Ví dụ xuyên suốt: thêm `GET /booking/{id}/receipt` trả phiếu thanh toán của một đơn cho chủ đơn và nhân viên chi nhánh.

## Checklist

- [ ] **1. Xác định hợp đồng.** Method, path theo [quy ước đặt tên](../coding-conventions.md#cấu-trúc-và-đặt-tên), body, response, mã lỗi, ai được gọi và ở phạm vi nào.
- [ ] **2. DTO.** Request trong `dto/request`, response trong `dto/response`. Không trả entity.
- [ ] **3. Mapper.** Thêm method MapStruct trong `mapper/`, `@Mapping` cho trường lấy từ quan hệ.
- [ ] **4. Repository.** Nếu cần truy vấn mới, viết `@Query` JPQL hoặc method dẫn xuất. Ghi dữ liệu tranh chấp thì dùng biến thể `...ForUpdate`. Không dùng `Pageable` hay `findFirst` cùng `@EntityGraph` có collection.
- [ ] **5. Service.** Nghiệp vụ trong method `@Transactional` (đọc thì `readOnly = true`). Lấy người gọi bằng `CurrentUserProvider`, kiểm tra quyền chủ sở hữu và chi nhánh bằng `BookingAccessPolicy` hoặc hàm `require...Access` sẵn có. Dùng `Clock` được inject. Map sang DTO bên trong transaction.
- [ ] **6. Mã lỗi.** Dùng `ErrorCode` có sẵn nếu đúng nghĩa. Thêm mã mới với HTTP status phù hợp và thông báo tiếng Việt.
- [ ] **7. Controller.** Thêm method, bọc kết quả trong `ApiResponse`, `@Valid` cho body.
- [ ] **8. Phân quyền.**
  - `@PreAuthorize` cho role trên method của controller. Service không khai báo `@PreAuthorize` (`RoleCheckPlacementTest` kiểm).
  - Route GET dưới `/movie`, `/showtime`, `/ticket/showtime`, `/genre`, `/director`, `/food`, `/branch`, `/room` mặc định công khai ở `SecurityConfig`. Endpoint mới dưới các tiền tố này mà cần đăng nhập thì phải có `@PreAuthorize`.
  - Endpoint công khai mới (không thuộc các tiền tố trên) phải thêm vào `PUBLIC_ENDPOINT` của `SecurityConfig`.
- [ ] **9. Test backend.** Unit test cho quy tắc nghiệp vụ (xem `BackendServiceFixtures` để dựng service thật với repository giả). Endpoint đọc mới: thêm vào `paths()` của `ReadEndpointsSmokeTest`. Có `@Query` mới thì `RepositoryQueryValidationTest` tự kiểm tra cú pháp.
- [ ] **10. Định dạng.** `.\mvnw.cmd spotless:apply`, rồi `.\mvnw.cmd test`.
- [ ] **11. API client.** Thêm hàm vào nhóm tương ứng trong [frontend/src/api/index.js](../../../frontend/src/api/index.js).
- [ ] **12. Màn hình.** Gọi hàm mới, xử lý trạng thái đang tải, lỗi, rỗng. Xem [add-page.md](add-page.md).
- [ ] **13. Tài liệu.** Thêm dòng vào [endpoints.md](../../04-api/endpoints.md). Đổi quyền thì cập nhật [roles-permissions.md](../../02-domain/roles-permissions.md). Đổi nghiệp vụ thì cập nhật file trong [02-domain](../../02-domain/).

## Ví dụ

```java
// dto/response/BookingReceiptResponse.java
@Data
@Builder
public class BookingReceiptResponse {
  private String bookingCode;
  private List<String> seatCodes;
  private BigDecimal totalAmount;
  private LocalDateTime paidAt;
}
```

```java
// service/BookingQueryService.java
@Transactional(readOnly = true)
public BookingReceiptResponse getReceipt(Long bookingId) {
  Booking booking = getBooking(bookingId);
  bookingAccessPolicy.requireCanView(booking, currentUserProvider.requireUser());
  return bookingMapper.toReceipt(booking); // map bên trong transaction
}
```

```java
// controller/BookingController.java
@GetMapping("/{id}/receipt")
public ApiResponse<BookingReceiptResponse> getReceipt(@PathVariable("id") Long id) {
  return ApiResponse.<BookingReceiptResponse>builder()
      .result(bookingService.getReceipt(id))
      .build();
}
```

```js
// frontend/src/api/index.js, trong bookingApi
getReceipt: (id) => axiosClient.get(`/booking/${id}/receipt`),
```

`/booking/**` không công khai ở `SecurityConfig`, nên endpoint tự động yêu cầu đăng nhập. `requireCanView` cho phép chủ đơn, STAFF và MANAGER cùng chi nhánh, và ADMIN.

## Lỗi hay gặp

| Lỗi | Nguyên nhân |
| --- | --- |
| `LazyInitializationException` | Map DTO ngoài transaction, hoặc trả entity. Chuyển việc map vào method `@Transactional` của service. |
| Endpoint trả 401 dù đã đăng nhập | Token là refresh token, hoặc header sai định dạng. |
| Endpoint trả 403 cho MANAGER dù có `hasAnyRole` | Service kiểm tra chi nhánh, MANAGER chưa được gán `branchId` hoặc dữ liệu thuộc chi nhánh khác. |
| Frontend nhận `undefined` | Đọc `response.data` thay vì `response.data.result`. |
| CORS lỗi chỉ với method mới | Method không nằm trong danh sách `GET, POST, PUT, PATCH, DELETE, OPTIONS` của `corsConfigurationSource`. |
