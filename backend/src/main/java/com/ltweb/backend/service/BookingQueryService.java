package com.ltweb.backend.service;

import com.ltweb.backend.dto.request.BookingSearchRequest;
import com.ltweb.backend.dto.response.BookingPageResponse;
import com.ltweb.backend.dto.response.BookingResponse;
import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.BookingStatus;
import com.ltweb.backend.enums.PaymentStatus;
import com.ltweb.backend.enums.UserRole;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.mapper.BookingMapper;
import com.ltweb.backend.repository.BookingRepository;
import com.ltweb.backend.repository.BookingSearchFilter;
import com.ltweb.backend.repository.BookingSearchRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BookingQueryService {
  private final BookingRepository bookingRepository;
  private final BookingMapper bookingMapper;
  private final CurrentUserProvider currentUserProvider;
  private final BookingAccessPolicy bookingAccessPolicy;
  private final RefundPolicy refundPolicy;

  /**
   * Danh sách đơn quản lý, phân trang và lọc ở DB. ADMIN xem mọi chi nhánh (có thể lọc {@code
   * branchId}); STAFF/MANAGER chỉ xem chi nhánh được phân công; vai trò khác nhận trang rỗng.
   */
  public BookingPageResponse searchBookings(BookingSearchRequest request) {
    int page = request.pageOrDefault();
    int size = request.sizeOrDefault();
    Optional<BookingSearchFilter> filter = toFilter(request, getUserCurrent());
    if (filter.isEmpty()) {
      return emptyPage(page, size);
    }

    Page<Long> ids = bookingRepository.searchIds(filter.get(), PageRequest.of(page, size));
    Map<Long, Booking> byId =
        ids.isEmpty()
            ? Map.of()
            : bookingRepository.findDetailedByIdIn(ids.getContent()).stream()
                .collect(Collectors.toMap(Booking::getId, Function.identity()));
    BookingSearchRepository.Totals totals = bookingRepository.totals(filter.get());

    return BookingPageResponse.builder()
        .content(
            ids.getContent().stream()
                .map(byId::get)
                .filter(Objects::nonNull)
                .map(bookingMapper::toBookingResponse)
                .toList())
        .page(page)
        .size(size)
        .totalElements(ids.getTotalElements())
        .totalPages(ids.getTotalPages())
        .summary(
            BookingPageResponse.Summary.builder()
                .completed(totals.completed())
                .refundRequested(totals.refundRequested())
                .paidAmount(totals.paidAmount())
                .build())
        .build();
  }

  /** Bộ lọc theo quyền; rỗng khi người dùng không có phạm vi xem hoặc bộ lọc không thể khớp. */
  private Optional<BookingSearchFilter> toFilter(BookingSearchRequest request, User user) {
    Long branchId;
    if (user.getRole() == UserRole.ADMIN) {
      branchId = request.branchId();
    } else if (isBranchOperator(user) && user.getBranchId() != null) {
      if (request.branchId() != null && !Objects.equals(request.branchId(), user.getBranchId())) {
        throw new AccessDeniedException("Branch access denied");
      }
      branchId = user.getBranchId();
    } else {
      return Optional.empty();
    }

    PaymentStatus paymentStatus = null;
    boolean noPaymentStatus = false;
    String requestedPayment = request.paymentStatus();
    if (requestedPayment != null && !requestedPayment.isBlank()) {
      if (BookingSearchRequest.NO_TRANSACTION.equals(requestedPayment)) {
        noPaymentStatus = true;
      } else {
        try {
          paymentStatus = PaymentStatus.valueOf(requestedPayment);
        } catch (IllegalArgumentException unknownStatus) {
          // Trạng thái không tồn tại trong hệ thống thì không đơn nào khớp.
          return Optional.empty();
        }
      }
    }

    return Optional.of(
        new BookingSearchFilter(
            branchId,
            request.q(),
            request.status(),
            paymentStatus,
            noPaymentStatus,
            startOf(request.from()),
            startOfNextDay(request.to()),
            startOf(request.showtimeDate()),
            startOfNextDay(request.showtimeDate()),
            startOf(request.checkedInDate()),
            startOfNextDay(request.checkedInDate())));
  }

  private static LocalDateTime startOf(LocalDate date) {
    return date == null ? null : date.atStartOfDay();
  }

  private static LocalDateTime startOfNextDay(LocalDate date) {
    return date == null ? null : date.plusDays(1).atStartOfDay();
  }

  private static BookingPageResponse emptyPage(int page, int size) {
    return BookingPageResponse.builder()
        .content(List.of())
        .page(page)
        .size(size)
        .summary(
            BookingPageResponse.Summary.builder().paidAmount(java.math.BigDecimal.ZERO).build())
        .build();
  }

  public List<BookingResponse> getRefundBookings() {
    return scopedBookings(REFUND_STATUSES).stream()
        .sorted(
            java.util.Comparator.comparing(
                    Booking::getUpdatedAt,
                    java.util.Comparator.nullsLast(java.util.Comparator.naturalOrder()))
                .reversed())
        .map(bookingMapper::toBookingResponse)
        .toList();
  }

  public BookingResponse getBookingById(Long bookingId) {
    Booking booking = getBooking(bookingId);
    bookingAccessPolicy.requireCanView(booking, getUserCurrent());
    return withRefundDeadline(booking, getRefundWindowHours());
  }

  public BookingResponse getMyBookings(Long bookingId) {
    User user = getUserCurrent();

    Booking booking = getBooking(bookingId);

    bookingAccessPolicy.requireOwner(booking, user);

    return withRefundDeadline(booking, getRefundWindowHours());
  }

  public List<BookingResponse> getMyBookingsList() {
    User user = getUserCurrent();
    int refundWindowHours = getRefundWindowHours();

    return bookingRepository.findByUserId(user.getId()).stream()
        .map(booking -> withRefundDeadline(booking, refundWindowHours))
        .toList();
  }

  private BookingResponse withRefundDeadline(Booking booking, int refundWindowHours) {
    BookingResponse response = bookingMapper.toBookingResponse(booking);
    response.setRefundDeadline(refundPolicy.deadline(booking, refundWindowHours));
    return response;
  }

  private static final List<BookingStatus> REFUND_STATUSES =
      List.of(BookingStatus.REFUND_REQUESTED, BookingStatus.REFUNDED);

  /**
   * ADMIN thấy toàn hệ thống; STAFF/MANAGER chỉ thấy chi nhánh được phân công; vai trò khác không
   * thấy gì. Lọc chi nhánh và trạng thái ngay trong truy vấn DB.
   */
  private List<Booking> scopedBookings(List<BookingStatus> statuses) {
    User currentUser = getUserCurrent();
    if (currentUser.getRole() == UserRole.ADMIN) {
      return bookingRepository.findByStatusIn(statuses);
    }
    Long branchId = isBranchOperator(currentUser) ? currentUser.getBranchId() : null;
    if (branchId == null) {
      return List.of();
    }
    return bookingRepository.findByBranchIdAndStatusIn(branchId, statuses);
  }

  private boolean isBranchOperator(User user) {
    return bookingAccessPolicy.isBranchOperator(user);
  }

  private Booking getBooking(Long bookingId) {
    return bookingRepository
        .findById(bookingId)
        .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));
  }

  private User getUserCurrent() {
    return currentUserProvider.requireUser();
  }

  private int getRefundWindowHours() {
    return refundPolicy.windowHours();
  }
}
