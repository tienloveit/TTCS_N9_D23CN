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
  PASSWORD_INCORRECT(401, "Password incorrect", HttpStatus.UNAUTHORIZED),

  // Price
  SEATTYPE_EXIST(401, "Seat type already exist", HttpStatus.BAD_REQUEST),
  SEATTYPE_NOT_EXIST(401, "Seat type does not exist", HttpStatus.BAD_REQUEST),

  // User Management
  USER_EXISTED(400, "User already exists", HttpStatus.BAD_REQUEST),
  USER_NOT_FOUND(400, "User does not exist", HttpStatus.BAD_REQUEST),

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

  // Ticket Management
  TICKET_NOT_FOUND(400, "Ticket does not exist", HttpStatus.BAD_REQUEST),
  TICKET_ALREADY_EXISTS(
      400, "Ticket already exists for this showtime and seat", HttpStatus.BAD_REQUEST),
  TICKET_NOT_AVAILABLE(
      400, "One or more selected tickets are not available", HttpStatus.BAD_REQUEST),
  INVALID_TICKET_CHECKIN(400, "Ticket is not valid for check-in", HttpStatus.BAD_REQUEST),

  // Payment Management
  PAYMENT_NOT_FOUND(400, "Payment does not exist", HttpStatus.BAD_REQUEST),
  INVALID_PAYMENT_STATUS(400, "Invalid payment status for this operation", HttpStatus.BAD_REQUEST),

  // Database
  DATA_INTEGRITY_VIOLATION(400, "Database constraint violated", HttpStatus.BAD_REQUEST);
  private final int code;
  private final String message;
  private final HttpStatus status;
}
