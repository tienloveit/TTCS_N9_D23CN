package com.ltweb.backend.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {
  // General Errors
  INTERNAL_ERROR(500, "Unexpected error occurred", HttpStatus.INTERNAL_SERVER_ERROR),

  // Authentication & Authorization
  UNAUTHORIZED(401, "Unauthorized", HttpStatus.UNAUTHORIZED),
  LOGIN_FAILED(401, "Username or password incorrect", HttpStatus.UNAUTHORIZED),
  ACCESS_DENIED(403, "Access denied", HttpStatus.FORBIDDEN),
  TOKEN_INVALID(401, "Invalid JWT token", HttpStatus.UNAUTHORIZED),
  TOKEN_SIGNING_FAILED(500, "Failed to sign JWT token", HttpStatus.INTERNAL_SERVER_ERROR),
  OTP_INVALID(401, "Invalid OTP", HttpStatus.UNAUTHORIZED),
  OTP_RATE_LIMIT(429, "Too many OTP requests. Please try again later", HttpStatus.TOO_MANY_REQUESTS),
  PASSWORD_INCORRECT(401, "Password incorrect", HttpStatus.UNAUTHORIZED),
  OAUTH2_EMAIL_MISSING(400, "Google account does not provide an email", HttpStatus.BAD_REQUEST),
  OAUTH2_EMAIL_NOT_VERIFIED(401, "Google email is not verified", HttpStatus.UNAUTHORIZED),

  // Price
  SEATTYPE_EXIST(401, "Seat type already exist", HttpStatus.BAD_REQUEST),
  SEATTYPE_NOT_EXIST(401, "Seat type does not exist", HttpStatus.BAD_REQUEST),

  // User Management
  USER_EXISTED(400, "User already exists", HttpStatus.BAD_REQUEST),
  USER_NOT_FOUND(400, "Email không tồn tại trong hệ thống", HttpStatus.BAD_REQUEST),

  // Request Validation
  VALIDATION_ERROR(400, "Request validation failed", HttpStatus.BAD_REQUEST),
  MISSING_REQUEST_HEADER(400, "Required request header is missing", HttpStatus.BAD_REQUEST),

  // Branch Management
  BRANCH_NOT_FOUND(400, "Branch does not exist", HttpStatus.BAD_REQUEST),

  // Room Management
  ROOM_NOT_FOUND(400, "Room does not exist", HttpStatus.BAD_REQUEST),
  ROOM_HAS_SHOWTIMES(
      400,
      "Cannot change room structure because it has scheduled showtimes",
      HttpStatus.BAD_REQUEST),

  // Seat Management
  SEAT_NOT_FOUND(400, "Seat does not exist", HttpStatus.BAD_REQUEST),
  SEAT_DUPLICATE(400, "SeatCode duplicate", HttpStatus.BAD_REQUEST),

  // Movie Management
  MOVIE_NOT_FOUND(400, "Movie does not exist", HttpStatus.BAD_REQUEST),

  // Genre Management
  GENRE_NOT_FOUND(400, "Genre does not exist", HttpStatus.BAD_REQUEST),

  // Director Management
  DIRECTOR_NOT_FOUND(400, "Director does not exist", HttpStatus.BAD_REQUEST),

  // Food Management
  FOOD_NOT_FOUND(400, "Food does not exist", HttpStatus.BAD_REQUEST),

  // Showtime Management
  SHOWTIME_NOT_FOUND(400, "Showtime does not exist", HttpStatus.BAD_REQUEST),
  SHOWTIME_TIME_OVERLAP(
      400, "Showtime time overlaps with an existing schedule", HttpStatus.BAD_REQUEST),
  SHOWTIME_HAS_BOOKINGS(
      400, "Cannot delete showtime that has existing bookings", HttpStatus.BAD_REQUEST),

  // Booking Management
  BOOKING_NOT_FOUND(400, "Booking does not exist", HttpStatus.BAD_REQUEST),
  BOOKING_CANNOT_CANCEL(400, "Only pending bookings can be cancelled", HttpStatus.BAD_REQUEST),
  MAX_TICKET_PER_TRANSACTION(
      400, "Cannot book more than 8 tickets in a single transaction", HttpStatus.BAD_REQUEST),
  MAX_TICKET_PER_MOVIE(
      400, "Cannot book more than 8 tickets for the same movie", HttpStatus.BAD_REQUEST),

  // Ticket Management
  TICKET_NOT_FOUND(400, "Ticket does not exist", HttpStatus.BAD_REQUEST),
  TICKET_ALREADY_EXISTS(
      400, "Ticket already exists for this showtime and seat", HttpStatus.BAD_REQUEST),
  TICKET_NOT_AVAILABLE(
      400, "One or more selected tickets are not available", HttpStatus.BAD_REQUEST),
  INVALID_TICKET_CHECKIN(400, "Ticket is not valid for check-in", HttpStatus.BAD_REQUEST),
  INVALID_QR_IMAGE(400, "Invalid QR code image file", HttpStatus.BAD_REQUEST),
  QR_CODE_NOT_FOUND(400, "QR code not found in image", HttpStatus.BAD_REQUEST),

  // Payment Management
  PAYMENT_NOT_FOUND(400, "Payment does not exist", HttpStatus.BAD_REQUEST),
  INVALID_PAYMENT_STATUS(400, "Invalid payment status for this operation", HttpStatus.BAD_REQUEST),

  // Promotion Management
  PROMOTION_NOT_FOUND(400, "Promotion code does not exist", HttpStatus.BAD_REQUEST),
  PROMOTION_EXPIRED(400, "Promotion code has expired or is inactive", HttpStatus.BAD_REQUEST),
  PROMOTION_USAGE_LIMIT(400, "Promotion code has reached its usage limit", HttpStatus.BAD_REQUEST),
  PROMOTION_TIER_NOT_MET(
      400, "Your membership tier does not meet the requirement", HttpStatus.BAD_REQUEST),
  PROMOTION_MIN_ORDER(
      400, "Order amount does not meet minimum requirement for this promotion", HttpStatus.BAD_REQUEST),

  // Database
  DATA_INTEGRITY_VIOLATION(400, "Database constraint violated", HttpStatus.BAD_REQUEST);
  private final int code;
  private final String message;
  private final HttpStatus status;
}
