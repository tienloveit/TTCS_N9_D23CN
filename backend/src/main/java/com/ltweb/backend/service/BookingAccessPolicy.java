package com.ltweb.backend.service;

import com.ltweb.backend.entity.Booking;
import com.ltweb.backend.entity.Showtime;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.UserRole;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import java.util.Objects;
import org.springframework.stereotype.Component;

@Component
public class BookingAccessPolicy {
  public Long branchId(Booking booking) {
    return booking.getShowtime() == null ? null : branchId(booking.getShowtime());
  }

  public Long branchId(Showtime showtime) {
    return showtime.getRoom() == null || showtime.getRoom().getBranch() == null
        ? null
        : showtime.getRoom().getBranch().getBranchId();
  }

  public boolean isBranchOperator(User user) {
    return user.getRole() == UserRole.STAFF || user.getRole() == UserRole.MANAGER;
  }

  public boolean isInBranch(Booking booking, Long branchId) {
    return branchId != null && Objects.equals(branchId(booking), branchId);
  }

  public boolean canManage(Booking booking, User user) {
    return user.getRole() == UserRole.ADMIN
        || (isBranchOperator(user) && isInBranch(booking, user.getBranchId()));
  }

  public void requireOwner(Booking booking, User user) {
    require(isOwner(booking, user), ErrorCode.ACCESS_DENIED);
  }

  public void requireCanView(Booking booking, User user) {
    require(isOwner(booking, user) || canManage(booking, user), ErrorCode.ACCESS_DENIED);
  }

  public void requireCanManage(Booking booking, User user) {
    require(canManage(booking, user), ErrorCode.ACCESS_DENIED);
  }

  public void requireCanCancel(Booking booking, User user) {
    require(
        isOwner(booking, user)
            || user.getRole() == UserRole.ADMIN
            || (user.getRole() == UserRole.STAFF && isInBranch(booking, user.getBranchId())),
        ErrorCode.ACCESS_DENIED);
  }

  /**
   * Chủ đơn tự gửi yêu cầu hoàn. Với đơn bán tại quầy, ADMIN hoặc STAFF/MANAGER của đúng chi nhánh
   * được gửi thay khách, vì khách vãng lai không có tài khoản đăng nhập.
   */
  public void requireCanRequestRefund(Booking booking, User user) {
    require(
        isOwner(booking, user) || canRequestRefundForCustomer(booking, user),
        ErrorCode.ACCESS_DENIED);
  }

  /** Người đang thao tác gửi yêu cầu hoàn thay khách (không phải chủ đơn). */
  public boolean isRequestingRefundForCustomer(Booking booking, User user) {
    return !isOwner(booking, user) && canRequestRefundForCustomer(booking, user);
  }

  private boolean canRequestRefundForCustomer(Booking booking, User user) {
    return booking.getStaffUser() != null && canManage(booking, user);
  }

  public void requireCanCreateAtCounter(Showtime showtime, User user) {
    require(
        user.getRole() == UserRole.ADMIN
            || (user.getRole() == UserRole.STAFF
                && user.getBranchId() != null
                && Objects.equals(branchId(showtime), user.getBranchId())),
        ErrorCode.ACCESS_DENIED);
  }

  public void requireRefundOperator(User user, boolean requireAssignedBranch) {
    require(
        user.isEnabled()
            && user.isAccountNonLocked()
            && (user.getRole() == UserRole.ADMIN
                || (user.getRole() == UserRole.MANAGER
                    && (!requireAssignedBranch || user.getBranchId() != null))),
        ErrorCode.ACCESS_DENIED);
  }

  public void requireCanRefund(Booking booking, User user) {
    require(
        user.getRole() == UserRole.ADMIN
            || (user.getRole() == UserRole.MANAGER && isInBranch(booking, user.getBranchId())),
        ErrorCode.ACCESS_DENIED);
  }

  private boolean isOwner(Booking booking, User user) {
    return booking.getUser() != null && Objects.equals(booking.getUser().getId(), user.getId());
  }

  private void require(boolean allowed, ErrorCode error) {
    if (!allowed) throw new AppException(error);
  }
}
