package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.ltweb.backend.entity.User;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.repository.UserRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

class PasswordRecoveryServiceTest {
  private final UserRepository users = mock(UserRepository.class);
  private final PasswordEncoder encoder = mock(PasswordEncoder.class);
  private final OTPService otp = mock(OTPService.class);
  private final EmailService email = mock(EmailService.class);
  private final PasswordRecoveryService recovery =
      new PasswordRecoveryService(users, encoder, otp, email, new CurrentUserProvider(users));

  @AfterEach
  void clearAuthentication() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void passwordChangeChecksCurrentPasswordBeforePersisting() {
    User user = User.builder().username("customer").password("old-hash").build();
    SecurityContextHolder.getContext()
        .setAuthentication(new UsernamePasswordAuthenticationToken("customer", null, List.of()));
    when(users.findByUsername("customer")).thenReturn(Optional.of(user));
    assertThatThrownBy(() -> recovery.changePassword("wrong", "new"))
        .isInstanceOf(AppException.class)
        .extracting("errorCode")
        .isEqualTo(ErrorCode.PASSWORD_INCORRECT);
    verify(users, never()).save(any());
    when(encoder.matches("correct", "old-hash")).thenReturn(true);
    when(encoder.encode("new")).thenReturn("new-hash");
    recovery.changePassword("correct", "new");
    assertThat(user.getPassword()).isEqualTo("new-hash");
    verify(users).save(user);
  }

  @Test
  void validOtpIsConsumedOnlyAfterSavingTheNewPassword() {
    User user = User.builder().email("customer@example.test").build();
    when(otp.checkOTP(user.getEmail(), "123456")).thenReturn(true);
    when(users.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
    when(encoder.encode("new")).thenReturn("new-hash");
    recovery.resetPassword(user.getEmail(), "123456", "new");
    var order = inOrder(users, otp);
    order.verify(otp).checkOTP(user.getEmail(), "123456");
    order.verify(users).findByEmail(user.getEmail());
    order.verify(users).save(user);
    order.verify(otp).deleteOTP(user.getEmail());
    assertThat(user.getPassword()).isEqualTo("new-hash");
  }

  @Test
  void invalidOtpDoesNotLoadOrModifyAnAccount() {
    assertThatThrownBy(() -> recovery.resetPassword("customer@example.test", "invalid", "new"))
        .isInstanceOf(AppException.class)
        .extracting("errorCode")
        .isEqualTo(ErrorCode.OTP_INVALID);
    verifyNoInteractions(users, encoder);
    verify(otp, never()).deleteOTP(anyString());
  }

  @Test
  void forgotPasswordSendsTheGeneratedOtpForAnExistingAccount() throws Exception {
    when(users.existsByEmail("customer@example.test")).thenReturn(true);
    when(otp.generateOTP("customer@example.test")).thenReturn("123456");
    recovery.forgotPassword("customer@example.test");
    verify(email).sendOtp("customer@example.test", "123456");
  }
}
