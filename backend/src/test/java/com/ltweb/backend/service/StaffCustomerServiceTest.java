package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.ltweb.backend.dto.request.StaffBookingRequest;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.MembershipTier;
import com.ltweb.backend.enums.UserRole;
import com.ltweb.backend.enums.UserStatus;
import com.ltweb.backend.exception.AppException;
import com.ltweb.backend.exception.ErrorCode;
import com.ltweb.backend.repository.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

class StaffCustomerServiceTest {
  private final UserRepository users = mock(UserRepository.class);
  private StaffCustomerService service;

  private final User linh =
      User.builder()
          .id(42L)
          .username("linhnguyen90")
          .fullName("Nguyễn Thị Linh")
          .email("linhnguyen90@example.com")
          .phoneNumber("0901234567")
          .role(UserRole.USER)
          .status(UserStatus.ACTIVE)
          .membershipTier(MembershipTier.SILVER)
          .build();

  @BeforeEach
  void setup() {
    PasswordEncoder encoder = mock(PasswordEncoder.class);
    when(encoder.encode(any())).thenReturn("hash");
    when(users.findByEmail(any())).thenReturn(Optional.empty());
    when(users.findByPhoneNumber(any())).thenReturn(Optional.empty());
    when(users.save(any())).thenAnswer(call -> call.getArgument(0));
    service = new StaffCustomerService(users, encoder);
  }

  @Test
  void lookupMasksMatchedCustomer() {
    when(users.findByPhoneNumber("0901234567")).thenReturn(Optional.of(linh));

    var result = service.lookup(null, "090 123 4567");

    assertThat(result.isMatched()).isTrue();
    assertThat(result.getCustomerId()).isEqualTo(42L);
    assertThat(result.getMaskedName()).isEqualTo("N. T. Linh");
    assertThat(result.getMaskedPhone()).isEqualTo("090****567");
    assertThat(result.getMaskedEmail()).isEqualTo("li**********@example.com");
    assertThat(result.getMembershipTier()).isEqualTo("Bạc");
    assertThat(result.isGuestAccount()).isFalse();
  }

  @Test
  void saleToExistingAccountRequiresConfirmation() {
    when(users.findByPhoneNumber("0901234567")).thenReturn(Optional.of(linh));
    StaffBookingRequest request = request(null, "0901234567");

    assertError(
        () -> service.getOrCreateStaffCustomer(request), ErrorCode.CUSTOMER_CONFIRMATION_REQUIRED);

    request.setConfirmedCustomerId(42L);
    assertThat(service.getOrCreateStaffCustomer(request)).isSameAs(linh);
    verify(users, never()).save(any());
  }

  @Test
  void confirmationForAnotherAccountIsRejected() {
    when(users.findByEmail("linhnguyen90@example.com")).thenReturn(Optional.of(linh));
    StaffBookingRequest request = request("linhnguyen90@example.com", null);
    request.setConfirmedCustomerId(99L);

    assertError(
        () -> service.getOrCreateStaffCustomer(request), ErrorCode.CUSTOMER_CONFIRMATION_REQUIRED);
  }

  @Test
  void staffOrBlockedAccountsCannotReceiveCounterSale() {
    User staff = User.builder().id(7L).role(UserRole.STAFF).status(UserStatus.ACTIVE).build();
    when(users.findByEmail("staff@movieptit.vn")).thenReturn(Optional.of(staff));
    assertError(() -> service.lookup("staff@movieptit.vn", null), ErrorCode.CUSTOMER_NOT_ELIGIBLE);

    linh.setStatus(UserStatus.BLOCKED);
    when(users.findByPhoneNumber("0901234567")).thenReturn(Optional.of(linh));
    StaffBookingRequest request = request(null, "0901234567");
    request.setConfirmedCustomerId(42L);
    assertError(() -> service.getOrCreateStaffCustomer(request), ErrorCode.CUSTOMER_NOT_ELIGIBLE);
  }

  @Test
  void emailAndPhoneOfDifferentAccountsConflict() {
    User other = User.builder().id(43L).role(UserRole.USER).status(UserStatus.ACTIVE).build();
    when(users.findByEmail("linhnguyen90@example.com")).thenReturn(Optional.of(linh));
    when(users.findByPhoneNumber("0987654321")).thenReturn(Optional.of(other));

    assertError(
        () -> service.lookup("linhnguyen90@example.com", "0987654321"),
        ErrorCode.CUSTOMER_CONTACT_CONFLICT);
  }

  @Test
  void newWalkInGetsNormalizedPhone() {
    User created = service.getOrCreateStaffCustomer(request(null, "+84 901-234-568"));

    assertThat(created.getPhoneNumber()).isEqualTo("0901234568");
    assertThat(created.getUsername()).isEqualTo("guest_0901234568");
    assertThat(created.getFullName()).isEqualTo("Walk-in Customer");
  }

  @Test
  void invalidContactIsRejected() {
    assertError(() -> service.lookup(null, "12345"), ErrorCode.CUSTOMER_PHONE_INVALID);
    assertError(() -> service.lookup("not-an-email", null), ErrorCode.CUSTOMER_EMAIL_INVALID);
  }

  @Test
  void noContactStillSellsAsAnonymousWalkIn() {
    User created = service.getOrCreateStaffCustomer(request(null, null));

    assertThat(created.getPhoneNumber()).isNull();
    assertThat(created.getEmail()).isNull();
    assertThat(service.lookup(" ", "").isMatched()).isFalse();
  }

  private static StaffBookingRequest request(String email, String phone) {
    StaffBookingRequest request = new StaffBookingRequest();
    request.setCustomerEmail(email);
    request.setCustomerPhone(phone);
    return request;
  }

  private static void assertError(Runnable action, ErrorCode expected) {
    assertThatThrownBy(action::run)
        .isInstanceOfSatisfying(
            AppException.class, error -> assertThat(error.getErrorCode()).isEqualTo(expected));
  }
}
