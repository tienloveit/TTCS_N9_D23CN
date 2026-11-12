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
    require(isOwner(booking, user), ErrorCode.UNAUTHORIZED);
  }

  public void requireCanView(Booking booking, User user) {
    require(isOwner(booking, user) || canManage(booking, user), ErrorCode.UNAUTHORIZED);
  }

  public void requireCanManage(Booking booking, User user) {
    require(canManage(booking, user), ErrorCode.UNAUTHORIZED);
  }

  public void requireCanCancel(Booking booking, User user) {
    require(
        isOwner(booking, user)
            || user.getRole() == UserRole.ADMIN
            || (user.getRole() == UserRole.STAFF && isInBranch(booking, user.getBranchId())),
        ErrorCode.UNAUTHORIZED);
  }

  public void requireCanCreateAtCounter(Showtime showtime, User user) {
    require(
        user.getRole() == UserRole.ADMIN
            || (user.getRole() == UserRole.STAFF
                && user.getBranchId() != null
                && Objects.equals(branchId(showtime), user.getBranchId())),
        ErrorCode.UNAUTHORIZED);
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
