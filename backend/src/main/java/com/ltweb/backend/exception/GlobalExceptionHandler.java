package com.ltweb.backend.exception;

import com.ltweb.backend.dto.response.ErrorResponse;
import java.util.Date;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

@RestControllerAdvice
@Slf4j(topic = "Global-Exception")
public class GlobalExceptionHandler {
  // 1. Xử lý Custom Exception
  @ExceptionHandler(AppException.class)
  public ResponseEntity<ErrorResponse> handleJavaBuilderException(
      AppException exception, WebRequest request) {

    ErrorResponse response =
        ErrorResponse.builder()
            .code(exception.getErrorCode().getCode())
            .error(exception.getErrorCode().getStatus().getReasonPhrase())
            .message(exception.getMessage())
            .timestamp(new Date())
            .path(request.getDescription(false).replace("uri=", ""))
            .build();

    return ResponseEntity.status(exception.getErrorCode().getStatus()).body(response);
  }

  // 2. Xử lý Validation Errors
  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ErrorResponse> handleValidationException(
      MethodArgumentNotValidException e, WebRequest request) {

    BindingResult bindingResult = e.getBindingResult();
    List<FieldError> fieldErrors = bindingResult.getFieldErrors();

    // Lấy tất cả error messages
    List<String> errors = fieldErrors.stream().map(FieldError::getDefaultMessage).toList();

    ErrorResponse errorResponse =
        ErrorResponse.builder()
            .timestamp(new Date())
            .code(ErrorCode.VALIDATION_ERROR.getCode())
            .error(ErrorCode.VALIDATION_ERROR.getStatus().getReasonPhrase())
            .message(errors.size() > 1 ? errors.toString() : errors.get(0))
            .path(request.getDescription(false).replace("uri=", ""))
            .build();

    return ResponseEntity.badRequest().body(errorResponse);
  }

  // 3. Xử lý Authentication Errors
  @ExceptionHandler(AuthenticationException.class)
  public ResponseEntity<ErrorResponse> handleAuthenticationException(
      AuthenticationException exception, WebRequest request) {

    log.error("Authentication failed: {}", exception.getMessage());
    ErrorResponse response = buildErrorCodeResponse(ErrorCode.LOGIN_FAILED, request);
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
  }

  // 4. Xử lý Authorization Errors
  @ExceptionHandler(AccessDeniedException.class)
  public ResponseEntity<ErrorResponse> handleAccessDeniedException(
      AccessDeniedException exception, WebRequest request) {

    log.error("Access denied: {}", exception.getMessage());
    ErrorResponse response = buildErrorCodeResponse(ErrorCode.ACCESS_DENIED, request);
    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
  }

  // 5. Xử lý Missing Headers/Cookies
  @ExceptionHandler(MissingRequestHeaderException.class)
  public ResponseEntity<ErrorResponse> handleMissingRequestHeaderException(
      MissingRequestHeaderException exception, WebRequest request) {

    ErrorResponse response =
        ErrorResponse.builder()
            .timestamp(new Date())
            .code(ErrorCode.MISSING_REQUEST_HEADER.getCode())
            .error(ErrorCode.MISSING_REQUEST_HEADER.getStatus().getReasonPhrase())
            .message("Required header '" + exception.getHeaderName() + "' is missing")
            .path(request.getDescription(false).replace("uri=", ""))
            .build();

    return ResponseEntity.badRequest().body(response);
  }

  // 6. Xử lý Database Constraint Violations
  @ExceptionHandler(DataIntegrityViolationException.class)
  public ResponseEntity<ErrorResponse> handleDataIntegrityViolation(
      DataIntegrityViolationException exception, WebRequest request) {
    String detailedMessage =
        exception.getMostSpecificCause() != null
            ? exception.getMostSpecificCause().getMessage()
            : ErrorCode.DATA_INTEGRITY_VIOLATION.getMessage();

    ErrorResponse response =
        ErrorResponse.builder()
            .timestamp(new Date())
            .code(ErrorCode.DATA_INTEGRITY_VIOLATION.getCode())
            .error(ErrorCode.DATA_INTEGRITY_VIOLATION.getStatus().getReasonPhrase())
            .message(detailedMessage)
            .path(request.getDescription(false).replace("uri=", ""))
            .build();
    return ResponseEntity.badRequest().body(response);
  }

  // 7. Catch-all cho các exceptions không được xử lý
  @ExceptionHandler(Exception.class)
  public ResponseEntity<ErrorResponse> handleAllExceptions(Exception ex, WebRequest request) {

    log.error("Unexpected exception occurred: ", ex);
    ErrorResponse response =
        ErrorResponse.builder()
            .timestamp(new Date())
            .code(ErrorCode.INTERNAL_ERROR.getCode())
            .message("Unexpected error occurred: " + ex.toString() + " - " + ex.getMessage())
            .error(ErrorCode.INTERNAL_ERROR.getStatus().getReasonPhrase())
            .path(request.getDescription(false).replace("uri=", ""))
            .build();
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
  }

  // Helper method để build ErrorResponse từ ErrorCode
  private ErrorResponse buildErrorCodeResponse(ErrorCode errorCode, WebRequest request) {
    return ErrorResponse.builder()
        .timestamp(new Date())
        .code(errorCode.getCode())
        .message(errorCode.getMessage())
        .error(errorCode.getStatus().getReasonPhrase())
        .path(request.getDescription(false).replace("uri=", ""))
        .build();
  }
}
